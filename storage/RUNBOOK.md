# Storage: Physical & Cloud Operational Runbook

Production-ready procedures for provisioning, maintaining, and troubleshooting storage infrastructure.

---

## Table of Contents

1. [Storage Provisioning](#1-storage-provisioning)
2. [Cloud Storage Configuration](#2-cloud-storage-configuration)
3. [Backup & Restore](#3-backup--restore)
4. [Disaster Recovery](#4-disaster-recovery)
5. [Performance Tuning](#5-performance-tuning)
6. [Monitoring & Alerting](#6-monitoring--alerting)
7. [Data Migration](#7-data-migration)
8. [Security Hardening](#8-security-hardening)
9. [Compliance & Governance](#9-compliance--governance)
10. [Cost Optimization](#10-cost-optimization)
11. [Troubleshooting](#11-troubleshooting)
12. [Disaster Recovery Drills](#12-disaster-recovery-drills)

---

## 1. Storage Provisioning

### AWS S3 Bucket Creation

```bash
# Step 1: Create S3 bucket
aws s3api create-bucket \
  --bucket my-storage-bucket-$(date +%s) \
  --region us-east-1 \
  --create-bucket-configuration LocationConstraint=us-east-1

# Expected output:
# {
#   "Location": "http://my-storage-bucket-1706700000.s3.amazonaws.com/"
# }

# Step 2: Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-storage-bucket-1706700000 \
  --versioning-configuration Status=Enabled

# Step 3: Enable default encryption
aws s3api put-bucket-encryption \
  --bucket my-storage-bucket-1706700000 \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Step 4: Block public access
aws s3api put-public-access-block \
  --bucket my-storage-bucket-1706700000 \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Verification
aws s3api head-bucket --bucket my-storage-bucket-1706700000
# No output = success
```

### AWS EBS Volume Creation

```bash
# Step 1: Create gp3 volume (general purpose, default)
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 100 \
  --volume-type gp3 \
  --iops 3000 \
  --throughput 125 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=app-data},{Key=Environment,Value=production}]'

# Expected output includes:
# "VolumeId": "vol-1234567890abcdef0"

# Step 2: Attach volume to instance
VOLUME_ID="vol-1234567890abcdef0"
INSTANCE_ID="i-0987654321fedcba0"

aws ec2 attach-volume \
  --volume-id $VOLUME_ID \
  --instance-id $INSTANCE_ID \
  --device /dev/sdf

# Step 3: Login to instance and mount
ssh ec2-user@<instance-ip>

# Create filesystem
sudo mkfs.ext4 /dev/xvdf

# Create mount point
sudo mkdir -p /mnt/data

# Mount the volume
sudo mount /dev/xvdf /mnt/data

# Verify
df -h /mnt/data
# Expected: Filesystem Size Used Avail Use% Mounted on
#           /dev/xvdf  100G 60M  94G   1% /mnt/data

# Persistent mount (add to /etc/fstab)
echo '/dev/xvdf /mnt/data ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab
```

### AWS EFS Creation

```bash
# Step 1: Create EFS file system
aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=app-efs Key=Environment,Value=production

# Expected output includes:
# "FileSystemId": "fs-1234567890abcdef0"

# Step 2: Create mount targets (for each availability zone)
FILE_SYSTEM_ID="fs-1234567890abcdef0"

# For us-east-1a
aws efs create-mount-target \
  --file-system-id $FILE_SYSTEM_ID \
  --subnet-id subnet-12345678 \
  --security-groups sg-12345678

# Step 3: Mount to EC2 instance
ssh ec2-user@<instance-ip>

# Install NFS utilities
sudo yum install -y nfs-utils

# Create mount point
sudo mkdir -p /mnt/efs

# Mount EFS
sudo mount -t nfs4 -o nfsvers=4.1 fs-1234567890abcdef0.efs.us-east-1.amazonaws.com:/ /mnt/efs

# Verify
mount | grep efs
# Expected: fs-1234567890abcdef0.efs.us-east-1.amazonaws.com:/ on /mnt/efs

# Persistent mount
echo 'fs-1234567890abcdef0.efs.us-east-1.amazonaws.com:/ /mnt/efs nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 0 0' | sudo tee -a /etc/fstab
```

### Azure Storage Account Creation

```bash
# Step 1: Create storage account
az storage account create \
  --name mystorageaccount \
  --resource-group myresourcegroup \
  --location eastus \
  --sku Standard_GRS \
  --kind StorageV2 \
  --encryption-services blob file

# Expected output includes:
# "name": "mystorageaccount"
# "provisioningState": "Succeeded"

# Step 2: Get storage account key
STORAGE_KEY=$(az storage account keys list \
  --resource-group myresourcegroup \
  --account-name mystorageaccount \
  --query [0].value -o tsv)

# Step 3: Create blob container
az storage container create \
  --name mycontainer \
  --account-name mystorageaccount \
  --account-key $STORAGE_KEY \
  --public-access off

# Verification
az storage container exists \
  --name mycontainer \
  --account-name mystorageaccount \
  --account-key $STORAGE_KEY
```

### GCP Cloud Storage Bucket Creation

```bash
# Step 1: Create bucket
gsutil mb -c STANDARD -l us-central1 -b on gs://my-storage-bucket-$(date +%s)

# Expected output:
# Creating gs://my-storage-bucket-1706700000/

# Step 2: Enable versioning
gsutil versioning set on gs://my-storage-bucket-1706700000

# Step 3: Set lifecycle policy
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 90}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://my-storage-bucket-1706700000

# Verification
gsutil ls -Lh gs://my-storage-bucket-1706700000
```

---

## 2. Cloud Storage Configuration

### S3 Lifecycle Policy

```bash
# Create lifecycle configuration
cat > lifecycle-policy.json << 'EOF'
{
  "Rules": [
    {
      "Id": "Transition to IA after 30 days",
      "Status": "Enabled",
      "Prefix": "logs/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555
      },
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
EOF

# Apply policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-storage-bucket-1706700000 \
  --lifecycle-configuration file://lifecycle-policy.json

# Verify
aws s3api get-bucket-lifecycle-configuration \
  --bucket my-storage-bucket-1706700000
```

### EBS Snapshot Schedule

```bash
# Create Data Lifecycle Manager policy
aws dlm create-lifecycle-policy \
  --execution-role-arn arn:aws:iam::123456789012:role/service-role/AWSDataLifecycleManagerDefaultRole \
  --description "Daily EBS snapshots with 30-day retention" \
  --state ENABLED \
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [{"Key": "Backup", "Value": "Daily"}],
    "Schedules": [
      {
        "Name": "Daily Snapshot",
        "CopyTags": true,
        "CreateRule": {
          "Interval": 24,
          "IntervalUnit": "HOURS",
          "Times": ["02:00"]
        },
        "RetainRule": {
          "Count": 30
        },
        "FastRestoreRule": {
          "Count": 7
        }
      }
    ]
  }'

# Verify
aws dlm get-lifecycle-policies --state ENABLED
```

### Azure Managed Disk Snapshot Schedule

```bash
# Create daily snapshots via automation
for day in {1..30}; do
  SNAPSHOT_DATE=$(date -d "$day days ago" +%Y-%m-%d)
  az snapshot create \
    --resource-group myresourcegroup \
    --name "daily-snapshot-$SNAPSHOT_DATE" \
    --source /subscriptions/subscription-id/resourceGroups/myresourcegroup/providers/Microsoft.Compute/disks/my-disk
done

# Verify snapshots
az snapshot list --resource-group myresourcegroup --output table
```

### GCP Persistent Disk Snapshot Schedule

```bash
# Create snapshot schedule with gcloud
gcloud compute resource-policies create snapshot-schedule daily-disk-backup \
  --daily-schedule-from-utc=02:00 \
  --max-retention-days=30 \
  --region=us-central1

# Attach to disk
gcloud compute disks add-resource-policies my-disk \
  --resource-policies=daily-disk-backup \
  --zone=us-central1-a

# List snapshots
gcloud compute snapshots list --filter="source_disk:my-disk"
```

---

## 3. Backup & Restore

### Full Backup Procedure

```bash
# Step 1: Identify data to backup
BACKUP_SOURCE="/data/important"
BACKUP_DEST="s3://my-backup-bucket/$(date +%Y-%m-%d)"

# Step 2: Create tar archive with compression
tar czf backup.tar.gz $BACKUP_SOURCE

# Expected: backup.tar.gz created

# Step 3: Calculate checksum
sha256sum backup.tar.gz > backup.tar.gz.sha256

# Step 4: Upload to S3
aws s3 cp backup.tar.gz $BACKUP_DEST/
aws s3 cp backup.tar.gz.sha256 $BACKUP_DEST/

# Step 5: Verify upload
aws s3 ls $BACKUP_DEST/

# Step 6: Set to Glacier for cost savings
aws s3api copy-object \
  --bucket my-backup-bucket \
  --copy-source my-backup-bucket/$(date +%Y-%m-%d)/backup.tar.gz \
  --key $(date +%Y-%m-%d)/backup.tar.gz \
  --storage-class GLACIER_IR
```

### Incremental Backup Procedure

```bash
# Step 1: Create list of files modified since last backup
LAST_BACKUP=$(date -d "1 day ago" +%Y-%m-%d)

find /data -type f -newermt "$LAST_BACKUP" > /tmp/incremental-files.txt

# Step 2: Create tar with only changed files
tar czf incremental-backup.tar.gz -T /tmp/incremental-files.txt

# Step 3: Upload
aws s3 cp incremental-backup.tar.gz s3://my-backup-bucket/$(date +%Y-%m-%d)-incremental/

# Verification
echo "Files backed up: $(wc -l < /tmp/incremental-files.txt)"
echo "Backup size: $(du -h incremental-backup.tar.gz | cut -f1)"
```

### Restore from Backup

```bash
# Step 1: Verify backup exists
aws s3 ls s3://my-backup-bucket/2024-01-15/

# Step 2: Download backup
aws s3 cp s3://my-backup-bucket/2024-01-15/backup.tar.gz .

# Step 3: Verify checksum
aws s3 cp s3://my-backup-bucket/2024-01-15/backup.tar.gz.sha256 .
sha256sum -c backup.tar.gz.sha256

# Expected: backup.tar.gz: OK

# Step 4: Extract to restore location
tar xzf backup.tar.gz -C /restore-location/

# Step 5: Verify restored data
ls -la /restore-location/
diff -r /data /restore-location/data
```

---

## 4. Disaster Recovery

### Database Replication Setup (RDS to Standby)

```bash
# Step 1: Create read replica in different region
aws rds create-db-instance-read-replica \
  --db-instance-identifier production-db-replica \
  --source-db-instance-identifier production-db \
  --db-instance-class db.t3.large \
  --availability-zone us-west-2a \
  --publicly-accessible false

# Wait for replica creation (5-15 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier production-db-replica

# Step 2: Verify replication lag
aws rds describe-db-instances \
  --db-instance-identifier production-db-replica \
  --query 'DBInstances[0].StatusInfos'

# Expected: ReplicationLag shows 0 or low seconds

# Step 3: Promote replica to standalone (in case of disaster)
aws rds promote-read-replica \
  --db-instance-identifier production-db-replica \
  --backup-retention-period 30

# Step 4: Update connection string
# Application connection: production-db-replica.c9akciq32.us-west-2.rds.amazonaws.com
```

### S3 Cross-Region Replication

```bash
# Step 1: Create destination bucket
aws s3api create-bucket \
  --bucket my-backup-bucket-us-west \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

# Step 2: Enable versioning on source and destination
aws s3api put-bucket-versioning \
  --bucket my-backup-bucket \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
  --bucket my-backup-bucket-us-west \
  --versioning-configuration Status=Enabled

# Step 3: Create replication role
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "s3.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name s3-replication-role \
  --assume-role-policy-document file://trust-policy.json

# Step 4: Attach replication policy
cat > replication-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetReplicationConfiguration", "s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-backup-bucket"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObjectVersionForReplication", "s3:GetObjectVersionAcl"],
      "Resource": "arn:aws:s3:::my-backup-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ReplicateObject", "s3:ReplicateDelete"],
      "Resource": "arn:aws:s3:::my-backup-bucket-us-west/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name s3-replication-role \
  --policy-name s3-replication \
  --policy-document file://replication-policy.json

# Step 5: Enable replication configuration
cat > replication-config.json << 'EOF'
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "ID": "Replicate all",
      "Status": "Enabled",
      "Priority": 1,
      "DeleteMarkerReplication": {"Status": "Enabled"},
      "Filter": {"Prefix": ""},
      "Destination": {
        "Bucket": "arn:aws:s3:::my-backup-bucket-us-west",
        "ReplicationTime": {"Status": "Enabled", "Time": {"Minutes": 15}},
        "Metrics": {"Status": "Enabled", "EventThreshold": {"Minutes": 15}}
      }
    }
  ]
}
EOF

aws s3api put-bucket-replication \
  --bucket my-backup-bucket \
  --replication-configuration file://replication-config.json
```

---

## 5. Performance Tuning

### EBS Performance Optimization

```bash
# Step 1: Monitor current performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/EBS \
  --metric-name VolumeReadOps \
  --dimensions Name=VolumeId,Value=vol-1234567890abcdef0 \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300

# Step 2: Check volume queue length (latency indicator)
aws cloudwatch get-metric-statistics \
  --namespace AWS/EBS \
  --metric-name VolumeQueueLength \
  --dimensions Name=VolumeId,Value=vol-1234567890abcdef0 \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300

# Step 3: If performance poor, modify volume
# Option A: Increase IOPS (for gp3)
aws ec2 modify-volume \
  --volume-id vol-1234567890abcdef0 \
  --iops 10000

# Option B: Increase throughput
aws ec2 modify-volume \
  --volume-id vol-1234567890abcdef0 \
  --throughput 250

# Monitor modification progress
aws ec2 describe-volumes-modifications \
  --filters Name=volume-id,Values=vol-1234567890abcdef0
```

### S3 Performance Optimization

```bash
# Step 1: Enable S3 Transfer Acceleration
aws s3api put-bucket-accelerate-configuration \
  --bucket my-storage-bucket \
  --accelerate-configuration Status=Enabled

# Step 2: Use multi-part upload for large files
aws s3 cp large-file.iso s3://my-storage-bucket/ \
  --metadata "upload-date=$(date +%Y-%m-%d)" \
  --expected-size 1000000000 \
  --sse AES256

# Step 3: Use CloudFront for distribution
aws cloudfront create-distribution \
  --origin-domain-name my-storage-bucket.s3.amazonaws.com \
  --default-root-object index.html

# Step 4: Monitor S3 request metrics
aws s3api put-bucket-metrics-configuration \
  --bucket my-storage-bucket \
  --id EntireBucket \
  --metrics-configuration '{
    "Id": "EntireBucket",
    "Filter": {"Prefix": ""}
# Step 4: Monitor S3 request metrics
aws s3api put-bucket-metrics-configuration \
  --bucket my-storage-bucket \
  --id EntireBucket \
  --metrics-configuration '{\n    \"Id\": \"EntireBucket\",\n    \"Filter\": {\"Prefix\": \"\"}\n  }'\n```\n\n### Azure Blob Storage Performance Optimization\n\n```bash\n# Step 1: Enable Blob storage tiering\naz storage account blob-service-properties update \\\n  --account-name mystorageaccount \\\n  --enable-change-feed true \\\n  --enable-versioning true\n\n# Step 2: Use AzCopy for parallel transfers\nazcopy copy /source/largefile.iso \\\n  'https://mystorageaccount.blob.core.windows.net/container/largefile.iso' \\\n  --recursive --parallel-count=16 --block-size-mb=8\n\n# Step 3: Use Azure CDN for distribution\naz cdn endpoint create \\\n  --resource-group myresourcegroup \\\n  --profile-name mycdn \\\n  --name myblobcdn \\\n  --origin mystorageaccount.blob.core.windows.net \\\n  --origin-path /mycontainer\n```\n\n### GCP Cloud Storage Performance Optimization\n\n```bash\n# Step 1: Enable parallel transfers\ngsutil -m -D cp -r ./large-files gs://my-storage-bucket/data/\n\n# Step 2: Configure transfer settings\ngsutil config set GSUtil:parallel_thread_count 24\ngsutil config set GSUtil:parallel_process_count 8\n\n# Step 3: Use Cloud CDN for distribution\ngcloud compute backend-buckets create my-backend \\\n  --gcs-bucket-name=my-storage-bucket \\\n  --enable-cdn\n```\n\n---\n\n## 6. Monitoring & Alerting\n\n### CloudWatch Monitoring Setup (AWS)

```bash
# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name Storage-Dashboard \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/EBS", "VolumeReadOps", {"stat": "Sum"}],
            ["AWS/EBS", "VolumeWriteOps", {"stat": "Sum"}],
            ["AWS/EBS", "VolumeQueueLength", {"stat": "Average"}],
            ["AWS/S3", "4xxErrors", {"stat": "Sum"}],
            ["AWS/S3", "5xxErrors", {"stat": "Sum"}]
          ],
          "period": 300,
          "stat": "Average",
          "region": "us-east-1",
          "title": "Storage Performance"
        }
      }
    ]
  }'

# Create SNS topic for alerts
aws sns create-topic --name storage-alerts

# Create EBS latency alarm
aws cloudwatch put-metric-alarm \
  --alarm-name high-ebs-latency \
  --alarm-description "Alert when EBS latency is high" \
  --metric-name VolumeQueueLength \
  --namespace AWS/EBS \
  --statistic Average \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:storage-alerts

# Create S3 error alarm
aws cloudwatch put-metric-alarm \
  --alarm-name high-s3-errors \
  --alarm-description "Alert when S3 errors increase" \
  --metric-name 4xxErrors \
  --namespace AWS/S3 \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:storage-alerts
```

### Azure Monitor Alerts

```bash
# Create action group for alerts
az monitor action-group create \
  --resource-group myresourcegroup \
  --name storage-alerts

# Create alert for storage account availability
az monitor metrics alert create \
  --resource-group myresourcegroup \
  --name \"Storage Availability Alert\" \
  --scopes /subscriptions/subscription-id/resourceGroups/myresourcegroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount \
  --condition \"avg Availability < 99.5\" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action storage-alerts

# Create alert for storage capacity
az monitor metrics alert create \
  --resource-group myresourcegroup \
  --name \"Storage Quota Alert\" \
  --scopes /subscriptions/subscription-id/resourceGroups/myresourcegroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount \
  --condition \"avg UsedCapacity > 90000000000\" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action storage-alerts
```

### GCP Cloud Monitoring Alerts

```bash\n# Create notification channel (email)
NOTIFY_CHANNEL=$(gcloud alpha monitoring channels create \
  --display-name=\"Storage Team Email\" \
  --type=email \
  --channel-labels=email_address=storage@company.com \
  --format='value(name)')\n\n# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=$NOTIFY_CHANNEL \
  --display-name=\"GCS High Error Rate\" \
  --condition-display-name=\"4xx Errors > 100\" \
  --condition-threshold-value=100 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-filter='resource.type=\"gcs_bucket\" AND metric.type=\"storage.googleapis.com/storage_errors_count\"'\n\n# Create alert for storage usage
gcloud alpha monitoring policies create \
  --notification-channels=$NOTIFY_CHANNEL \
  --display-name=\"GCS High Storage Usage\" \
  --condition-display-name=\"Storage > 90% capacity\" \
  --condition-threshold-value=900000000000 \
  --condition-threshold-duration=600s \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-filter='resource.type=\"gcs_bucket\" AND metric.type=\"storage.googleapis.com/storage/total_bytes\"'
```

---

## 7. Data Migration

### AWS DataSync Migration

```bash
# Step 1: Create DataSync locations (source and destination)
# Source: On-premises NFS
SOURCE_LOCATION=$(aws datasync create-location-nfs \
  --subdirectory /data \
  --server-hostname nfs-server.example.com \
  --on-prem-config AgentArns=arn:aws:datasync:us-east-1:123456789012:agent/agent-12345678 \
  --query 'LocationArn' \
  --output text)

# Destination: AWS S3
DEST_LOCATION=$(aws datasync create-location-s3 \
  --s3-bucket-arn arn:aws:s3:::my-migration-bucket \
  --subdirectory /migrated-data \
  --s3-storage-class STANDARD \
  --query 'LocationArn' \
  --output text)

# Step 2: Create and start task
TASK_ARN=$(aws datasync create-task \
  --source-location-arn $SOURCE_LOCATION \
  --destination-location-arn $DEST_LOCATION \
  --name nfs-to-s3-migration \
  --options VerifyMode=POINT_IN_TIME_CONSISTENT,OverwriteMode=ALWAYS \
  --query 'TaskArn' \
  --output text)

# Step 3: Start task execution
EXECUTION_ARN=$(aws datasync start-task-execution \
  --task-arn $TASK_ARN \
  --query 'TaskExecutionArn' \
  --output text)

# Step 4: Monitor progress
aws datasync describe-task-execution \
  --task-execution-arn $EXECUTION_ARN \
  --query 'TaskExecutionStatus' \
  --output text
```

---

## 8. Security Hardening

### Enable S3 Security

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-storage-bucket \
  --versioning-configuration Status=Enabled

# Enable MFA delete protection
aws s3api put-bucket-versioning \
  --bucket my-storage-bucket \
  --versioning-configuration Status=Enabled \
  --mfa "arn:aws:iam::123456789012:mfa/user 123456"

# Block all public access
aws s3api put-public-access-block \
  --bucket my-storage-bucket \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Enable default encryption
aws s3api put-bucket-encryption \
  --bucket my-storage-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:us-east-1:123456789012:key/12345678"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Enable logging
aws s3api put-bucket-logging \
  --bucket my-storage-bucket \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "my-log-bucket",
      "TargetPrefix": "s3-access-logs/"
    }
  }'

# Enable access control logging
aws s3api put-bucket-acl \
  --bucket my-storage-bucket \
  --acl private

# Set bucket policy to deny unencrypted uploads
aws s3api put-bucket-policy \
  --bucket my-storage-bucket \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-storage-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }]
  }'
```

### Azure Storage Security Hardening

```bash
# Enable HTTPS only
az storage account update \
  --resource-group myresourcegroup \
  --name mystorageaccount \
  --https-only true

# Configure network rules
az storage account network-rule add \
  --resource-group myresourcegroup \
  --account-name mystorageaccount \
  --vnet-name my-vnet \
  --subnet my-subnet

# Deny public access by default
az storage account update \
  --resource-group myresourcegroup \
  --name mystorageaccount \
  --default-action Deny

# Enable encryption with customer-managed keys
az storage account update \
  --resource-group myresourcegroup \
  --name mystorageaccount \
  --encryption-key-name my-key \
  --encryption-key-vault /subscriptions/subscription-id/resourceGroups/myresourcegroup/providers/Microsoft.KeyVault/vaults/my-keyvault \
  --encryption-key-source Microsoft.Keyvault

# Enable soft delete for blobs
az storage blob service-properties delete-policy update \
  --account-name mystorageaccount \
  --enable true \
  --days-retained 7

# Enable audit logging
az storage logging update \
  --account-name mystorageaccount \
  --log rwd \
  --retention 30 \
  --services b
```

### GCP Cloud Storage Security Hardening

```bash
# Disable public access with uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://my-storage-bucket

# Enable encryption with Cloud KMS
KEY_RESOURCE=\"projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key\"
gsutil encryption set $KEY_RESOURCE gs://my-storage-bucket

# Enable versioning
gsutil versioning set on gs://my-storage-bucket

# Enable access logging
gsutil logging set on -b gs://my-log-bucket gs://my-storage-bucket

# Configure retention policy
gsutil retention set 30d gs://my-storage-bucket

# Set IAM policy to least privilege
cat > policy.yaml << 'EOF'
bindings:
- members:
  - serviceAccount:my-app@my-project.iam.gserviceaccount.com
  role: roles/storage.objectViewer
- members:
  - serviceAccount:my-backup@my-project.iam.gserviceaccount.com
  role: roles/storage.admin
EOF

gsutil iam ch -f policy.yaml gs://my-storage-bucket
```

---

## 9. Compliance & Governance

### Object Lock for Compliance

```bash
# Enable Object Lock on bucket
aws s3api create-bucket \
  --bucket my-compliant-bucket \
  --object-lock-enabled-for-bucket

# Put object with retention
aws s3api put-object \
  --bucket my-compliant-bucket \
  --key compliance-document.pdf \
  --body compliance-document.pdf \
  --object-lock-mode GOVERNANCE \
  --object-lock-retain-until-date 2026-12-31T00:00:00Z

# Put legal hold
aws s3api put-object-legal-hold \
  --bucket my-compliant-bucket \
  --key compliance-document.pdf \
  --legal-hold Status=ON

# Verify retention
aws s3api get-object-retention \
  --bucket my-compliant-bucket \
  --key compliance-document.pdf
```

---

## 10. Cost Optimization

### S3 Cost Analysis

```bash
# Get S3 storage metrics
aws s3api list-metrics \
  --bucket my-storage-bucket

# Calculate total storage size
aws s3 ls s3://my-storage-bucket --recursive --summarize --human-readable

# Expected output:
# Total Objects: 150,234
# Total Size: 256.5 GiB

# Calculate lifecycle savings
CURRENT_COST=$((256 * 23))  # 256 GB × $0.023/GB/month
echo "Current cost: $$CURRENT_COST/month"

# With lifecycle (70% to Glacier after 90 days)
OPTIMIZED_COST=$((256 * 23 * 0.3 + 256 * 4 * 0.7))  # 30% Standard + 70% Glacier
echo "Optimized cost: $$OPTIMIZED_COST/month"

SAVINGS=$((CURRENT_COST - OPTIMIZED_COST))
echo "Monthly savings: $$SAVINGS"
```

---

## 11. Troubleshooting

### Storage Performance Issues

```bash
# Issue: Slow S3 uploads
Symptoms: Uploads taking > 30 seconds

Solutions:
1. Check network: ping -c 5 s3.amazonaws.com
2. Use multi-part upload: aws s3 cp large-file s3://bucket --expected-size 1GB
3. Enable S3 Transfer Acceleration: aws s3api put-bucket-accelerate-configuration
4. Use S3 Select for partial retrieval: aws s3api select-object-content

# Issue: High EBS latency
Symptoms: VolumeQueueLength > 10

Solutions:
1. Check IOPS utilization: Check CloudWatch metrics
2. Increase IOPS: aws ec2 modify-volume --volume-id vol-123 --iops 10000
3. Use gp3 instead of gp2: Redeploy to gp3
4. Stripe multiple volumes: RAID 0 for better throughput
```

---

## 12. Disaster Recovery Drills

### Monthly DR Drill Procedure

```bash
# Schedule: First Friday of each month, 2 PM UTC
# Expected duration: 2 hours
# Participants: Storage team, Application team

# Step 1: Backup health check (30 minutes)
echo "=== Backup Health Check ==="
aws s3 ls s3://my-backup-bucket/$(date +%Y-%m-%d)
aws s3api head-object --bucket my-backup-bucket --key $(date +%Y-%m-%d)/backup.tar.gz

# Step 2: Test restore procedure (45 minutes)
echo "=== Testing Restore ==="
# Download backup
aws s3 cp s3://my-backup-bucket/2024-01-15/backup.tar.gz /tmp/

# Extract to test directory
mkdir /tmp/restore-test
tar xzf /tmp/backup.tar.gz -C /tmp/restore-test/

# Verify data integrity
diff -r /data /tmp/restore-test/data | head -20

# Step 3: Failover test (45 minutes)
echo "=== Testing Failover ==="
# Promote read replica
aws rds promote-read-replica --db-instance-identifier production-db-replica-test

# Verify database connectivity
mysql -h production-db-replica-test.c9akciq32.us-west-2.rds.amazonaws.com -u admin -p

# Step 4: Document results
cat > dr-drill-$(date +%Y-%m-%d).log << 'EOF'
DR Drill Results
================
Date: $(date)
Backup Status: OK
Restore Test: OK
Failover Test: OK
Time to Recovery: 45 minutes
Issues Found: None
EOF
```

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Contact**: Storage Operations Team
