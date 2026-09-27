package com.opscore.erp.repository;

import com.opscore.erp.domain.InventoryTransaction;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;

// Deliberately expose no update/delete repository methods for historical entries.
public interface InventoryTransactionRepository extends Repository<InventoryTransaction, Long> {
    <S extends InventoryTransaction> S saveAndFlush(S entity);
    @EntityGraph(attributePaths = "product")
    Page<InventoryTransaction> findAll(Specification<InventoryTransaction> specification, Pageable pageable);
}
