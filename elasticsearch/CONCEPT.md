# Elasticsearch & OpenSearch: Comprehensive Concepts Guide

**Purpose**: Deep technical reference for understanding Elasticsearch and OpenSearch architectures, best practices, and operational patterns.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Architecture](#2-core-architecture)
3. [Elasticsearch vs OpenSearch](#3-elasticsearch-vs-opensearch)
4. [Cluster Design](#4-cluster-design)
5. [Indexing & Data Organization](#5-indexing--data-organization)
6. [Querying & Search](#6-querying--search)
7. [Performance Optimization](#7-performance-optimization)
8. [Cluster Management](#8-cluster-management)
9. [High Availability & Disaster Recovery](#9-high-availability--disaster-recovery)
10. [Security & Compliance](#10-security--compliance)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Advanced Features](#12-advanced-features)
13. [Common Use Cases](#13-common-use-cases)
14. [Troubleshooting](#14-troubleshooting)
15. [Enterprise Patterns](#15-enterprise-patterns)

---

## 1. Introduction

### What is Elasticsearch?

Elasticsearch is a distributed, open-source search and analytics engine built on top of Apache Lucene. It provides:

- **Full-text search**: Powerful, fast search across large datasets
- **Real-time analytics**: Process and analyze data as it arrives
- **Scalability**: Horizontal scaling to petabytes of data
- **Availability**: High availability through distribution and replication
- **Schema flexibility**: Dynamic mapping of document structures

### What is OpenSearch?

OpenSearch is a community-driven fork of Elasticsearch (created after Elastic's license change in 2021). Key characteristics:

- **Open-source**: Fully open-source under SSPL/Polyform (no proprietary restrictions)
- **Compatible**: Mostly compatible with Elasticsearch APIs
- **AWS-managed**: Native integration with AWS OpenSearch Service
- **Community-driven**: Development driven by community contributions

### Key Differences at a Glance

| Aspect | Elasticsearch | OpenSearch |
|--------|---------------|-----------|
| **License** | Proprietary (8.0+) | SSPL/Polyform (100% open) |
| **Cost** | Enterprise licensing required | Free to use |
| **Support** | Elastic (commercial) | AWS or community |
| **API Compatibility** | - | ~95% compatible with ES 7.10 |
| **Best for** | Enterprise (integrated tooling) | Cost-conscious or AWS users |

---

## 2. Core Architecture

### 2.1 Node Types

Elasticsearch/OpenSearch clusters consist of specialized node types:

**Master-Eligible Nodes**
- Manage cluster state and coordination
- Handle node membership, shard allocation
- Minimum 3 for production (quorum-based)
- Low compute/memory requirements
- Example config:
  ```yaml
  node:
    roles: [master]
  ```

**Data Nodes**
- Store actual index data
- Execute search and aggregation queries
- High compute and memory requirements
- Horizontally scalable
- Example config:
  ```yaml
  node:
    roles: [data]
  ```

**Ingest Nodes**
- Pre-process documents before indexing
- Execute ingest pipelines
- Optional (can be enabled on data nodes)
- Example config:
  ```yaml
  node:
    roles: [ingest]
  ```

**Coordinating Nodes**
- Route requests to appropriate nodes
- No shard allocation
- Used for load balancing large requests
- Example config:
  ```yaml
  node:
    roles: []  # No roles = coordinating only
  ```

### 2.2 Data Organization

**Cluster**: Collection of nodes working together
```
Cluster "production"
├── Node 1 (master, data)
├── Node 2 (data)
├── Node 3 (data)
└── Node 4 (ingest)
```

**Index**: Collection of documents with common characteristics
```
Index "logs-2024.01"
├── Shard 0 (Primary)
│   └── Replica 0
├── Shard 1 (Primary)
│   └── Replica 0
└── Shard 2 (Primary)
    └── Replica 0
```

**Shard**: Unit of data distribution and parallelization
- Primary shards: Original data
- Replica shards: Copies for high availability
- Example: 3 primary shards × 2 replicas = 6 total shards per index

**Document**: JSON object being indexed
```json
{
  "_id": "1",
  "_index": "logs-2024.01",
  "_type": "_doc",
  "@timestamp": "2024-01-31T10:30:00Z",
  "message": "Application error occurred",
  "level": "ERROR",
  "service": "api-server"
}
```

### 2.3 Indexing Pipeline

```
Document → Ingest Pipeline → Analyzer → Lucene Index → Shards
         ↓              ↓           ↓          ↓         ↓
     Enrichment   Processors  Tokenization   Indexing  Distribution
     (optional)              (stemming)      (scoring)  (replication)
```

---

## 3. Elasticsearch vs OpenSearch

### 3.1 Feature Comparison

| Feature | Elasticsearch 8.x | OpenSearch 2.x |
|---------|------------------|---|
| **Full-text search** | ✅ | ✅ |
| **Analytics** | ✅ (Kibana) | ✅ (OpenSearch Dashboards) |
| **Alerting** | ✅ (Commercial) | ✅ (Built-in) |
| **Machine Learning** | ✅ (Commercial) | ✅ (Plugins) |
| **Security (SAML, LDAP)** | ✅ (Commercial) | ✅ (Built-in) |
| **Custom plugins** | Limited | More flexibility |
| **AWS integration** | Basic | Native |

### 3.2 Migration Path

**Elasticsearch → OpenSearch**:
```
ES 7.10 (stable) → OpenSearch 1.x (compatible) → OpenSearch 2.x (enhanced)
```

**Compatibility levels**:
- ES 7.10 → OpenSearch 1.x: ~99% compatible
- OpenSearch 1.x → OpenSearch 2.x: Full compatibility
- OpenSearch 2.x → ES 8.x: ~80% compatible (API differences)

---

## 4. Cluster Design

### 4.1 Cluster Topology Patterns

**Small Cluster** (Development/Testing - 3 nodes)
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Master  │  │ Master  │  │ Master  │
│ Data    │  │ Data    │  │ Data    │
│ Ingest  │  │ Ingest  │  │ Ingest  │
└─────────┘  └─────────┘  └─────────┘
```

**Medium Cluster** (Production - 9+ nodes)
```
┌──────────┐  ┌──────────┐  ┌──────────┐     ┌──────────┐  ┌──────────┐
│ Master   │  │ Master   │  │ Master   │     │ Ingest   │  │ Ingest   │
│ Voting   │  │ Voting   │  │ Voting   │     │ Pipeline │  │ Pipeline │
└──────────┘  └──────────┘  └──────────┘     └──────────┘  └──────────┘
       ↓             ↓             ↓                ↓             ↓
┌──────────┐  ┌──────────┐  ┌──────────┐     ┌──────────┐  ┌──────────┐
│ Data     │  │ Data     │  │ Data     │     │ Coordinate   │ Coordinate   │
│ Warm     │  │ Warm     │  │ Warm     │     │ Node     │  │ Node     │
└──────────┘  └──────────┘  └──────────┘     └──────────┘  └──────────┘
```

**Large Enterprise Cluster** (Multiple zones)
```
Zone 1            Zone 2            Zone 3
┌────────┐        ┌────────┐        ┌────────┐
│Master  │        │Master  │        │Master  │
│Data    │        │Data    │        │Data    │
│Hot     │        │Warm    │        │Cold    │
└────────┘        └────────┘        └────────┘
     ↓                  ↓                ↓
  (Recent)         (Historical)      (Archive)
```

### 4.2 Shard Planning

**Key formula**:
```
Total Shards = (Data Size / Target Shard Size) × Replication Factor

Example:
- Data size: 1TB
- Target shard size: 50GB (optimal: 20-50GB)
- Replication factor: 2 (1 primary + 1 replica)
- Primary shards: 1000GB / 50GB = 20
- Total shards: 20 × 2 = 40 shards
```

**Shard sizing guidelines**:

| Data Size | Recommended Shards | Shard Size |
|-----------|---|---|
| < 10GB | 1-2 | 5-10GB |
| 10-100GB | 3-5 | 20-30GB |
| 100GB-1TB | 5-15 | 30-50GB |
| 1TB-10TB | 15-30 | 40-50GB |
| > 10TB | 30+ | 40-50GB |

---

## 5. Indexing & Data Organization

### 5.1 Index Lifecycle Management (ILM)

Automated policy for managing index lifecycle through 4 phases:

**Hot Phase** (Active indexing)
```json
{
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
    }
  }
}
```

**Warm Phase** (Indexed but not frequently searched)
```json
{
  "warm": {
    "min_age": "7d",
    "actions": {
      "set_priority": {
        "priority": 25
      },
      "forcemerge": {
        "max_num_segments": 1
      }
    }
  }
}
```

**Cold Phase** (Occasional searches, lower performance acceptable)
```json
{
  "cold": {
    "min_age": "30d",
    "actions": {
      "searchable_snapshot": {}
    }
  }
}
```

**Delete Phase** (Remove old data)
```json
{
  "delete": {
    "min_age": "90d",
    "actions": {
      "delete": {}
    }
  }
}
```

### 5.2 Index Mapping

Defines structure of documents within an index:

```json
{
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date",
        "format": "epoch_millis"
      },
      "message": {
        "type": "text",
        "analyzer": "standard"
      },
      "level": {
        "type": "keyword"
      },
      "service": {
        "type": "keyword"
      },
      "response_time_ms": {
        "type": "integer"
      },
      "tags": {
        "type": "keyword"
      }
    }
  }
}
```

**Field types**:
- `text`: Full-text searchable (analyzed)
- `keyword`: Exact matching (not analyzed)
- `date`: Date/time values
- `integer`, `long`, `float`, `double`: Numeric
- `boolean`: True/false
- `object`: Nested JSON
- `nested`: Array of objects

### 5.3 Data Ingestion Patterns

**Bulk Indexing** (Highest throughput)
```bash
curl -X POST "localhost:9200/_bulk" -H 'Content-Type: application/json' -d'
{ "index" : { "_index" : "logs", "_id" : "1" } }
{ "timestamp": "2024-01-31T10:30:00Z", "level": "INFO", "message": "Started" }
{ "index" : { "_index" : "logs", "_id" : "2" } }
{ "timestamp": "2024-01-31T10:30:01Z", "level": "ERROR", "message": "Failed" }
'
```

**Beats** (Lightweight shippers)
- Filebeat: Logs and files
- Metricbeat: System metrics
- Heartbeat: Uptime monitoring
- Packetbeat: Network traffic

**Logstash** (Heavy processing)
- Complex transformations
- Multi-source aggregation
- Conditional routing

**Kafka Integration** (High-volume events)
```
Kafka → Logstash → Elasticsearch/OpenSearch
```

---

## 6. Querying & Search

### 6.1 Query DSL (Domain Specific Language)

**Match Query** (Full-text search)
```json
{
  "query": {
    "match": {
      "message": "application error"
    }
  }
}
```

**Term Query** (Exact match)
```json
{
  "query": {
    "term": {
      "level": "ERROR"
    }
  }
}
```

**Bool Query** (Complex combinations)
```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "message": "error" } }
      ],
      "filter": [
        { "term": { "level": "ERROR" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ],
      "should": [
        { "term": { "service": "api-server" } }
      ],
      "minimum_should_match": 1
    }
  }
}
```

**Range Query** (Numeric/date ranges)
```json
{
  "query": {
    "range": {
      "response_time_ms": {
        "gte": 100,
        "lte": 1000
      }
    }
  }
}
```

### 6.2 Aggregations (Analytics)

**Terms Aggregation** (Count by value)
```json
{
  "aggs": {
    "errors_by_service": {
      "terms": {
        "field": "service",
        "size": 10
      }
    }
  }
}
```

**Date Histogram** (Time-series data)
```json
{
  "aggs": {
    "errors_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "1h"
      }
    }
  }
}
```

**Metric Aggregations** (Calculate values)
```json
{
  "aggs": {
    "avg_response_time": {
      "avg": {
        "field": "response_time_ms"
      }
    },
    "p99_response_time": {
      "percentiles": {
        "field": "response_time_ms",
        "percents": [99]
      }
    }
  }
}
```

### 6.3 Search Performance Tips

- **Index optimization**: Smaller shards (20-50GB) for faster queries
- **Caching**: Elasticsearch caches query results
- **Filtering before aggregations**: Reduce data processed
- **Date range queries**: Always filter by date range when querying logs
- **Avoid wildcards**: Use term queries instead
- **Use forcemerge on old indices**: Merge segments to improve search speed

---

## 7. Performance Optimization

### 7.1 Tuning Parameters

**Heap Size** (Most important)
```yaml
# Set Xmx and Xms to same value (avoid heap resizing)
# Never exceed 50% of available RAM
# Typical: 16GB-32GB for data nodes
-Xmx31g
-Xms31g
```

**Thread Pools** (Query execution)
```yaml
thread_pool:
  search:
    size: <auto>  # 3 × num_cores
    queue_size: 1000
  index:
    size: <auto>
    queue_size: 200
  bulk:
    size: <auto>
    queue_size: 300
```

**Network Optimization**
```yaml
# Increase TCP buffer sizes
net.core.rmem_max: 134217728
net.core.wmem_max: 134217728
net.ipv4.tcp_rmem: 67108864 134217728 268435456
net.ipv4.tcp_wmem: 67108864 134217728 268435456
```

### 7.2 Storage & I/O Optimization

**Refresh Interval** (How often segments searchable)
```json
{
  "settings": {
    "index.refresh_interval": "30s"  # Default 1s
  }
}
```

**Merge Policy** (Combine segments)
```json
{
  "settings": {
    "index.merge.policy.segments_per_tier": 10
  }
}
```

**Compression** (Reduce storage)
```yaml
index.codec: best_compression  # Default: default
```

---

## 8. Cluster Management

### 8.1 Node Discovery & Bootstrap

**Seed Hosts** (Initial discovery)
```yaml
discovery.seed_hosts:
  - es-node-1:9300
  - es-node-2:9300
  - es-node-3:9300
```

**Initial Master Nodes** (Bootstrap cluster)
```yaml
cluster.initial_master_nodes:
  - es-node-1
  - es-node-2
  - es-node-3
```

### 8.2 Shard Allocation

**Allocation awareness** (Distribute across zones)
```yaml
node.attr.zone: us-east-1a
cluster.routing.allocation.awareness.attributes: zone
```

**Allocation filtering** (Restrict shard placement)
```json
{
  "index.routing.allocation.require._name": "data-node-*"
}
```

### 8.3 Cluster Health Monitoring

```bash
# Check cluster health
curl -s localhost:9200/_cluster/health | jq .

# Response:
{
  "cluster_name": "elasticsearch",
  "status": "green",  # green = healthy, yellow = missing replicas, red = missing primary
  "timed_out": false,
  "number_of_nodes": 5,
  "number_of_data_nodes": 3,
  "active_primary_shards": 100,
  "active_shards": 200,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 0,
  "delayed_unassigned_shards": 0,
  "number_of_pending_tasks": 0,
  "number_of_in_flight_fetch": 0,
  "task_max_waiting_in_queue_millis": 0,
  "active_shards_percent_as_number": 100.0
}
```

---

## 9. High Availability & Disaster Recovery

### 9.1 Replication Strategy

**Primary & Replica Distribution**:
```
Node 1: Shard-0P, Shard-1P, Shard-2R
Node 2: Shard-0R, Shard-1R, Shard-2P
Node 3: Shard-1P, Shard-2P, Shard-0P (if 3 replicas)
```

**Replication Best Practices**:
- Minimum 2 replicas for critical data
- 1 replica for non-critical data
- Cross-zone replication for site failover

### 9.2 Snapshot & Restore

**Create Repository** (S3 example)
```json
{
  "type": "s3",
  "settings": {
    "bucket": "my-elasticsearch-backups",
    "region": "us-east-1",
    "base_path": "backups"
  }
}
```

**Create Snapshot**
```bash
curl -X PUT "localhost:9200/_snapshot/my-repo/snapshot-2024-01-31"

# List snapshots
curl "localhost:9200/_snapshot/my-repo/_all"

# Restore snapshot
curl -X POST "localhost:9200/_snapshot/my-repo/snapshot-2024-01-31/_restore"
```

### 9.3 Cross-Cluster Replication (CCR)

For disaster recovery with geographically distributed clusters:

```yaml
cluster.remote:
  leader:
    seeds:
      - remote-es-node:9300
    skip_unavailable: false
```

---

## 10. Security & Compliance

### 10.1 Authentication & Authorization

**LDAP Integration** (OpenSearch/ES with security plugin)
```yaml
opendistro_security:
  authcz:
    admin_dn:
      - "cn=admin,dc=example,dc=com"
  auth_domain:
    ldap:
      description: "LDAP authenticator"
      http_authenticator:
        type: basic
        challenge: false
      authentication_backend:
        type: ldap
        config:
          ldap_host: ldap.example.com
          ldap_port: 389
          ldap_bind_dn: "cn=admin,dc=example,dc=com"
          ldap_bind_password: "password"
          ldap_basedn: "dc=example,dc=com"
          ldap_userbase: "ou=users,dc=example,dc=com"
          ldap_usersearch: "(uid={0})"
```

### 10.2 Encryption

**Transport Layer (Node-to-node)**
```yaml
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: "certs/elastic-stack-ca.p12"
xpack.security.transport.ssl.keystore.password: "password"
```

**REST Layer (Client-to-node)**
```yaml
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.keystore.path: "certs/elastic-stack-ca.p12"
xpack.security.http.ssl.keystore.password: "password"
```

### 10.3 Audit Logging

```yaml
xpack.security.audit.enabled: true
xpack.security.audit.outputs: [logfile]
xpack.security.audit.logfile.events.include:
  - access_denied
  - access_granted
  - authentication_failed
  - authentication_success
  - privilege_check_failure
  - privilege_check_success
```

---

## 11. Monitoring & Observability

### 11.1 Key Metrics to Monitor

| Metric | Threshold | Impact |
|--------|-----------|--------|
| **Cluster Health** | Should be green | Red = data loss risk |
| **Heap Usage** | < 85% | > 90% causes GC pauses |
| **JVM GC Time** | < 1% of total | > 2% indicates memory pressure |
| **Disk Usage** | < 85% | > 90% prevents shard assignment |
| **Index Size** | < 50GB per shard | Larger = slower queries |
| **Query Latency** | < 100ms p99 | > 500ms = poor UX |
| **Indexing Rate** | Monitor trend | Spikes indicate issues |
| **Unassigned Shards** | 0 | Indicates allocation problems |

### 11.2 Monitoring Tools

**Built-in Monitoring** (Elasticsearch/OpenSearch)
```json
GET /_cluster/stats
GET /_nodes/stats
GET /_cat/indices
GET /_cat/nodes
```

**External Monitoring**
- Prometheus + Prometheus Exporter
- ELK Stack (Elasticsearch + Logstash + Kibana)
- Splunk integration
- New Relic integration
- Datadog integration

---

## 12. Advanced Features

### 12.1 Machine Learning (Elasticsearch - Commercial)

- Anomaly detection
- Forecasting
- Outlier detection
- Advanced visualizations

### 12.2 Alerting

```json
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "indices": ["logs"],
      "body": {
        "query": {
          "bool": {
            "filter": {
              "term": {
                "level": "ERROR"
              }
            }
          }
        }
      }
    }
  },
  "condition": {
    "script": {
      "source": "ctx.payload.hits.total > 10"
    }
  },
  "actions": {
    "send_email": {
      "email": {
        "to": "ops@example.com",
        "subject": "High error rate detected"
      }
    }
  }
}
```

### 12.3 Canvas & Custom Dashboards

Create pixel-perfect dashboards with:
- Custom visualizations
- Real-time data
- Workpads (like Powerpoint presentations)
- Shareable reports

---

## 13. Common Use Cases

### 13.1 Application Logging

**Pattern**: Filebeat → Elasticsearch → Kibana

```
Applications
     ↓
  Logs (JSON)
     ↓
  Filebeat
     ↓
Elasticsearch
     ↓
  Kibana (visualization)
```

### 13.2 Infrastructure Monitoring

**Pattern**: Metricbeat → Elasticsearch

```
Servers/K8s
     ↓
System Metrics
     ↓
Metricbeat
     ↓
Elasticsearch (time-series data)
     ↓
Dashboards & Alerting
```

### 13.3 Security Information & Event Management (SIEM)

**Pattern**: Multi-source → Logstash → Elasticsearch

```
Firewalls, IDS, WAF, Endpoints
          ↓
      Raw Events
          ↓
      Logstash (parse, enrich, correlate)
          ↓
   Elasticsearch/OpenSearch
          ↓
   Threat Detection & Response
```

### 13.4 Full-Text Search

**E-commerce example**:
```json
{
  "query": {
    "multi_match": {
      "query": "wireless headphones",
      "fields": ["title^2", "description", "tags"]
    }
  }
}
```

---

## 14. Troubleshooting

### 14.1 Common Issues

**Red Cluster Status**
- **Cause**: Missing primary shards
- **Solution**: Check node status, restore from backup, or force allocate

**High Heap Usage**
- **Cause**: Large queries, memory leaks
- **Solution**: Increase heap, optimize queries, add nodes

**Slow Queries**
- **Cause**: Large shards, missing indices, complex aggregations
- **Solution**: Split large shards, add indices, optimize queries

**Unassigned Shards**
- **Cause**: Not enough nodes, allocation filters, disk space
- **Solution**: Add nodes, adjust filters, free disk space

### 14.2 Debugging Commands

```bash
# Check node status
curl -s localhost:9200/_nodes | jq '.nodes'

# Check shard allocation
curl -s localhost:9200/_cat/shards

# Check index settings
curl -s localhost:9200/logs/_settings

# Check node info
curl -s localhost:9200/_nodes/stats/jvm | jq '.nodes[] | {name, heap_percent}'

# Enable debug logging
curl -X PUT "localhost:9200/_cluster/settings" -d '{
  "transient": {
    "logger.org.elasticsearch": "DEBUG"
  }
}'
```

---

## 15. Enterprise Patterns

### 15.1 Multi-Cluster Architecture

**Hub & Spoke**:
```
Central Cluster (Analytics)
        ↑
        ├── Regional Cluster 1 → Cross-Cluster Search
        ├── Regional Cluster 2 → Cross-Cluster Search
        └── Regional Cluster 3 → Cross-Cluster Search
```

**Active-Active Replication**:
```
Cluster A ←→ Cross-Cluster Replication ←→ Cluster B
   (DR)           (Bidirectional)          (DR)
```

### 15.2 Tiered Storage Architecture

**Hot-Warm-Cold Pattern**:
```
Day 1-7:   Hot nodes (SSD, high performance)
Day 8-30:  Warm nodes (HDD, slower, lower cost)
Day 31+:   Cold nodes (Archive, very slow, cheapest)
```

Cost reduction: 50-70% with tiered storage

### 15.3 Index Strategy for Large Scale

**Time-series indices** (Recommended for logs):
- Daily: `logs-2024.01.31`
- Weekly: `logs-2024.w05`
- Monthly: `logs-2024.01`

**Rollover strategy**: Automatic creation of new index when:
- Index reaches size limit (50GB)
- Index reaches age limit (1 day)
- Manual trigger

---

## Conclusion

Elasticsearch/OpenSearch provides powerful, scalable search and analytics capabilities. Key takeaways:

1. **Architecture**: Understand node types and shard placement
2. **Indexing**: Use ILM for automated lifecycle management
3. **Querying**: Master Query DSL for efficient searches
4. **Optimization**: Focus on heap sizing and shard management
5. **HA/DR**: Implement replication and snapshot strategies
6. **Security**: Enable authentication, encryption, and auditing
7. **Monitoring**: Proactive monitoring prevents issues

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Contact**: Database & Search Team
