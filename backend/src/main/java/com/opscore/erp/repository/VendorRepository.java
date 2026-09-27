package com.opscore.erp.repository;

import com.opscore.erp.domain.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface VendorRepository extends JpaRepository<Vendor, Long>, JpaSpecificationExecutor<Vendor> {
    @Query("select (count(v) > 0) from Vendor v where lower(trim(v.name)) = lower(trim(:name))")
    boolean existsByNormalizedName(@Param("name") String name);
}
