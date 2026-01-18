package com.doordash.decider.rules;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class MarketRuleSeedLoader implements ApplicationRunner {

    private static final String RULE_SEED_GLOB = "classpath*:rulesets/*.json";

    private final RuleRepository repository;
    private final ObjectMapper objectMapper;
    private final ResourcePatternResolver resolver;

    public MarketRuleSeedLoader(RuleRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.resolver = new PathMatchingResourcePatternResolver();
    }

    @Override
    public void run(ApplicationArguments args) {
        Resource[] resources;
        try {
            resources = resolver.getResources(RULE_SEED_GLOB);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to load ruleset seeds", e);
        }
        for (Resource resource : resources) {
            if (!resource.exists()) {
                continue;
            }
            try {
                RuleSeedDefinition definition = objectMapper.readValue(resource.getInputStream(), RuleSeedDefinition.class);
                RuleSeed seed = RuleSeed.from(definition, objectMapper);
                repository.save(seed);
            } catch (IOException e) {
                throw new IllegalStateException("Failed to parse ruleset definition: " + resource.getFilename(), e);
            }
        }
    }
}
