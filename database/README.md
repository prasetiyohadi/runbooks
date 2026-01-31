# Database Operations & Indexing

Welcome to the Database section of the runbooks. This guide covers **MySQL** and **PostgreSQL** indexing strategies, best practices, and hands-on optimization techniques.

---

## 🚀 Quick Start (Choose Your Path)

### 🔵 MySQL Focus
1. [CONCEPT.md → MySQL Sections 1-8](./CONCEPT.md#mysql-index-concepts--best-practices)
2. [WORKSHOP.md → MySQL Part 1 & 2](./WORKSHOP.md#part-1-mysql-workshop) (60 min)

### 🟢 PostgreSQL Focus
1. [CONCEPT.md → PostgreSQL Sections 1-6](./CONCEPT.md#postgresql-index-concepts--advanced-features)
2. [WORKSHOP.md → PostgreSQL Part 1 & 2](./WORKSHOP.md#part-2-postgresql-workshop) (60 min)

### 📚 Full Curriculum (Both)
Complete both MySQL and PostgreSQL paths for comprehensive database knowledge (~120 min total)

---

## 📚 Learning Paths

### **Beginner**: Start Here (30 min)

**MySQL Path:**
1. [CONCEPT.md → Overview](./CONCEPT.md#1-overview-what-is-database-indexing) — Why indexes matter
2. [CONCEPT.md → Index Types](./CONCEPT.md#2-index-types-in-mysql) — Learn the 5 types
3. [CONCEPT.md → Cardinality](./CONCEPT.md#3-index-concepts-cardinality) — Master the most important concept

**PostgreSQL Path:**
1. [CONCEPT.md → PostgreSQL Overview](./CONCEPT.md#1-postgresql-indexing-fundamentals) — Core concepts
2. [CONCEPT.md → Locking & Concurrent Creation](./CONCEPT.md#locking-during-index-creation) — Key difference from MySQL
3. [CONCEPT.md → Query Planning](./CONCEPT.md#3-postgresql-query-performance-explain) — EXPLAIN basics

### **Intermediate**: Hands-On Practice (60 min)

**Choose one or both:**
- [WORKSHOP.md → MySQL (Part 1 & 2)](./WORKSHOP.md#part-1-mysql-workshop) — Small dataset, index creation
- [WORKSHOP.md → PostgreSQL (Part 2 & 3)](./WORKSHOP.md#part-2-postgresql-workshop) — 10M rows, scan type comparison

### **Advanced**: Production Optimization (45 min)

**MySQL:**
1. [CONCEPT.md → Anti-Patterns](./CONCEPT.md#6-index-anti-patterns-and-solutions) — Common mistakes
2. [CONCEPT.md → High-Traffic Tables](./CONCEPT.md#7-managing-indexes-on-high-traffic-tables) — Zero-downtime tools

**PostgreSQL:**
1. [CONCEPT.md → Scan Types Deep Dive](./CONCEPT.md#4-postgresql-scan-types) — When PostgreSQL chooses each scan type
2. [CONCEPT.md → Concurrent Index Creation](./CONCEPT.md#locking-during-index-creation) — Production-safe migrations

---

## 🎯 Key Concepts at a Glance

### Index Types Comparison

| Feature | MySQL | PostgreSQL |
|---------|-------|-----------|
| **B-Tree (Default)** | ✅ | ✅ |
| **Hash** | ❌ | ✅ |
| **Full-Text** | ✅ | ✅ (GIN) |
| **GiST** | ❌ | ✅ |
| **BRIN** | ❌ | ✅ (Large tables) |
| **Concurrent Creation** | ❌ (use tools) | ✅ (`CONCURRENTLY`) |

### EXPLAIN Output Interpretation

**MySQL** (Focus on: `type`, `key`, `rows`):
```
type = ALL ❌ (full scan)
type = ref ✅ (index lookup)
type = range ✅ (index range scan)
```

**PostgreSQL** (More nuanced scan selection):
```
Seq Scan → High selectivity (> 10%)
Bitmap Scan → Medium selectivity (5-10%)
Index Scan → Low selectivity (< 5%)
Index Only Scan → Fastest (no heap access)
```

### Cardinality & Index Selection

| Scenario | Index? | Reason |
|----------|--------|--------|
| `user_id` (1M unique in 1M rows) | ✅ YES | High cardinality |
| `gender` (2 unique in 1M rows) | ❌ NO | Low cardinality |
| `email` on users table | ✅ YES | High selectivity + unique |
| `status` (5 values) | ❌ NO | Too few unique values |

---

## 📖 File Guide

### CONCEPT.md — Comprehensive Theory (800+ lines)

**MySQL Sections** (1-8):
- Indexing fundamentals & B-Tree architecture
- 5 index types with SQL examples
- Cardinality analysis & composite indexes
- Diagrams showing index structures
- Anti-patterns & solutions
- Zero-downtime production migrations
- 4 runnable SQL examples

**PostgreSQL Sections** (1-6):
- Indexing fundamentals with concurrent creation
- 6 PostgreSQL index types
- Query planning & EXPLAIN output
- **4 Scan Types**: Sequential, Index, Bitmap, Index-Only
- Runnable examples with 10M row dataset
- Selectivity thresholds for scan type selection

### WORKSHOP.md — Hands-On Labs (800+ lines)

**MySQL Part** (60 min):
- Docker setup
- Small table (7 rows) for quick learning
- Before/after EXPLAIN comparison
- Composite index practice
- Performance metrics table

**PostgreSQL Part** (60 min):
- Docker setup
- Large table (10M rows) to see real behavior
- Scan type selection based on selectivity
- Concurrent index creation demo
- Comprehensive validation checklist

### README.md (This file)

Navigation hub with learning paths and quick reference tables.

---

## 🔍 Common Questions

### Q: Should I index every column?

**A**: No. Index only columns that:
- Appear in `WHERE` clauses frequently
- Are used in `ORDER BY` / `GROUP BY`
- Are foreign key references
- Have **high cardinality** (many unique values)

**Skip indexing**:
- Low-cardinality columns (gender, status, boolean flags)
- Columns rarely queried
- Columns in high-write tables (indexes slow inserts)

---

### Q: What's the best index order for composite indexes?

**A**: Order by **descending cardinality** (most selective first):

```sql
-- ✅ GOOD: user_id (high cardinality) before status (low cardinality)
ALTER TABLE orders ADD INDEX idx (user_id, status);

-- ❌ BAD: Reverse order is slower
ALTER TABLE orders ADD INDEX idx (status, user_id);
```

---

### Q: How do I know if an index is helping?

**A**: Use EXPLAIN and measure:

```sql
-- Before index
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
-- type: ALL, rows: 1000000 (scans everything)

-- After index
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
-- type: ref, rows: 1 (direct lookup)
```

**Key metrics**:
- `type` changes from `ALL` → `ref`/`range`
- `rows examined` decreases
- `filtered %` increases

---

### Q: What about production impact?

**MySQL**:
- Standard `ALTER TABLE` **locks the table**
- Use migration tools: `gh-ost`, `pt-online-schema-change`, `LHM`
- See [Section 7](./CONCEPT.md#7-managing-indexes-on-high-traffic-tables) for details

**PostgreSQL**:
- `CREATE INDEX CONCURRENTLY` allows writes during creation
- Takes longer (2-3x) but no downtime
- Requires 2 full table scans

---

### Q: How do I choose between MySQL and PostgreSQL?

| Requirement | MySQL | PostgreSQL |
|-------------|-------|-----------|
| **Production index changes without downtime** | Tools needed | Native support |
| **Large dataset handling** | Good | Excellent |
| **Query planning flexibility** | Basic | Advanced (6 index types) |
| **Simple CRUD operations** | Fast | Fast |
| **Complex reporting queries** | Good | Excellent |

Both are excellent — choose based on your team's expertise and app needs.

---

## 📋 Next Steps After Learning

### Day 1: Immediate Actions (30 min)
1. Complete [WORKSHOP.md](./WORKSHOP.md) for your database (MySQL or PostgreSQL)
2. Run `EXPLAIN` on 3 slow queries in your codebase
3. Identify missing indexes

### Week 1: Code Review (Ongoing)
1. Review SQL queries in pull requests
2. Check for missing indexes using `EXPLAIN`
3. Flag N+1 query problems
4. Suggest composite indexes for multi-column filters

### Week 2: Monitoring (2 hours)
1. **Enable slow query log** on development database
2. Set threshold to log queries > 1 second
3. Review top 10 slowest queries
4. Create indexes for the slowest ones

### Month 1: Production Optimization
1. **Analyze real production traffic** (ask DBA for slow query log)
2. **Prioritize indexes** by query frequency
3. **Test locally first** with production-like data volumes
4. **Deploy using zero-downtime tools** (MySQL: gh-ost; PostgreSQL: CONCURRENTLY)
5. **Measure impact** before/after

### Ongoing: Maintenance
- Weekly: Review slow query logs
- Monthly: Check for unused/fragmented indexes
- Quarterly: Rebuild fragmented indexes
- Yearly: Archive old index performance data

---

## 🛠️ Tools & Resources

### Local Development
- [Docker MySQL Image](https://hub.docker.com/_/mysql) — Run MySQL locally
- [Docker PostgreSQL Image](https://hub.docker.com/_/postgres) — Run PostgreSQL locally
- [DBeaver](https://dbeaver.io/) — Universal database IDE
- [MySQL Workbench](https://www.mysql.com/products/workbench/) — MySQL GUI

### Production Management
- **MySQL**: [Percona Toolkit](https://www.percona.com/doc/percona-toolkit/) (`pt-query-digest`, `pt-online-schema-change`)
- **MySQL**: [gh-ost](https://github.com/github/gh-ost) — GitHub's online schema migration
- **MySQL**: [LHM](https://github.com/soundcloud/lhm) — SoundCloud's lightweight migration
- **PostgreSQL**: Native `CREATE INDEX CONCURRENTLY` (no tools needed)

### Monitoring
- MySQL slow query log (`SET GLOBAL slow_query_log = 'ON'`)
- PostgreSQL `log_statement` and `log_duration` settings
- Cloud provider tools:
  - AWS RDS Performance Insights
  - GCP Cloud SQL Insights
  - Azure Database Query Performance Insight

### Official Documentation
- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/refman/8.0/)
- [PostgreSQL 13+ Documentation](https://www.postgresql.org/docs/)

---

## ✅ Do's and ❌ Don'ts

### ✅ DO:
- Index high-cardinality columns used in WHERE clauses
- Order composite indexes by cardinality
- Use EXPLAIN before assuming indexes help
- Test index changes locally with realistic data volumes
- Monitor slow queries regularly (weekly)
- Use zero-downtime tools for production changes
- Document why each index was created

### ❌ DON'T:
- Create too many indexes (slows writes, wastes space)
- Index low-cardinality columns (gender, status, boolean)
- Add indexes without measuring impact
- Skip EXPLAIN output interpretation
- Use `ALTER TABLE` on production without migration tools
- Forget about maintenance (fragmentation degrades performance)
- Assume MySQL and PostgreSQL work the same way

---

## 📞 Key Takeaways

1. **Indexes solve read-heavy bottlenecks** but slow writes
2. **Cardinality is critical** — only index high-cardinality columns
3. **EXPLAIN is mandatory** — don't guess, measure
4. **Production requires tools** — standard DDL causes downtime
5. **PostgreSQL is safer** — concurrent index creation prevents downtime
6. **Monitor in production** — slow query logs reveal real bottlenecks
7. **Composite indexes matter** — column order affects query performance
8. **Test locally first** — validate before production deployment

---

## Related Runbooks

- [Network Concepts](../networking/README.md) — Cloud networking fundamentals
- [CNPG Operations](../cnpg/README.md) — PostgreSQL in Kubernetes
- [Contributing Guide](../CONTRIBUTING.md) — Repository standards

---

**Last Updated**: January 2026

Questions or feedback? Open an issue in the repository.
