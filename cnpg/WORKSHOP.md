# CNPG Workshop: Hands-On PostgreSQL Clustering Lab

## Overview

This workshop provides practical experience with CloudNativePG (CNPG) by building and operating a PostgreSQL cluster on Kubernetes.

- **Duration**: 120 minutes (6 parts, 18 tasks)
- **Prerequisites**: Kubernetes cluster (minikube/kind acceptable), kubectl, helm, docker
- **Outcome**: Running HA PostgreSQL cluster with backups, failover, and monitoring

---

## Part 1: Operator Installation & Setup (15 min)

### Task 1.1: Verify Kubernetes Environment

```bash
# Check Kubernetes version
kubectl version --short

# Expected output:
# Client Version: v1.28.0
# Server Version: v1.28.0

# Check available storage classes
kubectl get storageclass

# Expected output (at least 1):
# NAME                 PROVISIONER
# standard (default)   kubernetes.io/amd-minikube-hostpath
```

### Task 1.2: Create CNPG Namespace

```bash
# Create namespace for CNPG operator
kubectl create namespace cnpg-system

# Verify creation
kubectl get namespaces | grep cnpg

# Expected output:
# cnpg-system   Active   5s
```

### Task 1.3: Install CNPG Operator via Helm

```bash
# Add Helm repository
helm repo add cnpg https://cloudnative-pg.github.io/charts
helm repo update

# Install operator
helm install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace

# Verify operator deployment
kubectl get deployment -n cnpg-system

# Expected output:
# NAME                             READY   UP-TO-DATE   AVAILABLE   AGE
# cnpg-cloudnative-pg              1/1     1            1           30s
```

### Task 1.4: Verify Operator is Ready

```bash
# Check operator pod
kubectl get pods -n cnpg-system

# Expected output (RUNNING status):
# NAME                                      READY   STATUS    RESTARTS   AGE
# cnpg-cloudnative-pg-7c8d4f5b89-abc123   1/1     Running   0          45s

# Check operator logs
kubectl logs -n cnpg-system deployment/cnpg-cloudnative-pg | head -20

# Expected: Log entries about CRD registration
```

### Task 1.5: Create Production Namespace

```bash
# Create namespace for PostgreSQL clusters
kubectl create namespace databases

# Verify
kubectl get namespaces | grep databases

# Expected:
# databases   Active   3s
```

---

## Part 2: Deploy PostgreSQL Cluster (30 min)

### Task 2.1: Create Base Cluster Manifest

Create `pg-cluster.yaml`:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: demo-cluster
  namespace: databases
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.2
  
  # HA Configuration
  primaryUpdateStrategy: unsupervised
  primaryUpdateMethod: switchover
  
  # Storage
  storage:
    size: 1Gi
    storageClass: standard
  walStorage:
    size: 1Gi
    storageClass: standard
  
  # Resources
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  
  # Monitoring
  monitoring:
    enabled: true
    
  # PostgreSQL Configuration
  postgresql:
    parameters:
      max_connections: "100"
      shared_buffers: "64MB"
```

### Task 2.2: Apply Cluster Manifest

```bash
# Apply manifest
kubectl apply -f pg-cluster.yaml

# Verify cluster created
kubectl get cluster -n databases

# Expected output:
# NAME            AGE   INSTANCES   READY   STATUS
# demo-cluster    5s    3           0       Setting up cluster
```

### Task 2.3: Monitor Cluster Creation

```bash
# Watch pods being created
kubectl get pods -n databases -w

# Expected progression:
# NAME              READY   STATUS            RESTARTS   AGE
# demo-cluster-1    0/1     Pending           0          5s
# demo-cluster-1    0/1     ContainerCreating 0          8s
# demo-cluster-1    1/1     Running           0          15s
# demo-cluster-2    0/1     Pending           0          20s
# demo-cluster-2    1/1     Running           0          30s
# demo-cluster-3    0/1     Pending           0          35s
# demo-cluster-3    1/1     Running           0          45s

# Press Ctrl+C to stop watching
```

### Task 2.4: Check Cluster Status

```bash
# Wait for all pods to be ready (1-2 minutes)
kubectl wait --for=condition=ready pod \
  -l postgresql=demo-cluster \
  -n databases \
  --timeout=300s

# Get detailed cluster status
kubectl cnpg status demo-cluster -n databases

# Expected output:
# Cluster Summary
# Name:                 demo-cluster
# Namespace:            databases
# System ID:            xxxxxxxxxxxx
# PostgreSQL Version:   16.2
# Primary:              demo-cluster-1
# 
# Instances:            3
#   Ready:              3
#   Not Ready:          0
#
# Replicas:
#   demo-cluster-2 (streaming|wal received)
#   demo-cluster-3 (streaming|wal received)
```

### Task 2.5: Verify Storage

```bash
# Check PVCs created
kubectl get pvc -n databases

# Expected output (6 PVCs: 3 for data, 3 for WAL):
# NAME                    STATUS   VOLUME
# demo-cluster-1          Bound    pvc-xxx
# demo-cluster-1-wal      Bound    pvc-xxx
# demo-cluster-2          Bound    pvc-xxx
# demo-cluster-2-wal      Bound    pvc-xxx
# demo-cluster-3          Bound    pvc-xxx
# demo-cluster-3-wal      Bound    pvc-xxx
```

### Task 2.6: Verify Services

```bash
# Check services created
kubectl get svc -n databases

# Expected output (4 services):
# NAME                     TYPE        CLUSTER-IP
# demo-cluster-rw          ClusterIP   10.x.x.x  (read-write, primary)
# demo-cluster-ro          ClusterIP   10.x.x.x  (read-only, replicas)
# demo-cluster-r           ClusterIP   10.x.x.x  (any instance)
# demo-cluster-metrics     ClusterIP   10.x.x.x  (prometheus)
```

---

## Part 3: Database Operations & Queries (30 min)

### Task 3.1: Connect to Database

```bash
# Open PSQL shell
kubectl cnpg psql demo-cluster -n databases

# You should see:
# psql (16.2 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 10.2.1)
# SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256)
# postgres=>
```

### Task 3.2: Create Test Database and Schema

```sql
-- Create database
CREATE DATABASE testdb;

-- Connect to it
\c testdb

-- Create schema
CREATE SCHEMA test;

-- Create table
CREATE TABLE test.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_users_email ON test.users(email);

-- Insert test data
INSERT INTO test.users (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com'),
  ('Charlie', 'charlie@example.com');

-- Verify data
SELECT * FROM test.users;

-- Expected output:
--  id |  name   |       email        |         created_at
-- ----+---------+--------------------+----------------------------
--   1 | Alice   | alice@example.com  | 2024-01-28 10:30:45.123456
--   2 | Bob     | bob@example.com    | 2024-01-28 10:30:45.234567
--   3 | Charlie | charlie@example.com| 2024-01-28 10:30:45.345678
```

### Task 3.3: Check Replication

```sql
-- Check replication slots
SELECT * FROM pg_replication_slots;

-- Expected output (2 replicas):
--  slot_name   |  slot_type  | restart_lsn
-- ---------------+-------------+-------------
--  cnpg_standby_1 | physical    | 0/3000028
--  cnpg_standby_2 | physical    | 0/3000028

-- Check active replicas
SELECT * FROM pg_stat_replication;

-- Expected output:
--  pid | usesysid | usename | application_name | state
-- -----+----------+---------+------------------+----------
--  123 | 10       | cnpg    | standby_1        | streaming
--  124 | 10       | cnpg    | standby_2        | streaming

-- Check lag (should be 0)
SELECT now() - pg_last_xact_replay_time();

-- Expected:
--  ?column?
-- ----------
--  00:00:00
```

### Task 3.4: Verify Write Operations on Primary

```bash
# Exit PSQL
\q

# Connect to READ-WRITE service (primary only)
kubectl cnpg psql demo-cluster -n databases

# Insert data
psql> INSERT INTO test.users (name, email) VALUES ('David', 'david@example.com');

# Query
psql> SELECT COUNT(*) FROM test.users;
-- Expected: 4

# Disconnect
\q
```

### Task 3.5: Verify Replicas Received Data

```bash
# Connect to READ-ONLY service (replica)
# Note: Port forward required for replicas (they're not exposed in basic setup)

# Check replica pod directly
kubectl exec -it -n databases demo-cluster-2 -- psql -U postgres

# Query replica
psql> SELECT COUNT(*) FROM testdb.test.users;
-- Expected: 4 (replicas have the data)

psql> SELECT * FROM testdb.test.users WHERE name = 'David';
-- Expected: Shows the newly inserted row

psql> \q
```

### Task 3.6: Check Primary ID

```bash
# Get primary pod name
kubectl get pods -n databases -o wide | grep "demo-cluster"

# Expected: demo-cluster-1 marked as primary
# Or check cluster status
kubectl cnpg status demo-cluster -n databases | grep "Primary:"
```

---

## Part 4: Failover & Recovery (30 min)

### Task 4.1: Simulate Primary Failure

```bash
# Delete primary pod (simulates crash)
kubectl delete pod demo-cluster-1 -n databases

# Immediately check cluster status
kubectl cnpg status demo-cluster -n databases

# Expected progression:
# Initial: Primary demo-cluster-1 (deleting)
# After 10s: No primary, replicas promoting
# After 20s: demo-cluster-2 promoted to primary
# After 30s: demo-cluster-1 recreated as replica
```

### Task 4.2: Monitor Failover Process

```bash
# Watch pod recreation
kubectl get pods -n databases -w

# Timeline:
# demo-cluster-1   0/1 Terminating
# demo-cluster-1   0/1 Terminated
# (cluster without primary for ~10s)
# demo-cluster-2   Primary promoted (1/1 Running)
# demo-cluster-1   0/1 Pending (recreating)
# demo-cluster-1   0/1 ContainerCreating
# demo-cluster-1   1/1 Running (new replica)
```

### Task 4.3: Verify Failover Completed

```bash
# Get cluster status
kubectl cnpg status demo-cluster -n databases

# Expected output (NEW primary):
# Primary:          demo-cluster-2  (was demo-cluster-1)
# Replicas:
#   demo-cluster-1 (streaming)
#   demo-cluster-3 (streaming)
```

### Task 4.4: Verify Data Integrity After Failover

```bash
# Connect and query
kubectl cnpg psql demo-cluster -n databases

# Check data is intact
psql> SELECT COUNT(*) FROM test.users;
-- Expected: 4 (all data preserved)

psql> SELECT * FROM test.users;
-- Expected: All rows including David

# Insert new data to verify primary works
psql> INSERT INTO test.users (name, email) VALUES ('Eve', 'eve@example.com');

psql> SELECT COUNT(*) FROM test.users;
-- Expected: 5

psql> \q
```

### Task 4.5: Manual Switchover (Planned)

```bash
# Current state: demo-cluster-2 is primary
# Goal: Move primary back to demo-cluster-1

# Get current cluster status
kubectl cnpg status demo-cluster -n databases

# Promote replica to primary (switchover)
kubectl cnpg promote demo-cluster demo-cluster-1 -n databases

# Watch switchover
kubectl get pods -n databases -w

# Expected:
# demo-cluster-2 steps down (gets new primary label)
# demo-cluster-1 becomes primary
# demo-cluster-2 restarts as replica
```

### Task 4.6: Verify Switchover Completed

```bash
# Get status
kubectl cnpg status demo-cluster -n databases

# Expected (original primary restored):
# Primary:          demo-cluster-1
# Replicas:
#   demo-cluster-2 (streaming)
#   demo-cluster-3 (streaming)

# Verify data consistency
kubectl cnpg psql demo-cluster -n databases

psql> SELECT COUNT(*) FROM test.users;
-- Expected: 5 (includes Eve)
```

---

## Part 5: Backup & Recovery (20 min)

### Task 5.1: Create Backup Storage (MinIO)

```bash
# Deploy MinIO for object storage backup
kubectl run minio \
  -n databases \
  --image=minio/minio:latest \
  -- server /data

# Wait for MinIO to start
sleep 10

# Expose MinIO (for local testing)
kubectl port-forward -n databases svc/minio 9000:9000 &
```

### Task 5.2: Configure Backup in Cluster

Create `pg-cluster-backup.yaml`:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: demo-cluster
  namespace: databases
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.2
  
  # ... existing config ...
  
  # Backup configuration
  backup:
    barmanObjectStore:
      destinationPath: s3://demo-backup/
      endpointURL: http://minio:9000
      s3Credentials:
        accessKeyId: minioadmin
        secretAccessKey: minioadmin
      wal:
        compression: gzip
        maxParallel: 4
```

### Task 5.3: Apply Backup Configuration

```bash
# Apply updated manifest
kubectl apply -f pg-cluster-backup.yaml

# Verify backup storage initialized
kubectl logs -n databases demo-cluster-1 | grep -i backup

# Expected log entries about backup initialization
```

### Task 5.4: Create Scheduled Backup

Create `scheduled-backup.yaml`:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: demo-cluster-backup
  namespace: databases
spec:
  schedule: "0 1 * * *"  # Daily at 1 AM UTC
  backupOwnerReference: cluster
  cluster:
    name: demo-cluster
```

### Task 5.5: Trigger Manual Backup

```bash
# Apply scheduled backup
kubectl apply -f scheduled-backup.yaml

# Trigger immediate backup (for lab purposes)
kubectl cnpg psql demo-cluster -n databases << EOF
SELECT * FROM pg_basebackup_start('demo-backup', false);
EOF

# Wait for backup to complete (~30 seconds)
echo "Backup in progress..."
sleep 30

# Check backup status in MinIO logs
kubectl logs -n databases deployment/minio | tail -20
```

### Task 5.6: Point-in-Time Recovery (PITR)

```bash
# Get current timestamp
RECOVERY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "Recovery time: $RECOVERY_TIME"

# Create recovery manifest
cat > pg-cluster-recovered.yaml << EOF
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: demo-cluster-recovered
  namespace: databases
spec:
  instances: 1
  imageName: ghcr.io/cloudnative-pg/postgresql:16.2
  
  storage:
    size: 1Gi
    storageClass: standard
  
  bootstrap:
    recovery:
      source: demo-cluster
      recoveryTarget:
        targetTime: "$RECOVERY_TIME"
EOF

# Apply recovery cluster (don't do this in real lab to avoid complications)
echo "Recovery manifest created: pg-cluster-recovered.yaml"
echo "In production, apply with: kubectl apply -f pg-cluster-recovered.yaml"
```

---

## Part 6: Monitoring & Validation (15 min)

### Task 6.1: Check Pod Metrics

```bash
# Get resource usage
kubectl top pods -n databases

# Expected output:
# NAME              CPU(cores)   MEMORY(bytes)
# demo-cluster-1    50m          128Mi
# demo-cluster-2    45m          125Mi
# demo-cluster-3    48m          130Mi
```

### Task 6.2: Check PVC Usage

```bash
# Check storage usage
kubectl get pvc -n databases -o wide

# Check detailed PVC info
kubectl describe pvc demo-cluster-1 -n databases | grep -i "used\|size"
```

### Task 6.3: Verify Replication Health

```bash
# Check cluster status
kubectl cnpg status demo-cluster -n databases

# Look for "All replicas ready" message
# Check Replication Slots are active (for both replicas)
```

### Task 6.4: Test Recovery

```bash
# Connect to database
kubectl cnpg psql demo-cluster -n databases

# Simulate data corruption (delete a row)
psql> DELETE FROM test.users WHERE id = 1;

psql> SELECT COUNT(*) FROM test.users;
-- Expected: 4 (one deleted)

# In production, restore from backup to another cluster
# (PITR would recover the deleted data)

psql> \q
```

### Task 6.5: Cleanup (Optional)

```bash
# Delete cluster (removes pods and PVCs)
kubectl delete cluster demo-cluster -n databases

# Verify deletion
kubectl get pods -n databases

# Delete namespace
kubectl delete namespace databases
```

### Task 6.6: Validation Checklist

- [ ] Cluster deployed with 3 instances
- [ ] Primary and replicas identified
- [ ] Data replicated to all instances
- [ ] Failover worked (primary recreated)
- [ ] Switchover successful (primary role switched)
- [ ] Backup configured
- [ ] Can query both primary and replicas
- [ ] Replication slots active
- [ ] Monitoring metrics collected
- [ ] Services created correctly

---

## Troubleshooting Common Issues

| Issue | Symptoms | Resolution |
|-------|----------|-----------|
| **Pod stuck "Pending"** | Stays pending > 5min | Check storage class: `kubectl get storageclass` |
| **Replicas not joining** | "Waiting for instances" | Check logs: `kubectl logs <pod> -n databases` |
| **Slow failover** | Primary down 2-3min before replica promotes | Check PVC attachment status |
| **Cannot connect** | "Connection refused" | Port forward or check service: `kubectl get svc` |
| **WAL archiving failed** | Backup not progressing | Verify MinIO credentials and connectivity |

---

## Next Steps

1. **Deploy metrics collection** (Prometheus + Grafana)
2. **Set up alerting** (Alert on replication lag > 60s)
3. **Automate backups** (Use ScheduledBackup CRD)
4. **Implement connection pooling** (PgBouncer via CNPG Pooler)
5. **Test DR procedures** (Regular PITR drills)
6. **Document runbooks** (Customized for your environment)

---

**Workshop Completion Time**: ~120 minutes
**Skills Gained**: Cluster deployment, failover, backup/recovery, monitoring