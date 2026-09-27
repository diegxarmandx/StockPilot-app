package com.opscore.erp.dto;
import jakarta.validation.constraints.*;
public record PurchaseOrderItemRequest(
        @NotNull @Positive Long productId,
        @NotNull @Positive(message = "Quantity must be greater than zero") Integer quantity) {}
