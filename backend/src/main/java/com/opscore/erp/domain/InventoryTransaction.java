package com.opscore.erp.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.Immutable;

@Entity @Getter @Immutable @NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "inventory_transactions", uniqueConstraints = @UniqueConstraint(name = "uk_inventory_receipt",
       columnNames = {"reference_type", "reference_id", "product_id"}), indexes = {
       @Index(name = "idx_inventory_product_created", columnList = "product_id,created_at,id"),
       @Index(name = "idx_inventory_created", columnList = "created_at,id"),
       @Index(name = "idx_inventory_reference", columnList = "reference_id")})
@Check(constraints = "quantity > 0 and balance_before >= 0 and balance_after >= 0 "
        + "and balance_after - balance_before = quantity and reference_type = 'PURCHASE_ORDER' "
        + "and length(trim(reference_id)) > 0")
public class InventoryTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, updatable = false)
    private Product product;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32, updatable = false)
    private InventoryTransactionType type;
    @Column(nullable = false, updatable = false)
    private Integer quantity;
    @Column(nullable = false, updatable = false)
    private Integer balanceBefore;
    @Column(nullable = false, updatable = false)
    private Integer balanceAfter;
    @Column(nullable = false, length = 32, updatable = false)
    private String referenceType;
    @Column(nullable = false, length = 40, updatable = false)
    private String referenceId;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public static InventoryTransaction purchaseReceipt(Product product, int quantity, int before, int after, String poNumber) {
        var entry = new InventoryTransaction();
        entry.product = product;
        entry.type = InventoryTransactionType.PURCHASE_RECEIPT;
        entry.quantity = quantity;
        entry.balanceBefore = before;
        entry.balanceAfter = after;
        entry.referenceType = "PURCHASE_ORDER";
        entry.referenceId = poNumber;
        entry.createdAt = Instant.now();
        return entry;
    }
}
