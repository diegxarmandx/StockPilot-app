package com.opscore.erp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opscore.erp.domain.*;
import com.opscore.erp.repository.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.profiles.active=${test.profile:test}")
@AutoConfigureMockMvc
class PurchaseOrderApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired PurchaseOrderRepository orders;
    @Autowired ProductRepository products;
    @Autowired VendorRepository vendors;
    @Autowired JdbcTemplate jdbc;
    Product gloves, tape;
    Vendor vendor;

    @BeforeEach void setup() {
        jdbc.update("delete from inventory_transactions");
        orders.deleteAll(); products.deleteAll(); vendors.deleteAll();
        vendor = new Vendor(); vendor.setName("Caribbean Supply"); vendor = vendors.saveAndFlush(vendor);
        gloves = product("GLOVE", "Gloves", "12.50");
        tape = product("TAPE", "Tape", "0.10");
    }
    private Product product(String sku, String name, String price) {
        Product p = new Product(); p.setSku(sku); p.setName(name); p.setUnitCost(new BigDecimal(price));
        p.setQuantityOnHand(120); return products.saveAndFlush(p);
    }
    private Map<String,Object> input(int quantity) {
        return Map.of("vendorId", vendor.getId(), "items", List.of(
                Map.of("productId", gloves.getId(), "quantity", quantity),
                Map.of("productId", tape.getId(), "quantity", 3)));
    }
    private String json(Object value) throws Exception { return mapper.writeValueAsString(value); }
    private JsonNode create() throws Exception {
        return mapper.readTree(mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(json(input(10))))
                .andExpect(status().isCreated()).andExpect(header().exists("Location")).andReturn().getResponse().getContentAsString());
    }
    @Test void createsDraftWithExactSnapshotsTotalsAndUniqueBusinessNumber() throws Exception {
        var first = create(); var second = create();
        assertThat(first.get("poNumber").asText()).matches("PO-\\d{4}-\\d{6,}").isNotEqualTo(second.get("poNumber").asText());
        assertThat(first.get("status").asText()).isEqualTo("DRAFT");
        assertThat(first.get("subtotal").asText()).isEqualTo("125.30");
        assertThat(first.get("total").asText()).isEqualTo("125.30");
        assertThat(first.get("items").get(0).get("unitCost").asText()).isEqualTo("12.50");
        assertThat(first.get("items").get(0).get("lineTotal").asText()).isEqualTo("125.00");
        assertThat(first.get("orderedAt").isNull()).isTrue();
        mvc.perform(get("/api/purchase-orders/" + first.get("id"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.vendor.name").value("Caribbean Supply"));
        assertThat(products.findById(gloves.getId()).orElseThrow().getQuantityOnHand()).isEqualTo(120);
    }
    @Test void rejectsInactiveVendor() throws Exception {
        vendor.setActive(false); vendors.saveAndFlush(vendor);
        mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(json(input(1))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VENDOR_INACTIVE"));
        assertThat(orders.count()).isZero();
    }
    @Test void rejectsInactiveProductAtomically() throws Exception {
        tape.setActive(false); products.saveAndFlush(tape);
        mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(json(input(1))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PRODUCT_INACTIVE"));
        assertThat(orders.count()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from purchase_order_items", Long.class)).isZero();
    }
    @ParameterizedTest @ValueSource(ints = {0, -1})
    void rejectsInvalidQuantity(int quantity) throws Exception {
        mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(json(input(quantity))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors['items[0].quantity']").exists());
    }
    @Test void rejectsDuplicateProducts() throws Exception {
        var item = Map.of("productId", gloves.getId(), "quantity", 1);
        mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("vendorId", vendor.getId(), "items", List.of(item, item)))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("DUPLICATE_PRODUCT"));
    }
    @Test void validatesRequiredFieldsAndMissingReferences() throws Exception {
        for (String body : List.of("{}", "{\"vendorId\":1,\"items\":[]}",
                "{\"vendorId\":1,\"items\":[null]}", "{\"vendorId\":1,\"items\":[{}]}")) {
            mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("vendorId", Long.MAX_VALUE, "items", input(1).get("items")))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("VENDOR_NOT_FOUND"));
        mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("vendorId", vendor.getId(), "items", List.of(Map.of("productId", Long.MAX_VALUE, "quantity", 1))))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        mvc.perform(get("/api/purchase-orders/" + Long.MAX_VALUE)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PURCHASE_ORDER_NOT_FOUND"));
    }
    @ParameterizedTest @ValueSource(strings = {"unitCost", "lineTotal", "subtotal", "total", "poNumber", "status"})
    void rejectsServerOwnedFields(String field) throws Exception {
        var body = new HashMap<>(input(1)); body.put(field, "0");
        mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isBadRequest());
    }
    @Test void rejectsItemPriceInjectionAndFractionalQuantity() throws Exception {
        for (String extra : List.of(",\"unitCost\":\"0\"", ",\"lineTotal\":\"0\"")) {
            String body = "{\"vendorId\":"+vendor.getId()+",\"items\":[{\"productId\":"+gloves.getId()+",\"quantity\":1"+extra+"}]}";
            mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON)
                .content(json(input(1)).replace("\"quantity\":1", "\"quantity\":1.5"))).andExpect(status().isBadRequest());
    }
    @Test void editsDraftPreservingExistingPriceAndSnapshotsNewItems() throws Exception {
        var first = create(); long id = first.get("id").asLong();
        gloves.setUnitCost(new BigDecimal("99.99")); products.saveAndFlush(gloves);
        var box = product("BOX", "Box", "3.25");
        var newVendor = new Vendor(); newVendor.setName("Second supplier"); newVendor = vendors.saveAndFlush(newVendor);
        var body = Map.of("vendorId", newVendor.getId(), "items", List.of(
                Map.of("productId", gloves.getId(), "quantity", 2), Map.of("productId", box.getId(), "quantity", 4)));
        mvc.perform(put("/api/purchase-orders/"+id).contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value("38.00"))
                .andExpect(jsonPath("$.items[0].unitCost").value("12.50"))
                .andExpect(jsonPath("$.items[0].id").value(first.get("items").get(0).get("id").asLong()))
                .andExpect(jsonPath("$.items[1].unitCost").value("3.25"))
                .andExpect(jsonPath("$.vendor.name").value("Second supplier"));
        assertThat(jdbc.queryForObject("select count(*) from purchase_order_items where purchase_order_id = ?", Long.class, id)).isEqualTo(2);
    }
    @Test void invalidEditRollsBackEveryLineAndTotals() throws Exception {
        var first = create(); tape.setActive(false); products.saveAndFlush(tape);
        mvc.perform(put("/api/purchase-orders/"+first.get("id")).contentType(MediaType.APPLICATION_JSON).content(json(input(50))))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/purchase-orders/"+first.get("id"))).andExpect(jsonPath("$.total").value("125.30"))
                .andExpect(jsonPath("$.items[0].quantity").value(10));
    }
    @Test void orderingSetsTimestampLocksEditsAndDoesNotChangeInventory() throws Exception {
        var id = create().get("id");
        mvc.perform(post("/api/purchase-orders/"+id+"/order")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ORDERED")).andExpect(jsonPath("$.orderedAt").isNotEmpty());
        mvc.perform(put("/api/purchase-orders/"+id).contentType(MediaType.APPLICATION_JSON).content(json(input(1))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PURCHASE_ORDER_NOT_EDITABLE"));
        for (String transition : List.of("order", "cancel"))
            mvc.perform(post("/api/purchase-orders/"+id+"/"+transition)).andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("INVALID_PURCHASE_ORDER_STATUS"));
        assertThat(products.findById(gloves.getId()).orElseThrow().getQuantityOnHand()).isEqualTo(120);
    }
    @Test void cancellationIsTerminal() throws Exception {
        var id = create().get("id");
        mvc.perform(post("/api/purchase-orders/"+id+"/cancel")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED")).andExpect(jsonPath("$.orderedAt").isEmpty());
        for (String transition : List.of("order", "cancel"))
            mvc.perform(post("/api/purchase-orders/"+id+"/"+transition)).andExpect(status().isConflict());
        mvc.perform(put("/api/purchase-orders/"+id).contentType(MediaType.APPLICATION_JSON).content(json(input(1))))
                .andExpect(status().isConflict());
    }
    @Test void paginatesFiltersAndSearchesLiteralText() throws Exception {
        var first = create(); create();
        mvc.perform(post("/api/purchase-orders/"+first.get("id")+"/order")).andExpect(status().isOk());
        mvc.perform(get("/api/purchase-orders").param("size","1").param("page","1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2)).andExpect(jsonPath("$.content[0].itemCount").value(2));
        mvc.perform(get("/api/purchase-orders").param("status","DRAFT").param("vendorId",vendor.getId().toString()).param("search","CARIBBEAN"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/purchase-orders").param("search",first.get("poNumber").asText())).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/purchase-orders").param("search","%_")).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/purchase-orders").param("vendorId", Long.toString(Long.MAX_VALUE))).andExpect(jsonPath("$.totalElements").value(0));
        for (String query : List.of("?size=101", "?page=-1", "?status=UNKNOWN", "?vendorId=0"))
            mvc.perform(get("/api/purchase-orders"+query)).andExpect(status().isBadRequest());
    }
    @Test void concurrentTransitionsHaveExactlyOneWinner() throws Exception {
        long id = create().get("id").asLong();
        var gate = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { gate.await(); return mvc.perform(post("/api/purchase-orders/"+id+"/order")).andReturn().getResponse().getStatus(); });
            var b = executor.submit(() -> { gate.await(); return mvc.perform(post("/api/purchase-orders/"+id+"/cancel")).andReturn().getResponse().getStatus(); });
            gate.countDown();
            assertThat(List.of(a.get(15, TimeUnit.SECONDS), b.get(15, TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
    }
    @Test void concurrentCreatesHaveUniqueNumbers() throws Exception {
        try (var executor = Executors.newFixedThreadPool(4)) {
            List<Callable<String>> tasks = new ArrayList<>();
            for (int i=0;i<4;i++) tasks.add(() -> create().get("poNumber").asText());
            Set<String> numbers = new HashSet<>();
            for (var future : executor.invokeAll(tasks)) numbers.add(future.get());
            assertThat(numbers).hasSize(4);
        }
    }
    @Test void databaseEnforcesLineQuantityAndBusinessNumberUniqueness() throws Exception {
        var first = create(); var second = create();
        assertThatThrownBy(() -> jdbc.update("update purchase_order_items set quantity = 0 where purchase_order_id = ?", first.get("id").asLong()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("update purchase_orders set po_number = ? where id = ?", first.get("poNumber").asText(), second.get("id").asLong()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
}
