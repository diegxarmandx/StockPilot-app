package com.opscore.erp.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record UpdateProductRequest(
        @NotBlank(message = "SKU is required") @Size(max = 64) String sku,
        @NotBlank(message = "Name is required") @Size(max = 160) String name,
        @Size(max = 4000) String description,
        @NotNull(message = "Unit cost is required")
        @DecimalMin(value = "0", message = "Unit cost must be zero or greater")
        @Digits(integer = 10, fraction = 2) BigDecimal unitCost,
        @NotNull @Min(0) Integer reorderPoint,
        @NotNull Boolean active) {
    public UpdateProductRequest {
        sku = TextValues.trim(sku);
        name = TextValues.trim(name);
        description = TextValues.optional(description);
    }
}
