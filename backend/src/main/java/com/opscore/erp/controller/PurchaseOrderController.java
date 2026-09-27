package com.opscore.erp.controller;
import com.opscore.erp.domain.PurchaseOrderStatus;
import com.opscore.erp.dto.*;
import com.opscore.erp.service.PurchaseOrderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/purchase-orders") @RequiredArgsConstructor @Validated
public class PurchaseOrderController {
    private final PurchaseOrderService service;
    @GetMapping
    public PageResponse<PurchaseOrderSummary> list(@RequestParam(required = false) @Size(max = 200) String search,
            @RequestParam(required = false) PurchaseOrderStatus status,
            @RequestParam(required = false) @Positive Long vendorId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.listPurchaseOrders(search, status, vendorId, page, size);
    }
    @PostMapping
    public ResponseEntity<PurchaseOrderResponse> create(@Valid @RequestBody CreatePurchaseOrderRequest request) {
        var result = service.createPurchaseOrder(request);
        return ResponseEntity.created(URI.create("/api/purchase-orders/" + result.id())).body(result);
    }
    @GetMapping("/{id}")
    public PurchaseOrderResponse get(@PathVariable @Positive Long id) { return service.getPurchaseOrder(id); }
    @PutMapping("/{id}")
    public PurchaseOrderResponse update(@PathVariable @Positive Long id, @Valid @RequestBody UpdatePurchaseOrderRequest request) {
        return service.updatePurchaseOrder(id, request);
    }
    @PostMapping("/{id}/order")
    public PurchaseOrderResponse order(@PathVariable @Positive Long id) { return service.markOrdered(id); }
    @PostMapping("/{id}/cancel")
    public PurchaseOrderResponse cancel(@PathVariable @Positive Long id) { return service.cancelPurchaseOrder(id); }
    @PostMapping("/{id}/receive")
    public PurchaseOrderResponse receive(@PathVariable @Positive Long id) { return service.receivePurchaseOrder(id); }
}
