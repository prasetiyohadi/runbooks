# Observability Operations & Monitoring Infrastructure Runbook

## 1. Overview

This runbook covers production operational procedures for deploying, managing, and maintaining observability stacks including metrics collection, alerting, logging, and distributed tracing systems.

**Scope**: Prometheus setup, Grafana dashboards, alerting rules, ELK/logging, distributed tracing, SLO management
**Target Audience**: DevOps engineers, SREs, platform engineers, on-call engineers
**Prerequisite**: CONCEPT.md (three pillars, four golden signals)

---

## 2. Prometheus Deployment

### 2.1 Installation (Kubernetes)

**Using Prometheus Operator**:

```bash
# Add Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus Operator and stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi \
  --set grafana.adminPassword=<SECURE_PASSWORD> \
  --set alertmanager.enabled=true
```

### 2.2 Prometheus Configuration

**scrape_configs.yaml** (job definitions):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s
      evaluation_interval: 30s
      external_labels:
        cluster: prod-us-east1
        environment: production
    
    # Alertmanager for alert routing
    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093
    
    # Alert rule files
    rule_files:
    - /etc/prometheus/rules/*.yml
    
    # Scrape jobs
    scrape_configs:
    
    # Kubernetes API server
    - job_name: 'kubernetes-apiservers'
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https
    
    # Kubernetes nodes
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    
    # Kubernetes pods (scrape all pods with metrics)
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
```

### 2.3 ServiceMonitor for Prometheus Operator

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: my-application
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

---

## 3. Alerting Configuration

### 3.1 Alert Rules

**Create PrometheusRule**:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: application-alerts
  namespace: monitoring
spec:
  groups:
  - name: application.rules
    interval: 30s
    rules:
    
    # Latency Alerts (Golden Signal #1)
    - alert: HighLatency
      expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1.0
      for: 5m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "High request latency detected"
        description: "P99 latency is {{ $value }}s on {{ $labels.instance }}"
    
    # Error Rate Alerts (Golden Signal #4)
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
        team: platform
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value | humanizePercentage }} on {{ $labels.service }}"
    
    # Traffic Alerts (Golden Signal #2)
    - alert: TrafficSpike
      expr: rate(http_requests_total[5m]) > 10000
      for: 2m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "Unusual traffic spike detected"
        description: "Traffic is {{ $value }} requests/sec on {{ $labels.service }}"
    
    # Saturation Alerts (Golden Signal #3)
    - alert: HighCPUUsage
      expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
      for: 10m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "High CPU usage detected"
        description: "CPU usage is {{ $value | humanizePercentage }} on {{ $labels.pod }}"
    
    - alert: HighMemoryUsage
      expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
      for: 5m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "High memory usage detected"
        description: "Memory usage is {{ $value | humanizePercentage }} on {{ $labels.pod }}"
    
    # Database Connection Pool
    - alert: DBConnectionPoolExhausted
      expr: mysql_global_status_threads_connected / mysql_global_variables_max_connections > 0.8
      for: 5m
      labels:
        severity: critical
        team: database
      annotations:
        summary: "Database connection pool near exhaustion"
        description: "{{ $value | humanizePercentage }} of connections in use"
```

### 3.2 Alertmanager Configuration

**alertmanager.yml** (alert routing & notifications):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
      slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    
    # Default routing
    route:
      receiver: platform-default
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      
      # Routes for specific teams
      routes:
      
      # Critical alerts → immediate PagerDuty
      - match:
          severity: critical
        receiver: pagerduty-critical
        continue: true
        repeat_interval: 5m
      
      # Warning alerts → Slack
      - match:
          severity: warning
        receiver: slack-warnings
        repeat_interval: 1h
      
      # Database team alerts
      - match_re:
          team: database|mysql|postgres
        receiver: database-team
        continue: true
    
    receivers:
    
    # Slack notifications
    - name: slack-warnings
      slack_configs:
      - channel: '#alerts-warnings'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
    
    # PagerDuty for critical
    - name: pagerduty-critical
      pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }} on {{ .GroupLabels.instance }}'
        details:
          severity: '{{ .GroupLabels.severity }}'
          alerts: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    
    # Database team
    - name: database-team
      slack_configs:
      - channel: '#database-alerts'
        title: '[{{ .GroupLabels.severity | toUpper }}] {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    
    - name: platform-default
      slack_configs:
      - channel: '#platform-alerts'
```

---

## 4. Grafana Dashboard Management

### 4.1 Dashboard Creation

**Create Dashboard via API**:

```bash
# Export existing dashboard as JSON
curl -s "http://grafana:3000/api/dashboards/db/system-overview" \
  -H "Authorization: Bearer $GRAFANA_API_TOKEN" | jq '.dashboard' > dashboard.json

# Create new dashboard
curl -X POST "http://grafana:3000/api/dashboards/db" \
  -H "Authorization: Bearer $GRAFANA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @dashboard.json
```

### 4.2 Key Dashboards

**System Overview Dashboard**:

```json
{
  "dashboard": {
    "title": "System Overview",
    "panels": [
      {
        "title": "Request Latency (P99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)"
          }
        ]
      }
    ]
  }
}
```

---

## 5. Logging Stack (ELK)

### 5.1 Elasticsearch Installation

```bash
# Using Docker Compose or Kubernetes Helm
helm repo add elastic https://helm.elastic.co
helm repo update

helm install elasticsearch elastic/elasticsearch \
  --namespace logging \
  --create-namespace \
  --set replicas=3 \
  --set resources.requests.memory="2Gi" \
  --set resources.requests.cpu="500m" \
  --set volumeClaimTemplate.storageClassName="fast-ssd"
```

### 5.2 Logstash Configuration

**logstash.conf** (log processing):

```
input {
  # Receive logs from Filebeat
  beats {
    port => 5044
    ssl => true
    ssl_certificate => "/etc/logstash/certs/logstash.crt"
    ssl_key => "/etc/logstash/certs/logstash.key"
  }
  
  # Kubernetes audit logs
  file {
    path => "/var/log/kubernetes/audit.log"
    tags => ["k8s-audit"]
    codec => json
  }
}

filter {
  # Parse JSON logs
  json {
    source => "message"
  }
  
  # Extract fields
  mutate {
    add_field => { "[@metadata][index_name]" => "logs-%{+YYYY.MM.dd}" }
  }
  
  # Grok patterns for nginx
  if [program] == "nginx" {
    grok {
      match => { "message" => "%{COMBINEDAPACHELOG}" }
    }
  }
  
  # Kubernetes metadata enrichment
  if [kubernetes] {
    mutate {
      add_field => { "pod_name" => "%{[kubernetes][pod][name]}" }
      add_field => { "namespace" => "%{[kubernetes][namespace]}" }
    }
  }
}

output {
  # Send to Elasticsearch
  elasticsearch {
    hosts => ["elasticsearch.logging:9200"]
    index => "%{[@metadata][index_name]}"
  }
  
  # Archive to S3 for long-term storage
  s3 {
    region => "us-east-1"
    bucket => "log-archive"
    prefix => "logs/%{[kubernetes][namespace]}/%{+YYYY/MM/dd}/"
  }
}
```

### 5.3 Kibana Queries

**Common Query Patterns**:

```bash
# Find 5xx errors in last 24h
response.code >= 500 AND timestamp:[now-24h TO now]

# Pod crash logs
level: ERROR AND (OOMKilled OR CrashLoopBackOff)

# Slow database queries (> 5 seconds)
query.duration_ms > 5000 AND database: production

# Authentication failures
event.type: authentication AND result: failure

# Get log count by service
@timestamp:[now-1h TO now] AND service:* | stats count() by service
```

---

## 6. Distributed Tracing (Jaeger)

### 6.1 Jaeger Deployment

```bash
# Install Jaeger operator
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update

helm install jaeger jaegertracing/jaeger \
  --namespace tracing \
  --create-namespace \
  --set storage.type=elasticsearch \
  --set elasticsearch.host=elasticsearch.logging
```

### 6.2 Application Instrumentation

**Python Example (OpenTelemetry)**:

```python
from opentelemetry import trace, metrics
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configure Jaeger exporter
jaeger_exporter = JaegerExporter(
    agent_host_name="jaeger-agent",
    agent_port=6831,
)

# Create tracer
trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)
tracer = trace.get_tracer(__name__)

# Instrument application
with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("order.id", 12345)
    span.set_attribute("customer.id", 67890)
    
    # Nested span
    with tracer.start_as_current_span("validate_order"):
        # Validation logic
        pass
    
    with tracer.start_as_current_span("process_payment"):
        # Payment logic
        pass
```

---

## 7. SLO & SLA Management

### 7.1 Define SLOs

```yaml
# Example SLOs for payment service
SLOs:
  Availability:
    target: 99.9%
    window: 30 days
    query: |
      (count(up{service="payment"} == 1) / count(up{service="payment"})) * 100
  
  Latency:
    target: P99 < 500ms
    window: 7 days
    query: |
      histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="payment"}[7d])) < 0.5
  
  Error Rate:
    target: < 0.1%
    window: 7 days
    query: |
      rate(http_requests_total{service="payment", status=~"5.."}[7d]) < 0.001
```

### 7.2 Error Budget Tracking

```promql
# Error budget remaining (%)
(1 - (rate(errors[30d]) / target_error_rate)) * 100

# Alert when error budget exhausted
(30 * 24 * 60 * 60) - 
  (count_over_time(http_requests_total{status=~"5.."}[30d])) / 
  (count_over_time(http_requests_total[30d])) < 0.999
```

---

## 8. Troubleshooting

### 8.1 Prometheus Issues

**Prometheus Not Scraping Targets**:

```bash
# Check Prometheus UI
curl http://localhost:9090/api/v1/targets

# Look for error state targets
# Check scrape config and target availability

# Check Prometheus logs
kubectl logs -n monitoring prometheus-0 | grep -i error | tail -20

# Common issues:
# 1. Target not reachable (firewall, DNS)
# 2. Authentication failure (missing bearer token)
# 3. Scrape timeout too short
```

**High Memory Usage**:

```bash
# Prometheus metric cardinality explosion
curl http://localhost:9090/api/v1/labels

# Check for high-cardinality labels
curl 'http://localhost:9090/api/v1/label/{label_name}/values'

# Solutions:
# 1. Add relabel_configs to drop high-cardinality labels
# 2. Use metric_relabel_configs to filter metrics
# 3. Reduce retention period
```

### 8.2 Alert Troubleshooting

**Alerts Not Firing**:

```bash
# Check alert evaluation
curl 'http://localhost:9090/api/v1/query?query=up'

# Check alert rule file syntax
promtool check rules /etc/prometheus/rules/*.yml

# Verify alert is firing (even if not notified)
curl 'http://localhost:9090/api/v1/alerts'

# Check Alertmanager
curl http://localhost:9093/api/v1/alerts

# Verify webhook delivery
# Check Alertmanager logs
kubectl logs -n monitoring alertmanager-0 | grep -i error
```

---

## 9. Operational Checklists

### Pre-Production

- [ ] Prometheus configured and scraping all targets
- [ ] Alert rules created for all SLOs
- [ ] Alertmanager routing configured and tested
- [ ] Grafana dashboards created for key metrics
- [ ] Logging stack deployed (Elasticsearch, Logstash, Kibana)
- [ ] Distributed tracing (Jaeger) deployed
- [ ] On-call rotation configured
- [ ] Alert escalation procedures documented
- [ ] Load testing with observability validated

### Daily Operations

- [ ] Review alert firing rate (should be low)
- [ ] Check Prometheus target status (all green)
- [ ] Verify log ingestion rate
- [ ] Monitor error budget status

### Weekly Maintenance

- [ ] Review alert tuning (false positives/negatives)
- [ ] Update dashboards based on new metrics
- [ ] Archive old logs
- [ ] Test backup/restore of observability data

---

## 10. Performance Tuning

**Prometheus Storage Optimization**:

```yaml
global:
  scrape_interval: 30s          # Increase from 15s if possible
  evaluation_interval: 30s      # Match scrape interval

# Reduce cardinality in scrape configs
relabel_configs:
- source_labels: [__name__]
  regex: 'go_.*'                # Drop Go runtime metrics if not needed
  action: drop
```

**Elasticsearch Performance**:

```yaml
# Increase refresh interval for bulk indexing
PUT logs-*/_settings
{
  "index": {
    "refresh_interval": "30s"   # From default 1s
  }
}

# Tune shard count based on volume
# Rule: 50GB per shard, 1-3 shards per node
PUT logs-new
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 2
  }
}
```

---

**Last Updated**: January 2026
**Maintained by**: Platform Observability Team
**Version**: 1.0.0

