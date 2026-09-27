package com.opscore.erp.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Check;

@Getter @Setter @Entity
@Table(name = "purchase_orders", uniqueConstraints = @UniqueConstraint(name = "uk_purchase_orders_number", columnNames = "po_number"),
       indexes = {@Index(name = "idx_po_vendor", columnList = "vendor_id"), @Index(name = "idx_po_status", columnList = "status")})
@Check(constraints = "subtotal >= 0 and total = subtotal")
public class PurchaseOrder extends TimestampedEntity {
    @Column(nullable = false, length = 40, updatable = false)
    private String poNumber;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private PurchaseOrderStatus status = PurchaseOrderStatus.DRAFT;
    @Column(nullable = false, precision = 24, scale = 2)
    private BigDecimal subtotal;
    @Column(nullable = false, precision = 24, scale = 2)
    private BigDecimal total;
    private Instant orderedAt;
    private Instant receivedAt;
    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC") @BatchSize(size = 100)
    private List<PurchaseOrderItem> items = new ArrayList<>();
}
