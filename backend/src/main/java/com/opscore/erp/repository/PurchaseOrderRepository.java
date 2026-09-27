package com.opscore.erp.repository;
import com.opscore.erp.domain.PurchaseOrder;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>, JpaSpecificationExecutor<PurchaseOrder> {
    @Override @EntityGraph(attributePaths = {"vendor", "items", "items.product"})
    Optional<PurchaseOrder> findById(Long id);
    @Override @EntityGraph(attributePaths = "vendor")
    Page<PurchaseOrder> findAll(Specification<PurchaseOrder> spec, Pageable pageable);
    // Lock only the parent row; all mutation paths take this same lock.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PurchaseOrder p where p.id = :id")
    Optional<PurchaseOrder> findForUpdate(@Param("id") Long id);
}
