resource "helm_release" "kube_prometheus_stack" {
  name       = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.dd_observability.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "58.4.0"

  values = [
    file("${path.module}/values/prometheus-values.yaml")
  ]
}

resource "helm_release" "loki_stack" {
  name       = "loki-stack"
  namespace  = kubernetes_namespace.dd_observability.metadata[0].name
  repository = "https://grafana.github.io/helm-charts"
  chart      = "loki-stack"
  version    = "2.10.2"

  values = [
    file("${path.module}/values/loki-values.yaml")
  ]
}
