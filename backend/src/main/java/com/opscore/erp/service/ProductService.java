package com.opscore.erp.service;

import com.opscore.erp.domain.Product;
import com.opscore.erp.dto.*;
import com.opscore.erp.exception.*;
import com.opscore.erp.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {
    private final ProductRepository repository;

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        if (repository.existsBySku(request.sku())) throw new DuplicateSkuException(request.sku());
        Product product = new Product();
        product.setSku(request.sku());
        product.setName(request.name());
        product.setDescription(request.description());
        product.setUnitCost(request.unitCost());
        product.setQuantityOnHand(request.quantityOnHand());
        product.setReorderPoint(request.reorderPoint());
        product.setActive(request.active());
        return response(save(product));
    }

    public ProductResponse getProduct(Long id) {
        return response(find(id));
    }

    public PageResponse<ProductResponse> listProducts(String search, Boolean active, int page, int size) {
        return PageResponse.from(repository.findAll(CatalogSearch.matching(search, active, "sku", "name"),
                PageRequest.of(page, size, Sort.by("id").descending())).map(this::response));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, UpdateProductRequest request) {
        Product product = repository.findForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        if (repository.existsBySkuAndIdNot(request.sku(), id)) throw new DuplicateSkuException(request.sku());
        product.setSku(request.sku());
        product.setName(request.name());
        product.setDescription(request.description());
        product.setUnitCost(request.unitCost());
        product.setReorderPoint(request.reorderPoint());
        product.setActive(request.active());
        return response(save(product));
    }

    @Transactional
    public ProductResponse deactivateProduct(Long id) {
        Product product = repository.findForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        product.setActive(false);
        return response(save(product));
    }

    private Product find(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    private Product save(Product product) {
        try {
            // Flush here so concurrent SKU conflicts are translated before the transaction returns.
            return repository.saveAndFlush(product);
        } catch (DataIntegrityViolationException ex) {
            for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
                if (cause instanceof org.hibernate.exception.ConstraintViolationException constraint
                        && constraint.getConstraintName() != null
                        && constraint.getConstraintName().toLowerCase(java.util.Locale.ROOT).contains("uk_products_sku")) {
                    throw new DuplicateSkuException(product.getSku());
                }
            }
            throw ex;
        }
    }

    private ProductResponse response(Product product) {
        return new ProductResponse(product.getId(), product.getSku(), product.getName(), product.getDescription(),
                product.getUnitCost(), product.getQuantityOnHand(), product.getReorderPoint(), product.getActive(),
                product.getCreatedAt(), product.getUpdatedAt(), stockStatus(product));
    }

    private StockStatus stockStatus(Product product) {
        if (!product.getActive()) return StockStatus.INACTIVE;
        if (product.getQuantityOnHand() == 0) return StockStatus.OUT_OF_STOCK;
        if (product.getQuantityOnHand() <= product.getReorderPoint()) return StockStatus.LOW_STOCK;
        return StockStatus.IN_STOCK;
    }
}
