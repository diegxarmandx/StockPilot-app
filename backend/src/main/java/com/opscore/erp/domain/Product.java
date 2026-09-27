package com.opscore.erp.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.ColumnDefault;

@Getter
@Setter
@Entity
@Table(name = "products", uniqueConstraints = @UniqueConstraint(name = "uk_products_sku", columnNames = "sku"))
@Check(constraints = "unit_cost >= 0 AND quantity_on_hand >= 0 AND reorder_point >= 0 AND length(trim(sku)) > 0 AND length(trim(name)) > 0")
public class Product extends TimestampedEntity {
    @Column(nullable = false, length = 64)
    private String sku;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(length = 4000)
    private String description;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal unitCost;
    @Column(nullable = false)
    @ColumnDefault("0")
    private Integer quantityOnHand = 0;
    @Column(nullable = false)
    @ColumnDefault("0")
    private Integer reorderPoint = 0;
    @Column(nullable = false)
    @ColumnDefault("true")
    private Boolean active = true;
}
