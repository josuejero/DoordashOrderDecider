package com.doordash.decider.domain;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

public record ExplanationNode(String title, Object value, List<ExplanationNode> children) {

    public ExplanationNode {
        Objects.requireNonNull(title, "explanation title is required");
        children = children == null ? Collections.emptyList() : List.copyOf(children);
    }

    public static ExplanationNode of(String title, Object value, List<ExplanationNode> children) {
        return new ExplanationNode(title, value, children);
    }

    public static ExplanationNode leaf(String title, Object value) {
        return new ExplanationNode(title, value, Collections.emptyList());
    }
}
