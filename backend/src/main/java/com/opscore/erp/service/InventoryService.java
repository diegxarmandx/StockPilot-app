package com.opscore.erp.service;

import com.opscore.erp.domain.*;
import com.opscore.erp.dto.*;
import com.opscore.erp.exception.ResourceNotFoundException;
import com.opscore.erp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class InventoryService {
    private final InventoryTransactionRepository inventory;
    private final ProductRepository products;

    public PageResponse<InventoryTransactionResponse> list(Long productId, InventoryTransactionType type,
                                                          String referenceId, int page, int size) {
        Specification<InventoryTransaction> spec = (root, query, cb) -> {
            var predicate = cb.conjunction();
            if (productId != null) predicate = cb.and(predicate, cb.equal(root.get("product").get("id"), productId));
            if (type != null) predicate = cb.and(predicate, cb.equal(root.get("type"), type));
            if (referenceId != null && !referenceId.isBlank())
                predicate = cb.and(predicate, cb.equal(root.get("referenceId"), referenceId.strip()));
            return predicate;
        };
        return PageResponse.from(inventory.findAll(spec, PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")))).map(this::response));
    }

    public PageResponse<InventoryTransactionResponse> productHistory(Long productId, int page, int size) {
        if (!products.existsById(productId)) throw new ResourceNotFoundException("Product", productId);
        return list(productId, null, null, page, size);
    }

    private InventoryTransactionResponse response(InventoryTransaction t) {
        return new InventoryTransactionResponse(t.getId(), t.getProduct().getId(), t.getProduct().getSku(),
                t.getProduct().getName(), t.getType(), t.getQuantity(), t.getBalanceBefore(), t.getBalanceAfter(),
                t.getReferenceType(), t.getReferenceId(), t.getCreatedAt());
    }
}
