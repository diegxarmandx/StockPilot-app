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
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.profiles.active=${test.profile:test}")
@AutoConfigureMockMvc
class ReceivingApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ProductRepository products;
    @Autowired VendorRepository vendors;
    @Autowired PurchaseOrderRepository orders;
    @Autowired JdbcTemplate jdbc;
    Product first, second;
    Vendor vendor;

    @BeforeEach void setup() {
        jdbc.update("delete from inventory_transactions");
        orders.deleteAll(); products.deleteAll(); vendors.deleteAll();
        vendor = new Vendor(); vendor.setName("Receiving supplier"); vendor = vendors.saveAndFlush(vendor);
        first = product("RECEIVE-A", 20, "12.50", 25);
        second = product("RECEIVE-B", 5, "3.25", 0);
    }
    private Product product(String sku, int stock, String cost, int reorder) {
        var p = new Product(); p.setSku(sku); p.setName(sku); p.setQuantityOnHand(stock);
        p.setUnitCost(new BigDecimal(cost)); p.setReorderPoint(reorder);
        return products.saveAndFlush(p);
    }
    private JsonNode create(List<Map<String,Object>> items) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("vendorId",vendor.getId(),"items",items))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    private Map<String,Object> line(Product product, int quantity) {
        return Map.of("productId",product.getId(),"quantity",quantity);
    }
    private JsonNode ordered(int firstQty, int secondQty) throws Exception {
        var po = create(List.of(line(first,firstQty),line(second,secondQty)));
        mvc.perform(post("/api/purchase-orders/"+po.get("id")+"/order")).andExpect(status().isOk());
        return po;
    }
    private JsonNode read(String path) throws Exception {
        return mapper.readTree(mvc.perform(get(path)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    private int stock(Product p) { return products.findById(p.getId()).orElseThrow().getQuantityOnHand(); }
    private long ledgerCount() { return jdbc.queryForObject("select count(*) from inventory_transactions",Long.class); }
    private void receive(JsonNode po) throws Exception {
        mvc.perform(post("/api/purchase-orders/"+po.get("id")+"/receive")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RECEIVED")).andExpect(jsonPath("$.receivedAt").isNotEmpty());
    }

    @Test void receivesAllItemsWithAccurateBalancesReferenceAndTimestamps() throws Exception {
        var po = ordered(50,7); receive(po);
        assertThat(stock(first)).isEqualTo(70); assertThat(stock(second)).isEqualTo(12);
        assertThat(ledgerCount()).isEqualTo(2);
        var history = read("/api/products/"+first.getId()+"/inventory-transactions");
        var entry = history.get("content").get(0);
        assertThat(entry.get("quantity").asInt()).isEqualTo(50);
        assertThat(entry.get("balanceBefore").asInt()).isEqualTo(20);
        assertThat(entry.get("balanceAfter").asInt()).isEqualTo(70);
        assertThat(entry.get("referenceType").asText()).isEqualTo("PURCHASE_ORDER");
        assertThat(entry.get("referenceId").asText()).isEqualTo(po.get("poNumber").asText());
        assertThat(entry.get("type").asText()).isEqualTo("PURCHASE_RECEIPT");
        assertThat(entry.get("createdAt").asText()).isNotBlank();
        var saved = read("/api/purchase-orders/"+po.get("id"));
        assertThat(saved.get("status").asText()).isEqualTo("RECEIVED");
        assertThat(saved.get("orderedAt").asText()).isNotBlank();
        assertThat(saved.get("receivedAt").asText()).isNotBlank();
        assertThat(saved.get("total")).isEqualTo(po.get("total"));
    }
    @ParameterizedTest @ValueSource(strings={"DRAFT","CANCELLED"})
    void rejectsUnreceivableStatesWithoutMutations(String state) throws Exception {
        var po = create(List.of(line(first,50)));
        if (state.equals("CANCELLED")) mvc.perform(post("/api/purchase-orders/"+po.get("id")+"/cancel")).andExpect(status().isOk());
        mvc.perform(post("/api/purchase-orders/"+po.get("id")+"/receive")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PURCHASE_ORDER_NOT_RECEIVABLE"));
        assertThat(stock(first)).isEqualTo(20); assertThat(ledgerCount()).isZero();
        assertThat(read("/api/purchase-orders/"+po.get("id")).get("status").asText()).isEqualTo(state);
    }
    @Test void duplicateReceiptReturnsConflictAndNeverChangesStockOrLedger() throws Exception {
        var po = ordered(50,7); receive(po);
        var before = read("/api/purchase-orders/"+po.get("id"));
        mvc.perform(post("/api/purchase-orders/"+po.get("id")+"/receive")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PURCHASE_ORDER_ALREADY_RECEIVED"))
                .andExpect(jsonPath("$.message").value("Purchase order "+po.get("poNumber").asText()+" has already been received"));
        assertThat(stock(first)).isEqualTo(70); assertThat(stock(second)).isEqualTo(12);
        assertThat(ledgerCount()).isEqualTo(2);
        assertThat(read("/api/purchase-orders/"+po.get("id")).get("receivedAt")).isEqualTo(before.get("receivedAt"));
    }
    @Test void receivedPurchaseOrderIsPermanentlyReadOnly() throws Exception {
        var po = ordered(1,1); receive(po);
        for (String action : List.of("order","cancel"))
            mvc.perform(post("/api/purchase-orders/"+po.get("id")+"/"+action)).andExpect(status().isConflict());
        mvc.perform(put("/api/purchase-orders/"+po.get("id")).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("vendorId",vendor.getId(),"items",List.of(line(first,1))))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PURCHASE_ORDER_NOT_EDITABLE"));
    }
    @Test void missingPurchaseOrderReturnsNotFound() throws Exception {
        mvc.perform(post("/api/purchase-orders/"+Long.MAX_VALUE+"/receive")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PURCHASE_ORDER_NOT_FOUND"));
    }
    @Test void secondItemOverflowRollsBackAlreadyFlushedFirstBalanceAndLedger() throws Exception {
        // Ascending product-ID locks process first before second. First is flushed to the DB;
        // second deterministically overflows, exercising a real Spring transaction rollback.
        assertThat(first.getId()).isLessThan(second.getId());
        second.setQuantityOnHand(Integer.MAX_VALUE); products.saveAndFlush(second);
        var po = ordered(10,1);
        mvc.perform(post("/api/purchase-orders/"+po.get("id")+"/receive")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVENTORY_UPDATE_FAILED"));
        assertThat(stock(first)).isEqualTo(20); assertThat(stock(second)).isEqualTo(Integer.MAX_VALUE);
        assertThat(ledgerCount()).isZero();
        var saved = read("/api/purchase-orders/"+po.get("id"));
        assertThat(saved.get("status").asText()).isEqualTo("ORDERED");
        assertThat(saved.get("receivedAt").isNull()).isTrue();
    }
    @Test void databaseDuplicateSafeguardAlsoRollsBackEarlierLines() throws Exception {
        var po = ordered(10,2);
        jdbc.update("""
                insert into inventory_transactions(product_id,type,quantity,balance_before,balance_after,reference_type,reference_id,created_at)
                values(?, 'PURCHASE_RECEIPT', 1, 0, 1, 'PURCHASE_ORDER', ?, current_timestamp)
                """,second.getId(),po.get("poNumber").asText());
        mvc.perform(post("/api/purchase-orders/"+po.get("id")+"/receive")).andExpect(status().isConflict());
        assertThat(stock(first)).isEqualTo(20); assertThat(stock(second)).isEqualTo(5);
        assertThat(ledgerCount()).isEqualTo(1); // Only the pre-existing safeguard fixture remains.
        assertThat(read("/api/purchase-orders/"+po.get("id")).get("status").asText()).isEqualTo("ORDERED");
    }
    @Test void simultaneousReceiptsOfSamePoHaveOneWinner() throws Exception {
        var po = ordered(50,7);
        var results = concurrent(() -> receiveStatus(po), () -> receiveStatus(po));
        assertThat(results).containsExactlyInAnyOrder(200,409);
        assertThat(stock(first)).isEqualTo(70); assertThat(stock(second)).isEqualTo(12);
        assertThat(ledgerCount()).isEqualTo(2);
    }
    @Test void differentPurchaseOrdersSharingProductsDoNotLoseUpdatesOrDeadlock() throws Exception {
        var a = ordered(10,2);
        // Opposite request item order must still acquire product locks in ascending ID order.
        var b = create(List.of(line(second,3),line(first,7)));
        mvc.perform(post("/api/purchase-orders/"+b.get("id")+"/order")).andExpect(status().isOk());
        assertThat(concurrent(() -> receiveStatus(a), () -> receiveStatus(b))).containsExactly(200,200);
        assertThat(stock(first)).isEqualTo(37); assertThat(stock(second)).isEqualTo(10);
        assertThat(ledgerCount()).isEqualTo(4);
        var firstEntries = jdbc.queryForList("select balance_before, balance_after from inventory_transactions where product_id = ? order by id",first.getId());
        assertThat(firstEntries.get(0).get("balance_before")).isEqualTo(20);
        assertThat(firstEntries.get(0).get("balance_after")).isEqualTo(firstEntries.get(1).get("balance_before"));
        assertThat(firstEntries.get(1).get("balance_after")).isEqualTo(37);
    }
    @Test void productMetadataEditCannotOverwriteConcurrentReceipt() throws Exception {
        var po = ordered(50,7);
        Callable<Integer> edit = () -> mvc.perform(put("/api/products/"+first.getId()).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("sku",first.getSku(),"name","Updated name","unitCost","15.00","reorderPoint",25,"active",true))))
                .andReturn().getResponse().getStatus();
        assertThat(concurrent(() -> receiveStatus(po),edit)).containsExactly(200,200);
        assertThat(stock(first)).isEqualTo(70);
        assertThat(products.findById(first.getId()).orElseThrow().getName()).isEqualTo("Updated name");
    }
    @Test void inactiveMasterDataDoesNotBlockAnExistingOrderedCommitment() throws Exception {
        var po = ordered(1,1);
        first.setActive(false);products.saveAndFlush(first);vendor.setActive(false);vendors.saveAndFlush(vendor);
        receive(po); assertThat(stock(first)).isEqualTo(21);
    }
    @Test void listsAndFiltersLedgerAndProductHistoryWithPagination() throws Exception {
        var po = ordered(50,7);receive(po);
        mvc.perform(get("/api/inventory-transactions").param("referenceId",po.get("poNumber").asText()).param("type","PURCHASE_RECEIPT").param("size","1").param("page","1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(1));
        mvc.perform(get("/api/inventory-transactions").param("productId",first.getId().toString()))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].sku").value(first.getSku()));
        assertThat(read("/api/inventory-transactions?referenceId=NOT-A-PO").get("totalElements").asInt()).isZero();
        assertThat(read("/api/products/"+second.getId()+"/inventory-transactions").get("content").get(0).get("balanceBefore").asInt()).isEqualTo(5);
        var unused=product("NO-HISTORY",0,"1.00",0);
        assertThat(read("/api/products/"+unused.getId()+"/inventory-transactions").get("totalElements").asInt()).isZero();
        mvc.perform(get("/api/products/"+Long.MAX_VALUE+"/inventory-transactions")).andExpect(status().isNotFound());
        for (String query:List.of("?size=101","?page=-1","?productId=0","?type=ADJUSTMENT"))
            mvc.perform(get("/api/inventory-transactions"+query)).andExpect(status().isBadRequest());
    }
    @Test void inventoryHasNoMutationEndpointsAndProductEditCannotSetStock() throws Exception {
        mvc.perform(post("/api/inventory-transactions").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isMethodNotAllowed());
        mvc.perform(put("/api/inventory-transactions").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isMethodNotAllowed());
        mvc.perform(delete("/api/inventory-transactions")).andExpect(status().isMethodNotAllowed());
        mvc.perform(put("/api/products/"+first.getId()).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("sku",first.getSku(),"name",first.getName(),"unitCost","12.50",
                        "quantityOnHand",999,"reorderPoint",25,"active",true))))
                .andExpect(status().isBadRequest());
        assertThat(stock(first)).isEqualTo(20);
    }
    @Test void ledgerDatabaseConstraintsRejectDuplicateReceiptsAndInvalidBalances() throws Exception {
        var po=ordered(1,1);receive(po);
        assertThatThrownBy(() -> jdbc.update("""
                insert into inventory_transactions(product_id,type,quantity,balance_before,balance_after,reference_type,reference_id,created_at)
                select product_id,type,quantity,balance_before,balance_after,reference_type,reference_id,created_at
                from inventory_transactions where product_id = ?
                """,first.getId())).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("update inventory_transactions set balance_after = 0 where product_id = ?",first.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(ledgerCount()).isEqualTo(2);
    }
    @Test void dashboardAggregatesStockAndOpenOrdersAndRecentActivity() throws Exception {
        var draft=create(List.of(line(first,1)));
        var po=ordered(50,7);
        var cancelled=create(List.of(line(first,1)));
        mvc.perform(post("/api/purchase-orders/"+cancelled.get("id")+"/cancel")).andExpect(status().isOk());
        mvc.perform(get("/api/dashboard")).andExpect(status().isOk()).andExpect(jsonPath("$.products").value(2))
                .andExpect(jsonPath("$.openPurchaseOrders").value(2)).andExpect(jsonPath("$.inventoryValue").value("266.25"))
                .andExpect(jsonPath("$.lowStockItems").value(1)).andExpect(jsonPath("$.recentInventoryActivity").isEmpty());
        receive(po);
        mvc.perform(get("/api/dashboard")).andExpect(jsonPath("$.openPurchaseOrders").value(1))
                .andExpect(jsonPath("$.inventoryValue").value("914.00")).andExpect(jsonPath("$.lowStockItems").value(0))
                .andExpect(jsonPath("$.recentInventoryActivity.length()").value(2));
        assertThat(read("/api/purchase-orders/"+draft.get("id")).get("status").asText()).isEqualTo("DRAFT");
    }
    @Test void emptyDashboardUsesExactZeroAndInactiveStockStillHasValue() throws Exception {
        first.setActive(false);products.saveAndFlush(first);
        mvc.perform(get("/api/dashboard")).andExpect(jsonPath("$.inventoryValue").value("266.25"))
                .andExpect(jsonPath("$.lowStockItems").value(0));
        products.deleteAll();
        mvc.perform(get("/api/dashboard")).andExpect(jsonPath("$.products").value(0))
                .andExpect(jsonPath("$.inventoryValue").value("0.00"));
    }
    @Test void phase2StatusConstraintUpgradePreservesOrdersAndCanBeRepeated() throws Exception {
        var po=ordered(1,1);
        jdbc.execute("alter table purchase_orders drop constraint if exists purchase_orders_status_check");
        jdbc.execute("alter table purchase_orders add constraint purchase_orders_status_check check (status in ('DRAFT','ORDERED','CANCELLED'))");
        var script = new ResourceDatabasePopulator(new ClassPathResource("db/phase3-postgresql.sql"));
        script.execute(Objects.requireNonNull(jdbc.getDataSource()));
        receive(po);
        script.execute(jdbc.getDataSource());
        assertThat(read("/api/purchase-orders/"+po.get("id")).get("poNumber")).isEqualTo(po.get("poNumber"));
        assertThat(ledgerCount()).isEqualTo(2);
    }
    private int receiveStatus(JsonNode po) throws Exception {
        return mvc.perform(post("/api/purchase-orders/"+po.get("id")+"/receive")).andReturn().getResponse().getStatus();
    }
    private List<Integer> concurrent(Callable<Integer> a, Callable<Integer> b) throws Exception {
        var ready = new CountDownLatch(2); var start = new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var first=executor.submit(() -> {ready.countDown();start.await();return a.call();});
            var second=executor.submit(() -> {ready.countDown();start.await();return b.call();});
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();start.countDown();
            return List.of(first.get(15,TimeUnit.SECONDS),second.get(15,TimeUnit.SECONDS));
        }
    }
}
