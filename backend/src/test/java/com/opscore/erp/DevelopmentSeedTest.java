package com.opscore.erp;

import com.opscore.erp.config.DevelopmentSeed;
import com.opscore.erp.repository.ProductRepository;
import com.opscore.erp.repository.VendorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import com.opscore.erp.dto.*;
import com.opscore.erp.service.*;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

// Always isolated in H2, including when the catalog suite uses the PostgreSQL profile.
@SpringBootTest(properties = {
        "spring.profiles.active=test,dev",
        "spring.datasource.url=jdbc:h2:mem:stockpilot_seed;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=true"
})
class DevelopmentSeedTest {
    @Autowired DevelopmentSeed seed;
    @Autowired ProductRepository products;
    @Autowired VendorRepository vendors;

    @Autowired ProductService productService;
    @Autowired VendorService vendorService;

    @BeforeEach
    void resetIsolatedH2Catalog() {
        products.deleteAll();
        vendors.deleteAll();
        seed.run();
    }

    @Test
    void repeatedSeedingPreservesExistingEditsAndDoesNotDuplicateRecords() {
        assertThat(products.count()).isEqualTo(3);
        assertThat(vendors.count()).isEqualTo(2);
        var product = products.findAll().getFirst();
        product.setName("Edited product");
        product.setQuantityOnHand(42);
        product.setActive(false);
        products.saveAndFlush(product);
        var vendor = vendors.findAll().getFirst();
        vendor.setPhone("787-555-0199");
        vendor.setActive(false);
        vendors.saveAndFlush(vendor);

        seed.run();
        seed.run();

        assertThat(products.count()).isEqualTo(3);
        assertThat(vendors.count()).isEqualTo(2);
        var savedProduct = products.findById(product.getId()).orElseThrow();
        assertThat(savedProduct.getName()).isEqualTo("Edited product");
        assertThat(savedProduct.getQuantityOnHand()).isEqualTo(42);
        assertThat(savedProduct.getActive()).isFalse();
        var savedVendor = vendors.findById(vendor.getId()).orElseThrow();
        assertThat(savedVendor.getPhone()).isEqualTo("787-555-0199");
        assertThat(savedVendor.getActive()).isFalse();
    }

    @Test
    void fillsMissingSeedsInPartiallyPopulatedCatalogs() {
        products.findAll().stream().filter(p -> p.getSku().equals("SKU-002")).forEach(products::delete);
        vendors.findAll().stream().filter(v -> v.getName().equals("PR Distribution Group")).forEach(vendors::delete);
        productService.createProduct(new CreateProductRequest("UNRELATED", "Existing product", null,
                new BigDecimal("9.99"), 5, 1, true));
        vendorService.createVendor(new CreateVendorRequest("Existing vendor", null, null, true));

        seed.run();
        seed.run();

        assertThat(products.count()).isEqualTo(4);
        assertThat(vendors.count()).isEqualTo(3);
        var restored = products.findAll().stream().filter(p -> p.getSku().equals("SKU-002")).findFirst().orElseThrow();
        assertThat(restored.getQuantityOnHand()).isEqualTo(8);
        assertThat(restored.getReorderPoint()).isEqualTo(10);
        assertThat(restored.getUnitCost()).isEqualByComparingTo("3.25");
        assertThat(vendors.existsByNormalizedName("PR Distribution Group")).isTrue();
    }

    @Test
    void vendorSeedMatchesNameRegardlessOfCaseWhitespaceAndActiveFlag() {
        var vendor = vendors.findAll().stream().filter(v -> v.getName().equals("Caribbean Supply Co.")).findFirst().orElseThrow();
        vendor.setName("  CARIBBEAN SUPPLY CO.  ");
        vendor.setActive(false);
        vendors.saveAndFlush(vendor);

        seed.run();
        seed.run();

        assertThat(vendors.count()).isEqualTo(2);
        assertThat(vendors.findById(vendor.getId()).orElseThrow().getName()).isEqualTo("  CARIBBEAN SUPPLY CO.  ");
        assertThat(vendors.findById(vendor.getId()).orElseThrow().getActive()).isFalse();
    }
}
