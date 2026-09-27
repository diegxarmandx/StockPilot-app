package com.opscore.erp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opscore.erp.repository.ProductRepository;
import com.opscore.erp.repository.VendorRepository;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.profiles.active=${test.profile:test}")
@AutoConfigureMockMvc
class CatalogApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ProductRepository products;
    @Autowired VendorRepository vendors;
    @Autowired JdbcTemplate jdbc;
    @Autowired com.opscore.erp.repository.PurchaseOrderRepository orders;

    @BeforeEach
    void cleanDatabase() {
        jdbc.update("delete from inventory_transactions");
        orders.deleteAll();
        products.deleteAll();
        vendors.deleteAll();
    }

    @Test
    void healthIsUp() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(content().json("{\"status\":\"UP\"}"));
    }

    @Test
    void createsProductWithTrimmedValuesDefaultsAndExactMoney() throws Exception {
        mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sku\":\"  TEST-1  \",\"name\":\"  Gloves  \",\"unitCost\":\"12.50\"}"))
                .andExpect(status().isCreated()).andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.sku").value("TEST-1"))
                .andExpect(jsonPath("$.name").value("Gloves"))
                .andExpect(jsonPath("$.unitCost").value("12.50"))
                .andExpect(jsonPath("$.quantityOnHand").value(0))
                .andExpect(jsonPath("$.reorderPoint").value(0))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.stockStatus").value("OUT_OF_STOCK"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());
    }

    @Test
    void rejectsInvalidProductWithFieldErrors() throws Exception {
        mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON).content("""
                {"sku":" ","name":" ","unitCost":"-1","quantityOnHand":-1,"reorderPoint":-1}
                """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.sku").exists()).andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.unitCost").exists()).andExpect(jsonPath("$.errors.quantityOnHand").exists())
                .andExpect(jsonPath("$.errors.reorderPoint").exists());
    }

    @Test
    void rejectsMissingOrOverpreciseCost() throws Exception {
        for (String cost : List.of("null", "\"1.234\"", "\"10000000000.00\"")) {
            mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"sku\":\"TEST\",\"name\":\"Gloves\",\"unitCost\":" + cost + "}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.unitCost").exists());
        }
    }

    @Test
    void rejectsFractionalStockAndUnknownFields() throws Exception {
        mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sku\":\"TEST\",\"name\":\"Gloves\",\"unitCost\":1,\"quantityOnHand\":1.2}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sku\":\"TEST\",\"name\":\"Gloves\",\"unitCost\":1,\"stockStatus\":\"IN_STOCK\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateSkuIsConflictEvenIfExistingProductIsInactive() throws Exception {
        long id = product("DUP", "Gloves", 3, 1, true).get("id").asLong();
        mvc.perform(patch("/api/products/" + id + "/deactivate")).andExpect(status().isOk());
        mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                .content(productBody(" DUP ", "Different name", 5, 2, true)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_SKU"));
    }

    @Test
    void concurrentDuplicateCreatesReturnOneConflict() throws Exception {
        Callable<Integer> create = () -> mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                .content(productBody("RACE", "Gloves", 1, 0, true))).andReturn().getResponse().getStatus();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var results = executor.invokeAll(List.of(create, create));
            assertThat(List.of(results.get(0).get(), results.get(1).get())).containsExactlyInAnyOrder(201, 409);
        }
        assertThat(products.count()).isEqualTo(1);
    }

    @Test
    void fetchesUpdatesAndSoftDeactivatesProduct() throws Exception {
        JsonNode created = product("LIFE", "Gloves", 100, 10, true);
        long id = created.get("id").asLong();
        mvc.perform(get("/api/products/" + id)).andExpect(status().isOk()).andExpect(jsonPath("$.sku").value("LIFE"));
        mvc.perform(put("/api/products/" + id).contentType(MediaType.APPLICATION_JSON)
                .content(productUpdateBody("LIFE-EDIT", "Updated gloves", 100, true)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated gloves"))
                .andExpect(jsonPath("$.stockStatus").value("LOW_STOCK"))
                .andExpect(jsonPath("$.createdAt").value(created.get("createdAt").asText()));
        mvc.perform(patch("/api/products/" + id + "/deactivate")).andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false)).andExpect(jsonPath("$.stockStatus").value("INACTIVE"));
        mvc.perform(patch("/api/products/" + id + "/deactivate")).andExpect(status().isOk());
        assertThat(products.findById(id).orElseThrow().getActive()).isFalse();
    }

    @Test
    void updateCannotStealAnotherSkuOrOmitRequiredFields() throws Exception {
        product("FIRST", "First", 0, 0, true);
        long second = product("SECOND", "Second", 0, 0, true).get("id").asLong();
        mvc.perform(put("/api/products/" + second).contentType(MediaType.APPLICATION_JSON)
                .content(productUpdateBody("FIRST", "Second", 0, true)))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/products/" + second).contentType(MediaType.APPLICATION_JSON)
                .content("{\"sku\":\"SECOND\",\"name\":\"Second\",\"unitCost\":\"1\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.active").exists());
        assertThat(products.findById(second).orElseThrow().getSku()).isEqualTo("SECOND");
    }

    @ParameterizedTest
    @CsvSource({"true,0,0,OUT_OF_STOCK", "true,1,5,LOW_STOCK", "true,5,5,LOW_STOCK",
            "true,6,5,IN_STOCK", "false,0,5,INACTIVE", "false,6,5,INACTIVE"})
    void calculatesCanonicalStockStatus(boolean active, int stock, int reorder, String expected) throws Exception {
        assertThat(product("STATUS", "Status", stock, reorder, active).get("stockStatus").asText()).isEqualTo(expected);
    }

    @Test
    void productSearchFiltersAndPaginationWorkTogether() throws Exception {
        product("GLOVE-1", "Safety wear", 12, 2, true);
        product("GLOVE-2", "Cotton gloves", 3, 2, true);
        product("GLOVE-3", "Inactive gloves", 0, 2, false);
        product("BOX", "Carton", 10, 2, true);
        mvc.perform(get("/api/products").param("search", " GlOvE ").param("active", "true").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.first").value(true)).andExpect(jsonPath("$.last").value(false));
        mvc.perform(get("/api/products").param("search", "glove").param("active", "true").param("size", "1").param("page", "1"))
                .andExpect(jsonPath("$.content[0].sku").value("GLOVE-1")).andExpect(jsonPath("$.last").value(true));
        mvc.perform(get("/api/products").param("active", "false"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/products").param("page", "50"))
                .andExpect(jsonPath("$.content").isEmpty());
    }

    @Test
    void searchTreatsWildcardsLiterally() throws Exception {
        product("PCT", "100% cotton", 1, 0, true);
        product("OTHER", "Cotton", 1, 0, true);
        mvc.perform(get("/api/products").param("search", "%"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void databaseEnforcesSkuUniquenessAndNonnegativeStock() throws Exception {
        long first = product("DB-1", "First", 1, 0, true).get("id").asLong();
        long second = product("DB-2", "Second", 1, 0, true).get("id").asLong();
        assertThatThrownBy(() -> jdbc.update("update products set sku = 'DB-1' where id = ?", second))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("update products set quantity_on_hand = -1 where id = ?", first))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void createsVendorTrimsValuesAndDefaultsActive() throws Exception {
        mvc.perform(post("/api/vendors").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\" Caribbean Supply Co. \",\"email\":\" sales@example.com \",\"phone\":\" 787-555-0101 \"}"))
                .andExpect(status().isCreated()).andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.name").value("Caribbean Supply Co."))
                .andExpect(jsonPath("$.email").value("sales@example.com"))
                .andExpect(jsonPath("$.phone").value("787-555-0101"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void rejectsInvalidVendorEmailAndBlankName() throws Exception {
        mvc.perform(post("/api/vendors").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\" \",\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.name").exists());
    }

    @Test
    void optionalVendorContactFieldsCanBeBlank() throws Exception {
        mvc.perform(post("/api/vendors").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Vendor\",\"email\":\" \",\"phone\":\" \"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.email").isEmpty()).andExpect(jsonPath("$.phone").isEmpty());
    }

    @Test
    void fetchesUpdatesAndSoftDeactivatesVendor() throws Exception {
        long id = vendor("Supply Co.", "sales@example.com", true).get("id").asLong();
        mvc.perform(get("/api/vendors/" + id)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Supply Co."));
        mvc.perform(put("/api/vendors/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Updated Supply\",\"email\":\"new@example.com\",\"phone\":\"787-555-0102\",\"active\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated Supply"))
                .andExpect(jsonPath("$.email").value("new@example.com"));
        mvc.perform(patch("/api/vendors/" + id + "/deactivate")).andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        mvc.perform(patch("/api/vendors/" + id + "/deactivate")).andExpect(status().isOk());
        assertThat(vendors.findById(id).orElseThrow().getActive()).isFalse();
    }

    @Test
    void vendorUpdateValidatesEmailAndRequiredFields() throws Exception {
        long id = vendor("Vendor", "sales@example.com", true).get("id").asLong();
        mvc.perform(put("/api/vendors/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Vendor\",\"email\":\"invalid\",\"active\":true}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.email").exists());
        mvc.perform(put("/api/vendors/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Vendor\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.active").exists());
    }

    @Test
    void searchesVendorsByNameAndEmailWithFilterAndPagination() throws Exception {
        vendor("Caribbean Supply", "hello@example.com", true);
        vendor("Distribution", "caribbean@example.com", true);
        vendor("Caribbean Inactive", "closed@example.com", false);
        mvc.perform(get("/api/vendors").param("search", "CARIBBEAN").param("active", "true").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2)).andExpect(jsonPath("$.content.length()").value(1));
        mvc.perform(get("/api/vendors").param("search", "caribbean").param("active", "true").param("size", "1").param("page", "1"))
                .andExpect(jsonPath("$.last").value(true)).andExpect(jsonPath("$.content[0].name").value("Caribbean Supply"));
        mvc.perform(get("/api/vendors").param("active", "false"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void missingResourcesReturnConsistent404() throws Exception {
        for (String resource : List.of("products", "vendors")) {
            String code = resource.equals("products") ? "PRODUCT_NOT_FOUND" : "VENDOR_NOT_FOUND";
            mvc.perform(get("/api/" + resource + "/999999"))
                    .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value(code))
                    .andExpect(jsonPath("$.timestamp").exists());
            mvc.perform(patch("/api/" + resource + "/999999/deactivate")).andExpect(status().isNotFound());
        }
    }

    @Test
    void invalidPaginationAndTypesReturnReadable400() throws Exception {
        for (String resource : List.of("products", "vendors")) {
            for (Map.Entry<String, String> parameter : Map.of("page", "-1", "size", "101", "active", "maybe").entrySet()) {
                mvc.perform(get("/api/" + resource).param(parameter.getKey(), parameter.getValue()))
                        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").exists());
            }
            mvc.perform(get("/api/" + resource).param("size", "0")).andExpect(status().isBadRequest());
        }
    }

    @Test
    void supportsLocalCorsAndDoesNotExposeDelete() throws Exception {
        mvc.perform(options("/api/products").header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST").header("Access-Control-Request-Headers", "Content-Type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(delete("/api/products/1")).andExpect(status().isMethodNotAllowed());
        mvc.perform(delete("/api/vendors/1")).andExpect(status().isMethodNotAllowed());
    }

    private JsonNode product(String sku, String name, int stock, int reorder, boolean active) throws Exception {
        String response = mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                .content(productBody(sku, name, stock, reorder, active)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(response);
    }

    private String productBody(String sku, String name, int stock, int reorder, boolean active) throws Exception {
        return mapper.writeValueAsString(Map.of("sku", sku, "name", name, "unitCost", "12.50",
                "quantityOnHand", stock, "reorderPoint", reorder, "active", active));
    }

    private String productUpdateBody(String sku, String name, int reorder, boolean active) throws Exception {
        return mapper.writeValueAsString(Map.of("sku", sku, "name", name, "unitCost", "12.50",
                "reorderPoint", reorder, "active", active));
    }

    private JsonNode vendor(String name, String email, boolean active) throws Exception {
        String response = mvc.perform(post("/api/vendors").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("name", name, "email", email, "active", active))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(response);
    }
}
