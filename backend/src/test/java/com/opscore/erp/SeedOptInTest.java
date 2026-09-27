package com.opscore.erp;

import com.opscore.erp.config.DevelopmentSeed;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class SeedOptInTest {
    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(DevelopmentSeed.class);

    @Test
    void devProfileAloneDoesNotSeed() {
        context.withPropertyValues("spring.profiles.active=dev")
                .run(application -> assertThat(application).doesNotHaveBean(DevelopmentSeed.class));
    }

    @Test
    void seedFlagAloneDoesNotSeedOutsideDev() {
        context.withPropertyValues("app.seed.enabled=true")
                .run(application -> assertThat(application).doesNotHaveBean(DevelopmentSeed.class));
    }
}
