package com.opscore.erp.dto;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.opscore.erp.domain.PurchaseOrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
public record PurchaseOrderSummary(Long id, String poNumber, PurchaseOrderStatus status,
        PurchaseOrderVendorResponse vendor, int itemCount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal subtotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal total,
        Instant createdAt, Instant updatedAt, Instant orderedAt, Instant receivedAt) {}
