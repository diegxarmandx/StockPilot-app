package com.opscore.erp;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class ProductionConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer());

    @Test
    void productionUsesPlatformPortAndDoesNotModifySchemaOrSeed() {
        runner.withPropertyValues("spring.profiles.active=prod", "PORT=9090",
                "SEED_DATA_ENABLED=true", "CORS_ALLOWED_ORIGINS=https://frontend.example.com")
                .run(context -> {
                    var env = context.getEnvironment();
                    assertThat(env.getProperty("server.port")).isEqualTo("9090");
                    assertThat(env.getProperty("server.address")).isEqualTo("0.0.0.0");
                    assertThat(env.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
                    assertThat(env.getProperty("spring.sql.init.mode")).isEqualTo("never");
                    assertThat(env.getProperty("app.seed.enabled")).isEqualTo("false");
                    assertThat(env.getProperty("app.cors.allowed-origins"))
                            .isEqualTo("https://frontend.example.com");
                });
    }

    @Test
    void localPortAndCorsDefaultsRemainAvailable() {
        runner.run(context -> {
            var env = context.getEnvironment();
            assertThat(env.getProperty("server.port")).isEqualTo("8080");
            assertThat(env.getProperty("app.seed.enabled")).isEqualTo("false");
            assertThat(env.getProperty("app.cors.allowed-origins"))
                    .contains("http://localhost:5173", "http://127.0.0.1:5173");
        });
    }
}
