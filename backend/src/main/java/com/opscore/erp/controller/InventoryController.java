package com.opscore.erp.controller;
import com.opscore.erp.domain.InventoryTransactionType;
import com.opscore.erp.dto.*;
import com.opscore.erp.service.InventoryService;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor @Validated @RequestMapping("/api")
public class InventoryController {
    private final InventoryService service;
    @GetMapping("/inventory-transactions")
    public PageResponse<InventoryTransactionResponse> list(
            @RequestParam(required = false) @Positive Long productId,
            @RequestParam(required = false) InventoryTransactionType type,
            @RequestParam(required = false) @Size(max = 40) String referenceId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.list(productId, type, referenceId, page, size);
    }
    @GetMapping("/products/{productId}/inventory-transactions")
    public PageResponse<InventoryTransactionResponse> history(@PathVariable @Positive Long productId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.productHistory(productId, page, size);
    }
}
