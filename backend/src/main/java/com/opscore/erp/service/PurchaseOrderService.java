package com.opscore.erp.service;

import com.opscore.erp.domain.*;
import com.opscore.erp.dto.*;
import com.opscore.erp.exception.*;
import com.opscore.erp.repository.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class PurchaseOrderService {
    private final PurchaseOrderRepository orders;
    private final ProductRepository products;
    private final VendorRepository vendors;
    private final JdbcTemplate jdbc;
    private final InventoryTransactionRepository inventory;

    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(CreatePurchaseOrderRequest request) {
        var order = new PurchaseOrder();
        replaceDraft(order, request.vendorId(), request.items());
        // A separate, atomic database sequence makes concurrent creation safe; gaps are expected.
        Long number = jdbc.queryForObject("select nextval('purchase_order_number_seq')", Long.class);
        order.setPoNumber("PO-" + Year.now(ZoneOffset.UTC) + "-" + String.format(Locale.ROOT, "%06d", number));
        return response(orders.saveAndFlush(order));
    }

    public PurchaseOrderResponse getPurchaseOrder(Long id) { return response(find(id, false)); }

    public PageResponse<PurchaseOrderSummary> listPurchaseOrders(String search, PurchaseOrderStatus status,
                                                                 Long vendorId, int page, int size) {
        Specification<PurchaseOrder> spec = (root, query, cb) -> {
            var predicate = cb.conjunction();
            if (status != null) predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            if (vendorId != null) predicate = cb.and(predicate, cb.equal(root.get("vendor").get("id"), vendorId));
            if (search != null && !search.isBlank()) {
                String term = "%" + search.strip().toLowerCase(Locale.ROOT)
                        .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
                predicate = cb.and(predicate, cb.or(cb.like(cb.lower(root.get("poNumber")), term, '!'),
                        cb.like(cb.lower(root.get("vendor").get("name")), term, '!')));
            }
            return predicate;
        };
        return PageResponse.from(orders.findAll(spec, PageRequest.of(page, size, Sort.by("id").descending()))
                .map(o -> new PurchaseOrderSummary(o.getId(), o.getPoNumber(), o.getStatus(), vendor(o),
                        o.getItems().size(), o.getSubtotal(), o.getTotal(), o.getCreatedAt(), o.getUpdatedAt(), o.getOrderedAt(), o.getReceivedAt())));
    }

    @Transactional
    public PurchaseOrderResponse updatePurchaseOrder(Long id, UpdatePurchaseOrderRequest request) {
        var order = find(id, true);
        requireDraft(order, "PURCHASE_ORDER_NOT_EDITABLE", "Only draft purchase orders can be edited");
        replaceDraft(order, request.vendorId(), request.items());
        order.markUpdated();
        return response(orders.saveAndFlush(order));
    }

    @Transactional
    public PurchaseOrderResponse markOrdered(Long id) {
        var order = find(id, true);
        requireDraft(order, "INVALID_PURCHASE_ORDER_STATUS", "Only draft purchase orders can be ordered");
        order.setStatus(PurchaseOrderStatus.ORDERED);
        order.setOrderedAt(Instant.now());
        return response(orders.saveAndFlush(order));
    }

    @Transactional
    public PurchaseOrderResponse cancelPurchaseOrder(Long id) {
        var order = find(id, true);
        requireDraft(order, "INVALID_PURCHASE_ORDER_STATUS", "Only draft purchase orders can be cancelled");
        order.setStatus(PurchaseOrderStatus.CANCELLED);
        return response(orders.saveAndFlush(order));
    }

    @Transactional
    public PurchaseOrderResponse receivePurchaseOrder(Long id) {
        var order = find(id, true);
        if (order.getStatus() == PurchaseOrderStatus.RECEIVED) {
            throw new PurchaseOrderException(409, "PURCHASE_ORDER_ALREADY_RECEIVED",
                    "Purchase order " + order.getPoNumber() + " has already been received");
        }
        if (order.getStatus() != PurchaseOrderStatus.ORDERED) {
            throw new PurchaseOrderException(409, "PURCHASE_ORDER_NOT_RECEIVABLE",
                    "Only ordered purchase orders can be received");
        }
        // Different POs may share products. Lock those rows in the same global order
        // to prevent lost updates and avoid circular waits between multi-item receipts.
        var items = order.getItems().stream()
                .sorted(Comparator.comparing(item -> item.getProduct().getId())).toList();
        for (var item : items) {
            var product = products.findForUpdate(item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", item.getProduct().getId()));
            int before = product.getQuantityOnHand();
            int after;
            try {
                after = Math.addExact(before, item.getQuantity());
            } catch (ArithmeticException ex) {
                throw new PurchaseOrderException(409, "INVENTORY_UPDATE_FAILED",
                        "Receiving would exceed the supported stock balance for " + product.getSku());
            }
            // Already-ordered commitments can be received even if master data is later inactive.
            product.setQuantityOnHand(after);
            inventory.saveAndFlush(InventoryTransaction.purchaseReceipt(product, item.getQuantity(),
                    before, after, order.getPoNumber()));
        }
        order.setStatus(PurchaseOrderStatus.RECEIVED);
        order.setReceivedAt(Instant.now());
        return response(orders.saveAndFlush(order));
    }

    private PurchaseOrder find(Long id, boolean lock) {
        return (lock ? orders.findForUpdate(id) : orders.findById(id)).orElseThrow(() ->
                new PurchaseOrderException(404, "PURCHASE_ORDER_NOT_FOUND", "Purchase order " + id + " does not exist"));
    }

    private void requireDraft(PurchaseOrder order, String code, String message) {
        if (order.getStatus() != PurchaseOrderStatus.DRAFT) throw new PurchaseOrderException(409, code, message);
    }

    private void replaceDraft(PurchaseOrder order, Long vendorId, List<PurchaseOrderItemRequest> requested) {
        var vendor = vendors.findById(vendorId).orElseThrow(() -> new ResourceNotFoundException("Vendor", vendorId));
        if (!vendor.getActive()) throw new PurchaseOrderException(400, "VENDOR_INACTIVE", "Select an active vendor");
        Set<Long> ids = new HashSet<>();
        for (var item : requested) {
            if (!ids.add(item.productId())) throw new PurchaseOrderException(400, "DUPLICATE_PRODUCT", "Each product can appear only once");
        }
        var available = products.findAllById(ids).stream().collect(Collectors.toMap(Product::getId, Function.identity()));
        var existing = order.getItems().stream().collect(Collectors.toMap(i -> i.getProduct().getId(), Function.identity()));
        BigDecimal subtotal = new BigDecimal("0.00");
        for (var input : requested) {
            var product = available.get(input.productId());
            if (product == null) throw new ResourceNotFoundException("Product", input.productId());
            if (!product.getActive()) throw new PurchaseOrderException(400, "PRODUCT_INACTIVE", "Product " + product.getSku() + " is inactive");
            var item = existing.get(product.getId());
            if (item == null) {
                item = new PurchaseOrderItem();
                item.setPurchaseOrder(order);
                item.setProduct(product);
                item.setUnitCost(product.getUnitCost());
                order.getItems().add(item);
            }
            item.setQuantity(input.quantity());
            item.setLineTotal(item.getUnitCost().multiply(BigDecimal.valueOf(input.quantity())));
            subtotal = subtotal.add(item.getLineTotal());
        }
        order.getItems().removeIf(item -> !ids.contains(item.getProduct().getId()));
        order.setVendor(vendor);
        order.setSubtotal(subtotal);
        order.setTotal(subtotal);
    }

    private PurchaseOrderVendorResponse vendor(PurchaseOrder o) {
        return new PurchaseOrderVendorResponse(o.getVendor().getId(), o.getVendor().getName(), o.getVendor().getActive());
    }

    private PurchaseOrderResponse response(PurchaseOrder o) {
        return new PurchaseOrderResponse(o.getId(), o.getPoNumber(), o.getStatus(), vendor(o), o.getItems().stream()
                .map(i -> new PurchaseOrderItemResponse(i.getId(), i.getProduct().getId(), i.getProduct().getSku(),
                        i.getProduct().getName(), i.getProduct().getActive(), i.getQuantity(), i.getUnitCost(), i.getLineTotal())).toList(),
                o.getSubtotal(), o.getTotal(), o.getCreatedAt(), o.getUpdatedAt(), o.getOrderedAt(), o.getReceivedAt());
    }
}
