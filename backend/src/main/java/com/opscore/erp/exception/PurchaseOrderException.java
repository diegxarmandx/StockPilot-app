package com.opscore.erp.exception;
import lombok.Getter;
@Getter
public class PurchaseOrderException extends RuntimeException {
    private final int status;
    private final String code;
    public PurchaseOrderException(int status, String code, String message) {
        super(message); this.status = status; this.code = code;
    }
}
