package com.opscore.erp.dto;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.opscore.erp.domain.PurchaseOrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
public record PurchaseOrderResponse(Long id, String poNumber, PurchaseOrderStatus status,
        PurchaseOrderVendorResponse vendor, List<PurchaseOrderItemResponse> items,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal subtotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal total,
        Instant createdAt, Instant updatedAt, Instant orderedAt, Instant receivedAt) {}
