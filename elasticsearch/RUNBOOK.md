# Elasticsearch & OpenSearch: Production Runbook

**Purpose**: Operational procedures for deploying, managing, and maintaining Elasticsearch/OpenSearch clusters in production.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Standard Deployment Configuration](#2-standard-deployment-configuration)
3. [Cluster Management](#3-cluster-management)
4. [Monitoring & Health Checks](#4-monitoring--health-checks)
5. [Upgrades & Maintenance](#5-upgrades--maintenance)
6. [Disaster Recovery](#6-disaster-recovery)
7. [Troubleshooting](#7-troubleshooting)
8. [Essential Commands Reference](#8-essential-commands-reference)

---

## 1. Overview

This runbook covers operational procedures for Elasticsearch (commercial) and OpenSearch (open-source) clusters in production environments. Both platforms have similar operational requirements with some platform-specific differences noted where applicable.

**Assumed Audience**: Infrastructure/Database engineers with Linux and search engine knowledge.

---

## 2. Standard Deployment Configuration

### 2.1 Pre-Deployment Checklist

Before deployment, verify:

```bash
# System requirements
- [ ] Minimum 3 nodes for production (quorum)
- [ ] Each node: 8+ CPU cores, 32GB+ RAM
- [ ] Storage: SSD (3-5K IOPS per node)
- [ ] Network: 1Gbps+ bandwidth between nodes
- [ ] OS: Linux (RHEL 8+, Ubuntu 20.04+)
- [ ] Java: OpenJDK 11+ or vendor JDK
- [ ] Disk space: 2-3x data size minimum
- [ ] Open ports: 9200 (HTTP), 9300 (node communication)
```

### 2.2 System Tuning

Apply these kernel parameters before deployment:

```bash
# Increase file descriptors
sudo sysctl -w vm.max_map_count=262144

# Persist settings
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# Verify
sysctl vm.max_map_count
```

### 2.3 Installation Steps

**Using Package Manager (Ubuntu)**:

```bash
# 1. Add repository
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# 2. Install Elasticsearch
sudo apt-get update
sudo apt-get install -y elasticsearch

# 3. Enable and start service
sudo systemctl enable elasticsearch
sudo systemctl start elasticsearch

# 4. Verify
curl -u elastic:password localhost:9200
```

**Using Docker (Recommended for testing)**:

```bash
# Pull image
docker pull docker.elastic.co/elasticsearch/elasticsearch:8.6.0

# Run container
docker run -d --name elasticsearch \
  -e discovery.seed_hosts=es-node-2,es-node-3 \
  -e cluster.initial_master_nodes=es-node-1,es-node-2,es-node-3 \
  -e xpack.security.enabled=true \
  -e ELASTIC_PASSWORD=password123 \
  -p 9200:9200 \
  -p 9300:9300 \
  docker.elastic.co/elasticsearch/elasticsearch:8.6.0
```

### 2.4 Configuration (elasticsearch.yml)

**Minimal Production Config**:

```yaml
cluster.name: production-cluster
node.name: es-node-1

# Node roles
node.roles: [master, data]

# Network
network.host: 0.0.0.0
http.port: 9200
transport.port: 9300

# Discovery
discovery.seed_hosts: ["es-node-2:9300", "es-node-3:9300"]
cluster.initial_master_nodes: ["es-node-1", "es-node-2", "es-node-3"]

# Memory
-Xms16g
-Xmx16g  # 50% of available RAM, max 31GB

# Thread pools
thread_pool.search.size: 48
thread_pool.search.queue_size: 1000
thread_pool.bulk.size: 16
thread_pool.bulk.queue_size: 300

# Index management
action.auto_create_index: "+logs-*,+metrics-*,-.watches,-_daily_,-_monthly_"

# Security
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true

# Monitoring
xpack.monitoring.collection.enabled: true
```

### 2.5 Cluster Bootstrap

After installing all 3+ nodes, verify cluster formation:

```bash
# 1. Check cluster health
curl -u elastic:password localhost:9200/_cluster/health
# Expected: "status": "green"

# 2. List nodes
curl -u elastic:password localhost:9200/_cat/nodes

# 3. View cluster state
curl -u elastic:password localhost:9200/_cluster/state?pretty | head -50
```

---

## 3. Cluster Management

### 3.1 Adding Nodes to Cluster

**Steps**:

```bash
# 1. Install Elasticsearch on new node
# (Follow Section 2.3 installation steps)

# 2. Configure elasticsearch.yml with:
# - cluster.name: production-cluster (same as others)
# - node.name: es-node-4 (unique name)
# - discovery.seed_hosts: [list of existing nodes]
# - Initial master nodes not needed (only for bootstrap)

# 3. Start Elasticsearch
sudo systemctl start elasticsearch

# 4. Verify node joined
curl -u elastic:password localhost:9200/_cat/nodes -v

# 5. Check cluster health (may be yellow during rebalancing)
curl -u elastic:password localhost:9200/_cluster/health?wait_for_status=green
```

### 3.2 Removing Nodes Safely

**To remove a node without data loss**:

```bash
# 1. Exclude node from shard allocation
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "transient": {
    "cluster.routing.allocation.exclude._name": "es-node-4"
  }
}'

# 2. Wait for shards to migrate (monitor progress)
watch -n 5 'curl -s -u elastic:password localhost:9200/_cluster/health?pretty'
# Wait for unassigned_shards to reach 0

# 3. Stop service on node
ssh es-node-4
sudo systemctl stop elasticsearch

# 4. Remove node from discovery list in other nodes' config
# (Optional - node won't rejoin without manual restart)

# 5. Verify cluster health
curl -u elastic:password localhost:9200/_cluster/health
# Should return "green" with fewer nodes
```

### 3.3 Index Lifecycle Management (ILM)

**Create ILM Policy**:

```bash
curl -X PUT "localhost:9200/_ilm/policy/logs_policy" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "policy": "logs_policy",
  "phases": {
    "hot": {
      "min_age": "0d",
      "actions": {
        "rollover": {
          "max_primary_shard_size": "50GB",
          "max_age": "1d"
        }
      }
    },
    "warm": {
      "min_age": "7d",
      "actions": {
        "set_priority": { "priority": 25 },
        "forcemerge": { "max_num_segments": 1 }
      }
    },
    "cold": {
      "min_age": "30d",
      "actions": {
        "set_priority": { "priority": 0 }
      }
    },
    "delete": {
      "min_age": "90d",
      "actions": {
        "delete": {}
      }
    }
  }
}'
```

**Apply to Index**:

```bash
curl -X PUT "localhost:9200/logs/_settings" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "settings": {
    "index.lifecycle.name": "logs_policy",
    "index.lifecycle.rollover_alias": "logs"
  }
}'
```

---

## 4. Monitoring & Health Checks

### 4.1 Daily Health Check

**Run this every morning**:

```bash
#!/bin/bash
# health_check.sh

ES_HOST="localhost:9200"
ES_USER="elastic"
ES_PASS="password123"

echo "=== Cluster Health ==="
curl -s -u "$ES_USER:$ES_PASS" "$ES_HOST/_cluster/health" | jq '.status'

echo "=== Disk Usage ==="
curl -s -u "$ES_USER:$ES_PASS" "$ES_HOST/_cat/allocation?v" | head -10

echo "=== Heap Usage ==="
curl -s -u "$ES_USER:$ES_PASS" "$ES_HOST/_nodes/stats" | \
  jq '.nodes[] | {name, heap_percent: .jvm.mem.heap_percent}'

echo "=== Unassigned Shards ==="
curl -s -u "$ES_USER:$ES_PASS" "$ES_HOST/_cluster/health" | \
  jq '.unassigned_shards'

echo "=== Index Count ==="
curl -s -u "$ES_USER:$ES_PASS" "$ES_HOST/_cat/indices" | wc -l

echo "=== JVM GC Time ==="
curl -s -u "$ES_USER:$ES_PASS" "$ES_HOST/_nodes/stats/jvm" | \
  jq '.nodes[] | {name, gc_time_ms: .jvm.gc.collection_time_in_millis}'
```

### 4.2 Key Monitoring Metrics

| Metric | Healthy Range | Alert If |
|--------|---|---|
| Cluster Status | green | yellow or red |
| Heap Usage | < 85% | > 90% |
| Disk Usage | < 85% | > 90% |
| JVM GC Time | < 1% of total | > 2% |
| Query Latency p99 | < 200ms | > 500ms |
| Indexing Latency | < 100ms | > 500ms |
| Unassigned Shards | 0 | > 0 |

### 4.3 Monitoring Tools Setup

**Using Prometheus + Elasticsearch Exporter**:

```bash
# 1. Install exporter
docker run -d --name elasticsearch-exporter \
  -p 9114:9114 \
  prometheuscommunity/elasticsearch-exporter \
  --es.uri=http://es-node-1:9200

# 2. Add to Prometheus scrape config
cat >> /etc/prometheus/prometheus.yml << 'EOF'
- job_name: 'elasticsearch'
  static_configs:
    - targets: ['localhost:9114']
EOF

# 3. Verify metrics collected
curl localhost:9114/metrics | grep es_
```

---

## 5. Upgrades & Maintenance

### 5.1 Minor Version Upgrade (e.g., 8.5 → 8.6)

**Rolling upgrade (zero downtime)**:

```bash
# 1. Disable shard allocation
curl -X PUT "localhost:9200/_cluster/settings" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "transient": {
    "cluster.routing.allocation.enable": "primaries"
  }
}'

# 2. Stop one node
sudo systemctl stop elasticsearch

# 3. Upgrade package
sudo apt-get upgrade elasticsearch

# 4. Start node and wait for recovery
sudo systemctl start elasticsearch
sleep 30
curl -u elastic:password localhost:9200/_cluster/health?wait_for_status=yellow

# 5. Repeat steps 2-4 for each node

# 6. Re-enable shard allocation
curl -X PUT "localhost:9200/_cluster/settings" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "transient": {
    "cluster.routing.allocation.enable": "all"
  }
}'

# 7. Wait for cluster to be green
curl -u elastic:password localhost:9200/_cluster/health?wait_for_status=green
```

### 5.2 Snapshot Backup

**Create repository (S3 example)**:

```bash
curl -X PUT "localhost:9200/_snapshot/s3-backup" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "type": "s3",
  "settings": {
    "bucket": "my-elasticsearch-backups",
    "region": "us-east-1",
    "compress": true
  }
}'
```

**Create snapshot**:

```bash
curl -X PUT "localhost:9200/_snapshot/s3-backup/snapshot-$(date +%Y%m%d)" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "indices": "logs-*,metrics-*",
  "include_global_state": true,
  "wait_for_completion": false
}'

# Monitor progress
curl -u elastic:password localhost:9200/_snapshot/s3-backup/_status
```

### 5.3 Maintenance Window Procedure

**Schedule: 2:00 AM - 4:00 AM UTC (Low traffic)**

```bash
# 1. Notify team (do this 24 hours before)
echo "Maintenance window: 2024-02-07 02:00-04:00 UTC"

# 2. 10 minutes before: Disable alerts
# (Pause alerting in monitoring system)

# 3. Execute upgrade (Section 5.1)

# 4. Verify everything working
curl -u elastic:password localhost:9200/_cluster/health
curl -u elastic:password localhost:9200/_cat/indices?v | head -20

# 5. Test search functionality
curl -u elastic:password "localhost:9200/logs-*/_search?size=1"

# 6. Re-enable alerts
# (Resume alerting in monitoring system)

# 7. Send completion notification
echo "Maintenance completed successfully"
```

---

## 6. Disaster Recovery

### 6.1 Backup Strategy

**Recommended**:
- Daily snapshots (kept for 30 days)
- Weekly snapshots (kept for 1 year)
- Monthly snapshots (kept for 7 years)

**Automated backup script**:

```bash
#!/bin/bash
# backup.sh - Run daily via cron

CLUSTER="https://elastic:password@localhost:9200"
REPO="s3-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create snapshot
curl -X PUT "$CLUSTER/_snapshot/$REPO/snapshot_$TIMESTAMP" \
  -H 'Content-Type: application/json' \
  -d '{
  "indices": "logs-*,metrics-*",
  "include_global_state": true
}'

# Wait for completion
while true; do
  STATUS=$(curl -s "$CLUSTER/_snapshot/$REPO/snapshot_$TIMESTAMP" | jq '.snapshots[0].state')
  if [ "$STATUS" = '"SUCCESS"' ]; then
    echo "Snapshot $TIMESTAMP completed"
    break
  fi
  sleep 10
done
```

### 6.2 Restore from Snapshot

**Partial restore** (specific indices):

```bash
# 1. Check available snapshots
curl -u elastic:password localhost:9200/_snapshot/s3-backup/_all

# 2. Restore specific index
curl -X POST "localhost:9200/_snapshot/s3-backup/snapshot-20240131/_restore" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "indices": "logs-2024.01.*",
  "rename_pattern": "(.+)",
  "rename_replacement": "$1-restored"
}'

# 3. Wait for restore to complete
watch -n 5 'curl -s -u elastic:password localhost:9200/_cluster/health?pretty'
```

**Full cluster restore** (complete disaster recovery):

```bash
# 1. Spin up new Elasticsearch cluster (3+ nodes)

# 2. Restore all indices from snapshot
curl -X POST "localhost:9200/_snapshot/s3-backup/snapshot-20240131/_restore" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "indices": "*"
}'

# 3. Wait for recovery
curl -u elastic:password localhost:9200/_cluster/health?wait_for_status=green

# 4. Verify data integrity
curl -u elastic:password "localhost:9200/_cat/indices?v" | wc -l
```

### 6.3 Cross-Cluster Replication (CCR)

For remote disaster recovery site:

```bash
# On leader cluster:
curl -X PUT "localhost:9200/_cluster/settings" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "persistent": {
    "cluster.remote.follower.seeds": ["remote-cluster-node:9300"]
  }
}'

# On follower cluster:
curl -X PUT "localhost:9200/_ccr/follow" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "remote_cluster": "leader",
  "leader_index": "logs-*"
}'
```

---

## 7. Troubleshooting

### 7.1 Common Issues

**Issue: Cluster Status RED**

```bash
# 1. Check cluster health
curl -u elastic:password localhost:9200/_cluster/health?pretty

# 2. Find missing primary shards
curl -u elastic:password "localhost:9200/_cat/shards?h=index,shard,prirep,state,unassigned.reason" | \
  grep UNASSIGNED

# 3. Options:
# Option A: Wait (if node recovering)
# Option B: Add more nodes
# Option C: Force allocate (data loss risk):
curl -X POST "localhost:9200/_cluster/reroute?allow_primary=true" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "commands": [{
    "allocate_empty_primary": {
      "index": "logs-2024.01.31",
      "shard": 0,
      "node": "es-node-1"
    }
  }]
}'
```

**Issue: High Heap Usage (> 90%)**

```bash
# 1. Check what's using memory
curl -u elastic:password localhost:9200/_nodes/stats/jvm | \
  jq '.nodes[] | {name, heap_max_in_bytes, heap_used_in_bytes}'

# 2. Check for long-running queries
curl -u elastic:password "localhost:9200/_tasks?detailed=true&actions=*search*"

# 3. Options:
# Option A: Restart node (graceful)
curl -X POST "localhost:9200/_nodes/es-node-1/_shutdown" \
  -u elastic:password

# Option B: Increase heap size (edit elasticsearch.yml, restart)
# Option C: Add more nodes (distribute load)
```

**Issue: Slow Queries**

```bash
# 1. Enable slow query logging
curl -X PUT "localhost:9200/_cluster/settings" \
  -H 'Content-Type: application/json' \
  -u elastic:password -d '{
  "transient": {
    "logger.index.search.slowlog": "INFO",
    "index.search.slowlog.threshold.query.warn": "1s",
    "index.search.slowlog.threshold.query.info": "100ms"
  }
}'

# 2. Check slow query logs
tail -100f /var/log/elasticsearch/slowlog.log

# 3. Optimize (pick one or more):
# - Add timestamp filter (reduce data scanned)
# - Simplify aggregations
# - Use smaller shards (< 50GB)
# - Add more data nodes
```

### 7.2 Emergency Procedures

**Cluster Won't Start**

```bash
# 1. Check logs
tail -100 /var/log/elasticsearch/elasticsearch.log

# 2. Common causes:
# - Not enough disk space (clear old indices)
# - Bad configuration file (syntax error)
# - Java version mismatch (upgrade Java)
# - Permission issues (check file ownership)

# 3. Recover:
sudo chown -R elasticsearch:elasticsearch /var/lib/elasticsearch
sudo systemctl start elasticsearch
```

**Complete Data Loss Recovery**

```bash
# 1. If snapshot exists:
# Follow Section 6.2 full cluster restore

# 2. If no snapshot:
# - Accept data loss
# - Restart cluster
# - Restart data ingestion

# Prevention: Always maintain backups!
```

---

## 8. Essential Commands Reference

### Cluster Operations

```bash
# Health status
curl -u elastic:password localhost:9200/_cluster/health

# Cluster info
curl -u elastic:password localhost:9200/

# Nodes information
curl -u elastic:password localhost:9200/_nodes

# Cluster settings
curl -u elastic:password localhost:9200/_cluster/settings

# Update cluster setting
curl -X PUT "localhost:9200/_cluster/settings" -d '{"transient": {...}}'
```

### Index Operations

```bash
# List all indices
curl -u elastic:password localhost:9200/_cat/indices

# Index statistics
curl -u elastic:password localhost:9200/<index>/_stats

# Get index settings
curl -u elastic:password localhost:9200/<index>/_settings

# Update index settings
curl -X PUT "localhost:9200/<index>/_settings" -d '{"settings": {...}}'

# Delete old indices
curl -X DELETE "localhost:9200/logs-2024.01.*"
```

### Shard Operations

```bash
# List shard allocation
curl -u elastic:password localhost:9200/_cat/shards

# Explain shard allocation
curl -u elastic:password "localhost:9200/_cluster/allocation/explain?pretty"

# Force shard move
curl -X POST "localhost:9200/_cluster/reroute" -d '{
  "commands": [{
    "move": {
      "index": "logs-2024.01.31",
      "shard": 0,
      "from_node": "es-node-1",
      "to_node": "es-node-2"
    }
  }]
}'
```

### Snapshot Operations

```bash
# Create snapshot
curl -X PUT "localhost:9200/_snapshot/repo/snapshot-name" -d '{...}'

# List snapshots
curl -u elastic:password localhost:9200/_snapshot/repo/_all

# Restore from snapshot
curl -X POST "localhost:9200/_snapshot/repo/snapshot-name/_restore"

# Delete snapshot
curl -X DELETE "localhost:9200/_snapshot/repo/snapshot-name"
```

---

## Runbook Maintenance

**Last Updated**: January 31, 2026  
**Maintained By**: Database & Search Team  
**Contact**: ops-team@example.com

For immediate help:
- Check [CONCEPT.md](./CONCEPT.md) for technical details
- Consult [WORKSHOP.md](./WORKSHOP.md) for hands-on learning
- Review [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/)

---

**Critical Contacts**:
- On-Call DBA: [Phone/Pager]
- Database Team Slack: #elasticsearch-support
- Escalation: Database Team Lead
