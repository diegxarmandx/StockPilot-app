package com.opscore.erp.controller;

import com.opscore.erp.dto.*;
import com.opscore.erp.service.VendorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vendors")
@RequiredArgsConstructor
@Validated
public class VendorController {
    private final VendorService service;

    @GetMapping
    public PageResponse<VendorResponse> list(
            @RequestParam(required = false) @Size(max = 200) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.listVendors(search, active, page, size);
    }

    @PostMapping
    public ResponseEntity<VendorResponse> create(@Valid @RequestBody CreateVendorRequest request) {
        var response = service.createVendor(request);
        return ResponseEntity.created(URI.create("/api/vendors/" + response.id())).body(response);
    }

    @GetMapping("/{id}")
    public VendorResponse get(@PathVariable @Positive Long id) {
        return service.getVendor(id);
    }

    @PutMapping("/{id}")
    public VendorResponse update(@PathVariable @Positive Long id, @Valid @RequestBody UpdateVendorRequest request) {
        return service.updateVendor(id, request);
    }

    @PatchMapping("/{id}/deactivate")
    public VendorResponse deactivate(@PathVariable @Positive Long id) {
        return service.deactivateVendor(id);
    }
}
