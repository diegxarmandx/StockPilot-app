package com.opscore.erp.service;

import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

final class CatalogSearch {
    private CatalogSearch() {}

    static <T> Specification<T> matching(String search, Boolean active, String first, String second) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            if (active != null) predicate = cb.and(predicate, cb.equal(root.get("active"), active));
            if (search != null && !search.isBlank()) {
                // Search input is literal text, including SQL wildcard characters.
                String term = search.strip().toLowerCase(Locale.ROOT)
                        .replace("!", "!!").replace("%", "!%").replace("_", "!_");
                String pattern = "%" + term + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get(first)), pattern, '!'),
                        cb.like(cb.lower(root.get(second)), pattern, '!')));
            }
            return predicate;
        };
    }
}
