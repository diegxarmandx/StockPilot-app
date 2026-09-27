package com.opscore.erp.exception;

import lombok.Getter;

@Getter
public class ResourceNotFoundException extends RuntimeException {
    private final String code;

    public ResourceNotFoundException(String resource, Long id) {
        super(resource + " " + id + " does not exist");
        code = resource.toUpperCase(java.util.Locale.ROOT) + "_NOT_FOUND";
    }
}
