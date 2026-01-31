# Elasticsearch & OpenSearch: Hands-On Workshop

**Duration**: 90-120 minutes | **Difficulty**: Beginner to Intermediate | **Prerequisites**: Terminal access, Docker or local installation

---

## Lab Setup

Before starting, prepare your environment:

```bash
# 1. Start Elasticsearch (Docker)
docker run -d --name elasticsearch \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  -e xpack.security.transport.ssl.enabled=false \
  -p 9200:9200 \
  docker.elastic.co/elasticsearch/elasticsearch:8.6.0

# 2. Wait for startup (~30 seconds)
sleep 30

# 3. Verify connectivity
curl -s localhost:9200 | jq .version.number

# Expected: "8.6.0"
```

---

## Part 1: Cluster Basics & Indexing (20 minutes | 3 tasks)

### Task 1.1: Create Your First Index

**Objective**: Create an index and understand basic structure.

```bash
# 1. Create index with mappings
curl -X PUT "localhost:9200/products" -H 'Content-Type: application/json' -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "standard"
      },
      "price": {
        "type": "float"
      },
      "category": {
        "type": "keyword"
      },
      "stock": {
        "type": "integer"
      },
      "created_at": {
        "type": "date"
      }
    }
  }
}'

# Expected output:
# {
#   "acknowledged": true,
#   "shards_acknowledged": true,
#   "index": "products"
# }

# 2. Verify index created
curl "localhost:9200/_cat/indices?v"

# Expected: Shows "products" index with 1 shard
```

**Verification**:

```bash
# Get index settings
curl "localhost:9200/products/_settings"

# Get index mappings
curl "localhost:9200/products/_mapping"
```

---

### Task 1.2: Index Documents (Bulk Loading)

**Objective**: Load sample data using bulk operations.

```bash
# 1. Create bulk file
cat > /tmp/products.jsonl << 'EOF'
{"index": {"_index": "products", "_id": "1"}}
{"name": "Wireless Headphones", "price": 79.99, "category": "electronics", "stock": 50, "created_at": "2024-01-15"}
{"index": {"_index": "products", "_id": "2"}}
{"name": "USB-C Cable", "price": 12.99, "category": "electronics", "stock": 200, "created_at": "2024-01-20"}
{"index": {"_index": "products", "_id": "3"}}
{"name": "Laptop Stand", "price": 45.00, "category": "accessories", "stock": 30, "created_at": "2024-01-18"}
{"index": {"_index": "products", "_id": "4"}}
{"name": "Mechanical Keyboard", "price": 129.99, "category": "electronics", "stock": 15, "created_at": "2024-01-22"}
{"index": {"_index": "products", "_id": "5"}}
{"name": "Monitor Arm", "price": 55.00, "category": "accessories", "stock": 20, "created_at": "2024-01-19"}
EOF

# 2. Bulk load documents
curl -X POST "localhost:9200/_bulk" -H 'Content-Type: application/json' \
  --data-binary @/tmp/products.jsonl

# Expected output:
# {
#   "took": 50,
#   "errors": false,
#   "items": [...]
# }

# 3. Verify documents indexed
curl "localhost:9200/products/_count"

# Expected:
# {
#   "count": 5,
#   "took": 2,
#   "_shards": {...}
# }
```

**Verification**:

```bash
# Get single document
curl "localhost:9200/products/_doc/1"

# List all documents
curl "localhost:9200/products/_search"
```

---

### Task 1.3: Check Cluster Health

**Objective**: Understand cluster status and node information.

```bash
# 1. Cluster health status
curl "localhost:9200/_cluster/health" | jq .

# Expected:
# {
#   "cluster_name": "docker-cluster",
#   "status": "green",
#   "timed_out": false,
#   "number_of_nodes": 1,
#   "number_of_data_nodes": 1,
#   "active_primary_shards": 1,
#   "active_shards": 1,
#   "unassigned_shards": 0
# }

# 2. Node information
curl "localhost:9200/_nodes" | jq '.nodes[] | {name, version, jvm}'

# 3. Cluster stats
curl "localhost:9200/_cluster/stats" | jq '.indices, .nodes'

# 4. List shards
curl "localhost:9200/_cat/shards?v"

# Expected: Shows shard allocation
```

**Verification**:

```bash
# All should show status "green"
curl "localhost:9200/_cluster/health" | jq '.status'
```

---

## Part 2: Querying & Search (25 minutes | 4 tasks)

### Task 2.1: Basic Queries

**Objective**: Master fundamental query types.

```bash
# 1. Match query (full-text search)
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "match": {
      "name": "keyboard"
    }
  }
}'

# Expected: Returns mechanical keyboard (ID 4)

# 2. Term query (exact match)
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "term": {
      "category": "electronics"
    }
  }
}'

# Expected: Returns 4 electronics items (IDs 1, 2, 3, 4)

# 3. Range query
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "range": {
      "price": {
        "gte": 50,
        "lte": 150
      }
    }
  }
}'

# Expected: Returns items 1, 3, 4, 5 (prices 50-150)
```

**Verification**:

```bash
# Verify each query returns expected document count
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' \
  -d '{"query": {"match": {"name": "keyboard"}}}' | jq '.hits.total'

# Expected: 1
```

---

### Task 2.2: Complex Boolean Queries

**Objective**: Combine multiple conditions with bool queries.

```bash
# 1. Must + Filter (AND logic)
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "must": [
        {"match": {"name": "wireless"}}
      ],
      "filter": [
        {"range": {"price": {"lte": 100}}}
      ]
    }
  }
}'

# Expected: Returns wireless headphones (ID 1)

# 2. Should + Minimum (OR logic with threshold)
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "should": [
        {"term": {"category": "electronics"}},
        {"term": {"category": "accessories"}}
      ],
      "minimum_should_match": 1
    }
  }
}'

# Expected: Returns all 5 products (all are electronics or accessories)

# 3. Must NOT (exclusion)
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "filter": [
        {"range": {"stock": {"gte": 20}}}
      ],
      "must_not": [
        {"term": {"category": "electronics"}}
      ]
    }
  }
}'

# Expected: Returns only accessories with stock >= 20 (IDs 3, 5)
```

**Verification**:

```bash
# Check each query results count
curl -X POST "localhost:9200/products/_search" -d '{...}' | jq '.hits.hits | length'
```

---

### Task 2.3: Sorting & Pagination

**Objective**: Control result ordering and navigate large result sets.

```bash
# 1. Sort by price ascending
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {"match_all": {}},
  "sort": [
    {"price": {"order": "asc"}}
  ]
}'

# Expected: USB cable ($12.99) first, keyboard ($129.99) last

# 2. Sort by multiple fields
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {"match_all": {}},
  "sort": [
    {"stock": {"order": "desc"}},
    {"price": {"order": "asc"}}
  ]
}'

# Expected: Sorted by stock (high to low), then price (low to high)

# 3. Pagination
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {"match_all": {}},
  "from": 0,
  "size": 2
}'

# Expected: Returns first 2 products

# 4. Next page
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {"match_all": {}},
  "from": 2,
  "size": 2
}'

# Expected: Returns products 3-4
```

**Verification**:

```bash
# Verify first product is cheapest
curl -X POST "localhost:9200/products/_search" -d '{"query":{"match_all":{}},"sort":[{"price":{"order":"asc"}}]}' | jq '.hits.hits[0]._source.name'

# Expected: USB-C Cable
```

---

### Task 2.4: Highlighting & Field Selection

**Objective**: Retrieve specific fields and highlight matches.

```bash
# 1. Select specific fields
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {"match": {"name": "keyboard"}},
  "_source": ["name", "price"]
}'

# Expected: Only name and price returned for matching product

# 2. Highlight matches in text
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {"match": {"name": "headphones"}},
  "highlight": {
    "fields": {
      "name": {}
    }
  }
}'

# Expected: Matched term highlighted (in tags like <em>headphones</em>)

# 3. Exclude fields
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {"match_all": {}},
  "_source": {
    "excludes": ["created_at"]
  }
}'

# Expected: All fields except created_at returned
```

**Verification**:

```bash
# Check highlighted output contains tags
curl -X POST "localhost:9200/products/_search" -d '{...highlight...}' | jq '.hits.hits[0].highlight'
```

---

## Part 3: Aggregations & Analytics (20 minutes | 3 tasks)

### Task 3.1: Terms Aggregation

**Objective**: Count unique values and find top values.

```bash
# 1. Count products by category
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "aggs": {
    "products_by_category": {
      "terms": {
        "field": "category",
        "size": 10
      }
    }
  },
  "size": 0
}'

# Expected output shows:
# {
#   "aggregations": {
#     "products_by_category": {
#       "buckets": [
#         {"key": "electronics", "doc_count": 4},
#         {"key": "accessories", "doc_count": 1}
#       ]
#     }
#   }
# }

# 2. Get top 3 most expensive products
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "aggs": {
    "top_products": {
      "terms": {
        "field": "name",
        "size": 3,
        "order": {"_key": "desc"}
      }
    }
  },
  "size": 0
}'

# Expected: Returns top 3 products by price
```

**Verification**:

```bash
# Verify aggregation returns correct count
curl -X POST "localhost:9200/products/_search" -d '{"aggs":{"by_cat":{"terms":{"field":"category"}}}, "size":0}' | jq '.aggregations.by_cat.buckets | length'

# Expected: 2 (electronics and accessories)
```

---

### Task 3.2: Metric Aggregations

**Objective**: Calculate statistics (avg, min, max, sum).

```bash
# 1. Average price
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "aggs": {
    "average_price": {
      "avg": {
        "field": "price"
      }
    }
  },
  "size": 0
}'

# Expected: Average around 64.59

# 2. Multiple metrics
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "aggs": {
    "price_stats": {
      "stats": {
        "field": "price"
      }
    }
  },
  "size": 0
}'

# Expected: Returns min, max, avg, sum, count

# 3. Percentiles (p50, p99)
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "aggs": {
    "price_percentiles": {
      "percentiles": {
        "field": "price",
        "percents": [50, 95, 99]
      }
    }
  },
  "size": 0
}'

# Expected: Shows 50th, 95th, 99th percentile prices

# 4. Total stock
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "aggs": {
    "total_stock": {
      "sum": {
        "field": "stock"
      }
    }
  },
  "size": 0
}'

# Expected: 315 total items
```

**Verification**:

```bash
# Check average calculation
curl -X POST "localhost:9200/products/_search" -d '{"aggs":{"avg_price":{"avg":{"field":"price"}}}, "size":0}' | jq '.aggregations.avg_price.value'

# Expected: ~64.59
```

---

### Task 3.3: Date Histogram & Nested Aggregations

**Objective**: Time-series analysis and sub-aggregations.

```bash
# 1. Products created by date
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "aggs": {
    "products_by_date": {
      "date_histogram": {
        "field": "created_at",
        "calendar_interval": "day"
      }
    }
  },
  "size": 0
}'

# Expected: Shows distribution by day

# 2. Average price by category (nested aggregation)
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "aggs": {
    "categories": {
      "terms": {
        "field": "category"
      },
      "aggs": {
        "avg_price_per_category": {
          "avg": {
            "field": "price"
          }
        }
      }
    }
  },
  "size": 0
}'

# Expected:
# electronics avg: ~71.49
# accessories avg: ~50
```

**Verification**:

```bash
# Verify nested aggregation structure
curl -X POST "localhost:9200/products/_search" -d '{"aggs":{"cat":{"terms":{"field":"category"},"aggs":{"avg":"avg":{"field":"price"}}}},"size":0}' | jq '.aggregations.cat.buckets[0]'
```

---

## Part 4: Indexing Strategies (15 minutes | 3 tasks)

### Task 4.1: Create Index Template

**Objective**: Automate index creation with consistent settings.

```bash
# 1. Create index template
curl -X PUT "localhost:9200/_index_template/products_template" -H 'Content-Type: application/json' -d '{
  "index_patterns": ["products-*"],
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "refresh_interval": "1s"
  },
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "name": {
        "type": "text"
      },
      "price": {
        "type": "float"
      },
      "category": {
        "type": "keyword"
      }
    }
  }
}'

# 2. Create index that matches pattern
curl -X PUT "localhost:9200/products-v2"

# 3. Verify template applied
curl "localhost:9200/products-v2/_settings"

# Expected: Shows template settings applied
```

**Verification**:

```bash
# List all templates
curl "localhost:9200/_index_template" | jq '.index_templates'

# Verify new index has correct settings
curl "localhost:9200/products-v2/_settings" | jq '.products-v2.settings'
```

---

### Task 4.2: Index Aliases

**Objective**: Use aliases for zero-downtime reindexing.

```bash
# 1. Create alias pointing to current index
curl -X POST "localhost:9200/_aliases" -H 'Content-Type: application/json' -d '{
  "actions": [
    {
      "add": {
        "index": "products",
        "alias": "products-live"
      }
    }
  ]
}'

# 2. Query using alias
curl "localhost:9200/products-live/_search" | jq '.hits.total'

# 3. Create new index with updated mapping
curl -X PUT "localhost:9200/products-v2" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "name": {"type": "text", "analyzer": "english"},
      "price": {"type": "float"},
      "category": {"type": "keyword"},
      "description": {"type": "text"}
    }
  }
}'

# 4. Reindex data
curl -X POST "localhost:9200/_reindex" -H 'Content-Type: application/json' -d '{
  "source": {"index": "products"},
  "dest": {"index": "products-v2"}
}'

# 5. Swap alias (zero downtime!)
curl -X POST "localhost:9200/_aliases" -H 'Content-Type: application/json' -d '{
  "actions": [
    {"remove": {"index": "products", "alias": "products-live"}},
    {"add": {"index": "products-v2", "alias": "products-live"}}
  ]
}'

# 6. Verify alias points to new index
curl "localhost:9200/products-live/_search" | jq '.hits.total'

# Expected: Still returns 5 documents, but from new index
```

**Verification**:

```bash
# Check which index alias points to
curl "localhost:9200/_alias/products-live"

# Expected: Shows products-v2
```

---

### Task 4.3: Refresh & Force Merge

**Objective**: Understand index optimization techniques.

```bash
# 1. Change refresh interval (fewer, larger flushes)
curl -X PUT "localhost:9200/products/_settings" -H 'Content-Type: application/json' -d '{
  "index.refresh_interval": "30s"
}'

# 2. Manual refresh (make data searchable immediately)
curl -X POST "localhost:9200/products/_refresh"

# 3. Force merge segments (optimize for read-only index)
curl -X POST "localhost:9200/products/_forcemerge?max_num_segments=1"

# 4. Verify segments merged
curl "localhost:9200/products/_stats?filter_path=indices.products.primaries.segments"
```

**Verification**:

```bash
# Check current refresh interval
curl "localhost:9200/products/_settings" | jq '.products.settings.index.refresh_interval'

# Check segment count (should be 1 after force merge)
curl "localhost:9200/products/_stats" | jq '.indices.products.primaries.segments.count'
```

---

## Part 5: Cluster Management (15 minutes | 3 tasks)

### Task 5.1: Shard Allocation & Rebalancing

**Objective**: Understand and control shard placement.

```bash
# 1. View shard allocation
curl "localhost:9200/_cat/shards?v"

# 2. Set shard allocation awareness (simulate multi-zone)
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d '{
  "transient": {
    "cluster.routing.allocation.awareness.attributes": "zone"
  }
}'

# 3. Exclude node from allocation (drain shards)
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d '{
  "transient": {
    "cluster.routing.allocation.exclude._name": "node-1"
  }
}'

# 4. Re-enable allocation
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d '{
  "transient": {
    "cluster.routing.allocation.exclude._name": null
  }
}'
```

**Verification**:

```bash
# Check shard count (should still be the same)
curl "localhost:9200/_cat/shards" | wc -l

# Check allocation settings
curl "localhost:9200/_cluster/settings" | jq '.transient'
```

---

### Task 5.2: Snapshot & Restore

**Objective**: Back up and restore data.

```bash
# 1. Register filesystem repository
curl -X PUT "localhost:9200/_snapshot/backup" -H 'Content-Type: application/json' -d '{
  "type": "fs",
  "settings": {
    "location": "/usr/share/elasticsearch/data/backup"
  }
}'

# 2. Create snapshot
curl -X PUT "localhost:9200/_snapshot/backup/snapshot-001" -H 'Content-Type: application/json' -d '{
  "indices": "products"
}'

# 3. Monitor snapshot progress
curl "localhost:9200/_snapshot/backup/snapshot-001"

# 4. Delete index (simulating disaster)
curl -X DELETE "localhost:9200/products"

# 5. Restore from snapshot
curl -X POST "localhost:9200/_snapshot/backup/snapshot-001/_restore" -H 'Content-Type: application/json' -d '{
  "indices": "products"
}'

# 6. Verify data restored
curl "localhost:9200/products/_count"

# Expected: 5 documents
```

**Verification**:

```bash
# List all snapshots
curl "localhost:9200/_snapshot/backup/_all" | jq '.snapshots[0].state'

# Expected: SUCCESS
```

---

### Task 5.3: Monitoring with Stats

**Objective**: Collect and interpret cluster metrics.

```bash
# 1. Cluster statistics
curl "localhost:9200/_cluster/stats" | jq '{
  indices: .indices,
  nodes: .nodes | {count, os: .os, jvm: .jvm}
}'

# 2. Node statistics
curl "localhost:9200/_nodes/stats" | jq '.nodes[] | {
  name: .name,
  jvm: .jvm | {heap_percent, uptime_in_millis},
  fs: .fs | {total_in_bytes, free_in_bytes},
  indices: .indices | {docs, store}
}'

# 3. Index statistics
curl "localhost:9200/products/_stats" | jq '.indices.products.primaries | {
  docs,
  store,
  indexing,
  search,
  refresh
}'

# 4. Slow query log setup (would require restart in real deployment)
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d '{
  "transient": {
    "logger.index.search.slowlog": "INFO",
    "index.search.slowlog.threshold.query.info": "100ms"
  }
}'
```

**Verification**:

```bash
# Check heap usage
curl "localhost:9200/_nodes/stats/jvm" | jq '.nodes[] | {heap_used_in_bytes, heap_max_in_bytes}'

# Calculate heap percentage
# heap_percent = (heap_used / heap_max) * 100
```

---

## Part 6: Advanced Features (10 minutes | 2 tasks)

### Task 6.1: Scripted Fields & Computed Values

**Objective**: Compute values at query time using scripts.

```bash
# 1. Add document with price and quantity
curl -X POST "localhost:9200/products/_doc/6" -H 'Content-Type: application/json' -d '{
  "name": "Mouse Pad",
  "price": 15,
  "quantity": 100,
  "category": "accessories"
}'

# 2. Query with computed field (total value)
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {"match_all": {}},
  "script_fields": {
    "inventory_value": {
      "script": {
        "source": "doc['\''price'\''].value * doc['\''stock'\''].value"
      }
    }
  }
}'

# 3. Query with conditional logic
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": {"match_all": {}},
  "script_fields": {
    "stock_status": {
      "script": {
        "source": "if (doc['\''stock'\''].value > 50) { return '\''high'\''; } else if (doc['\''stock'\''].value > 10) { return '\''medium'\''; } else { return '\''low'\''; }"
      }
    }
  }
}'
```

**Verification**:

```bash
# Run script query and verify computed fields
curl -X POST "localhost:9200/products/_search" -d '{...script_fields...}' | jq '.hits.hits[0].fields'
```

---

### Task 6.2: Query Performance Analysis

**Objective**: Profile and optimize slow queries.

```bash
# 1. Use profile API to analyze query performance
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "profile": true,
  "query": {
    "bool": {
      "filter": [
        {"range": {"price": {"gte": 50}}},
        {"term": {"category": "electronics"}}
      ]
    }
  }
}'

# 2. Analyze results in profile output
# Look for:
# - execution_time_in_millis (should be < 100ms)
# - breakdown (shows time spent in each phase)

# 3. Compare with unoptimized query
curl -X POST "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "profile": true,
  "query": {
    "bool": {
      "should": [
        {"match": {"name": "electronics"}},
        {"match": {"category": "electronics"}}
      ]
    }
  }
}'

# Expected: Profile shows more time spent processing
```

**Verification**:

```bash
# Profile output shows execution breakdown
curl -X POST "localhost:9200/products/_search" -d '{"profile":true,...}' | jq '.profile.shards[0].searches[0].query'
```

---

## Validation Checklist

Before completing the workshop, verify:

- [ ] **Part 1**: Created index, bulk loaded 5 documents, cluster healthy
- [ ] **Part 2**: Executed all 4 query types (match, term, range, bool)
- [ ] **Part 2**: Sorted results and paginated successfully
- [ ] **Part 3**: Ran terms, stats, and percentile aggregations
- [ ] **Part 3**: Created date histogram and nested aggregations
- [ ] **Part 4**: Created index template, used aliases for reindexing
- [ ] **Part 5**: Created snapshot and successfully restored data
- [ ] **Part 5**: Collected and analyzed cluster metrics
- [ ] **Part 6**: Used script fields and profiled queries
- [ ] **All queries**: Returned expected results with correct document counts

---

## Troubleshooting During Workshop

| Issue | Solution |
|-------|----------|
| Cluster not starting | Check Docker: `docker logs elasticsearch` |
| Cannot connect (curl fails) | Wait 30 seconds, verify with: `curl localhost:9200` |
| JSON parse errors | Validate JSON syntax, ensure proper quotes |
| No documents returned | Verify documents indexed: `curl localhost:9200/products/_count` |
| Aggregation returns empty | Remove `"size": 0` or check query filter |
| Snapshot creation fails | Check directory exists: `/usr/share/elasticsearch/data/backup` |

---

## Next Steps

1. **Explore Kibana**: Open `http://localhost:5601` to visualize data
2. **Review CONCEPT.md**: Deep dive into architecture and advanced topics
3. **Practice RUNBOOK.md**: Learn production deployment procedures
4. **Real-world scenarios**: Create custom indices and queries for your use cases

---

**Workshop Duration**: 90-120 minutes  
**Estimated Proficiency**: Intermediate Elasticsearch User  
**Last Updated**: January 31, 2026

For additional help, refer to [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/)
