# Database Indexing & Performance Runbook

## 1. Overview

This runbook covers production operational procedures for managing database indexes, optimizing query performance, and maintaining database health in MySQL and PostgreSQL environments.

- **Scope**: Index creation, query optimization, performance monitoring, maintenance
- **Target Audience**: Database administrators, DevOps engineers, application developers
- **Prerequisite**: CONCEPT.md (index types, query planning)

---

## 2. MySQL Index Management

### 2.1 Creating Indexes

**Primary Key Index** (required on all tables):

```sql
-- Create table with primary key
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create primary key on existing table
ALTER TABLE users ADD PRIMARY KEY (id);
```

**Single-Column Index**:

```sql
-- For WHERE clause filtering
ALTER TABLE users ADD INDEX idx_username (username);

-- Verify index creation
SHOW INDEX FROM users WHERE Column_name = 'username';

-- Monitor index disk usage
SELECT 
  OBJECT_SCHEMA,
  OBJECT_NAME,
  SUM(STAT_VALUE * @@innodb_page_size) / 1024 / 1024 AS size_mb
FROM performance_schema.table_io_waits_summary_by_index_usage
GROUP BY OBJECT_SCHEMA, OBJECT_NAME;
```

**Composite Index** (multi-column):

```sql
-- Order matters: more selective columns first
ALTER TABLE orders ADD INDEX idx_user_date (user_id, created_at);

-- This index optimizes:
-- SELECT * FROM orders WHERE user_id = 123 AND created_at > '2024-01-01';

-- Column order verification
SHOW INDEX FROM orders\G
-- Look at Seq_in_index column to see order

-- For frequently used combinations:
ALTER TABLE orders ADD INDEX idx_status_user_created (status, user_id, created_at);
```

**Unique Index**:

```sql
-- Enforce uniqueness and improve lookups
ALTER TABLE users ADD UNIQUE INDEX idx_email (email);

-- Verify uniqueness constraint
SHOW INDEX FROM users WHERE Key_name = 'idx_email';
```

**Full-Text Index** (text search):

```sql
-- For FULLTEXT searches
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, body);

-- Query using full-text search
SELECT id, title, MATCH(title, body) AGAINST('database optimization' IN BOOLEAN MODE) as relevance
FROM articles
WHERE MATCH(title, body) AGAINST('database optimization' IN BOOLEAN MODE)
ORDER BY relevance DESC;
```

### 2.2 Query Analysis with EXPLAIN

**Basic EXPLAIN**:

```sql
-- Analyze query execution plan
EXPLAIN SELECT * FROM orders WHERE user_id = 123 AND created_at > '2024-01-01'\G

-- Output interpretation:
-- id: Query ID (1 = outer query)
-- select_type: SIMPLE, PRIMARY, UNION, DEPENDENT SUBQUERY, etc.
-- table: Table being accessed
-- type: Access type (ALL=full scan, INDEX=index scan, RANGE=index range, EQ_REF=exact, CONST=single row)
-- possible_keys: Indexes MySQL could use
-- key: Index MySQL actually chose (NULL = no index used)
-- key_len: Length of key used (shorter is better)
-- rows: Estimated rows examined
-- filtered: Percentage of rows filtered
-- Extra: Additional info (Using index, Using where, Using temporary, Using filesort)
```

**Extended EXPLAIN** (detailed statistics):

```sql
-- Get detailed information
EXPLAIN FORMAT=JSON SELECT * FROM orders 
WHERE user_id = 123 AND created_at > '2024-01-01'\G

-- Look for:
-- "query_block" → "select_list" → "using_index": false (not using covering index)
-- "read_method" → "type": "range" (good), "all" (bad)
-- "cost": Higher cost = more expensive query
```

**Identifying Full Table Scans**:

```sql
-- Find queries doing full table scans (type = ALL)
EXPLAIN SELECT * FROM large_table WHERE status = 'active'\G

-- If index not used, check:
-- 1. Does index exist?
SHOW INDEX FROM large_table;

-- 2. Is column type matching? (INT vs VARCHAR)
DESC large_table;

-- 3. Is MySQL optimizer choosing incorrectly?
-- Force index usage:
SELECT * FROM large_table FORCE INDEX (idx_status) 
WHERE status = 'active';

-- 4. Or use hint syntax (MySQL 8.0+):
SELECT /*+ INDEX(large_table idx_status) */ * 
FROM large_table WHERE status = 'active';
```

### 2.3 Performance Monitoring

**Identify Slow Queries**:

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;  -- 2 seconds

-- Find slow query log file
SHOW VARIABLES LIKE 'slow_query_log_file';

-- Parse slow query log
mysqldumpslow -s t -n 10 /var/log/mysql/mysql-slow.log
-- -s t: Sort by query time
-- -n 10: Top 10 queries

-- Alternative: Use Performance Schema
SELECT 
  EVENT_ID,
  TIMER_WAIT / 1000000000000 as duration_sec,
  SQL_TEXT
FROM performance_schema.events_statements_history
ORDER BY TIMER_WAIT DESC
LIMIT 10;
```

**Monitor Index Usage**:

```sql
-- Find unused indexes
SELECT 
  OBJECT_SCHEMA,
  OBJECT_NAME,
  INDEX_NAME,
  COUNT_READ,
  COUNT_INSERT + COUNT_UPDATE + COUNT_DELETE as writes
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA != 'mysql'
  AND INDEX_NAME != 'PRIMARY'
  AND COUNT_READ = 0
ORDER BY writes DESC;

-- Candidates for removal (high write, zero reads)
-- Before dropping, verify application doesn't rely on index for uniqueness
```

**Table Statistics**:

```sql
-- Get table size and row count
SELECT 
  TABLE_NAME,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb,
  TABLE_ROWS,
  ROUND((data_length / 1024 / 1024), 2) as data_mb,
  ROUND((index_length / 1024 / 1024), 2) as index_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'production_db'
ORDER BY data_length DESC;
```

### 2.4 Index Maintenance

**Rebuild Fragmented Indexes**:

```sql
-- Check fragmentation
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  SEQ_IN_INDEX,
  STAT_NAME,
  STAT_VALUE
FROM mysql.innodb_index_stats
WHERE STAT_NAME = 'n_leaf_pages'
  AND STAT_VALUE > 1000;

-- For MyISAM (legacy), use OPTIMIZE:
OPTIMIZE TABLE users;

-- For InnoDB, recreate index:
ALTER TABLE users DROP INDEX idx_username, ADD INDEX idx_username (username);

-- Or use OPTIMIZE TABLE (rebuilds all indexes):
OPTIMIZE TABLE users;
-- Note: Locks table, use during maintenance window
```

**Update Table Statistics**:

```sql
-- Update statistics for query optimizer
ANALYZE TABLE users;
ANALYZE TABLE orders;

-- Verify stats updated
SELECT UPDATE_TIME FROM information_schema.TABLES 
WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = 'production_db';
```

---

## 3. PostgreSQL Index Management

### 3.1 Creating Indexes

**Standard B-Tree Index**:

```sql
-- Create index concurrently (non-blocking)
CREATE INDEX CONCURRENTLY idx_username ON users (username);

-- Verify creation
\d users
-- or
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'users';
```

**Composite Index**:

```sql
-- Multi-column index
CREATE INDEX CONCURRENTLY idx_user_date ON orders (user_id, created_at DESC);

-- Supports partial sort (useful for time-series)
CREATE INDEX CONCURRENTLY idx_recent_orders 
  ON orders (user_id, created_at DESC) 
  WHERE created_at > CURRENT_DATE - INTERVAL '1 year';
```

**Partial Index** (indexed subset):

```sql
-- Only index active users (save space, improve performance)
CREATE INDEX CONCURRENTLY idx_active_users ON users (email) 
WHERE status = 'active';

-- Query must include WHERE condition for index to be used
SELECT * FROM users WHERE status = 'active' AND email = 'user@example.com';
```

**Unique Index**:

```sql
-- Enforce uniqueness
CREATE UNIQUE INDEX idx_email ON users (email);

-- Add constraint
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
```

**Full-Text Index** (GIN - Generalized Inverted Index):

```sql
-- Create GIN index for full-text search
CREATE INDEX CONCURRENTLY idx_article_search ON articles 
  USING GIN (to_tsvector('english', title || ' ' || body));

-- Search
SELECT id, title FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'database & optimization');
```

**BRIN Index** (Block Range Index - for very large tables):

```sql
-- Smaller, faster for time-series data
CREATE INDEX CONCURRENTLY idx_logs_time ON logs USING BRIN (created_at);

-- Excellent for append-only tables (logs, metrics)
-- Much smaller than B-Tree, still very fast
```

### 3.2 Query Analysis with EXPLAIN

**Basic EXPLAIN**:

```sql
-- Analyze query plan
EXPLAIN SELECT * FROM orders WHERE user_id = 123 AND created_at > '2024-01-01';

-- Output interpretation:
-- Seq Scan = full table scan (bad)
-- Index Scan = using index (good)
-- Bitmap Scan = combining multiple indexes (good for OR queries)
-- Filter = rows filtered after scan
```

**EXPLAIN ANALYZE** (with actual execution):

```sql
-- Run query and show actual vs planned rows
EXPLAIN ANALYZE SELECT * FROM orders 
WHERE user_id = 123 AND created_at > '2024-01-01';

-- Look for discrepancies:
-- Planned Rows: 100, Actual Rows: 10000 (query planner miscalibrated)
-- Solution: ANALYZE TABLE to update statistics
```

**Identify Missing Indexes**:

```sql
-- Find sequential scans on large tables
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
  AND seq_tup_read > 100000
ORDER BY seq_tup_read DESC
LIMIT 10;
-- High seq_scan on large tables indicates missing index
```

### 3.3 Performance Monitoring

**Slow Query Detection**:

```sql
-- Enable log_min_duration_statement
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 second
SELECT pg_reload_conf();

-- Find slow queries in logs
tail -f /var/log/postgresql/postgresql.log | grep duration

-- Alternative: query pg_stat_statements (requires extension)
CREATE EXTENSION pg_stat_statements;

SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Index Usage Statistics**:

```sql
-- Unused indexes (candidates for removal)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Before dropping, check if it's used for constraints:
SELECT 
  schemaname,
  tablename,
  indexname,
  ix.indisprimary,
  ix.indisunique
FROM pg_stat_user_indexes s
JOIN pg_index ix ON s.indexrelid = ix.indexrelid
WHERE s.idx_scan = 0;
```

**Index Bloat**:

```sql
-- Find bloated indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  round(pg_relation_size(indexrelid) / 1024.0 / 1024, 2) as size_mb
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- Identify bloated from DELETE/UPDATE operations
-- Solution: REINDEX (can be concurrent in newer PostgreSQL)
REINDEX INDEX CONCURRENTLY idx_orders_user_date;
```

### 3.4 Index Maintenance

**Rebuild Bloated Indexes**:

```sql
-- Create new index concurrently (no downtime)
CREATE INDEX CONCURRENTLY idx_new ON orders (user_id, created_at);

-- Drop old index
DROP INDEX idx_old;

-- Rename new index
ALTER INDEX idx_new RENAME TO idx_orders_composite;

-- Or use REINDEX (PostgreSQL 12+, can be concurrent)
REINDEX INDEX CONCURRENTLY idx_orders_composite;
```

**Update Table Statistics**:

```sql
-- Analyze specific table
ANALYZE users;

-- Check last analyze time
SELECT 
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'users';
```

**Vacuum Operations**:

```sql
-- Remove dead tuples
VACUUM FULL ANALYZE users;  -- Locks table, use during maintenance

-- Or non-locking version
VACUUM ANALYZE users;  -- Can run during business hours

-- Check autovacuum status
SELECT 
  datname,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_database
WHERE datname = 'production_db';
```

---

## 4. Index Strategy Decision Tree

```
Query Slow? (> 1 second)
├─ Run EXPLAIN ANALYZE
│  ├─ Seq Scan on large table?
│  │  └─ Consider index on WHERE column
│  │
│  ├─ Bitmap Scan / Index Scan?
│  │  └─ Index present, query execution OK
│  │     └─ Check application caching layer
│  │
│  └─ Rows estimate ≠ actual?
│     └─ Run ANALYZE (update statistics)
│
└─ Multiple WHERE conditions?
   ├─ All conditions in IN/AND?
   │  └─ Consider composite index
   │
   └─ Some conditions in OR?
      └─ May need multiple indexes (PostgreSQL Bitmap Scan handles)
```

---

## 5. Best Practices

### 5.1 Index Naming Convention

```sql
-- Descriptive names
CREATE INDEX idx_users_email ON users (email);           -- Single column
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at);  -- Composite
CREATE INDEX idx_posts_published_active ON posts (published_at) WHERE status = 'active';  -- Partial

-- Avoid vague names:
-- ❌ idx_1, idx_test, temp_idx
```

### 5.2 Covering Indexes (PostgreSQL Feature)

```sql
-- Include non-key columns to allow index-only scan
CREATE INDEX idx_orders_covering ON orders (user_id, created_at) 
INCLUDE (total_amount, status);

-- Query execution:
-- SELECT user_id, created_at, total_amount, status FROM orders
-- WHERE user_id = 123
-- Can use index-only scan (no table lookup)
```

### 5.3 Drop Unused Indexes

```sql
-- MySQL: Drop after verification
DROP INDEX idx_unused ON table_name;

-- PostgreSQL: Safe drop (fails if dependent objects)
DROP INDEX IF EXISTS idx_unused;

-- Before dropping, double-check:
-- 1. No foreign key constraints using it
-- 2. No application relying on uniqueness
-- 3. Monitor query performance after drop
```

### 5.4 Monitoring Script

```bash
#!/bin/bash
# Database index health check

MYSQL_HOST="localhost"
DB_USER="monitoring"
DB_PASS="password"

# Check for missing indexes (MySQL)
mysql -h $MYSQL_HOST -u $DB_USER -p$DB_PASS <<EOF
SELECT table_name, index_name, seq_in_index, column_name
FROM information_schema.STATISTICS
WHERE table_schema = 'production_db'
ORDER BY table_name, index_name;
EOF

# Check for slow queries (PostgreSQL)
psql -h $MYSQL_HOST -U $DB_USER -d production_db -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## 6. Troubleshooting

### Index Not Being Used

```sql
-- MySQL troubleshooting
-- 1. Check if index exists
SHOW INDEX FROM table_name;

-- 2. Check column type matches
DESC table_name;

-- 3. Check cardinality
SELECT column_name, COUNT(DISTINCT column_name) as cardinality
FROM table_name GROUP BY column_name;

-- 4. Force index
SELECT * FROM table_name FORCE INDEX (index_name) WHERE condition;

-- 5. Recreate index if corrupted
REPAIR TABLE table_name;
```

### High Write Performance Impact

```sql
-- Too many indexes = slow writes
-- Check write operations per index
SELECT 
  index_name,
  count_insert,
  count_update,
  count_delete
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE object_schema = 'production_db'
ORDER BY (count_insert + count_update + count_delete) DESC;

-- Solution: Drop indexes with high write impact and low read benefit
```

---

## 7. Operational Checklists

### Weekly Database Health Check

- [ ] Run ANALYZE on production tables
- [ ] Check slow query log for new patterns
- [ ] Verify index fragmentation levels
- [ ] Monitor table size growth
- [ ] Check for unused indexes

### Monthly Index Optimization

- [ ] Review EXPLAIN plans for top 10 queries
- [ ] Remove unused indexes
- [ ] Add indexes for frequently scanned columns
- [ ] Rebuild/reindex fragmented indexes
- [ ] Update statistics

---

**Last Updated**: January 2026
**Maintained by**: Database Team
**Version**: 1.0.0

