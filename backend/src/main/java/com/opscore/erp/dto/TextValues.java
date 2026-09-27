package com.opscore.erp.dto;

final class TextValues {
    private TextValues() {}

    static String trim(String value) {
        return value == null ? null : value.strip();
    }

    static String optional(String value) {
        String trimmed = trim(value);
        return trimmed == null || trimmed.isEmpty() ? null : trimmed;
    }
}
