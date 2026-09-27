package com.opscore.erp.dto;

import jakarta.validation.constraints.*;

public record UpdateVendorRequest(
        @NotBlank(message = "Name is required") @Size(max = 160) String name,
        @Email(message = "Enter a valid email address") @Size(max = 254) String email,
        @Size(max = 40) String phone,
        @NotNull Boolean active) {
    public UpdateVendorRequest {
        name = TextValues.trim(name);
        email = TextValues.optional(email);
        phone = TextValues.optional(phone);
    }
}
