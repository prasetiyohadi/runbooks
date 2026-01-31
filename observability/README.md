# Observability: Quick Reference & Learning Guide

## Learning Paths

### Beginner Path (2-4 hours)
**Goal**: Understand observability fundamentals and set up basic monitoring

**Recommended sequence**:
1. Read [CONCEPT.md](CONCEPT.md#1-what-is-observability) — "What is Observability?" section
2. Read [CONCEPT.md](CONCEPT.md#2-the-four-golden-signals-slos) — Four Golden Signals
3. Complete [WORKSHOP.md Part 1-2](WORKSHOP.md#part-1-local-monitoring-stack-setup-15-min) — Setup & metrics
4. Do [WORKSHOP.md Part 3](WORKSHOP.md#part-3-dashboards--visualization-30-min) — Create first dashboard
5. Practice: Generate traffic and observe metrics in Grafana

**Key Concepts**:
- Metrics vs Logs vs Traces
- Prometheus pull model
- Grafana visualization
- Histograms and percentiles

---

### Intermediate Path (6-8 hours)
**Goal**: Implement production monitoring with alerts and optimization

**Recommended sequence**:
1. Read entire [CONCEPT.md](CONCEPT.md) with focus on:
   - [Metrics Types & Cardinality](CONCEPT.md#3-metric-types--cardinality)
   - [Prometheus Architecture](CONCEPT.md#4-metrics-collection-prometheus-architecture)
   - [Alerting Rules](CONCEPT.md#6-alerting-rules-and-escalation)
2. Complete entire [WORKSHOP.md](WORKSHOP.md) (all 6 parts)
3. Design alerts for your service using [Alerting Best Practices](CONCEPT.md#103-alerting-best-practices)
4. Create cardinality budget for your team

**Key Concepts**:
- Cardinality management and cost optimization
- Alert thresholds and escalation policies
- Dashboard design patterns
- Incident response workflows

---

### Advanced Path (10-12 hours)
**Goal**: Multi-service observability, cost optimization, custom instrumentation

**Recommended sequence**:
1. Deep dive into sections:
   - [Datadog vs Prometheus](CONCEPT.md#51-datadog-vs-prometheus) — Vendor comparison
   - [Logging: ELK Stack](CONCEPT.md#7-logging-elk-stack--aggregation) — Log aggregation
   - [Distributed Tracing](CONCEPT.md#8-distributed-tracing-request-journey) — Request tracing
   - [Observability Costs](CONCEPT.md#12-observability-costs--optimization) — Cost control
2. Implement custom metrics in your application
3. Design multi-service dashboards
4. Implement tail-based sampling for traces
5. Set up high-availability Prometheus cluster

**Key Concepts**:
- Cardinality at scale (millions of metrics)
- Multi-cluster observability
- Distributed tracing and APM
- Cost optimization strategies
- Custom instrumentation patterns

---

## Quick Reference Tables

### Metric Types Comparison

| Type | Use Case | Cardinality | Example |
|------|----------|-------------|---------|
| **Counter** | Cumulative events | 1 | `http_requests_total` |
| **Gauge** | Current value | 1 | `memory_bytes` |
| **Histogram** | Distribution/percentiles | 5-10 | `request_duration_seconds` |
| **Distribution** | Server-side percentiles | 3-5 | `response_size_dist` |

**Rule of thumb**: Counter × 1, Gauge × 1, Histogram × 5, Distribution × 3

---

### Alert Severity Levels

| Severity | Response Time | Escalation | Example |
|----------|---------------|-----------|---------|
| **INFO** | Next business day | None | "Cache hit ratio low" |
| **WARNING** | 1-4 hours | On-call if persists | "P99 latency > 200ms" |
| **CRITICAL** | < 15 minutes | Immediate page | "Error rate > 5%" |
| **FATAL** | < 5 minutes | All hands | "Complete service outage" |

---

### Latency Percentile Benchmarks

| Percentile | Typical Target | Red Flag |
|-----------|---|---|
| **P50 (median)** | < 50ms | > 100ms |
| **P95** | < 200ms | > 500ms |
| **P99** | < 500ms | > 1000ms |
| **P99.9** | < 1000ms | > 2000ms |

**Production rule**: Alert when P99 > 2× baseline

---

### Error Rate Thresholds

| Endpoint Type | Normal | Warning | Critical |
|--------------|--------|---------|----------|
| **Public API** | < 0.1% | > 0.5% | > 1% |
| **Internal API** | < 0.5% | > 1% | > 5% |
| **Batch job** | < 1% | > 5% | > 10% |
| **Health check** | 0% | > 0% | > 0% |

---

### Saturation Thresholds

| Resource | Good | Warning | Critical |
|----------|------|---------|----------|
| **CPU** | < 50% | > 70% | > 85% |
| **Memory** | < 60% | > 80% | > 95% |
| **Disk** | < 70% | > 85% | > 95% |
| **Connections** | < 50% | > 70% | > 85% |
| **Cache hit ratio** | > 90% | < 70% | < 50% |

---

### Cardinality Budget Calculator

```
Formula: Base Cardinality × Metric Type Multiplier

Example 1: Simple Counter
  Unique tag combinations = 10 (method × endpoint)
  Multiplier = 1 (counter)
  Cost = 10 × 1 = 10 metrics

Example 2: Histogram
  Unique tag combinations = 10
  Multiplier = 5 (histogram auto-generates 5)
  Cost = 10 × 5 = 50 metrics

Example 3: Multiple histograms
  request_duration (10 combinations × 5) = 50 metrics
  response_size (10 combinations × 5) = 50 metrics
  request_payload (10 combinations × 5) = 50 metrics
  Total = 150 metrics
```

**Cost impact**: 1000 metrics × $0.10/month = $100/month per service

---

### Prometheus Query Examples

| Query | Purpose | Use Case |
|-------|---------|----------|
| `rate(http_requests_total[5m])` | Requests/second | Dashboard, baseline |
| `histogram_quantile(0.99, ...)` | P99 latency | SLO monitoring |
| `sum(...) by (endpoint)` | Group by dimension | Per-endpoint stats |
| `...offset 1d` | Compare to yesterday | Trend detection |

---

## Frequently Asked Questions

### Q1: What's the difference between Prometheus and Datadog?

**Prometheus** (Open-source):
- ✅ Free and self-hosted
- ✅ No cardinality limits
- ✅ Full control
- ❌ Limited retention (15 days)
- ❌ Simple UI
- ❌ No built-in APM

**Datadog** (Commercial):
- ✅ 15-month retention
- ✅ Advanced UI and analytics
- ✅ Built-in APM and logs
- ✅ Automatic instrumentation
- ❌ Expensive (cardinality-based billing)
- ❌ Vendor lock-in

**Choice**: Use Prometheus for cost-sensitive projects, Datadog for enterprise with full feature needs.

---

### Q2: How do I reduce metric cardinality costs?

**Top 3 strategies**:

1. **Group by logic** (most effective):
   ```
   ❌ BAD: /api/users/1, /api/users/2, /api/orders/123
   ✅ GOOD: /api/*, with status label
   Reduction: 1000s paths → 1 path
   ```

2. **Remove high-cardinality tags**:
   ```
   ❌ BAD: status{user_id=?, request_id=?}
   ✅ GOOD: status{http_status=?, endpoint=?}
   Reduction: 100M+ → 100
   ```

3. **Sample or aggregate**:
   ```
   ❌ BAD: Every request as separate metric
   ✅ GOOD: Histogram with percentiles (1 in 10 samples)
   Reduction: 100× fewer metrics
   ```

---

### Q3: When should I use histograms vs gauges?

**Histograms**:
- ✅ Latency/duration measurements
- ✅ Request sizes
- ✅ When you need percentiles
- ❌ Current values

**Gauges**:
- ✅ CPU, memory, disk usage
- ✅ Current connection count
- ✅ Temperature, speed
- ❌ Cumulative values (use Counter)

**Example**:
```
✅ Histogram: http_request_duration_seconds (P50, P99)
✅ Gauge: connection_pool_available (current free connections)
✅ Counter: errors_total (cumulative failures)
❌ Gauge: total_requests (wrong! use Counter)
```

---

### Q4: How do I troubleshoot high latency?

**Investigation checklist**:

1. **Check metric source**:
   - Is it database latency? (check slow query logs)
   - Is it network latency? (check inter-service calls)
   - Is it processing latency? (check CPU usage)

2. **Compare to baseline**:
   ```bash
   # Current P99
   histogram_quantile(0.99, ...) → 1000ms
   
   # 1 hour ago
   histogram_quantile(0.99, ...)[1h:] → 50ms
   
   # Change: 20× increase → likely incident
   ```

3. **Break down by endpoint**:
   ```bash
   # See which endpoints are slow
   sum(rate(...)) by (endpoint)
   
   # If only /api/orders slow → check order service
   # If all endpoints slow → check infrastructure
   ```

4. **Check related metrics**:
   - Error rate: High errors = timeout issues
   - CPU/Memory: High usage = resource bottleneck
   - Connection count: High count = pool exhaustion

---

### Q5: What metrics should every service expose?

**Essential (Golden Signals)**:
- `service_requests_total` (counter) — Total requests
- `service_request_duration_seconds` (histogram) — Latency distribution
- `service_errors_total` (counter) — Failed requests by type
- `service_saturation` (gauge) — Resource usage

**Recommended additions**:
- `service_dependencies` (gauge) — Upstream service health
- `service_cache_hit_ratio` (gauge) — Cache effectiveness
- `database_connections_active` (gauge) — Connection pool usage
- `message_queue_depth` (gauge) — Queue backlog

**Don't expose**:
- ❌ Raw timestamps
- ❌ Sensitive data (passwords, tokens)
- ❌ Per-user metrics
- ❌ High-cardinality IDs

---

### Q6: How do I set up on-call rotations with alerts?

**Basic flow**:
```
Alert fires (Prometheus) 
    ↓
Webhook notification (Slack)
    ↓
PagerDuty escalation policy
    ↓
Engineer ACK + investigation
    ↓
Incident resolution
    ↓
Alert cleared (auto-resolved)
```

**Configuration**:
```yaml
# In AlertManager (prometheus.yml)
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

# In alertmanager.yml
route:
  receiver: 'pagerduty'
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_KEY'
        severity: 'critical'
```

---

### Q7: How often should I review my dashboard?

**Recommended schedule**:

| Frequency | Activity | Purpose |
|-----------|----------|---------|
| **Every shift** (hourly) | Check dashboard | Spot trends |
| **Daily** | Review alerts | Tune thresholds |
| **Weekly** | Analyze patterns | Identify bottlenecks |
| **Monthly** | Capacity planning | Add resources |
| **Quarterly** | Dashboard audit | Update alerts |

---

## Kubectl Commands for Observability

### Prometheus in Kubernetes

```bash
# Deploy Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Port forward to Prometheus
kubectl port-forward svc/prometheus-operated 9090:9090 -n monitoring

# Port forward to Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring

# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &
curl http://localhost:9090/api/v1/targets
```

### View logs for troubleshooting

```bash
# Prometheus logs
kubectl logs -n monitoring deployment/prometheus-operator

# Grafana logs
kubectl logs -n monitoring deployment/prometheus-grafana

# AlertManager logs
kubectl logs -n monitoring deployment/prometheus-alertmanager
```

---

## Tools & Resources

### Monitoring Tools

| Tool | Type | Use Case |
|------|------|----------|
| **Prometheus** | Metrics | Open-source time-series DB |
| **Grafana** | Visualization | Dashboards and UI |
| **Datadog** | Full Stack | Commercial all-in-one |
| **New Relic** | Full Stack | Commercial all-in-one |
| **Splunk** | Logging | Log aggregation |
| **ELK Stack** | Logging | Open-source logs |
| **Jaeger** | Tracing | Distributed tracing |
| **Datadog APM** | Tracing | Commercial APM |

### Recommended Reading

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [Google SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)
- [O'Reilly: Observability Engineering](https://www.oreilly.com/library/view/observability-engineering/9781492076438/)

---

## Maturity Levels

### Level 1: No Observability
```
Status: Manual debugging via logs
Problems: Slow issue resolution, high MTTR
Time to identify issue: Hours
```

### Level 2: Basic Monitoring
```
Status: Prometheus + basic dashboards
Problems: Alerts trigger too late, no context
Time to identify issue: 10-15 minutes
```

### Level 3: Alert-Driven Monitoring
```
Status: Metrics + dashboards + alerts
Problems: Alert fatigue, too many notifications
Time to identify issue: 2-5 minutes
```

### Level 4: Full Observability
```
Status: Metrics + Logs + Traces + Alerts
Problems: Minimal; can debug from alerts
Time to identify issue: < 1 minute
```

### Level 5: Predictive Observability
```
Status: ML-based anomaly detection
Problems: Prevents issues before they occur
Time to identify issue: Proactive alerting
```

---

## Next Steps & Roadmap

1. **Deploy Prometheus Operator** (1-2 weeks)
   - Helm-based Kubernetes deployment
   - Multi-cluster monitoring setup
   - Persistent storage configuration

2. **Implement Log Aggregation** (2-4 weeks)
   - ELK or Loki deployment
   - Log forwarding from all services
   - Dashboard for log search

3. **Add Distributed Tracing** (3-6 weeks)
   - Jaeger deployment
   - Instrumentation in services
   - Trace-based debugging

4. **Incident Response Automation** (4-8 weeks)
   - PagerDuty integration
   - Runbook automation
   - Chaos engineering tests

5. **Cost Optimization** (Ongoing)
   - Cardinality monitoring
   - Sampling strategies
   - Retention policies

---

## Support & Community

- **Issues**: Open issue in repo for questions
- **Slack**: #observability channel for discussions
- **Office Hours**: Weekly on Fridays 2pm UTC
- **Runbook**: [See main RUNBOOK.md](../RUNBOOK.md)

---

**Last Updated**: January 2026
**Maintained by**: Platform Engineering Team
**Version**: 1.0.0

