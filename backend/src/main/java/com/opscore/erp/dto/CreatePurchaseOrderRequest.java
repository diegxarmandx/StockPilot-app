package com.opscore.erp.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record CreatePurchaseOrderRequest(
        @NotNull @Positive Long vendorId,
        @NotEmpty @Size(max = 100, message = "A purchase order can contain at most 100 items")
        List<@NotNull @Valid PurchaseOrderItemRequest> items) {}
