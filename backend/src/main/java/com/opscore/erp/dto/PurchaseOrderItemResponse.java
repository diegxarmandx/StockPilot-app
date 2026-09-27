package com.opscore.erp.dto;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
public record PurchaseOrderItemResponse(Long id, Long productId, String sku, String productName,
        boolean productActive, Integer quantity,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal unitCost,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal lineTotal) {}
