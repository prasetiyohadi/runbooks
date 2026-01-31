# Observability Workshop: Hands-On Monitoring Lab

## Overview

This workshop provides a practical, hands-on introduction to observability by setting up a local monitoring stack and generating real alerts.

**Duration**: 120 minutes (6 parts, 18 tasks)
**Prerequisites**: Docker, curl, basic Kubernetes knowledge
**Outcome**: Working monitoring stack with metrics, dashboards, and alerts

---

## Part 1: Local Monitoring Stack Setup (15 min)

### Objective
Set up Prometheus and Grafana locally using Docker Compose.

### Task 1.1: Create docker-compose.yml

Create a file `docker-compose.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_SECURITY_ADMIN_USER: admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - monitoring
    depends_on:
      - prometheus

  sample_app:
    image: kennethreitz/httpbin:latest
    container_name: sample_app
    ports:
      - "5000:80"
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
```

### Task 1.2: Create Prometheus Configuration

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'sample_app'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['sample_app:5000']
```

### Task 1.3: Start the Stack

```bash
# Navigate to directory with docker-compose.yml
docker-compose up -d

# Verify containers running
docker ps | grep -E "prometheus|grafana|sample_app"

# Expected output:
# CONTAINER ID   IMAGE                          PORTS
# abc123def     prom/prometheus:latest         0.0.0.0:9090->9090/tcp
# def456abc     grafana/grafana:latest         0.0.0.0:3000->3000/tcp
# ghi789jkl     kennethreitz/httpbin:latest    0.0.0.0:5000->80/tcp
```

### Task 1.4: Verify Prometheus Health

```bash
# Access Prometheus UI
curl http://localhost:9090

# Check targets
curl http://localhost:9090/api/v1/targets

# Expected output: targets array with "UP" status
```

### Task 1.5: Access Grafana

```bash
# Open browser
# http://localhost:3000
# Username: admin
# Password: admin

# Then change password (recommended):
# Profile → Change Password
```

---

## Part 2: Metrics Generation & Collection (30 min)

### Objective
Create a Python application that exposes Prometheus metrics.

### Task 2.1: Create Flask Metrics App

Create `app.py`:

```python
from flask import Flask, Response, request
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import time
import random

app = Flask(__name__)

# Define metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0)
)

ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Number of active connections'
)

# Track connections
@app.before_request
def before_request():
    ACTIVE_CONNECTIONS.inc()
    request.start_time = time.time()

@app.after_request
def after_request(response):
    ACTIVE_CONNECTIONS.dec()
    
    # Record metrics
    latency = time.time() - request.start_time
    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.path
    ).observe(latency)
    
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.path,
        status=response.status_code
    ).inc()
    
    return response

# Application endpoints
@app.route('/login', methods=['POST'])
def login():
    # Simulate random latency (50-200ms)
    time.sleep(random.uniform(0.05, 0.2))
    return {'status': 'ok'}, 200

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    # Occasionally fail (5% error rate)
    if random.random() < 0.05:
        return {'error': 'user not found'}, 404
    
    time.sleep(random.uniform(0.02, 0.1))
    return {'id': user_id, 'name': 'User'}, 200

@app.route('/api/orders', methods=['POST'])
def create_order():
    # Slow endpoint (200-500ms)
    time.sleep(random.uniform(0.2, 0.5))
    return {'order_id': random.randint(1000, 9999)}, 201

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'healthy'}, 200

# Expose metrics
@app.route('/metrics', methods=['GET'])
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)
```

### Task 2.2: Create Dockerfile for App

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN pip install flask prometheus_client

COPY app.py .

EXPOSE 8080

CMD ["python", "app.py"]
```

### Task 2.3: Update docker-compose.yml

Update `docker-compose.yml` to include the app:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_SECURITY_ADMIN_USER: admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - monitoring
    depends_on:
      - prometheus

  app:
    build: .
    container_name: metrics_app
    ports:
      - "8080:8080"
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
```

### Task 2.4: Update prometheus.yml

Add the app to scrape config:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'metrics_app'
    static_configs:
      - targets: ['app:8080']
```

### Task 2.5: Build and Run App

```bash
# Build Docker image
docker-compose build app

# Start all services
docker-compose up -d

# Wait 30 seconds for Prometheus to scrape metrics
sleep 30

# Verify metrics are collected
curl http://localhost:8080/metrics | head -20

# Expected output:
# # HELP http_requests_total Total HTTP requests
# # TYPE http_requests_total counter
# http_requests_total{endpoint="/login",method="POST",status="200"} 5.0
# ...
```

### Task 2.6: Generate Traffic

Generate traffic to create metrics:

```bash
# Generate login requests (fast)
for i in {1..100}; do
  curl -X POST http://localhost:8080/login &
done
wait

# Generate user API requests
for i in {1..50}; do
  curl http://localhost:8080/api/users/$((RANDOM % 100)) &
done
wait

# Generate order API requests (slower)
for i in {1..20}; do
  curl -X POST http://localhost:8080/api/orders &
done
wait

echo "Traffic generation complete"
```

---

## Part 3: Dashboards & Visualization (30 min)

### Objective
Create Grafana dashboards to visualize metrics.

### Task 3.1: Add Prometheus Data Source

1. Open Grafana: http://localhost:3000
2. Navigate to: Configuration (gear icon) → Data Sources
3. Click "Add data source"
4. Select "Prometheus"
5. Set URL: `http://prometheus:9090`
6. Click "Save & Test"

**Expected**: "Data source is working"

### Task 3.2: Create Requests Dashboard

1. Click "+" (New Dashboard)
2. Click "Add panel"
3. Select Prometheus query type
4. Enter query: `sum(rate(http_requests_total[5m])) by (endpoint)`
5. Set title: "Requests per Endpoint"
6. Click "Save" → Name: "Application Metrics"

### Task 3.3: Add Latency Panel

1. Click "Add panel"
2. Query: `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))`
3. Title: "P99 Latency by Endpoint"
4. Save

### Task 3.4: Add Error Rate Panel

1. Click "Add panel"
2. Query: `sum(rate(http_requests_total{status=~"5.."}[5m])) by (endpoint) / sum(rate(http_requests_total[5m])) by (endpoint)`
3. Title: "Error Rate by Endpoint"
4. Format as percentage
5. Save

### Task 3.5: Add Connection Gauge

1. Click "Add panel"
2. Query: `active_connections`
3. Title: "Active Connections"
4. Visualization: "Stat" (gauge)
5. Save

---

## Part 4: Alerting (20 min)

### Objective
Create alert rules and test triggering alerts.

### Task 4.1: Create Alert Rules File

Create `alert_rules.yml`:

```yaml
groups:
  - name: application_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (endpoint)
          /
          sum(rate(http_requests_total[5m])) by (endpoint)
          > 0.05
        for: 2m
        annotations:
          summary: "High error rate on {{ $labels.endpoint }}"
          description: "Error rate is {{ $value | humanizePercentage }}"
        labels:
          severity: warning

      - alert: HighLatency
        expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)) > 1
        for: 2m
        annotations:
          summary: "High latency on {{ $labels.endpoint }}"
          description: "P99 latency is {{ $value }}s"
        labels:
          severity: warning

      - alert: HighConnectionCount
        expr: active_connections > 50
        for: 1m
        annotations:
          summary: "High connection count"
          description: "Active connections: {{ $value }}"
        labels:
          severity: info
```

### Task 4.2: Update prometheus.yml with Alert Rules

Update `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alert_rules.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'metrics_app'
    static_configs:
      - targets: ['app:8080']
```

### Task 4.3: Restart Prometheus

```bash
docker restart prometheus

# Wait 30 seconds for Prometheus to reload rules
sleep 30

# Verify alerts loaded
curl http://localhost:9090/api/v1/rules | grep -o '"name":"[^"]*"' | head -10

# Expected: Should see alert names like "HighErrorRate", "HighLatency"
```

### Task 4.4: Trigger High Error Rate Alert

Create an endpoint that returns errors:

```bash
# Generate 100 errors rapidly
for i in {1..100}; do
  # Call /api/users with force errors somehow
  # For now, generate invalid requests
  curl http://localhost:8080/api/users/invalid &
done
wait

# Wait 2 minutes for alert to fire (for: 2m threshold)
echo "Waiting for alert to fire..."
sleep 120

# Check alert status
curl http://localhost:9090/api/v1/alerts | grep -i "HighErrorRate"
```

### Task 4.5: View Fired Alerts in Prometheus

1. Open http://localhost:9090/alerts
2. Look for alerts with status "FIRING" (red)
3. Click on alert to see details
4. Note: Severity label and annotation message

**Expected**: Alert shows "High error rate on /api/users" with value > 5%

### Task 4.6: View Alerts in Grafana

1. Open Grafana: http://localhost:3000
2. Navigate to: Alerting (bell icon) → Alert Rules
3. Should see list of configured alerts
4. Click on fired alert to see details

---

## Part 5: Metrics Cardinality Analysis (20 min)

### Objective
Understand and optimize metric cardinality.

### Task 5.1: Query Cardinality

Check current metric cardinality:

```bash
# Get total unique metrics
curl http://localhost:9090/api/v1/query?query='count(count(%7B__name__%7D) by (__name__))' | jq '.data.result[0].value[1]'

# Expected: Should show hundreds (each unique metric)

# Get cardinality by metric type
curl http://localhost:9090/api/v1/query?query='topk(10, count by (__name__) (count(%7B__name__%7D) by (__name__, le)))' | jq '.data.result[] | {metric: .__name__, value: .value[1]}'

# Expected output shows cardinality per metric
```

### Task 5.2: Identify High Cardinality Metrics

```bash
# Check http_requests_total cardinality
curl 'http://localhost:9090/api/v1/query?query=count(http_requests_total)' | jq '.data.result[0].value[1]'

# Expected: Multiple combinations of method, endpoint, status

# Show all combinations
curl 'http://localhost:9090/api/v1/query?query=http_requests_total' | jq '.data.result[] | {metric: .metric, value: .value[1]}'
```

### Task 5.3: Calculate Histogram Cardinality Impact

```
Metric: http_request_duration_seconds (histogram)

Cardinality formula:
  Base cardinality = unique (method, endpoint) combinations
  Histogram cardinality = Base × 5 (count, sum, bucket, min, max)

Example:
  method: [GET, POST]                 (2 values)
  endpoint: [/login, /api/users, /api/orders] (3 values)
  
  Base cardinality = 2 × 3 = 6
  Histogram cardinality = 6 × 5 = 30 unique metrics
```

### Task 5.4: Generate High Cardinality Scenario

Simulate problematic metric (DO NOT use user_id in production):

```python
# Example of HIGH CARDINALITY (BAD):
user_request_total{user_id=?, endpoint=?}

If 1M users × 10 endpoints = 10M unique metrics (EXPENSIVE!)

# Fix: Remove user_id or aggregate
request_total{endpoint=?}  # Cardinality = 10
```

### Task 5.5: Cardinality Budget Recommendations

```yaml
Environment: Production
Service: order-api
Budget: 1000 unique metrics per service

Breakdown:
  Core metrics (5 services): 200 metrics
  Custom business metrics: 300 metrics
  Infrastructure (CPU, memory): 200 metrics
  Dependencies (DB, cache): 150 metrics
  Reserve: 150 metrics

Total: 1000 metrics (at budget)

Alert if cardinality > 1100 (10% overage)
```

---

## Part 6: Incident Response Simulation (25 min)

### Objective
Practice responding to an alert using observability data.

### Task 6.1: Create Performance Degradation

Modify `app.py` to add latency:

```python
# Add after imports
SLOW_MODE = False

# In create_order() function:
@app.route('/api/orders', methods=['POST'])
def create_order():
    if SLOW_MODE:
        time.sleep(random.uniform(2.0, 5.0))  # Much slower
    else:
        time.sleep(random.uniform(0.2, 0.5))
    return {'order_id': random.randint(1000, 9999)}, 201

# Add new endpoint to trigger slow mode
@app.route('/debug/enable_slow_mode', methods=['POST'])
def enable_slow_mode():
    global SLOW_MODE
    SLOW_MODE = True
    return {'message': 'Slow mode enabled'}
```

Rebuild and restart:

```bash
docker-compose build app
docker-compose up -d app
```

### Task 6.2: Trigger Incident

```bash
# Enable slow mode
curl -X POST http://localhost:8080/debug/enable_slow_mode

# Generate order requests to trigger latency alert
for i in {1..100}; do
  curl -X POST http://localhost:8080/api/orders &
done
wait

# Wait for alert to fire
echo "Alert should fire in ~2-3 minutes..."
sleep 180

# Check alert status
curl http://localhost:9090/api/v1/alerts | grep -i "HighLatency"
```

### Task 6.3: Investigation Using Metrics

```bash
# Step 1: Check request rate
curl 'http://localhost:9090/api/v1/query?query=sum(rate(http_requests_total%5B5m%5D)) by (endpoint)' | jq '.data.result[] | select(.metric.endpoint == "/api/orders")'

# Step 2: Check latency
curl 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket%5B5m%5D)) by (le, endpoint))' | jq '.data.result[] | select(.metric.endpoint == "/api/orders")'

# Step 3: Check error rate
curl 'http://localhost:9090/api/v1/query?query=http_requests_total{endpoint="/api/orders", status=~"5.."}' | jq '.data.result[] | .value'
```

### Task 6.4: View in Dashboards

1. Open Grafana dashboard
2. Observe:
   - Requests per Endpoint: /api/orders traffic increased
   - P99 Latency: /api/orders jumped to 2-5 seconds
   - Error Rate: Likely no errors (still completing, just slow)
3. These metrics tell you: "Service is slow, not broken"

### Task 6.5: Resolution

```bash
# Disable slow mode (simulate fix)
curl -X POST http://localhost:8080/debug/disable_slow_mode

# Generate normal traffic
for i in {1..50}; do
  curl -X POST http://localhost:8080/api/orders &
done
wait

# Wait for latency to return to normal
echo "Waiting for recovery..."
sleep 120

# Check alert status (should be resolved)
curl http://localhost:9090/api/v1/alerts | grep -i "HighLatency"
```

### Task 6.6: Post-Incident Review

Document findings:

```markdown
## Incident: High Latency on Order API

**Duration**: 10:15 - 10:45 UTC (30 minutes)
**Severity**: WARNING → CRITICAL

**Detection**: 
- Alert: HighLatency fired at 10:15
- P99 latency: 50ms → 2500ms (50x increase)

**Root Cause**:
- Slow database query triggered
- Connection pool exhaustion suspected

**Resolution**:
- Restarted order service
- Latency returned to normal

**Prevention**:
- Add index to frequently queried column
- Implement connection pooling limits
- Test with load to catch issues earlier
```

---

## Cleanup & Validation

### Task: Cleanup

```bash
# Stop containers
docker-compose down

# Remove volumes (optional)
docker-compose down -v

# Verify cleanup
docker ps | grep -i prometheus
# (Should show no results)
```

### Validation Checklist

- [ ] Prometheus collected metrics from app
- [ ] Grafana dashboard created with 4+ panels
- [ ] Alert rules loaded in Prometheus
- [ ] Alert fired when threshold exceeded
- [ ] Metrics visualized over time
- [ ] Cardinality analyzed and understood
- [ ] Incident response practiced
- [ ] Dashboard showed performance degradation

---

## Common Issues & Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Prometheus shows "DOWN" for app | App not running | Check: `docker ps` and logs |
| No metrics appearing | Scrape interval not elapsed | Wait 30s after app starts |
| Grafana can't connect to Prometheus | Network issue | Verify containers on same network |
| Alert won't fire | Threshold too high | Lower threshold and test |
| High cardinality metrics | Too many tag values | Remove or group tags |

---

## Next Steps

1. **Deploy to Kubernetes**: Use Prometheus Operator for production
2. **Implement APM**: Add distributed tracing with Jaeger
3. **Multi-cluster monitoring**: Aggregate metrics from multiple clusters
4. **Custom dashboards**: Build service-specific dashboards
5. **Alert routing**: Configure PagerDuty/OpsGenie integration

---

**Workshop Completion Estimated Time**: 120 minutes
**Skills Gained**: Metrics collection, dashboard creation, alerting, incident response

