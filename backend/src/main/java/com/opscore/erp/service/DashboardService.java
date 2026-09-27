package com.opscore.erp.service;
import com.opscore.erp.dto.DashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class DashboardService {
    private final JdbcTemplate jdbc;
    private final InventoryService inventory;

    public DashboardResponse getDashboard() {
        // A single SQL statement gives the four aggregates a consistent database snapshot.
        var totals = jdbc.queryForObject("""
                select (select count(*) from products) as products,
                  (select count(*) from purchase_orders where status in ('DRAFT','ORDERED')) as open_orders,
                  coalesce((select sum(quantity_on_hand * unit_cost) from products), 0) as inventory_value,
                  (select count(*) from products where active = true and quantity_on_hand <= reorder_point) as low_stock
                """, (rs, row) -> new DashboardResponse(rs.getLong("products"), rs.getLong("open_orders"),
                    rs.getBigDecimal("inventory_value").setScale(2), rs.getLong("low_stock"), java.util.List.of()));
        return new DashboardResponse(totals.products(), totals.openPurchaseOrders(), totals.inventoryValue(),
                totals.lowStockItems(), inventory.list(null, null, null, 0, 5).content());
    }
}
