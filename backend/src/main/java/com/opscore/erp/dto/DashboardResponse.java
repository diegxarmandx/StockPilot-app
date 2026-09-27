package com.opscore.erp.dto;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.util.List;
public record DashboardResponse(long products, long openPurchaseOrders,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal inventoryValue,
        long lowStockItems, List<InventoryTransactionResponse> recentInventoryActivity) {}
