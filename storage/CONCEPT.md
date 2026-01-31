# Storage: Physical & Cloud Concepts Guide

**Purpose**: Comprehensive technical reference for understanding modern storage architecture across physical data centers and cloud providers.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Storage Types](#2-storage-types)
3. [Block Storage](#3-block-storage)
4. [File Storage](#4-file-storage)
5. [Object Storage](#5-object-storage)
6. [Data Lifecycle Management](#6-data-lifecycle-management)
7. [Backup & Recovery](#7-backup--recovery)
8. [Disaster Recovery](#8-disaster-recovery)
9. [Performance Optimization](#9-performance-optimization)
10. [Cost Optimization](#10-cost-optimization)
11. [Security & Encryption](#11-security--encryption)
12. [Compliance & Data Governance](#12-compliance--data-governance)
13. [Cloud Provider Comparison](#13-cloud-provider-comparison)
14. [Troubleshooting](#14-troubleshooting)
15. [Enterprise Patterns](#15-enterprise-patterns)

---

## 1. Introduction

### Storage Fundamentals

Storage is the critical infrastructure layer that persists data beyond application runtime. Modern storage encompasses:

- **Physical Storage**: Data centers, hardware
- **Cloud Storage**: AWS, Azure, GCP, multi-cloud
- **Hybrid Storage**: On-premises + cloud
- **Distributed Storage**: Multiple locations, high availability

### Storage Categories by Use Case

```
┌─────────────────────────────────────────┐
│         Storage Hierarchy                │
├─────────────────────────────────────────┤
│                                         │
│  Tier 0: CPU Registers (nanoseconds)   │
│  Tier 1: L1/L2 Cache (nanoseconds)     │
│  Tier 2: RAM (microseconds)            │
│  Tier 3: SSD/Flash (milliseconds) ← Fast │
│  Tier 4: HDD (milliseconds)            │
│  Tier 5: Cloud Storage (seconds)       │
│  Tier 6: Archive (hours)               │
│  Tier 7: Tape (days)                   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 2. Storage Types

### Storage Classification

| Type | Use Case | Speed | Cost | Durability |
|------|----------|-------|------|-----------|
| **Block** | Databases, VMs | Very Fast | Medium | 99.999% |
| **File** | Shared access, NAS | Fast | Low | 99.99% |
| **Object** | Archives, backups | Medium | Low | 99.999999% |
| **Distributed** | Big data, analytics | Variable | Medium | 99.99% |

### Decision Matrix

```
Need fast random access? → Block Storage
Need shared filesystem? → File Storage
Need massive scale? → Object Storage
Need archive durability? → Object Storage + Archival
```

---

## 3. Block Storage

### What is Block Storage?

Block storage presents storage as logical blocks of fixed size (typically 4KB), allowing random read/write access. Perfect for databases and operating systems.

```
Application Layer
     ↓
File System (ext4, NTFS, etc)
     ↓
Block Storage Interface
     ↓
Physical Hardware (SSD/HDD)
```

### AWS EBS (Elastic Block Store)

```
EBS Volume Types:
├── gp3 (General Purpose) - Default, 3 IOPS/GB, SSD
├── gp2 (General Purpose) - Legacy, burst capable
├── io2 (Provisioned IOPS) - 64 IOPS/GB, databases
├── io1 (Provisioned IOPS) - 50 IOPS/GB, legacy
├── st1 (Throughput Optimized) - HDD, big data
└── sc1 (Cold Storage) - HDD, infrequent access
```

**Example: EBS Configuration**

```
Volume Characteristics:
- Size: 100 GB
- Type: gp3
- Performance: 3,000 IOPS, 125 MB/s
- Cost: ~$10/month

Database Volume (io2):
- Size: 500 GB
- IOPS: 32,000 (64 × 500)
- Latency: <1ms (99th percentile)
- Cost: ~$260/month
```

### Azure Disk Storage

```
Azure Managed Disks:
├── Ultra Disk (SSD) - <1ms latency, up to 160k IOPS
├── Premium SSD (P-series) - <1ms latency, up to 20k IOPS
├── Standard SSD (E-series) - <2ms latency, up to 2k IOPS
└── Standard HDD (S-series) - ~10ms latency, up to 500 IOPS
```

### GCP Persistent Disk

```
GCP Persistent Disks:
├── Balanced PD - 0.75 IOPS/GB, cost-effective
├── Performance (SSD) - 30 IOPS/GB, high performance
└── Standard (HDD) - 0.03 IOPS/GB, archived, infrequent
```

### Physical Storage (On-Premises)

```
Enterprise SAN (Storage Area Network):
├── Hardware: EMC, NetApp, Pure Storage
├── Protocol: Fibre Channel, iSCSI, NVMe
├── Redundancy: RAID 6, RAID 10 (dual parity)
├── Features: Snapshots, replication, thin provisioning
└── Performance: Multi-millisecond latency
```

### Block Storage Best Practices

```hcl
# 1. Right-sizing: Match volume size to needs
gp3_volume_100gb = {
  size = 100
  iops = 3000  # Default
  throughput = 125  # MB/s
}

database_volume_500gb = {
  size = 500
  iops = 32000  # 64 × 500
  throughput = 1000  # MB/s
  type = "io2"  # Provisioned IOPS
}

# 2. Snapshots for backup
snapshot_daily = {
  schedule = "daily at 2 AM"
  retention = "30 days"
  copy_to_region = "us-west-2"  # For DR
}

# 3. Striping for performance
raid_0_array = [
  { volume = "vol-1", stripe_size = "64KB" },
  { volume = "vol-2", stripe_size = "64KB" },
  { volume = "vol-3", stripe_size = "64KB" },
  { volume = "vol-4", stripe_size = "64KB" }
]

# 4. Encryption
encryption = {
  type = "AES-256"
  key_management = "KMS"
  tde = true  # Transparent Data Encryption
}
```

---

## 4. File Storage

### What is File Storage?

File storage presents data as named files organized in hierarchical directories. Multiple clients can access simultaneously via network protocols (NFS, SMB/CIFS).

```
Applications
     ↓
File API (POSIX open/read/write)
     ↓
Network Protocol (NFS, SMB, NFS3, NFS4)
     ↓
File System (NAS)
     ↓
Block Storage (SAN)
```

### AWS EFS (Elastic File System)

```
EFS Characteristics:
- Protocol: NFS 4.1
- Access: Multiple EC2 instances simultaneously
- Scaling: Auto-scales, no pre-provisioning
- Performance:
  * Bursting: Up to 500 MB/s (file system limit)
  * Provisioned: Up to 1 GB/s (higher pricing)
  * Latency: <1ms for local access
  * Throughput: Scales with storage size

EFS Configuration:
- Performance Mode: General (default) vs Max IO
- Throughput Mode: Bursting (default) vs Provisioned
- Lifecycle: Move to IA after 30/60/90 days (auto)
- Backup: Snapshots to S3, point-in-time recovery
```

**EFS Tiering**

```
Access Frequency      Tier              Cost/GB/Month
──────────────────────────────────────────────────
Frequent access       Standard           $0.30
Infrequent (1-30d)    Infrequent Access  $0.025
```

### Azure Files

```
Azure Files Share Types:
├── Standard (SMB/NFS)
│   ├── LRS (Locally Redundant): $0.06/GB/month
│   ├── GRS (Geo-Redundant): $0.12/GB/month
│   └── GZRS (Geo-Zone-Redundant): $0.16/GB/month
│
└── Premium (SMB)
    ├── Performance: Up to 100k IOPS
    ├── Throughput: Up to 10 GB/s
    └── Cost: $5.80/provisioned GB/month
```

### GCP Filestore

```
GCP Filestore:
- Protocol: NFS 3.0, NFSv4.1
- Instances:
  * Basic tier: Dev/test
  * High scale tier: Enterprise (10+ TB)
- Throughput: 16 MB/s per TB
- Maximum: 100 TB per instance
```

### Physical File Storage (On-Premises)

```
NAS (Network Attached Storage):
├── Protocol: NFS, CIFS/SMB
├── Vendors: NetApp, Synology, QNAP
├── Features:
│   ├── Snapshots (daily, hourly)
│   ├── Deduplication (50-80% savings)
│   ├── Compression (30-50% savings)
│   ├── Replication (sync/async)
│   └── Tiering (fast SSD + slow HDD)
└── Performance: 100MB/s - 1GB/s
```

### File Storage Best Practices

```
1. Performance Optimization
   - Use larger files (>1MB) when possible
   - Batch operations to reduce API calls
   - Use read-ahead caching for sequential access
   - Implement connection pooling

2. Cost Optimization
   - Use Infrequent Access tier after 30 days
   - Enable deduplication (NAS systems)
   - Enable compression for text/log files
   - Archive old files to object storage

3. Security
   - Enable encryption at rest (AES-256)
   - Enable encryption in transit (TLS 1.2+)
   - Use IAM for access control
   - Implement ACLs for granular permissions

4. High Availability
   - Multi-AZ deployment (cloud)
   - Geo-redundant backups
   - Automatic failover (>= 99.99% uptime)
   - Monitor throughput and latency
```

---

## 5. Object Storage

### What is Object Storage?

Object storage treats data as flat collections of objects (files + metadata). Each object has a unique key (URI). Perfect for unstructured data at massive scale.

```
Object = {
  key: "/documents/report-2024.pdf",
  data: <file content>,
  metadata: {
    size: 5242880,
    last_modified: "2024-01-15",
    content_type: "application/pdf",
    tags: ["financial", "archived"]
  }
}
```

### AWS S3 (Simple Storage Service)

```
S3 Storage Classes (Cost/GB/month):
├── S3 Standard: $0.023 (hot data, immediate access)
├── S3 Intelligent-Tiering: $0.0125 (auto-tiering)
├── S3 Standard-IA: $0.0125 (infrequent, 30-day minimum)
├── S3 One Zone-IA: $0.01 (one zone only)
├── S3 Glacier Instant: $0.004 (retrieval in milliseconds)
├── S3 Glacier Flexible: $0.0036 (retrieval in minutes/hours)
└── S3 Glacier Deep Archive: $0.00099 (retrieval in hours, 7-year minimum)

Pricing Model:
- Storage: $0.023/GB/month (Standard)
- Requests: $0.0004 per PUT/COPY/POST/LIST
- Data retrieval: $0.01/GB (S3 Standard, first 1GB free)
- Data transfer out: $0.09/GB (first 1GB/month free)
```

**S3 Lifecycle Policies**

```
Day 0-30:   S3 Standard (hot data, frequently accessed)
Day 30-90:  S3 Standard-IA (infrequent access)
Day 90-365: S3 Glacier Instant (archival, occasional retrieval)
Year 1+:    S3 Glacier Deep Archive (compliance holds)

Potential Savings:
100TB dataset:
- All Standard: $2,300/month
- With lifecycle: $150/month (93% savings)
```

### Azure Blob Storage

```
Azure Blob Tiers:
├── Hot: $0.0184/GB/month (frequently accessed)
├── Cool: $0.0092/GB/month (30-day minimum)
├── Cold: $0.0042/GB/month (90-day minimum)
└── Archive: $0.00099/GB/month (retrieval hours, 180-day minimum)

Redundancy Options:
├── LRS: $0.0184/GB (locally redundant)
├── ZRS: $0.0276/GB (zone redundant)
├── GRS: $0.0368/GB (geo-redundant)
└── GZRS: $0.0460/GB (geo-zone-redundant)
```

### GCP Cloud Storage

```
GCP Storage Classes:
├── Standard: $0.020/GB/month (hot, immediately available)
├── Nearline: $0.010/GB/month (30-day minimum)
├── Coldline: $0.004/GB/month (90-day minimum)
└── Archive: $0.0012/GB/month (365-day minimum)

Locations:
- Single Region: Best cost
- Dual Region: 50% overhead, higher availability
- Multi-Region: 100% overhead, global availability
```

### Object Storage Operations

```
Common Operations:
├── PUT (Upload): Create/overwrite object
├── GET (Download): Retrieve object
├── HEAD: Get metadata without body
├── DELETE: Remove object
├── COPY: Server-side copy (fast)
├── LIST: Enumerate objects (max 1000 per call)
└── MULTIPART UPLOAD: Large files, resumable

Concurrency Model:
- Read: Unlimited concurrent reads
- Write: Last-write-wins (no locking)
- Consistency: Strong consistency (most providers)
```

### Object Storage Best Practices

```
1. Naming Strategy (performance)
   Bad:  /logs/2024/01/15/app.log
         /logs/2024/01/15/db.log
         /logs/2024/01/15/cache.log
   (All start with "logs/2024/01/15/", causing hot partitions)

   Good: /20240115-app-xxxxx.log
         /20240115-db-xxxxx.log
         /20240115-cache-xxxxx.log
   (Randomized prefixes, even distribution)

2. Multipart Uploads (large files)
   - File >100MB: Use multipart upload
   - Parallel parts: 4-8 concurrent uploads
   - Part size: 5MB-5GB
   - Advantages: Resume capability, parallel transfer

3. Lifecycle Management
   - Hot → Warm → Cold → Archive over time
   - Auto-delete after retention period
   - Potential 90%+ cost reduction

4. Encryption
   - SSE-S3: Server-side encryption (AWS managed)
   - SSE-KMS: Key Management Service (customer managed)
   - CSE: Client-side encryption (before upload)
```

---

## 6. Data Lifecycle Management

### Data Lifecycle Framework

```
Phase 1: Creation (Hot Data)
├── Access: Frequently accessed
├── Location: Production database/cache
├── Duration: Days to weeks
└── Cost: High ($0.023/GB/month)

Phase 2: Warm Data (30-90 days)
├── Access: Occasionally accessed
├── Location: Standard cloud storage
├── Duration: Weeks to months
└── Cost: Medium ($0.01/GB/month)

Phase 3: Cold Data (90-365 days)
├── Access: Rarely accessed (compliance)
├── Location: Glacier/Archive tier
├── Duration: Months to years
└── Cost: Low ($0.004/GB/month)

Phase 4: Archival (1+ years)
├── Access: Minimal (legal holds)
├── Location: Deep archive/tape
├── Duration: Years to indefinite
└── Cost: Minimal ($0.001/GB/month)

Phase 5: Deletion
├── Retention: Expired
├── Method: Secure deletion (NIST 800-88)
└── Verification: Audit trail
```

### Automatic Tiering

**AWS Intelligent-Tiering**

```
Monitor access patterns automatically:

Week 1: S3 Standard (frequent access)
  ↓ (no access for 30 days)
Week 5: S3 Standard-IA ($0.0125/GB/month, 70% savings)
  ↓ (no access for 60 days)
Week 13: S3 Glacier Instant ($0.004/GB/month, 82% savings)
  ↓ (no access for 180 days)
Week 30: S3 Glacier Flexible ($0.0036/GB/month, 84% savings)

Cost: Original $0.023/GB × 52 weeks = $1.196/GB/year
      With Tiering: ~$0.15/GB/year (87% savings)
```

---

## 7. Backup & Recovery

### Backup Strategies

```
RPO (Recovery Point Objective): How much data loss is acceptable?
├── RPO = 1 hour: Backup every hour (expensive)
├── RPO = 1 day: Daily backups (cost-effective)
└── RPO = 1 week: Weekly backups (archival only)

RTO (Recovery Time Objective): How fast must recovery be?
├── RTO = 1 minute: Hot standby, instant failover
├── RTO = 1 hour: Warm standby, quick restore
└── RTO = 1 day: Cold restore, takes hours
```

### Backup Types

```
1. Full Backup
   - Everything backed up
   - Size: 100% of data
   - Restore time: Fast
   - Cost: High

2. Incremental Backup
   - Only changes since last backup
   - Size: 5-15% of data
   - Restore time: Slower (requires full + incrementals)
   - Cost: Low

3. Differential Backup
   - Changes since last full backup
   - Size: 10-30% of data
   - Restore time: Medium (requires full + one differential)
   - Cost: Medium

Recommended: Weekly full + daily incremental
```

### Backup Tools & Services

```
Cloud Provider Native:
├── AWS: AWS Backup, EBS Snapshots, S3 Cross-Region
├── Azure: Azure Backup, Azure Site Recovery
└── GCP: Cloud Backup and DR (formerly Backup for GKE)

Third-Party Solutions:
├── Veeam: Enterprise backup/recovery
├── Commvault: Advanced backup platform
├── Veritas: Data protection (acquired Symantec)
└── Acronis: Backup for cloud and hybrid
```

---

## 8. Disaster Recovery

### DR Strategies

```
RPO/RTO Matrix:
         │ RTO < 1hr │ RTO < 4hr │ RTO < 1day
─────────┼───────────┼──────────┼──────────
RPO <1hr │ Critical  │ Important│ Standard
RPO <1day│ Important │ Standard │ Acceptable
RPO <1wk │ Standard  │ Acceptable│ Relaxed

Examples:
- Database (Critical): RPO 15min, RTO 30min
- Web app (Important): RPO 1hr, RTO 2hr
- Archival (Relaxed): RPO 1wk, RTO 1day
```

### DR Implementation Patterns

```
1. Backup & Restore (Cold)
   - Cost: Low ($)
   - RTO: Hours
   - RPO: Daily
   - Use: Dev/test, archival

2. Pilot Light (Warm)
   - Cost: Medium ($$)
   - RTO: 15-30 minutes
   - RPO: 5-15 minutes
   - Use: Production tier 2

3. Warm Standby
   - Cost: Medium-High ($$$)
   - RTO: 1-5 minutes
   - RPO: < 1 minute
   - Use: Critical services

4. Active-Active (Hot)
   - Cost: High ($$$$)
   - RTO: Seconds
   - RPO: Real-time replication
   - Use: Mission-critical, zero-downtime
```

---

## 9. Performance Optimization

### I/O Performance Metrics

```
IOPS (Input/Output Operations Per Second):
- Measures: Number of operations per second
- Typical: 100 IOPS (HDD) → 100,000+ IOPS (NVMe SSD)
- Formula: IOPS = (throughput MB/s / average operation size KB) × 1024

Throughput (MB/s):
- Measures: Data transfer rate
- Typical: 100 MB/s (HDD) → 1000+ MB/s (NVMe)
- Formula: Throughput = IOPS × average operation size / 1024

Latency (milliseconds):
- Measures: Time per operation
- Typical: 10ms (HDD), 1ms (SSD), <0.1ms (NVMe)
- P99 latency: 99th percentile (important for user experience)
```

### Performance Optimization Techniques

```
1. Caching Layer
   ├── Application cache (Redis, Memcached)
   ├── Page cache (OS buffer cache)
   ├── Block cache (storage controller cache)
   └── Expected improvement: 50-100x for hot data

2. I/O Parallelization
   ├── Stripe data across multiple volumes
   ├── Use 4-8 parallel streams
   ├── RAID 0 (no parity): Maximum throughput
   └── Expected improvement: Linear with number of volumes

3. Read-Ahead & Write-Back
   ├── Read-ahead: Prefetch next blocks
   ├── Write-back cache: Batch small writes
   └── Expected improvement: 20-50% for sequential access

4. Compression & Deduplication
   ├── Compression: Reduce data size (reduces I/O)
   ├── Deduplication: Eliminate duplicate data
   ├── CPU cost: Higher CPU, lower I/O
   └── Expected improvement: 30-70% for text/logs
```

---

## 10. Cost Optimization

### Cost Factors

```
Block Storage Costs:
- Provisioned capacity: $0.10/GB/month (gp3)
- IOPS (if provisioned): $0.005 per IOPS/month
- Snapshots: $0.05 per GB (compressed size)
- Example: 100GB gp3 = ~$10/month

File Storage Costs:
- Provisioned capacity: $0.30/GB/month (Standard)
- Data transfer: Usually included
- Snapshots: Automatic, no cost (if <3 copies)
- Example: 1TB EFS = ~$300/month

Object Storage Costs:
- Capacity: $0.023/GB/month (S3 Standard)
- Requests: $0.0004 per 1000 requests
- Data transfer out: $0.09/GB (after 1GB free)
- Example: 10TB = $230/month (storage only)
```

### Cost Reduction Strategies

```
1. Right-Sizing
   Current: 1TB of 10GB average database
   Solution: Use 100GB volume instead
   Savings: $90/month (90%)

2. Lifecycle Tiering
   Current: All data in S3 Standard ($0.023/GB)
   Solution: Lifecycle to Glacier after 90 days
   Savings: 80-90% on archival data

3. Compression & Deduplication
   Current: 100TB uncompressed logs
   Solution: Enable compression
   Savings: 50-70% storage cost

4. Reservation & Commitment
   On-Demand: $0.23 per GB-month
   Reserved: $0.15 per GB-month (30% discount)
   Commitment: $0.12 per GB-month (50% discount)
   Savings: 30-50% with long-term commitment
```

---

## 11. Security & Encryption

### Encryption Types

```
1. Encryption at Rest
   - Location: Data on disk/storage media
   - Algorithm: AES-256 (standard)
   - Management:
     * AWS KMS: Amazon managed keys
     * Customer CMK: Customer-managed keys
     * Client-side: Encrypt before upload

2. Encryption in Transit
   - Protocol: TLS 1.2+ (HTTPS)
   - Algorithm: AES-256 (negotiated)
   - Verification: Certificate validation

3. Transparent Data Encryption (TDE)
   - Database encryption
   - Application sees unencrypted data
   - Storage level: Encrypted
```

### Key Management

```
AWS KMS (Key Management Service):
├── AWS-managed keys: Automatic, included
├── Customer-managed CMK: Full control
│   ├── Key policy: Fine-grained permissions
│   ├── Rotation: Manual or automatic (yearly)
│   └── Cost: $1/month per key
└── Multi-region keys: Across regions ($1/month each)

Best Practices:
1. Rotate keys annually
2. Use separate keys per application
3. Implement least privilege (granular IAM)
4. Audit key access (CloudTrail logs)
5. Never share master keys
```

---

## 12. Compliance & Data Governance

### Compliance Standards

```
HIPAA (Healthcare):
├── Requirements: Encryption, audit trails, access control
├── Storage: PHI must be encrypted at rest
├── Retention: Minimum 6 years
└── Compliance: AWS, Azure, GCP certified

PCI-DSS (Payment Card):
├── Requirements: Encryption, monitoring, vulnerability management
├── Storage: Cardholder data encrypted
├── Retention: Min 1 year, 3 months online
└── Compliance: AWS, Azure, GCP certified

GDPR (Privacy):
├── Requirements: Data minimization, retention limits, right to deletion
├── Storage: Data location (EU for EU customers)
├── Retention: No longer than necessary
├── Compliance: Requires consent for retention

SOC 2 Type II (Service Organizations):
├── Requirements: Security, availability, processing integrity
├── Storage: Audit trail, monitoring, encryption
├── Certification: Annual audit required
└── Compliance: AWS, Azure, GCP Type II certified
```

### Data Retention Policies

```
Automatic Retention:
├── Transactions: 7 years (financial regulation)
├── Medical: 6-7 years (HIPAA)
├── Customer data: 3 years (typical)
├── Logs: 90 days to 1 year
└── Backups: 30-90 days (recovery window)

Deletion Verification:
├── Compliance holds: Cannot delete during investigation
├── Audit trail: Track deletion events
├── Permanent deletion: 30-day grace period
└── Cryptographic erasure: Destroy encryption keys
```

---

## 13. Cloud Provider Comparison

### Feature Matrix

| Feature | AWS | Azure | GCP | On-Prem |
|---------|-----|-------|-----|---------|
| **Block Storage** | EBS (excellent) | Managed Disk (excellent) | Persistent Disk (good) | SAN (excellent) |
| **File Storage** | EFS (good) | Files (good) | Filestore (good) | NAS (excellent) |
| **Object Storage** | S3 (best) | Blob (good) | Cloud Storage (excellent) | Limited |
| **Data Transfer** | DataSync | Data Box | Transfer Appliance | Network |
| **Cost** | Medium | Medium | Lowest | Variable |
| **Features** | Most | Growing | Competitive | Traditional |

### Cost Comparison (1TB Example)

```
AWS S3 Standard:
$0.023/GB × 1,024 = $23.55/month

Azure Blob Hot:
$0.0184/GB × 1,024 = $18.84/month

GCP Standard:
$0.020/GB × 1,024 = $20.48/month

On-Premises SAN:
Capital: $50,000/year amortized
Operating: $20/TB/year
Total: ~$70/year ($5.83/month for 1TB)
(But lacks cloud benefits: scalability, global access)
```

---

## 14. Troubleshooting

### Common Issues & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| **Slow performance** | Hot partition, insufficient IOPS | Redistribute data, increase IOPS |
| **High latency** | Network congestion, high I/O load | Monitor metrics, scale horizontally |
| **Backup failure** | Insufficient capacity, permissions | Verify space, check IAM/RBAC |
| **Data corruption** | Checksum mismatch, bit rot | Verify checksums, restore from backup |
| **Cost overrun** | Unused resources, no lifecycle | Implement tagging, lifecycle policies |
| **Replication lag** | Network latency, high change rate | Increase bandwidth, optimize changes |
| **Timeout errors** | Object too large, network slow | Use multipart upload, increase timeout |

---

## 15. Enterprise Patterns

### Multi-Tier Storage Architecture

```
Tier 1: Hot (SSD, database)
├── Cost: High
├── Access: < 1ms latency
├── Duration: Days
└── Example: Active transactions

Tier 2: Warm (Standard cloud storage)
├── Cost: Medium
├── Access: < 100ms latency
├── Duration: Weeks to months
└── Example: Recent archives

Tier 3: Cold (Glacier/Archive)
├── Cost: Low
├── Access: Minutes to hours
├── Duration: Months to years
└── Example: Compliance archives

Tier 4: Offline (Tape)
├── Cost: Minimal
├── Access: Days
├── Duration: Years to indefinite
└── Example: Off-site backups
```

### Hybrid Storage Strategy

```
On-Premises:
├── Purpose: Hot data, low latency, compliance
├── Storage: NAS + SAN (RAID 6)
├── Capacity: 50-100 TB
└── Cost: High CapEx, low OpEx

Cloud (AWS S3):
├── Purpose: Warm/cold data, scaling, backup
├── Storage: Standard → Glacier lifecycle
├── Capacity: Unlimited (for practical purposes)
└── Cost: Low CapEx, medium OpEx

Archival (Tape):
├── Purpose: Long-term retention, compliance holds
├── Storage: LTO-9 (18TB native per cartridge)
├── Capacity: Off-site, unlimited scaling
└── Cost: Minimal, one-time media cost
```

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Contact**: Storage & Infrastructure Team
