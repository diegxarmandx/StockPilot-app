package com.opscore.erp.exception;

public class DuplicateSkuException extends RuntimeException {
    public DuplicateSkuException(String sku) {
        super("SKU '" + sku + "' is already in use");
    }
}
