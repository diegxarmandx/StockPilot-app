package com.opscore.erp.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
        Long id, String sku, String name, String description,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal unitCost,
        Integer quantityOnHand, Integer reorderPoint, Boolean active,
        Instant createdAt, Instant updatedAt, StockStatus stockStatus) {}
