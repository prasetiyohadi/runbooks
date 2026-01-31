# Cloud-Native PostgreSQL (CNPG): Architecture & Concepts

## Overview

CloudNativePG (CNPG) is a Kubernetes operator that manages PostgreSQL clusters natively on Kubernetes. It provides production-grade high availability, automated backups, self-healing capabilities, and Point-in-Time Recovery (PITR).

**Core Benefits**:
- ✅ High Availability (HA) with automatic failover
- ✅ Synchronous replication for data safety
- ✅ Automated WAL archiving and PITR
- ✅ Rolling updates with zero downtime
- ✅ Declarative cluster management (GitOps)
- ✅ No external dependencies (runs fully in Kubernetes)

---

## 1. PostgreSQL Basics

### 1.1 Replication Concepts

**Primary Node** (Writer):
- Single leader that accepts writes
- WAL (Write-Ahead Log) records changes
- Streams WAL to replicas

**Replica Nodes** (Read-Only):
- Receive WAL from primary
- Apply changes asynchronously or synchronously
- Can be promoted to primary if original fails

```
┌──────────────────────────────────────────────────────┐
│        PostgreSQL HA Architecture (CNPG)             │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Client Applications                                 │
│  (Write to Primary, Read from Replicas)              │
│  │                                                   │
│  ├────────┬─────────────┬────────────┐               │
│  ▼        ▼             ▼            ▼               │
│ ┌──────────────┐  ┌──────────────┐ ┌──────────────┐  │
│ │   Primary    │  │   Replica 1  │ │   Replica 2  │  │
│ │   (Writer)   │  │  (Read-Only) │ │ (Read-Only)  │  │
│ └──────┬───────┘  └──────────────┘ └──────────────┘  │
│        │                                             │
│   WAL Stream (Sync)                                  │
│   ├─ Standby Slots                                   │
│   ├─ Quorum Commits                                  │
│   └─ Replication Slots                               │
│                                                      │
│  Persistent Storage (PVCs)                           │
│  ├─ Data Volume (20GB+)                              │
│  └─ WAL Volume (5GB+)                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 1.2 Synchronous vs Asynchronous Replication

**Asynchronous** (Fast, risky):
```
Primary writes → Replica receives later
Risk: Data loss if primary crashes before replica receives

Use: Non-critical databases, high-throughput scenarios
```

**Synchronous** (Safe, slower):
```
Primary waits → Replica confirms → Commit confirms
Safety: No data loss (if replica crashes, primary has it)

Use: Production, mission-critical data, financial systems
```

### 1.3 Replication Slots

**Purpose**: Retain WAL files on primary until replica has consumed them.

```
Primary Disk
├─ WAL files (keep until consumed by replicas)
└─ Replication Slots track consumer position

Without slots: Primary might delete WAL before replica receives → replication lag
With slots: Primary keeps WAL → replicas always catchup
```

**Quorum Commit** (Synchronous mode):
```yaml
spec:
  postgresql:
    synchronous_commit: "on"  # Wait for replicas
    numSynchronousReplicas: 1  # At least 1 replica must ACK

Behavior:
  If 3 replicas (1 primary + 2 standbys):
    - Primary writes
    - Waits for ANY 1 replica to ACK
    - Then confirms write to application
    
  If 1 replica crashes:
    - Primary still waits for other replica
    - No impact on availability
    
  If 2 replicas crash:
    - Primary still works (no replicas to wait for)
    - Degraded but operational
```

---

## 2. CNPG Operator Architecture

### 2.1 Key Components

```
┌─────────────────────────────────────────────────────┐
│     CNPG Operator (Control Plane)                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  CRDs (Custom Resource Definitions)                 │
│  ├─ Cluster: Define PostgreSQL cluster              │
│  ├─ ScheduledBackup: Backup policy                  │
│  └─ Pooler: Connection pooling (pgBouncer)          │
│                                                     │
│  Controllers                                        │
│  ├─ Cluster Controller: Manage instances            │
│  ├─ Bootstrap Controller: Initialize clusters       │
│  └─ Backup Controller: Handle WAL archiving         │
│                                                     │
│  Status & Reconciliation                            │
│  └─ Continuously reconcile desired vs actual state  │
│                                                     │
└─────────────────────────────────────────────────────┘
         │
         │ Manages
         ▼
┌─────────────────────────────────────────────────────┐
│     PostgreSQL Cluster (Data Plane)                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Pods (Statefulset)                                 │
│  ├─ pod-0 (Primary)                                 │
│  ├─ pod-1 (Replica)                                 │
│  └─ pod-2 (Replica)                                 │
│                                                     │
│  PersistentVolumes (Storage)                        │
│  ├─ Data PVC (20GB)                                 │
│  ├─ WAL PVC (5GB)                                   │
│  └─ PGDATA directory                                │
│                                                     │
│  Services                                           │
│  ├─ rw: Primary (read-write)                        │
│  ├─ ro: Replicas (read-only)                        │
│  ├─ r: Any instance (reader)                        │
│  └─ metrics: Prometheus port 9187                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 Instance Lifecycle

```
1. CREATE Cluster manifest
         │
         ▼
2. CNPG Operator detects Cluster
         │
         ▼
3. CREATE StatefulSet with N pods
         │
         ▼
4. BOOTSTRAP (Initialize database)
   ├─ First pod: Primary
   ├─ Remaining pods: Replicas
   └─ Configure replication
         │
         ▼
5. READY (All pods running, replication healthy)
         │
         ▼
6. ROLLING UPDATE (e.g., version upgrade)
   ├─ Update replicas first (no downtime)
   ├─ Perform switchover (primary → replica)
   ├─ Update old primary
   └─ Switchback (if desired)
         │
         ▼
7. HEALTHY (Cluster operational)
```

---

## 3. Storage Architecture

### 3.1 Storage Types

**Data Volume** (`PGDATA`):
```
Location: /var/lib/postgresql/data/pgdata
Size: Depends on database size (typically 20GB+)
Usage: PostgreSQL data files, indexes, tables
I/O Pattern: Random read/write (needs fast disk)
Retention: Permanent (until cluster deleted)
```

**WAL Volume** (Write-Ahead Log):
```
Location: /var/lib/postgresql/wal
Size: Depends on write throughput (typically 5GB)
Usage: Transaction logs before committed to disk
I/O Pattern: Sequential writes (can use slower disk)
Retention: Until archived to S3/backup store
Benefit: Separating WAL improves I/O performance
```

**Backup Storage** (S3/MinIO):
```
Location: s3://bucket/cluster-name/base/ (base backups)
        + s3://bucket/cluster-name/wal/  (WAL archives)
Size: Compressed base backup + WAL archives
Usage: PITR and disaster recovery
Retention: Based on backup policy (e.g., 30 days)
```

### 3.2 Storage Expansion

**Online Expansion** (No downtime):
```yaml
# Update manifest
storage:
  size: 30Gi  # Increase from 20Gi

# Apply change
kubectl apply -f cluster.yaml

# Operator progressively expands each PVC
# Users experience no downtime
```

**Limitations**:
- ❌ Cannot shrink storage (only expand)
- ❌ Requires StorageClass that supports expansion
- ❌ Expansion takes time (depends on I/O speed)

### 3.3 Storage Classes

```yaml
# Fast SSD (Production Primary)
storageClass: "fast-storage-resizable"
size: 50Gi

# Standard storage (Replicas, non-critical)
storageClass: "standard-storage-resizable"
size: 20Gi

# Backup storage (Object store)
backup:
  barmanObjectStore:
    destinationPath: s3://my-bucket/
    endpointURL: https://s3.amazonaws.com
```

---

## 4. High Availability & Failover

### 4.1 Automatic Failover

```
Scenario: Primary node crashes

Timeline:
  0s:  Primary pod dies
  2s:  Kubernetes detects pod is down
  5s:  CNPG operator notices missing primary
 10s:  Operator promotes healthy replica to primary
 15s:  New primary is ready, accepts connections
 20s:  Service updates to point to new primary

Result: ~20 seconds of read-only access, then normal operations
```

### 4.2 Quorum-Based Failover

```yaml
spec:
  postgresql:
    synchronous_commit: "on"
    numSynchronousReplicas: 1  # At least 1 must ACK writes

Cluster: 1 Primary + 2 Replicas

Scenario 1: Primary fails
  ✅ Replicas still exist
  ✅ Operator promotes best replica (least lag)
  ✅ New cluster: 1 Primary + 1 Replica
  ✅ Cluster recovers automatically

Scenario 2: 1 Replica fails
  ✅ Primary + 1 Replica still healthy
  ✅ Replication continues
  ✅ Operator recreates lost replica
  ✅ Eventually: 1 Primary + 2 Replicas again

Scenario 3: 2 Replicas fail (Primary only)
  ⚠️ Primary operates without replicas (degraded)
  ✅ No synchronous replication (performance improves)
  ✅ Operator recreates replicas
  ✅ Eventually: 1 Primary + 2 Replicas again
```

### 4.3 Switchover (Planned Failover)

**Purpose**: Move primary to a different node with zero data loss.

```
Reason: Maintenance, node drain, load balancing

Steps:
  1. Current primary: Flush and sync WAL
  2. Current primary: Stop accepting writes
  3. Replica: Catch up to primary
  4. Replica: Promoted to primary
  5. Old primary: Demoted to replica
  6. Resume: New cluster is ready
  
Downtime: Typically < 1 second (fast reconnect)
Data Loss: Zero (fully synchronous)
```

---

## 5. Upgrades & Maintenance

### 5.1 PostgreSQL Minor Version Upgrade

**Example**: PostgreSQL 16.1 → 16.2

```
Impact: Near-zero downtime (with switchover enabled)

Procedure:
  1. Edit manifest: imageName: postgresql:16.2
  2. Apply change: kubectl apply -f cluster.yaml
  3. Operator updates replicas first (no downtime)
  4. Operator performs switchover (primary → replica)
  5. Operator updates old primary
  6. Optional: Switch back to original primary

Validation:
  - Check pod status: kubectl get pods
  - Check cluster version: kubectl cnpg status <cluster>
  - Monitor logs: kubectl logs -f pod/<cluster>-1
```

### 5.2 PostgreSQL Major Version Upgrade

**Example**: PostgreSQL 15.x → 16.x

```
⚠️ WARNING: Major upgrades involve pg_upgrade (can take time)

Prerequisites:
  1. Full backup (old backups become invalid after upgrade)
  2. Test in staging cluster first
  3. Ensure sufficient disk space (for pg_upgrade)

Procedure:
  1. Create base backup before upgrade
  2. Edit manifest: imageName: postgresql:16
  3. Set: primaryUpdateMethod: switchover
  4. Apply: kubectl apply -f cluster.yaml
  5. Monitor upgrade progress (check logs)
  6. If pod stuck: Force delete: kubectl delete pod <pod-name> --force

Post-Upgrade:
  ⚠️ CRITICAL: Trigger new base backup immediately
     Old backups are invalid for PITR
     New PITR starts from backup after upgrade
     
Rollback:
  ❌ NOT POSSIBLE (pg_upgrade is in-place)
  Have full backup if rollback needed
```

### 5.3 CNPG Operator Upgrade

**Risk Level**: High (can cause unexpected cluster restarts)

```yaml
Safety Procedure:

Step 1: Freeze all clusters (supervised mode)
  spec:
    primaryUpdateStrategy: supervised  # Don't auto-update
  
  Apply to ALL clusters:
  kubectl patch cluster -n cnpg --all -p '{"spec":{"primaryUpdateStrategy":"supervised"}}' --type=merge

Step 2: Upgrade operator
  helm upgrade cnpg cnpg/cloudnative-pg --version X.Y.Z

Step 3: Monitor operator
  kubectl logs -f deployment/cnpg-controller-manager -n cnpg-system

Step 4: Verify operator health
  kubectl get deployment -n cnpg-system cnpg-controller-manager
  # Should show all replicas ready

Step 5: Unfreeze clusters one by one
  spec:
    primaryUpdateStrategy: unsupervised  # Resume normal updates
  
  Apply per cluster to validate each works correctly
```

---

## 6. Backup & Disaster Recovery

### 6.1 WAL Archiving

**WAL** (Write-Ahead Log): Transaction log recorded before commit.

```
Without archiving:
  Primary disk: Keeps last few hours of WAL
  If primary crashes: Can recover only recent transactions
  Old backups: Cannot be used for PITR

With archiving:
  Primary disk: Keeps recent WAL (cleanup when archived)
  S3/Minio: Keeps ALL WAL for 30+ days
  Any old backup: Can PITR to any point in last 30 days
```

**Configuration**:
```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://my-bucket/
      endpointURL: https://s3.amazonaws.com
      s3Credentials:
        accessKeyId: KEY
        secretAccessKey: SECRET
      wal:
        compression: gzip  # Reduce storage
        maxParallel: 4     # Parallel streams
```

### 6.2 Scheduled Backups

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: cluster-daily-backup
spec:
  schedule: "0 1 * * *"  # Daily at 1 AM UTC
  backupOwnerReference: cluster  # Auto-delete old backups
  cluster:
    name: <cluster-name>
  
  # Retention: keep 7 daily backups
  retention: 7
```

### 6.3 Point-in-Time Recovery (PITR)

**Scenario**: Delete critical table at 14:30, discover at 15:00

```yaml
# Create NEW cluster (don't overwrite existing)
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: restored-cluster
spec:
  instances: 1
  
  bootstrap:
    recovery:
      source: cluster  # Source cluster name
      recoveryTarget:
        targetTime: "2024-01-28T14:25:00Z"  # Just before deletion
      # All data up to this timestamp will be restored
```

---

## 7. Connection Management

### 7.1 Connection Pooling with PgBouncer

**Problem**: Each PostgreSQL connection expensive (memory, process)

```
Without pooling:
  10,000 app instances → 10,000 connections → PostgreSQL overload
  
With pooling:
  10,000 app instances → PgBouncer → 100 connections → PostgreSQL (1 connection per replica)
```

**Configuration**:
```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: cluster-pooler
spec:
  cluster:
    name: <cluster-name>
  
  type: rw  # Read-write pooling
  
  pgbouncer:
    pool_mode: "transaction"  # Reuse connection per transaction
    max_client_conn: 1000     # Max app connections
    default_pool_size: 25     # Connection pool size per replica
```

### 7.2 Service Discovery

```yaml
# Read-Write (Primary only)
svc/<cluster>-rw.default.svc.cluster.local:5432

# Read-Only (Replicas only)
svc/<cluster>-ro.default.svc.cluster.local:5432

# Read (Any instance, load balanced)
svc/<cluster>-r.default.svc.cluster.local:5432

# Monitoring
svc/<cluster>-metrics.default.svc.cluster.local:9187
```

---

## 8. Monitoring & Observability

### 8.1 Key Metrics

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| **Replication Lag** | < 1s | > 10s | > 60s |
| **WAL Archiving** | Caught up | Behind 1h | Behind 24h |
| **PVC Usage** | < 70% | > 85% | > 95% |
| **Connection Count** | < 50% pool | > 70% | > 90% |
| **Transaction Rate** | Baseline | +50% | +100% |
| **Slow Queries** | < 1% | > 5% | > 10% |

### 8.2 Prometheus Metrics

```
# Replication lag (in seconds)
cnpg_replication_lag

# WAL archive status
cnpg_last_wal_archive_time
cnpg_wal_archive_success_total

# Pod metrics (standard)
up{job="cnpg"}  # Cluster health
container_memory_usage_bytes{pod=~"<cluster>.*"}
container_cpu_usage_seconds_total{pod=~"<cluster>.*"}

# PVC usage
kubelet_volume_stats_used_bytes{persistentvolumeclaim=~"<cluster>.*"}
kubelet_volume_stats_capacity_bytes{persistentvolumeclaim=~"<cluster>.*"}
```

### 8.3 Alert Rules

```yaml
- alert: CNPGReplicationLagHigh
  expr: cnpg_replication_lag > 60
  for: 5m
  annotations:
    summary: "CNPG replication lag > 60s"

- alert: CNPGWALArchivingFailing
  expr: time() - cnpg_last_wal_archive_time > 3600
  for: 15m
  annotations:
    summary: "WAL archiving not running (> 1 hour behind)"

- alert: CNPGPVCAlmostFull
  expr: kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.95
  for: 10m
  annotations:
    summary: "CNPG PVC > 95% full"
```

---

## 9. Best Practices

### 9.1 Production Configuration Checklist

```yaml
✅ Replicas: Minimum 3 (1 primary + 2 replicas)
✅ Synchronous Replication: numSynchronousReplicas: 1
✅ Storage: Separate data + WAL PVCs
✅ Resources: Explicit CPU/memory limits
✅ WAL Archiving: Enabled to S3/MinIO
✅ Backup Policy: Scheduled daily backups
✅ Update Strategy: primaryUpdateMethod: switchover
✅ Monitoring: PodMonitor configured
✅ Connection Pooling: PgBouncer for high concurrency
✅ Secrets: PostgreSQL passwords in K8s Secrets
```

### 9.2 Capacity Planning

```
Determine requirements:
  1. Database size today
  2. Growth rate (GB/month)
  3. Write throughput (queries/sec)
  4. Backup frequency and retention

Storage calculation:
  Data volume = current_size × 1.5 (growth buffer)
  WAL volume = (queries_per_sec × avg_query_size × 3600) / 1000
  Backup retention = base_backup_size × number_of_backups
  
Example:
  Current: 10GB
  Growth: 1GB/month
  Writes: 1000 q/s
  
  Data PVC: 10GB × 1.5 = 15GB
  WAL PVC: 5GB (typical for 1000 q/s)
  30-day backups: 10GB × 10 = 100GB (in S3)
```

### 9.3 Performance Tuning

```yaml
# Resource-heavy workloads
resources:
  requests:
    memory: "8Gi"
    cpu: "4"
  limits:
    memory: "16Gi"
    cpu: "8"

# Increase max connections
postgresql:
  parameters:
    max_connections: "1000"
    shared_buffers: "2GB"
    effective_cache_size: "8GB"
```

---

## 10. Essential kubectl Commands

```bash
# Cluster status
kubectl cnpg status <cluster-name>

# PSQL shell (run queries)
kubectl cnpg psql <cluster-name>

# Replication status
kubectl cnpg psql <cluster-name> -- -c "SELECT * FROM pg_stat_replication;"

# Check replication slots
kubectl cnpg psql <cluster-name> -- -c "SELECT * FROM pg_replication_slots;"

# Force promote replica to primary
kubectl cnpg promote <cluster-name> <pod-name>

# Restart instance
kubectl cnpg restart <cluster-name> <instance-name>

# Rollback cluster (destroy and recreate)
kubectl cnpg destroy <cluster-name>
```

---

## 11. Troubleshooting Common Issues

### Replica Stuck in "Waiting" Status

```
Symptom: Replica pod runs but doesn't join cluster

Causes:
  1. Replication slot issue
  2. Network connectivity problem
  3. Storage initialization problem

Fix:
  # Check logs
  kubectl logs pod/<cluster>-1
  
  # If slot stuck, recreate pod
  kubectl delete pod <cluster>-1
  
  # CNPG will automatically recreate and rejoin
```

### Authentication Failures

```
Error: "FATAL: role 'app' does not exist"

Fix: Ensure managed role name matches secret
  
  Manifest:
    spec:
      managed:
        roles:
        - name: app
        
  Secret:
    Must have key 'username: app'
```

### Switchover Timeout

```
Symptom: Switchover hangs or times out

Fix: Check primaryUpdateStrategy
  
  If supervised: Manually promote
    kubectl cnpg promote <cluster> <pod>
  
  Change to unsupervised:
    spec:
      primaryUpdateStrategy: unsupervised
      primaryUpdateMethod: switchover
```

---

## 12. Key Takeaways

1. **HA by default**: 3+ replicas with synchronous replication
2. **Storage separation**: Data + WAL on different volumes
3. **Zero-downtime updates**: Use switchover method
4. **PITR capability**: Enable WAL archiving to S3
5. **Self-healing**: Operator handles failover automatically
6. **Monitoring required**: Track replication lag and WAL archiving
7. **Capacity planning**: Predict storage growth upfront
8. **Backup discipline**: Automate backups and test recovery

---

## Additional Resources

- [CloudNativePG Documentation](https://cloudnative-pg.io/documentation/current/)
- [PostgreSQL Replication Guide](https://www.postgresql.org/docs/current/warm-standby.html)
- [CNPG GitHub Repository](https://github.com/cloudnative-pg/cloudnative-pg)
- [Production Deployment Guide](https://cloudnative-pg.io/documentation/current/deployment/)

---

**Last Updated**: January 2026
