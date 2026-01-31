# Storage: Physical & Cloud Quick Reference

Navigate storage solutions across data centers and cloud providers with practical commands, learning paths, and real-world solutions.

---

## Learning Paths

### 🟢 Beginner Path (Weeks 0-2)
Start from zero to productive storage user

- **Week 0-1**: Storage Fundamentals
  - Storage types: Block, File, Object
  - Use cases and when to choose each
  - Cloud provider options (AWS, Azure, GCP)
  - On-premises solutions
  - Cost factors

- **Week 1-2**: Your First Storage Setup
  - Create cloud storage bucket/volume
  - Upload data and verify
  - Basic permissions and access control
  - Monitor storage usage
  - First backup

**Time Investment**: 8-10 hours  
**Outcome**: Successfully provisioned and used cloud storage

---

### 🟡 Intermediate Path (Weeks 2-6)
Build production-ready storage infrastructure

- **Week 2-3**: Advanced Configuration
  - Lifecycle policies and tiering
  - Encryption (at rest and in transit)
  - Cross-region replication
  - Performance optimization
  - Cost analysis and optimization

- **Week 3-4**: Backup & Recovery
  - Full, incremental, differential backups
  - Recovery Point Objective (RPO)
  - Recovery Time Objective (RTO)
  - Disaster recovery procedures
  - Testing recovery procedures

- **Week 4-6**: Enterprise Patterns
  - Multi-tier storage architecture
  - Hybrid storage (on-premises + cloud)
  - Compliance and data governance
  - Audit logging and monitoring
  - Cost optimization strategies

**Time Investment**: 20-30 hours  
**Outcome**: Manage production storage with backup/recovery/compliance

---

### 🔴 Advanced Path (Week 6+)
Architect enterprise storage infrastructure

- **Week 6+**: Advanced Topics
  - Storage federation and geo-distribution
  - Active-active replication
  - Capacity planning and forecasting
  - Performance tuning and optimization
  - Custom storage solutions

- **Advanced Topics**:
  - Erasure coding and RAID strategies
  - Storage networking and protocols
  - Data deduplication and compression
  - Disaster recovery automation
  - Cost modeling and chargeback

**Time Investment**: 40+ hours  
**Outcome**: Enterprise-grade storage architecture

---

## Essential Commands Cheatsheet

### AWS S3

```bash
# Create bucket
aws s3 mb s3://my-bucket --region us-east-1

# List buckets
aws s3 ls

# Upload file
aws s3 cp local-file.txt s3://my-bucket/

# Download file
aws s3 cp s3://my-bucket/file.txt local-file.txt

# Sync directory (bidirectional)
aws s3 sync ./local-dir s3://my-bucket/remote-dir

# Set lifecycle policy
aws s3api put-bucket-lifecycle-configuration --bucket my-bucket --lifecycle-configuration file://lifecycle.json

# Enable versioning
aws s3api put-bucket-versioning --bucket my-bucket --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption --bucket my-bucket --server-side-encryption-configuration file://encryption.json
```

### AWS EBS

```bash
# Create volume
aws ec2 create-volume --size 100 --volume-type gp3 --availability-zone us-east-1a

# Attach to instance
aws ec2 attach-volume --volume-id vol-123 --instance-id i-456 --device /dev/sdf

# Create snapshot
aws ec2 create-snapshot --volume-id vol-123 --description "Backup"

# List snapshots
aws ec2 describe-snapshots --owner-ids self

# Create volume from snapshot
aws ec2 create-volume --snapshot-id snap-123 --availability-zone us-east-1a
```

### AWS EFS

```bash
# Create file system
aws efs create-file-system --performance-mode generalPurpose --throughput-mode bursting

# Create mount target
aws efs create-mount-target --file-system-id fs-123 --subnet-id subnet-456 --security-groups sg-789

# Mount to EC2 (inside instance)
sudo mount -t nfs4 -o nfsvers=4.1 fs-123.efs.us-east-1.amazonaws.com:/ /mnt/efs

# Create lifecycle configuration
aws efs put-lifecycle-configuration --file-system-id fs-123 --lifecycle-policies TransitionToIA=AFTER_30_DAYS
```

### Azure Storage

```bash
# Create storage account
az storage account create --name mystorageaccount --resource-group mygroup --location eastus

# Create blob container
az storage container create --name mycontainer --account-name mystorageaccount

# Upload blob
az storage blob upload --file local-file.txt --container-name mycontainer --name blob-name --account-name mystorageaccount

# List blobs
az storage blob list --container-name mycontainer --account-name mystorageaccount

# Set access tier to cool
az storage blob set-tier --name blob-name --container-name mycontainer --tier cool --account-name mystorageaccount

# Enable blob lifecycle management
az storage account management-policy create --account-name mystorageaccount --resource-group mygroup --policy @policy.json
```

### GCP Cloud Storage

```bash
# Create bucket
gsutil mb gs://my-bucket

# Copy file
gsutil cp local-file.txt gs://my-bucket/

# List objects
gsutil ls gs://my-bucket/

# Set lifecycle policy
gsutil lifecycle set lifecycle.json gs://my-bucket

# Enable versioning
gsutil versioning set on gs://my-bucket

# Change storage class
gsutil rewrite -s NEARLINE gs://my-bucket/**
```

---

## Storage Comparison Tables

### By Use Case

| Use Case | Recommended | Reason |
|----------|-------------|--------|
| **Databases** | Block (EBS/Disk) | Fast random access, low latency |
| **Web servers** | Object (S3/Blob) | Scalable, cost-effective |
| **Shared files** | File (EFS/Files) | Multi-client access, standard protocols |
| **Archives** | Object tier (Glacier) | Long-term, low cost |
| **Compliance** | Object tier (Deep Archive) | Years retention, legally required |
| **Backups** | Hybrid (cloud + tape) | Cost-effective scaling |
| **Big Data** | Object (S3/GCS) | Distributed access, analytics-optimized |

### By Cost

| Storage Type | Cost/TB/Month | Best For |
|--------------|---------------|----------|
| **SSD (block)** | $100-150 | Databases, high performance |
| **HDD (block)** | $20-30 | Infrequent block access |
| **NAS (file)** | $30-50 | Shared files, on-premises |
| **S3 Standard** | $23 | Hot data, web content |
| **S3 Glacier** | $4 | Cold data, 90+ day minimum |
| **Glacier Deep Archive** | $1 | Archives, 365-day minimum |
| **Tape** | $0.50 | Off-site archival, unlimited |

### By Speed

| Latency | Storage Type | Access Pattern |
|---------|--------------|-----------------|
| **<1ms** | NVMe SSD, in-memory | Databases, real-time |
| **1-10ms** | SSD (EBS gp3) | General purpose, web |
| **10-100ms** | HDD (st1) | Sequential access, big data |
| **100ms-1s** | Cloud file (EFS) | Shared files, NFS |
| **1-100ms** | Object (S3) | Large objects, batches |
| **Minutes** | Glacier Instant | Archival retrieval |
| **Hours** | Glacier Flexible | Long-term archival |

---

## Frequently Asked Questions

### Q1: How do I reduce storage costs?

**Answer**: Multi-tier approach:

```
1. Right-size: Match storage type to actual needs
2. Lifecycle: Auto-tier data based on access patterns
3. Compression: Enable compression for text/logs (50-70% savings)
4. Deduplication: Eliminate duplicate data
5. Clean up: Archive/delete old data automatically

Example: 1TB database
- Before: All on EBS gp3 = $100/month
- After: Hot on EBS, cold on S3 Glacier = $25/month (75% savings)
```

---

### Q2: What's the difference between RTO and RPO?

**Answer**:

- **RPO (Recovery Point Objective)**: How much data can you lose?
  - RPO = 1 hour means you can lose up to 1 hour of data
  - Solution: Backup/replicate every 1 hour

- **RTO (Recovery Time Objective)**: How fast must recovery be?
  - RTO = 15 minutes means recovery must complete in 15 minutes
  - Solution: Hot standby or automated failover

**Example**: Credit card transactions
- RPO = 1 minute (minimal data loss acceptable)
- RTO = 5 minutes (must recover quickly)
- Solution: Active-active replication with failover

---

### Q3: Should I backup to the cloud or keep on-premises?

**Answer**: Hybrid approach:

```
Backup Strategy:
├── Local backup: Daily incremental (1 week retention)
│   Purpose: Fast recovery (< 1 hour)
│   Cost: Tape storage (~$0.50/TB/month)
│
├── Cloud backup: Daily incremental (30 days retention)
│   Purpose: Geographic redundancy
│   Cost: S3 Standard (~$23/TB/month)
│
└── Archive backup: Monthly full (7 years retention)
    Purpose: Compliance holds
    Cost: S3 Glacier Deep Archive (~$1/TB/month)

Advantages:
- Fast local recovery (high RTO)
- Geographic diversity (disaster recovery)
- Compliance with retention policies
- Cost-effective scaling
```

---

### Q4: How do I ensure compliance with encryption?

**Answer**: Implement defense in depth:

```hcl
# 1. Encryption at rest
encryption_at_rest = {
  algorithm = "AES-256"
  key_management = "KMS"  # Customer-managed
  rotation = "annual"
}

# 2. Encryption in transit
encryption_in_transit = {
  protocol = "TLS 1.2+"
  certificate_validation = true
}

# 3. Transparent Database Encryption (TDE)
tde = true  # Database-level encryption

# 4. Key audit trail
key_audit = {
  logging = "CloudTrail"
  retention = "90 days"
  alert_on_access = true
}
```

---

### Q5: What's the best way to migrate data to cloud?

**Answer**: Choose based on data volume:

| Volume | Method | Time | Cost |
|--------|--------|------|------|
| **< 1TB** | Direct upload | Hours | Minimal |
| **1-100TB** | AWS DataSync | Days | $0.0125/GB |
| **> 100TB** | AWS Snowball | Weeks | $300-500 + $0.03/GB |
| **Continuous** | Replication | Ongoing | Depends on provider |

---

### Q6: How do I monitor storage performance?

**Answer**: Track key metrics:

```bash
# AWS CloudWatch metrics
- EBS:
  * Read IOPS, Write IOPS
  * Read Throughput, Write Throughput
  * Volume Queue Length (latency indicator)

- S3:
  * Requests count
  * 4xx, 5xx errors
  * First Byte Latency

- EFS:
  * Throughput utilization
  * Burst credit balance
  * Operations per second

Alerting thresholds:
- IOPS > 80% provisioned: Scale up
- Error rate > 1%: Investigate
- Latency P99 > 10x baseline: Optimize
```

---

### Q7: Can I move data between storage types?

**Answer**: Yes, multiple strategies:

```
Scenario: Move from S3 to EBS for database

Method 1: S3 → EC2 → EBS (manual)
- Download from S3
- Attach EBS volume
- Format and mount
- Copy data
- Cost: Data transfer + compute time

Method 2: S3 Snapshot → EBS (best)
- Create EBS volume from S3 snapshot
- Instant (snapshot-based)
- Cost: EBS volume cost only

Method 3: DataSync (automated)
- AWS DataSync handles transfer
- Validation and retry
- Scheduled or on-demand
- Cost: $0.0125/GB
```

---

### Q8: How do I calculate storage ROI?

**Answer**: Compare total cost of ownership:

```
On-Premises SAN (1TB):
- Hardware: $50,000 / 5-year life = $10,000/year
- Power: $2,000/year
- Cooling: $1,000/year
- Personnel: $5,000/year
- Maintenance: $3,000/year
Total: $21,000/year ($1,750/month)

Cloud Storage (1TB):
- S3 Standard: $23/month
- Backup to Glacier: $10/month
- Redundancy (GRS): $46/month
Total: $79/month

ROI: $1,750 - $79 = $1,671/month savings (95%)
Payback: Immediate (year 1 savings: $20,052)
```

---

## Production Deployment Checklist

**Pre-Deployment**:
- [ ] Capacity planning completed (growth forecast)
- [ ] Performance requirements documented (IOPS, throughput, latency)
- [ ] Backup/recovery procedures tested
- [ ] Encryption keys configured and backed up
- [ ] Access control (IAM/RBAC) reviewed
- [ ] Compliance requirements verified
- [ ] Cost estimated and approved
- [ ] Disaster recovery plan documented

**During Deployment**:
- [ ] Monitor storage creation/provisioning
- [ ] Verify encryption enabled
- [ ] Test permissions and access
- [ ] Enable monitoring and alerting
- [ ] Enable versioning/snapshots
- [ ] Configure lifecycle policies
- [ ] Document storage details

**Post-Deployment**:
- [ ] Run smoke tests (read/write/delete)
- [ ] Verify backups completing successfully
- [ ] Monitor performance metrics
- [ ] Test recovery procedure
- [ ] Update documentation
- [ ] Review cost optimization opportunities
- [ ] Schedule periodic disaster recovery drills

---

## Tools & Extensions

| Tool | Purpose | When to Use |
|------|---------|------------|
| **AWS S3 Select** | Query objects without downloading | Large JSON/CSV files |
| **AWS Athena** | SQL queries on S3 data | Analytics on raw data |
| **AWS DataSync** | Automated data transfer | Large migrations |
| **AWS Snowball** | Physical data transfer | 100TB+ migrations |
| **Veeam Backup** | Enterprise backup/recovery | Mixed environments |
| **Veritas NetBackup** | Data protection platform | Large organizations |
| **Cloudian HyperStore** | On-premises S3-compatible | Hybrid approaches |
| **MinIO** | Open-source S3 alternative | Private cloud |

---

## Next Steps

- **Read** [CONCEPT.md](CONCEPT.md) for deep technical understanding
- **Hands-On** [WORKSHOP.md](WORKSHOP.md) to practice storage operations
- **Operations** [RUNBOOK.md](RUNBOOK.md) for production procedures
- **Business** [BUSINESS.md](BUSINESS.md) for ROI and cost analysis

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Category**: Storage Infrastructure
