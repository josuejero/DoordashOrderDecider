from prometheus_client import Counter, Histogram

REQUESTS = Counter(
    "ml_requests_total",
    "Total ML prediction requests",
    ["endpoint", "status"],
)

LATENCY = Histogram(
    "ml_request_latency_seconds",
    "ML request latency",
    ["endpoint"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)
