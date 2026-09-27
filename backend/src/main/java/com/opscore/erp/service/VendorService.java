package com.opscore.erp.service;

import com.opscore.erp.domain.Vendor;
import com.opscore.erp.dto.*;
import com.opscore.erp.exception.ResourceNotFoundException;
import com.opscore.erp.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VendorService {
    private final VendorRepository repository;

    @Transactional
    public VendorResponse createVendor(CreateVendorRequest request) {
        Vendor vendor = new Vendor();
        vendor.setName(request.name());
        vendor.setEmail(request.email());
        vendor.setPhone(request.phone());
        vendor.setActive(request.active());
        return response(repository.saveAndFlush(vendor));
    }

    public VendorResponse getVendor(Long id) {
        return response(find(id));
    }

    public PageResponse<VendorResponse> listVendors(String search, Boolean active, int page, int size) {
        return PageResponse.from(repository.findAll(CatalogSearch.matching(search, active, "name", "email"),
                PageRequest.of(page, size, Sort.by("id").descending())).map(this::response));
    }

    @Transactional
    public VendorResponse updateVendor(Long id, UpdateVendorRequest request) {
        Vendor vendor = find(id);
        vendor.setName(request.name());
        vendor.setEmail(request.email());
        vendor.setPhone(request.phone());
        vendor.setActive(request.active());
        return response(repository.saveAndFlush(vendor));
    }

    @Transactional
    public VendorResponse deactivateVendor(Long id) {
        Vendor vendor = find(id);
        vendor.setActive(false);
        return response(repository.saveAndFlush(vendor));
    }

    private Vendor find(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vendor", id));
    }

    private VendorResponse response(Vendor vendor) {
        return new VendorResponse(vendor.getId(), vendor.getName(), vendor.getEmail(), vendor.getPhone(),
                vendor.getActive(), vendor.getCreatedAt(), vendor.getUpdatedAt());
    }
}
