package com.opscore.erp.dto;

import java.time.Instant;

public record VendorResponse(Long id, String name, String email, String phone,
                             Boolean active, Instant createdAt, Instant updatedAt) {}
