package com.opscore.erp.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.ColumnDefault;

@Getter
@Setter
@Entity
@Table(name = "vendors")
@Check(constraints = "length(trim(name)) > 0")
public class Vendor extends TimestampedEntity {
    @Column(nullable = false, length = 160)
    private String name;
    @Column(length = 254)
    private String email;
    @Column(length = 40)
    private String phone;
    @Column(nullable = false)
    @ColumnDefault("true")
    private Boolean active = true;
}
