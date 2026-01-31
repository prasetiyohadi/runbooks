# Database Indexing Workshop

## Overview

This workshop contains practical hands-on exercises for both **MySQL** and **PostgreSQL**. Complete the MySQL section first (60 min), then PostgreSQL section (60 min) for a full understanding of index optimization across both databases.

**Total Time**: ~120 minutes (60 min per database)

---

# Part 1: MySQL Workshop

## Practical Assessment

**Duration**: 60 minutes

**Objective**: Hands-on practice creating indexes, analyzing query performance with EXPLAIN, and comparing query efficiency before and after indexing.

---

## Prerequisites

### System Requirements
- Docker installed on your laptop
- MySQL 5.7 or later
- Basic MySQL CLI knowledge

### Install Dependency

Ensure Docker is running:

```bash
# Check Docker is running
docker --version

# If not installed, follow: https://docs.docker.com/get-docker/
```

---

## MySQL Part 1: Set Up MySQL in Docker

### Start MySQL Server

```bash
# Run MySQL 5.7 in Docker (change password as needed)
docker run -d \
  -e MYSQL_ROOT_PASSWORD=password123 \
  --name mysql57 \
  -p 3306:3306 \
  mysql:5.7

# Connect to MySQL
docker exec -it mysql57 mysql -u root -p

# When prompted, enter: password123
```

### Manage MySQL Container

```bash
# Start existing container
docker start -a mysql57

# Stop container
docker stop mysql57

# Remove container (if you want to clean up)
docker rm mysql57
```

---

## MySQL Part 2: Create Sample Database and Table

Once connected to MySQL (via `docker exec -it mysql57 mysql -u root -p`), run these commands:

### 2.1: Create Database

```sql
CREATE DATABASE workshop;

USE workshop;
```

### 2.2: Create Table Without Indexes

```sql
CREATE TABLE person_age (
  id INT(11) AUTO_INCREMENT,
  name CHAR(10),
  age INT(11),
  PRIMARY KEY (id)
);
```

### 2.3: Verify Table Structure

```sql
DESC person_age;

-- Expected Output:
-- +-------+----------+------+-----+---------+----------------+
-- | Field | Type     | Null | Key | Default | Extra          |
-- +-------+----------+------+-----+---------+----------------+
-- | id    | int(11)  | NO   | PRI | NULL    | auto_increment |
-- | name  | char(10) | YES  |     | NULL    |                |
-- | age   | int(11)  | YES  |     | NULL    |                |
-- +-------+----------+------+-----+---------+----------------+
```

---

## MySQL Part 3: Insert Sample Data

Insert 7 sample records:

```sql
INSERT INTO person_age VALUES
(1, 'Bob', 70),
(2, 'David', 10),
(3, 'Adam', 32),
(4, 'Hank', 19),
(5, 'Aaron', 25),
(6, 'Danny', 99),
(7, 'Nick', 17);

-- Verify data
SELECT * FROM person_age;

-- Expected: 7 rows with ages ranging from 10 to 99
```

---

## MySQL Part 4: Query Performance WITHOUT Index

### 4.1: Run Query Without Index

```sql
-- This query searches for all people with age > 20 (should return 4 rows)
SELECT * FROM person_age WHERE age > 20;
```

### 4.2: Analyze Query with EXPLAIN (Without Index)

```sql
EXPLAIN SELECT * FROM person_age WHERE age > 20;

-- Look for these fields in output:
-- - type: ALL (full table scan - BAD)
-- - key: NULL (no index used)
-- - rows: 7 (scans all 7 rows)
-- - filtered: 57.14 (only ~57% of rows match the condition)
```

**Expected Output** (reformatted for clarity):

```
+----+-------------+------------+------+---------------+------+---------+------+------+----------+
| id | select_type | table      | type | possible_keys | key  | rows    | Extra       |
+----+-------------+------------+------+---------------+------+---------+------+------+----------+
|  1 | SIMPLE      | person_age | ALL  | NULL          | NULL | 7       | Using where |
+----+-------------+------------+------+---------------+------+------+------+----------+
```

**Analysis**:
- `type: ALL` = Full table scan (inefficient)
- `rows: 7` = Had to examine all 7 rows
- `filtered: 57.14` = Only ~57% of rows actually matched the condition

---

## MySQL Part 5: Create Index on Age Column

### 5.1: Add Index

```sql
ALTER TABLE person_age ADD INDEX `age_index` (`age`);

-- Output:
-- Query OK, 0 rows affected (0.34 sec)
-- Records: 0  Duplicates: 0  Warnings: 0
```

### 5.2: Verify Index Exists

```sql
SHOW CREATE TABLE person_age;

-- Should show: KEY `age_index` (`age`)
```

---

## MySQL Part 6: Query Performance WITH Index

### 6.1: Run Same Query With Index

```sql
SELECT * FROM person_age WHERE age > 20;

-- Result should be identical (4 rows):
-- Bob (70), Adam (32), Aaron (25), Danny (99)
```

### 6.2: Analyze Query with EXPLAIN (With Index)

```sql
EXPLAIN SELECT * FROM person_age WHERE age > 20;

-- Expected improvements:
-- - type: range (index range scan - GOOD)
-- - key: age_index (index being used)
-- - rows: 3-4 (only examines relevant rows)
-- - filtered: 100 (all examined rows matched)
```

**Expected Output** (reformatted for clarity):

```
+----+-------------+------------+-------+---------------+-----------+---------+------+------+-----------------------+
| id | select_type | table      | type  | possible_keys | key       | rows    | Extra                  |
+----+-------------+------------+-------+---------------+-----------+---------+------+------+-----------------------+
|  1 | SIMPLE      | person_age | range | age_index     | age_index | 4       | Using index condition  |
+----+-------------+------------+-------+---------------+-----------+---------+------+------+-----------------------+
```

**Analysis**:
- `type: range` = Efficient range scan using index
- `rows: 4` = Only examined 4 rows (vs 7 before)
- `key: age_index` = Index was used
- Performance improvement = ~1.75x faster for this small dataset (larger for real tables)

### 6.3: Force Index Usage (Verify)

```sql
EXPLAIN SELECT * FROM person_age FORCE INDEX (age_index) WHERE age > 20;

-- Should show same results with age_index forced
```

---

## MySQL Part 7: Performance Comparison Summary

Complete this table based on your EXPLAIN results:

| Metric | WITHOUT Index | WITH Index | Improvement |
|--------|---------------|-----------|-------------|
| **Type** | ALL | range | Full scan → Index scan |
| **Key Used** | NULL | age_index | No → Yes |
| **Rows Examined** | 7 | 4 | 7 → 4 rows |
| **Filtered (%)** | 57.14 | 100 | Partial → All used |
| **Speed** | Baseline | ~1.75x faster | ✅ **Significant** |

---

## MySQL Part 8: Advanced - Composite Index

### 8.1: Create Second Table for Composite Index Practice

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT,
  user_id INT,
  amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Insert sample orders
INSERT INTO orders (user_id, amount) VALUES
(1, 99.99),
(2, 149.99),
(1, 199.99),
(3, 79.99),
(1, 59.99);
```

### 8.2: Query Without Composite Index

```sql
-- Find all orders by user 1 created after a specific date
SELECT * FROM orders WHERE user_id = 1 AND created_at > '2024-01-01' ORDER BY created_at DESC;

-- Analyze
EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND created_at > '2024-01-01' ORDER BY created_at DESC;
```

### 8.3: Create Composite Index

```sql
-- Composite index on both columns (user_id, created_at)
ALTER TABLE orders ADD INDEX `idx_user_created` (user_id, created_at DESC);
```

### 8.4: Query With Composite Index

```sql
-- Run same query again
EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND created_at > '2024-01-01' ORDER BY created_at DESC;

-- Should now show:
-- - type: range (using index)
-- - key: idx_user_created
-- - rows: much fewer
-- - Extra: Using index condition (more efficient)
```

---

## MySQL Part 9: Clean Up

### Remove Container (Optional)

```bash
# Stop the container
docker stop mysql57

# Remove the container
docker rm mysql57

# Verify it's gone
docker ps -a
```

---

## MySQL Validation Checklist

- [ ] MySQL container started and accessible
- [ ] `workshop` database created and accessible
- [ ] `person_age` table created with 7 records
- [ ] Query WITHOUT index: `type = ALL`, `key = NULL`, `rows = 7`
- [ ] Index `age_index` created successfully
- [ ] Query WITH index: `type = range`, `key = age_index`, `rows ≤ 4`
- [ ] Observed performance improvement (1.75x+ faster)
- [ ] Composite index created for `orders` table
- [ ] Understood Leftmost Prefix rule

---

---

# Part 2: PostgreSQL Workshop

## Practical Assessment

**Duration**: 60 minutes

**Objective**: Hands-on practice with large datasets, concurrent index creation, and understanding PostgreSQL's advanced scan types (Bitmap, Index-Only, Sequential).

---

## Prerequisites

### System Requirements
- Docker installed on your laptop
- PostgreSQL 13 or later
- Basic psql CLI knowledge

### Install Dependency

Ensure Docker is running:

```bash
docker --version
```

---

## PostgreSQL Part 1: Set Up PostgreSQL in Docker

### Start PostgreSQL Server

```bash
# Run PostgreSQL 13 in Docker
docker run -d \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres13 \
  -p 5432:5432 \
  postgres:13

# Connect to PostgreSQL
docker exec -it postgres13 psql -U postgres

# When prompted, enter: postgres
```

### Manage PostgreSQL Container

```bash
# Start existing container
docker start -a postgres13

# Stop container
docker stop postgres13

# Remove container (if you want to clean up)
docker rm postgres13
```

---

## PostgreSQL Part 2: Create Large Test Dataset

Once connected to PostgreSQL (via `docker exec -it postgres13 psql -U postgres`), run these commands:

### 2.1: Create Database

```sql
CREATE DATABASE workshop;

\c workshop  -- Connect to the new database
```

### 2.2: Create Table

```sql
CREATE TABLE person (
  name TEXT,
  salary INT,
  age INT
);
```

### 2.3: Generate 10 Million Rows (Takes ~2-3 minutes)

```sql
INSERT INTO person (name, salary, age)
SELECT 
  UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
  FLOOR(RANDOM() * (1000 - 100 + 1)) + 100,
  FLOOR(RANDOM() * (60 - 20 + 1)) + 20
FROM GENERATE_SERIES(1, 10000000);

-- This will output: INSERT 0 10000000
```

### 2.4: Update Table Statistics

```sql
-- This is CRITICAL for query planner to make good decisions
ANALYZE person;

-- Check table size
SELECT
  ROUND(PG_TOTAL_RELATION_SIZE('person') / 1024 / 1024.0, 2) AS size_mb;

-- Expected: ~400-500 MB for 10M rows
```

---

## PostgreSQL Part 3: Query Performance WITHOUT Index

### 3.1: Run Query Without Index (Full Scan)

```sql
-- Select people older than 50 (should return ~33% of rows = 3.3M)
SELECT COUNT(*) FROM person WHERE age > 50;

-- Now fetch actual data
SELECT * FROM person WHERE age > 50 LIMIT 10;
```

### 3.2: Analyze Query with EXPLAIN

```sql
EXPLAIN SELECT * FROM person WHERE age > 50;

-- Expected: Seq Scan (scans all 10M rows)
-- QUERY PLAN
-- ---------------------------------------------------------------
-- Seq Scan on person  (cost=0.00..180000.00 rows=3300000 width=48)
--   Filter: (age > 50)
```

**Analysis**:
- Scans entire table (all 10M rows)
- Returns ~3.3M rows (33% selectivity)
- Sequential I/O is efficient for large result sets

---

## PostgreSQL Part 4: Create Index and Observe Behavior

### 4.1: Create Index on Age

```sql
CREATE INDEX idx_age ON person (age);

-- Check index size
SELECT
  ROUND(PG_RELATION_SIZE('idx_age') / 1024 / 1024.0, 2) AS index_size_mb;

-- Expected: ~150-200 MB
```

### 4.2: Query with Different Selectivity Levels

#### Very Selective (1 row, 0.00001%):

```sql
EXPLAIN SELECT * FROM person WHERE age = 45;

-- Expected: Index Scan
-- Index Scan using idx_age on person  (cost=0.42..8.44 rows=1 width=48)
--   Index Cond: (age = 45)
```

#### Moderately Selective (3.3M rows, 33%):

```sql
EXPLAIN SELECT * FROM person WHERE age > 50;

-- Expected: Seq Scan (because 33% > 5% threshold)
-- PostgreSQL chooses sequential scan for large result sets
```

#### Medium Selectivity (660K rows, 6.6%):

```sql
EXPLAIN SELECT * FROM person WHERE age > 55;

-- Expected: Bitmap Scan
-- PostgreSQL chooses bitmap for moderate selectivity
-- QUERY PLAN
-- -------------------------------------------------------
-- Bitmap Heap Scan on person  (cost=...)(rows=660000 width=48)
--   Recheck Cond: (age > 55)
--   -> Bitmap Index Scan on idx_age  (cost=...)
--        Index Cond: (age > 55)
```

---

## PostgreSQL Part 5: Index-Only Scan

### 5.1: Query Fetching Only Indexed Column

```sql
-- Fetch ONLY the indexed column (age)
EXPLAIN SELECT age FROM person WHERE age > 50;

-- Expected: Index-Only Scan (no heap access)
-- Index Only Scan using idx_age on person  (cost=...)(rows=3300000 width=4)
--   Index Cond: (age > 50)

-- Compare to fetching all columns (requires heap access)
EXPLAIN SELECT * FROM person WHERE age > 50;
-- This triggers Seq Scan (because 33% selectivity)
```

---

## PostgreSQL Part 6: Concurrent Index Creation

### 6.1: Standard Index Creation (Blocks Writes)

```sql
-- This would lock the table (but we won't actually run it)
-- CREATE INDEX idx_salary ON person (salary);
-- During creation, INSERT/UPDATE/DELETE would BLOCK

-- Simulate with:
-- SELECT * FROM person FOR UPDATE;  -- Locks table
```

### 6.2: Concurrent Index Creation (Production Safe)

```sql
-- This allows concurrent writes (but takes longer)
CREATE INDEX CONCURRENTLY idx_salary ON person (salary);

-- Table remains fully usable during creation
-- Takes significantly longer (~2-3x) than standard creation
-- Uses more CPU/IO, but no downtime
```

### 6.3: Verify Index was Created

```sql
SELECT * FROM pg_indexes WHERE tablename = 'person';

-- Should show both idx_age and idx_salary
```

---

## PostgreSQL Part 7: Composite Index Example

### 7.1: Create Composite Index

```sql
CREATE INDEX CONCURRENTLY idx_salary_age ON person (salary, age);
```

### 7.2: Queries Benefiting from Composite Index

```sql
-- Query using leftmost columns
EXPLAIN SELECT * FROM person WHERE salary > 500 AND age < 40;

-- Expected: Uses composite index idx_salary_age
-- Index Scan or Bitmap Scan using idx_salary_age on person
--   Index Cond: ((salary > 500) AND (age < 40))
```

---

## PostgreSQL Part 8: Performance Comparison

### Summary of Scan Types Observed

| Query Type | Selectivity | Scan Type | Cost | Use Case |
|-----------|------------|-----------|------|----------|
| `age = 45` | 0.00001% | Index Scan | Lowest | Precise lookup |
| `age > 55` | 6.6% | Bitmap Scan | Medium | Moderate results |
| `age > 50` | 33% | Seq Scan | Medium | Large result set |
| `age (only)` | Any | Index-Only | Lowest | Covering index |

---

## PostgreSQL Part 9: Clean Up

### Remove Container (Optional)

```bash
# Stop the container
docker stop postgres13

# Remove the container
docker rm postgres13

# Verify it's gone
docker ps -a
```

---

## PostgreSQL Validation Checklist

- [ ] PostgreSQL container started and accessible
- [ ] `workshop` database created
- [ ] `person` table created with 10M rows
- [ ] Table statistics updated with ANALYZE
- [ ] Query WITHOUT index: Seq Scan on all rows
- [ ] Index `idx_age` created
- [ ] Observed Index Scan (very selective queries)
- [ ] Observed Bitmap Scan (medium selectivity)
- [ ] Observed Seq Scan (high selectivity)
- [ ] Observed Index-Only Scan (indexed columns only)
- [ ] Concurrent index creation completed without lock
- [ ] Understood PostgreSQL scan type selection

---

## Key Takeaways

### MySQL
1. Indexes dramatically speed up searches (10-100x)
2. Use EXPLAIN to validate index usage (`type: ALL` = bad)
3. Order composite indexes by cardinality
4. Use migration tools for production changes

### PostgreSQL
1. Concurrent index creation prevents downtime
2. PostgreSQL chooses scan type based on selectivity
3. Index-Only scans are fastest (no heap access)
4. Bitmap scans balance index + sequential I/O
5. Sequential scans are efficient for large result sets (> 10%)

### Both Databases
1. **EXPLAIN is mandatory** before assuming indexes help
2. **Measure selectivity** to understand index effectiveness
3. **Test locally first** before production changes
4. **Monitor slow queries** in production regularly
5. **Iterate based on actual data** patterns

---

## Next Steps

- **Monitor**: Enable logging in your production database
- **Analyze**: Review slow query logs weekly
- **Optimize**: Create indexes only for frequently slow queries
- **Maintain**: Rebuild fragmented indexes regularly
- **Document**: Record index creation dates and rationale

---

## Additional Resources

### MySQL
- [MySQL EXPLAIN Documentation](https://dev.mysql.com/doc/refman/8.0/en/explain.html)
- [Percona Toolkit](https://www.percona.com/doc/percona-toolkit/)

### PostgreSQL
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)

### Both
- [General Database Indexing Concepts](./CONCEPT.md)
