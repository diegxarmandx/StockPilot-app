package com.opscore.erp.dto;

import jakarta.validation.constraints.*;

public record CreateVendorRequest(
        @NotBlank(message = "Name is required") @Size(max = 160) String name,
        @Email(message = "Enter a valid email address") @Size(max = 254) String email,
        @Size(max = 40) String phone,
        Boolean active) {
    public CreateVendorRequest {
        name = TextValues.trim(name);
        email = TextValues.optional(email);
        phone = TextValues.optional(phone);
        active = active == null ? true : active;
    }
}
