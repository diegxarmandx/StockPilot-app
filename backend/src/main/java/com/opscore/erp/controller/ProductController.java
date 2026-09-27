package com.opscore.erp.controller;

import com.opscore.erp.dto.*;
import com.opscore.erp.service.ProductService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Validated
public class ProductController {
    private final ProductService service;

    @GetMapping
    public PageResponse<ProductResponse> list(
            @RequestParam(required = false) @Size(max = 200) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.listProducts(search, active, page, size);
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody CreateProductRequest request) {
        var response = service.createProduct(request);
        return ResponseEntity.created(URI.create("/api/products/" + response.id())).body(response);
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable @Positive Long id) {
        return service.getProduct(id);
    }

    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable @Positive Long id, @Valid @RequestBody UpdateProductRequest request) {
        return service.updateProduct(id, request);
    }

    @PatchMapping("/{id}/deactivate")
    public ProductResponse deactivate(@PathVariable @Positive Long id) {
        return service.deactivateProduct(id);
    }
}
