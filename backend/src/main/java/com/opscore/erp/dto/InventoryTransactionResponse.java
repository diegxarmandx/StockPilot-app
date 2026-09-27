package com.opscore.erp.dto;
import com.opscore.erp.domain.InventoryTransactionType;
import java.time.Instant;
public record InventoryTransactionResponse(Long id, Long productId, String sku, String productName,
        InventoryTransactionType type, Integer quantity, Integer balanceBefore, Integer balanceAfter,
        String referenceType, String referenceId, Instant createdAt) {}
