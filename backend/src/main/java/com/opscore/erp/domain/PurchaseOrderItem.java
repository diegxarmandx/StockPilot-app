package com.opscore.erp.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Check;

@Getter @Setter @Entity
@Table(name = "purchase_order_items", uniqueConstraints = @UniqueConstraint(name = "uk_po_item_product", columnNames = {"purchase_order_id", "product_id"}),
       indexes = @Index(name = "idx_po_item_product", columnList = "product_id"))
@Check(constraints = "quantity > 0 and unit_cost >= 0 and line_total = quantity * unit_cost")
public class PurchaseOrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    @Column(nullable = false)
    private Integer quantity;
    @Column(nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal unitCost;
    @Column(nullable = false, precision = 24, scale = 2)
    private BigDecimal lineTotal;
}
