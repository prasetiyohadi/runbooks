# Elasticsearch & OpenSearch: Quick Reference Guide

**Quick Links**: [Concepts](./CONCEPT.md) | [Runbook](./RUNBOOK.md) | [Workshop](./WORKSHOP.md) | [Business Case](./BUSINESS.md)

---

## Table of Contents

- [Overview](#overview)
- [Learning Paths](#learning-paths)
- [Quick Start](#quick-start)
- [Essential Commands](#essential-commands)
- [Common Use Cases](#common-use-cases)
- [FAQ](#faq)
- [Tools & Extensions](#tools--extensions)
- [Production Checklist](#production-checklist)
- [Troubleshooting Quick Reference](#troubleshooting-quick-reference)

---

## Overview

**Elasticsearch** is a distributed search and analytics engine for logs, metrics, and full-text search.
**OpenSearch** is the open-source alternative, offering similar capabilities without proprietary licensing.

Both platforms excel at:
- Real-time search across billions of documents
- Time-series data analytics (logs, metrics)
- Application performance monitoring
- Full-text search and relevance ranking
- Security event and anomaly detection

---

## Learning Paths

### 🟢 Beginner (Weeks 0-2)

**Goal**: Understand core concepts and run basic queries

| Week | Topics | Actions |
|------|--------|---------|
| **Week 1** | Architecture basics, cluster setup, indexing fundamentals | <ul><li>Read CONCEPT.md Sections 1-5</li><li>Deploy single-node cluster (Workshop Part 1)</li><li>Create first index and document</li></ul> |
| **Week 2** | Basic queries, simple dashboards | <ul><li>Master Query DSL (CONCEPT.md Section 6)</li><li>Write 10 different query types</li><li>Complete WORKSHOP Part 2</li></ul> |

**Success Criteria**: Can create index, index documents, write basic queries, view data in dashboard

---

### 🟡 Intermediate (Weeks 2-6)

**Goal**: Deploy and manage production clusters

| Week | Topics | Actions |
|------|--------|---------|
| **Week 3-4** | Multi-node cluster, shard management, replication | <ul><li>Deploy 3-node cluster (RUNBOOK Section 2)</li><li>Configure ILM policies</li><li>Complete WORKSHOP Part 3</li></ul> |
| **Week 5** | Monitoring, alerting, basic tuning | <ul><li>Set up Kibana/OpenSearch Dashboards</li><li>Configure alerts (CONCEPT.md Section 12)</li><li>Complete WORKSHOP Part 4</li></ul> |
| **Week 6** | Performance optimization, troubleshooting | <ul><li>Analyze slow queries</li><li>Optimize heap and thread pools</li><li>Troubleshoot common issues</li></ul> |

**Success Criteria**: Can deploy production cluster, monitor health, respond to alerts, optimize performance

---

### 🔴 Advanced (Weeks 6+)

**Goal**: Enterprise scale and cross-cluster operations

| Week | Topics | Actions |
|------|--------|---------|
| **Week 7-8** | Disaster recovery, cross-cluster replication, security | <ul><li>Implement backup/restore (RUNBOOK Section 5)</li><li>Set up CCR for DR</li><li>Configure LDAP/SSO (CONCEPT.md Section 10)</li></ul> |
| **Week 9-10** | Advanced querying, machine learning, custom analytics | <ul><li>Complex aggregations and transforms</li><li>ML anomaly detection</li><li>Complete WORKSHOP Part 5-6</li></ul> |
| **Week 11+** | Enterprise patterns, cost optimization, global deployments | <ul><li>Multi-cluster architecture (CONCEPT.md Section 15)</li><li>Tiered storage setup</li><li>Cross-region replication</li></ul> |

**Success Criteria**: Can manage global infrastructure, implement disaster recovery, optimize costs at scale

---

## Quick Start

### Installation (Single Node - Development)

```bash
# Using Docker
docker run -d --name elasticsearch \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  -p 9200:9200 \
  docker.elastic.co/elasticsearch/elasticsearch:8.0.0

# Or OpenSearch
docker run -d --name opensearch \
  -e discovery.type=single-node \
  -e OPENSEARCH_JAVA_OPTS="-Xms512m -Xmx512m" \
  -p 9200:9200 \
  opensearchproject/opensearch:2.0.0
```

### Create Your First Index

```bash
# Create index with mappings
curl -X PUT "localhost:9200/my-index" -H 'Content-Type: application/json' -d'{
  "mappings": {
    "properties": {
      "message": { "type": "text" },
      "timestamp": { "type": "date" },
      "level": { "type": "keyword" }
    }
  }
}'

# Index a document
curl -X POST "localhost:9200/my-index/_doc" -H 'Content-Type: application/json' -d'{
  "message": "Application started",
  "timestamp": "2024-01-31T10:30:00Z",
  "level": "INFO"
}'

# Search documents
curl "localhost:9200/my-index/_search?q=started"
```

### Access Dashboards

- **Elasticsearch**: Kibana at `http://localhost:5601`
- **OpenSearch**: OpenSearch Dashboards at `http://localhost:5601`

---

## Essential Commands

### Cluster Health & Status

```bash
# Cluster health (green/yellow/red)
curl localhost:9200/_cluster/health

# Node information
curl localhost:9200/_nodes | jq .

# Cluster stats
curl localhost:9200/_cluster/stats | jq '.indices, .nodes'

# Show all indices
curl localhost:9200/_cat/indices?v

# Show all nodes
curl localhost:9200/_cat/nodes?v
```

### Index Operations

```bash
# Create index
curl -X PUT "localhost:9200/logs-2024.01.31"

# Delete index
curl -X DELETE "localhost:9200/logs-2024.01.31"

# Get index settings
curl "localhost:9200/logs-2024.01.31/_settings"

# Update index settings
curl -X PUT "localhost:9200/logs-2024.01.31/_settings" -d '{
  "index.refresh_interval": "30s"
}'

# Get index mappings
curl "localhost:9200/logs-2024.01.31/_mapping"

# Reindex data
curl -X POST "localhost:9200/_reindex" -d '{
  "source": { "index": "old-index" },
  "dest": { "index": "new-index" }
}'
```

### Document Operations

```bash
# Index document
curl -X POST "localhost:9200/logs/_doc" -d '{...}'

# Get document
curl "localhost:9200/logs/_doc/1"

# Update document
curl -X POST "localhost:9200/logs/_update/1" -d '{
  "doc": { "field": "new_value" }
}'

# Delete document
curl -X DELETE "localhost:9200/logs/_doc/1"

# Bulk operations
curl -X POST "localhost:9200/_bulk" --data-binary @bulk-file.jsonl
```

### Search Queries

```bash
# Simple match query
curl "localhost:9200/logs/_search" -d '{
  "query": {
    "match": { "message": "error" }
  }
}'

# Filter + aggregation
curl "localhost:9200/logs/_search" -d '{
  "query": {
    "range": { "timestamp": { "gte": "now-1h" } }
  },
  "aggs": {
    "error_count": {
      "terms": { "field": "level" }
    }
  }
}'

# Get top results with pagination
curl "localhost:9200/logs/_search?size=100&from=0"
```

---

## Common Use Cases

### Use Case 1: Application Logging

**Setup**:
```
App → Filebeat → Elasticsearch → Kibana Dashboard
```

**Index Pattern**: `logs-application-YYYY.MM.DD`

**Key Queries**:
```json
{
  "query": {
    "bool": {
      "filter": [
        { "range": { "@timestamp": { "gte": "now-1d" } } },
        { "term": { "level": "ERROR" } }
      ]
    }
  }
}
```

### Use Case 2: Infrastructure Monitoring

**Setup**:
```
Servers → Metricbeat → Elasticsearch → Alerts
```

**Key Metrics**: CPU, memory, disk, network

**Alert Example**: CPU > 80% for 5 minutes

### Use Case 3: Full-Text Search (E-commerce)

**Index**: Products with title, description, tags

**Query**:
```json
{
  "query": {
    "multi_match": {
      "query": "wireless headphones",
      "fields": ["title^3", "description", "tags^2"]
    }
  }
}
```

### Use Case 4: Security & Compliance

**Setup**: Centralized event collection from all systems

**Alerts**: Suspicious patterns, unauthorized access, failed logins

---

## FAQ

### Q1: Elasticsearch vs OpenSearch - Which should I choose?

**Choose Elasticsearch if**:
- You need enterprise support from Elastic
- You want bundled machine learning
- You require integrated alerting and monitoring
- You're already in AWS (use Elasticsearch Service)

**Choose OpenSearch if**:
- You want fully open-source software
- You prefer AWS-managed solution
- You need to avoid vendor lock-in
- You want community-driven development

**Answer**: Both have ~95% compatible APIs. Most workloads work on either platform.

---

### Q2: How do I choose the right number of shards?

**Formula**:
```
Primary Shards = Data Size / Target Shard Size
Target Shard Size = 20-50 GB (optimal)
```

**Example**:
- Data size: 500 GB
- Target shard size: 50 GB
- Primary shards: 500 / 50 = 10

**Rule**: Start with fewer shards (5-10), add more if needed. Reindexing to increase shards is costly.

---

### Q3: Why is my cluster yellow?

**Yellow status** = Missing replicas (not critical, but no redundancy)

**Causes**:
1. Not enough nodes (if replicas=1, need 2+ nodes)
2. Node down or not joining cluster
3. Replicas disabled

**Fix**:
```bash
# Check replica setting
curl localhost:9200/my-index/_settings | grep number_of_replicas

# Reduce replicas if needed
curl -X PUT "localhost:9200/my-index/_settings" -d '{
  "index.number_of_replicas": 0
}'
```

---

### Q4: How do I handle large data volumes?

**Best practices**:
1. **Time-based indices**: Create daily/weekly indices, delete old ones
2. **Hot-warm-cold architecture**: Move old data to cheaper storage
3. **Searchable snapshots**: Archive to S3/GCS, still searchable
4. **Data sampling**: Use smaller datasets for analytics
5. **Bulk operations**: Batch writes for better throughput

---

### Q5: How do I improve query performance?

**Quick fixes** (in order):
1. Add `range` filter on timestamp (reduces data scanned)
2. Increase refresh interval (reduces indexing overhead)
3. Use `term` instead of `match` when possible (exact match faster)
4. Break aggregations into smaller indices
5. Add more data nodes (horizontal scaling)
6. Increase heap size (vertical scaling)

---

### Q6: Can I recover deleted data?

**Short answer**: Only from snapshots/backups

**Prevention**:
- Enable delete protection: `index.blocks.delete: true`
- Regular backups (daily snapshots recommended)
- Cross-cluster replication for disaster recovery

---

### Q7: How do I monitor cluster health?

**Key indicators to watch**:
- Cluster status (green/yellow/red)
- Heap usage (< 85%)
- Disk usage (< 85%)
- Query latency (< 100ms p99)
- Unassigned shards (0)

**Tools**:
- Kibana/OpenSearch Dashboards (built-in)
- Prometheus + Grafana (external)
- Datadog/New Relic (comprehensive)

---

### Q8: What's the difference between text and keyword fields?

| Aspect | Text | Keyword |
|--------|------|---------|
| **Processing** | Analyzed (tokenized) | Not analyzed |
| **Search** | Full-text search | Exact match |
| **Example** | "The quick brown fox" | "ERROR_CODE_123" |
| **Queries** | `match`, `match_phrase` | `term`, `terms` |
| **Use Case** | Log messages, descriptions | Categories, IDs, status codes |

---

## Tools & Extensions

### Official Tools

| Tool | Purpose | Link |
|------|---------|------|
| **Kibana** | Visualization & dashboards (Elasticsearch) | kibana.elastic.co |
| **OpenSearch Dashboards** | Visualization & dashboards (OpenSearch) | opensearch.org/docs |
| **Filebeat** | Ship logs to Elasticsearch | elastic.co/beats |
| **Metricbeat** | Ship metrics to Elasticsearch | elastic.co/beats |
| **Logstash** | Data processing pipeline | elastic.co/logstash |

### Community & Integrations

| Extension | Purpose |
|-----------|---------|
| **Prometheus Exporter** | Monitor ES/OpenSearch with Prometheus |
| **Grafana Plugin** | Visualize with Grafana |
| **Kafka Connector** | Stream data from Kafka |
| **Fluentd Plugin** | Ship logs from Fluentd |
| **Vector Integration** | Collect & route data with Vector |

---

## Production Checklist

### Pre-Deployment

- [ ] Defined cluster topology (node types, count, sizing)
- [ ] Calculated shard count based on data size
- [ ] Configured heap size (50% of available RAM, max 31GB)
- [ ] Set JVM settings for production workload
- [ ] Configured network security (firewalls, VPCs)
- [ ] Planned backup/restore strategy (snapshots)
- [ ] Defined monitoring and alerting thresholds

### Deployment

- [ ] Cluster healthy (status: green)
- [ ] All nodes joined cluster
- [ ] Index created and tested
- [ ] Data pipeline tested (Filebeat/Logstash/Beats)
- [ ] Backups working (snapshots created successfully)
- [ ] Security configured (TLS, auth, RBAC)
- [ ] Monitoring enabled (dashboards, alerts)

### Post-Deployment

- [ ] Cluster health verified (green status)
- [ ] Disk usage < 85%
- [ ] Heap usage < 85%
- [ ] Query latency acceptable (< 200ms p99)
- [ ] Index refresh interval tuned
- [ ] ILM policy activated (auto-rollover working)
- [ ] Backup schedule running
- [ ] Team trained on operations
- [ ] Runbook documented
- [ ] On-call playbook ready

---

## Troubleshooting Quick Reference

| Issue | Symptom | Quick Fix |
|-------|---------|-----------|
| **Red Cluster** | Status is RED | Check node status: `curl localhost:9200/_nodes`. Restart unhealthy nodes |
| **Yellow Cluster** | Status is YELLOW | Add more nodes or reduce replicas: `PUT /index/_settings {"index.number_of_replicas":0}` |
| **High Heap** | Heap > 90% | Restart node, increase heap size, or add nodes |
| **Slow Queries** | p99 latency > 1s | Reduce shard size, filter by timestamp, simplify query |
| **Disk Full** | Cannot assign shards | Delete old indices: `DELETE /logs-2024.01.*` |
| **No Replicas** | Yellow status, 1 node | Add second node or set replicas to 0 |
| **Unassigned Shards** | Count > 0 | Check `_cluster/health` for details, add nodes |

---

## Next Steps

1. **Start Learning**: Choose your learning path above (Beginner, Intermediate, or Advanced)
2. **Hands-On Practice**: Complete [WORKSHOP.md](./WORKSHOP.md)
3. **Deploy**: Follow [RUNBOOK.md](./RUNBOOK.md) for production setup
4. **Understand Deep Concepts**: Read [CONCEPT.md](./CONCEPT.md)
5. **Business Alignment**: Review [BUSINESS.md](./BUSINESS.md) for ROI and value

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Maintainers**: Database & Search Team
