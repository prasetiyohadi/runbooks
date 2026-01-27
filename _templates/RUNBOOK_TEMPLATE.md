# [Technology Name] Production Runbook

## 1. Overview
[Brief description of the technology and its role in the platform. Example: "This runbook details the operational procedures for managing Redis clusters using the Redis Operator."]

## 2. Standard Deployment Configuration

### 2.1 High Availability & Resources
For production clusters, strictly follow these standards:

- **Replicas**: [Minimum number, e.g., 3]
- **Resources**:
    - Requests: [CPU/Memory]
    - Limits: [CPU/Memory]
- **Storage**: [Size, Class, Separation strategy]

**Manifest Template:**
```yaml
# Paste the production-grade YAML here
apiVersion: v1
kind: Service
metadata:
  name: example
spec:
  # ...
```

### 2.2 Monitoring
- **Metrics**: [Ports to scrape, critical metrics]
- **Dashboards**: [Link to Grafana Dashboard]
- **Alerts**: [Top 3 critical alerts to watch]

---

## 3. Storage Management

### 3.1 Increasing Capacity
**Supported**: [Yes/No]
**Procedure**:
1. [Step 1]
2. [Step 2]

---

## 4. Upgrades & Maintenance

### 4.1 Minor Version Upgrade
**Impact**: [e.g., Rolling update, no downtime]
**Procedure**:
1. Update image tag: `image: v1.0 -> v1.1`
2. Apply manifest.

### 4.2 Major Version Upgrade
**Pre-requisites**: [Backups, etc.]
**Procedure**:
1. [Step 1]
2. [Step 2]

---

## 5. Disaster Recovery

### 5.1 Backup Strategy
- **Frequency**: [Daily/Hourly]
- **Retention**: [Days]
- **Location**: [S3 Bucket/Path]

### 5.2 Restoration Procedure
To restore to a specific point in time:

1. [Step 1]
2. [Step 2]

---

## 6. Troubleshooting

### 6.1 Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| [Name] | [Error Log/Behavior] | [Action] |
| [Name] | [Error Log/Behavior] | [Action] |

### 6.2 Essential Commands

- **Check Status**:
  `kubectl get pods -l app=example`
- **Connect towards instance**:
  `kubectl exec -it <pod> -- sh`
