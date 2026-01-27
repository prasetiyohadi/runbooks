# PostgreSQL on Kubernetes (CNPG) Production Runbook

## 1. Overview
This runbook details the operational procedures for managing PostgreSQL clusters using the CloudNativePG (CNPG) operator. It is based on validated experiments and best practices for production environments.

## 2. Standard Deployment Configuration

### 2.1 High Availability & Resources
For production clusters, strictly follow these standards to ensure performance and reliability.

- **Replicas**: Minimum 3 instances for HA.
- **Synchronous Replication**: Use `method: any`, `number: 1` (quorum commit) for data safety.
- **Resources**:
    - Always set explicit CPU/Memory limits to avoid OOM kills or CPU throttling.
- **Update Strategy**:
    - Default: `primaryUpdateStrategy: unsupervised` / `primaryUpdateMethod: switchover` (Minimizes downtime).
    - **Maintenance**: Switch to `supervised` before critical operations (e.g., Operator upgrades).

**Manifest Template:**
```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: prod-cluster
spec:
  instances: 3
  # HA & Update Strategy
  primaryUpdateStrategy: unsupervised
  primaryUpdateMethod: switchover
  
  # Storage
  storage:
    size: 20Gi # Data
    storageClass: fast-storage-resizable
  walStorage:
    size: 5Gi  # WAL Logs separated for I/O performance
    storageClass: fast-storage-resizable
  
  # Resources (Adjust based on load)
  resources:
    requests:
      memory: "2Gi"
      cpu: "1"
    limits:
      memory: "4Gi"
      cpu: "2"
```

### 2.2 Monitoring
- **Metrics**: Enable `podMonitor` to scrape port `9187`.
- **Dashboards**: Use the official CNPG Grafana dashboard.
- **Key Metrics to Watch**:
    - Replication Lag (`cnpg_replication_lag`)
    - WAL Archiving Status
    - PVC Usage
    - Connection Counts

---

## 3. Storage Management

### 3.1 Increasing Disk Size
**Supported**: Yes (Online expansion if StorageClass allows).
**Procedure**:
1. Edit the Cluster manifest:
   ```yaml
   storage:
     size: <new-larger-size>
   ```
2. Apply the change: `kubectl apply -f cluster.yaml`
3. **Note**: You can ONLY increase size; shrinking is NOT supported.

### 3.2 Changing Storage Class
> [!WARNING]
> This requires a full rollout (Primary switchover + Replica recreations).

**Procedure**:
1. Update `storageClass` in the manifest.
2. Apply the change.
3. Monitor the rollout. CNPG will recreate instances one by one.

---

## 4. Upgrades & Maintenance

### 4.1 Minor Version Upgrade
**Impact**: Rolling update (near-zero downtime with `switchover`).
**Procedure**:
1. Update `imageName` in manifest (e.g., `postgresql:17.2` -> `postgresql:17.3`).
2. Apply manifest.
3. CNPG updates replicas first, then performs a switchover for the primary.

### 4.2 Major Version Upgrade (In-Place)
**Pre-requisites**: Full Backup.

**Procedure**:
1. Update `imageName` to the new major version (e.g., `16.x` -> `17.x`).
2. Ensure switchover is enabled:
   > [!IMPORTANT]
   > Ensure `primaryUpdateMethod: switchover` is set to avoid prolonged downtime.
3. Apply manifest.
4. **Validating**: Check generic/specific upgrade logs. If a pod gets stuck in `Terminating`, force delete it: `kubectl delete pod <pod-name> --force`.
5. **Post-Upgrade**:
   > [!CAUTION]
   > Old backups are INVALID after a major version upgrade. Trigger a new base backup immediately.

### 4.3 CNPG Operator Upgrade
> [!CAUTION]
> High Risk. Potential for unexpected restarts if not handled correctly.

**Procedure**:
1. **Freeze Cluster**: Set `primaryUpdateStrategy: supervised` on all clusters.
   ```yaml
   spec:
     primaryUpdateStrategy: supervised
   ```
2. Upgrade Operator Helm Chart/Manifest.
3. Verify Operator status and logs.
4. **Un-Freeze**: Revert to `unsupervised` and `switchover` one by one.

---

## 5. Disaster Recovery

### 5.1 Backups (WAL Archival)
Ensure WAL archiving is configured (e.g., to S3/Minio) for Point-In-Time Recovery (PITR).

**Configuration**:
```yaml
backup:
  barmanObjectStore:
    destinationPath: s3://my-bucket/
    endpointURL: http://minio:9000
    wal:
      compression: gzip
```

### 5.2 Restoration (PITR)
To restore to a specific point in time:

1. Create a **New Cluster** manifest (do not edit the existing one).
2. Add `bootstrap` section:
   ```yaml
   bootstrap:
     recovery:
       source: <source-cluster-name>
       recoveryTarget:
         targetTime: "2023-10-27T08:00:00Z" # UTC Timestamp
   ```
3. Apply the new manifest.

### 5.3 Volume Snapshot Recovery
Faster than object store recovery for large DBs.
1. Create a `VolumeSnapshot` of the PVCs.
2. Bootstrap new cluster from `volumeSnapshot`.

---

## 6. Troubleshooting

### 6.1 Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Replica Stuck** | `Waiting for instances...` | Check replication slots. If stuck, delete the pod + PVC or use `kubectl cnpg destroy`. |
| **Auth Failures** | App cannot connect | specific secret `username` key MUST match `.spec.managed.roles.name`. |
| **Switchover Fail**| Master not moving | Check `primaryUpdateStrategy`. If `supervised`, run `kubectl cnpg promote`. |

### 6.2 Essential Commands

- **Cluster Status**:
  `kubectl cnpg status <cluster-name>`
- **PSQL Shell**:
  `kubectl cnpg psql <cluster-name>`
- **Check Replication Slots**:
  `kubectl cnpg psql <cluster-name> -- -c 'SELECT * FROM pg_replication_slots;'`
- **Force Promote Replica**:
  `kubectl cnpg promote <cluster-name> <pod-name>`
- **Restart Specific Instance**:
  `kubectl cnpg restart <cluster-name> <instance-name>`
