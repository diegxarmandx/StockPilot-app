package com.opscore.erp.config;

import com.opscore.erp.dto.*;
import com.opscore.erp.repository.*;
import com.opscore.erp.service.*;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("dev")
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DevelopmentSeed implements CommandLineRunner {
    private final ProductRepository products;
    private final VendorRepository vendors;
    private final ProductService productService;
    private final VendorService vendorService;

    @Override
    @Transactional
    public void run(String... args) {
        // Seed each missing business key; preserve all existing values, including inactive records.
        seedProduct(new CreateProductRequest("SKU-001", "Safety Gloves", "Protective work gloves", new BigDecimal("12.50"), 120, 20, true));
        seedProduct(new CreateProductRequest("SKU-002", "Packaging Box", "Standard shipping carton", new BigDecimal("3.25"), 8, 10, true));
        seedProduct(new CreateProductRequest("SKU-003", "Shipping Tape", "Clear packing tape", new BigDecimal("4.75"), 0, 5, true));
        seedVendor(new CreateVendorRequest("Caribbean Supply Co.", null, null, true));
        seedVendor(new CreateVendorRequest("PR Distribution Group", null, null, true));
    }

    private void seedProduct(CreateProductRequest request) {
        if (!products.existsBySku(request.sku())) {
            productService.createProduct(request);
        }
    }

    private void seedVendor(CreateVendorRequest request) {
        if (!vendors.existsByNormalizedName(request.name())) {
            vendorService.createVendor(request);
        }
    }
}
