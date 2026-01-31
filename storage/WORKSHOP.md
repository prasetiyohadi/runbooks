# Storage: Hands-On Workshop

Practical, step-by-step exercises to master cloud and physical storage. Estimated 90-120 minutes.

---

## Learning Objectives

By the end of this workshop, you will be able to:
✅ Provision block, file, and object storage (AWS, Azure, GCP)  
✅ Configure lifecycle policies and tiering across clouds  
✅ Implement backup and recovery procedures (multi-cloud)  
✅ Perform disaster recovery procedures (cross-region replication)  
✅ Optimize storage costs and performance  
✅ Compare and choose the right storage solution per cloud  
✅ Perform multi-cloud failover scenarios  

---

## Part 1: Storage Provisioning (20 minutes)

### Task 1.1: Create S3 Bucket with Security

**Objective**: Provision production-ready S3 bucket

```bash
# Step 1: Create bucket
BUCKET_NAME="storage-workshop-$(date +%s)"
aws s3api create-bucket --bucket $BUCKET_NAME --region us-east-1

# Expected output:
# {
#   "Location": "http://storage-workshop-1706700000.s3.amazonaws.com/"
# }

# Step 2: Enable versioning
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Step 3: Enable encryption
aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Step 4: Block public access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Verification
aws s3api head-bucket --bucket $BUCKET_NAME
echo "Bucket '$BUCKET_NAME' created successfully"
```

**Verification**: ✅ Bucket created with encryption and versioning enabled

---

### Task 1.2: Create EBS Volume and Mount

**Objective**: Provision and attach block storage

```bash
# Step 1: Create gp3 volume
VOLUME_ID=$(aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 50 \
  --volume-type gp3 \
  --iops 3000 \
  --throughput 125 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=workshop-volume}]' \
  --query 'VolumeId' \
  --output text)

echo "Created volume: $VOLUME_ID"

# Step 2: Wait for volume to be available
aws ec2 wait volume-available --volume-ids $VOLUME_ID

# Step 3: Attach to instance (requires running instance)
# Substitute with your instance ID
INSTANCE_ID="i-0987654321fedcba0"
aws ec2 attach-volume \
  --volume-id $VOLUME_ID \
  --instance-id $INSTANCE_ID \
  --device /dev/sdf

# Step 4: SSH to instance and mount
ssh ec2-user@<instance-ip> << 'EOF'

# Wait for device to appear
sleep 5

# Create filesystem
sudo mkfs.ext4 /dev/xvdf

# Create mount point
sudo mkdir -p /mnt/workshop

# Mount volume
sudo mount /dev/xvdf /mnt/workshop

# Verify
df -h /mnt/workshop

# Make persistent
echo '/dev/xvdf /mnt/workshop ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab

EOF

# Expected output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/xvdf        50G   60M   47G   1% /mnt/workshop
```

**Verification**: ✅ Volume mounted and accessible at `/mnt/workshop`

---

### Task 1.3: Create EFS and Test Multi-Mount

**Objective**: Provision shared file storage

```bash
# Step 1: Create EFS
FILE_SYSTEM_ID=$(aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=workshop-efs \
  --query 'FileSystemId' \
  --output text)

echo "Created EFS: $FILE_SYSTEM_ID"

# Step 2: Wait for file system to be available
aws efs wait file-system-available --file-system-id $FILE_SYSTEM_ID

# Step 3: Create mount targets
# Substitute with your subnet IDs
SUBNET_ID="subnet-12345678"
SECURITY_GROUP_ID="sg-12345678"

aws efs create-mount-target \
  --file-system-id $FILE_SYSTEM_ID \
  --subnet-id $SUBNET_ID \
  --security-groups $SECURITY_GROUP_ID

# Wait for mount target
sleep 30

# Step 4: Mount to instance
ssh ec2-user@<instance-ip> << 'EOF'

# Install NFS utils
sudo yum install -y nfs-utils

# Create mount point
sudo mkdir -p /mnt/efs

# Get the DNS name (replace with actual FS ID)
EFS_DNS="$FILE_SYSTEM_ID.efs.us-east-1.amazonaws.com"

# Mount EFS
sudo mount -t nfs4 -o nfsvers=4.1 $EFS_DNS:/ /mnt/efs

# Verify
mount | grep efs
# Expected: <efs>.efs.us-east-1.amazonaws.com:/ on /mnt/efs

# Test write/read
sudo touch /mnt/efs/test-file.txt
sudo echo "Hello from EFS" > /mnt/efs/test-file.txt
sudo cat /mnt/efs/test-file.txt

EOF

# Expected output:
# Hello from EFS
```

**Verification**: ✅ EFS mounted and tested with read/write

---

### Task 1.4: Create Azure Storage Account with Blob Container

**Objective**: Provision managed Azure Blob Storage

```bash
# Step 1: Create storage account
STORAGE_ACCOUNT="workshop$(date +%s | tail -c 6)"
az storage account create \
  --resource-group myresourcegroup \
  --name $STORAGE_ACCOUNT \
  --location eastus \
  --sku Standard_GRS \
  --kind StorageV2

# Expected output: Storage account created successfully

# Step 2: Get storage key
STORAGE_KEY=$(az storage account keys list \
  --resource-group myresourcegroup \
  --account-name $STORAGE_ACCOUNT \
  --query [0].value -o tsv)

# Step 3: Create blob container
az storage container create \
  --name workshop-container \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --public-access off

# Step 4: Upload test file
echo "Test data from Azure workshop" > /tmp/azure-test.txt
az storage blob upload \
  --file /tmp/azure-test.txt \
  --container-name workshop-container \
  --name test-file.txt \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# Verification
az storage blob list \
  --container-name workshop-container \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

# Expected output: test-file.txt listed
```

**Verification**: ✅ Azure Storage Account created with blob container

---

### Task 1.5: Create GCP Cloud Storage Bucket

**Objective**: Provision GCP Cloud Storage with security

```bash
# Step 1: Create bucket
BUCKET_NAME="workshop-$(date +%s)"
gsutil mb -c STANDARD -l us-central1 gs://$BUCKET_NAME

# Expected output: Creating gs://workshop-1706700000/

# Step 2: Enable versioning
gsutil versioning set on gs://$BUCKET_NAME

# Step 3: Upload test file
echo "Test data from GCP workshop" > /tmp/gcp-test.txt
gsutil cp /tmp/gcp-test.txt gs://$BUCKET_NAME/test-file.txt

# Step 4: Set uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME

# Verification
gsutil ls -h gs://$BUCKET_NAME/

# Expected output: gs://workshop-1706700000/test-file.txt
```

**Verification**: ✅ GCP Cloud Storage bucket created and tested

---

## Part 2: Lifecycle & Tiering (20 minutes)

### Task 2.1: Create S3 Lifecycle Policy

**Objective**: Implement automatic cost-saving tiering

```bash
# Step 1: Create sample data
mkdir -p /tmp/sample-data
for i in {1..10}; do
  dd if=/dev/urandom bs=1M count=10 of=/tmp/sample-data/file-$i.bin
done

# Step 2: Upload files to S3
aws s3 sync /tmp/sample-data s3://$BUCKET_NAME/logs/

# Step 3: Create lifecycle configuration
cat > lifecycle-policy.json << 'EOF'
{
  "Rules": [
    {
      "Id": "Auto-tier-logs",
      "Status": "Enabled",
      "Prefix": "logs/",
      "Transitions": [
        {
          "Days": 1,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 3,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
EOF

# Step 4: Apply lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET_NAME \
  --lifecycle-configuration file://lifecycle-policy.json

# Step 5: Verify configuration
aws s3api get-bucket-lifecycle-configuration --bucket $BUCKET_NAME

# Expected output shows transition rules
```

**Verification**: ✅ Lifecycle policy applied successfully

---

### Task 2.2: Monitor Cost Savings

**Objective**: Calculate potential savings

```bash
# Step 1: Get bucket size
BUCKET_SIZE=$(aws s3 ls s3://$BUCKET_NAME --recursive --summarize --human-readable | grep 'Total Size' | awk '{print $(NF-1)}')

echo "Bucket size: $BUCKET_SIZE"

# Step 2: Calculate current cost (all Standard)
# Assuming Standard = $0.023/GB/month
CURRENT_COST_PER_GB=0.023

# Step 3: Calculate with lifecycle
# 30 days: 1 day Standard, 2 days IA, 27 days Glacier
# Cost = (1/30 * 0.023) + (2/30 * 0.0125) + (27/30 * 0.004)
LIFECYCLE_COST_PER_GB=$(echo "scale=6; (1/30 * 0.023) + (2/30 * 0.0125) + (27/30 * 0.004)" | bc)

echo "Current cost per GB/month: $CURRENT_COST_PER_GB"
echo "With lifecycle per GB/month: $LIFECYCLE_COST_PER_GB"

# Step 4: Calculate monthly savings
# Would need to convert BUCKET_SIZE to numeric for calculation
echo "Estimated monthly savings: 70-80% on archival data"
```

**Verification**: ✅ Lifecycle policy configured for cost optimization

---

### Task 2.3: Configure Azure Blob Lifecycle

**Objective**: Implement tiering for Azure Blob Storage

```bash
# Step 1: Create lifecycle policy JSON
cat > azure-lifecycle.json << 'EOF'
{
  "rules": [
    {
      "enabled": true,
      "name": "tiering-policy",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": {"daysAfterModificationGreaterThan": 1},
            "tierToArchive": {"daysAfterModificationGreaterThan": 3},
            "delete": {"daysAfterModificationGreaterThan": 30}
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["logs/"]
        }
      }
    }
  ]
}
EOF

# Step 2: Create lifecycle policy
az storage account management-policy create \
  --account-name $STORAGE_ACCOUNT \
  --resource-group myresourcegroup \
  --policy @azure-lifecycle.json

# Step 3: Verify policy
az storage account management-policy show \
  --account-name $STORAGE_ACCOUNT \
  --resource-group myresourcegroup

# Expected output: Lifecycle policy applied successfully
```

**Verification**: ✅ Azure lifecycle policy configured

---

### Task 2.4: Configure GCP Cloud Storage Lifecycle

**Objective**: Implement multi-tier lifecycle for cost optimization

```bash
# Step 1: Create lifecycle configuration
cat > gcp-lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 1, "matchesPrefix": ["logs/"]}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 3, "matchesPrefix": ["logs/"]}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30, "matchesPrefix": ["logs/"]}
      }
    ]
  }
}
EOF

# Step 2: Apply lifecycle policy
gsutil lifecycle set gcp-lifecycle.json gs://$BUCKET_NAME

# Step 3: Verify policy
gsutil lifecycle get gs://$BUCKET_NAME

# Step 4: Upload test data to simulate tiering
mkdir -p /tmp/logs-data
for i in {1..5}; do
  dd if=/dev/urandom bs=1M count=5 of=/tmp/logs-data/log-$i.bin
done
gsutil -m cp /tmp/logs-data/* gs://$BUCKET_NAME/logs/

# Expected: Files uploaded to logs/ prefix for tiering
```

**Verification**: ✅ GCP lifecycle policy configured for tiering

---

## Part 3: Backup & Recovery (20 minutes)

### Task 3.1: Create and Upload Backup

**Objective**: Implement backup procedure

```bash
# Step 1: Create sample data to backup
mkdir -p /tmp/myapp-data
echo "Critical application data - do not lose!" > /tmp/myapp-data/database-export.sql
echo "User configuration file" > /tmp/myapp-data/config.json
echo "Sensitive credentials" > /tmp/myapp-data/secrets.env

# Step 2: Create backup archive
BACKUP_FILE="myapp-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar czf /tmp/$BACKUP_FILE -C /tmp myapp-data/

# Step 3: Calculate checksum
sha256sum /tmp/$BACKUP_FILE > /tmp/$BACKUP_FILE.sha256

# Step 4: Upload to S3
aws s3 cp /tmp/$BACKUP_FILE s3://$BUCKET_NAME/backups/
aws s3 cp /tmp/$BACKUP_FILE.sha256 s3://$BUCKET_NAME/backups/

# Step 5: Verify upload
aws s3 ls s3://$BUCKET_NAME/backups/ --recursive

# Expected output shows uploaded files
echo "Backup uploaded successfully"
```

**Verification**: ✅ Backup file created and uploaded to S3

---

### Task 3.2: Restore from Backup

**Objective**: Test recovery procedure

```bash
# Step 1: Get backup file name
BACKUP_FILE=$(aws s3 ls s3://$BUCKET_NAME/backups/ --recursive | grep '.tar.gz$' | tail -1 | awk '{print $NF}' | xargs basename)

echo "Restoring from: $BACKUP_FILE"

# Step 2: Download backup
aws s3 cp s3://$BUCKET_NAME/backups/$BACKUP_FILE /tmp/
aws s3 cp s3://$BUCKET_NAME/backups/$BACKUP_FILE.sha256 /tmp/

# Step 3: Verify checksum
cd /tmp
sha256sum -c $BACKUP_FILE.sha256

# Expected output:
# /tmp/myapp-backup-20240115-143022.tar.gz: OK

# Step 4: Extract to restore location
mkdir -p /tmp/restore-test
tar xzf /tmp/$BACKUP_FILE -C /tmp/restore-test/

# Step 5: Verify restored files
ls -la /tmp/restore-test/myapp-data/
cat /tmp/restore-test/myapp-data/database-export.sql

# Expected output shows restored files
echo "Restore completed successfully"
```

**Verification**: ✅ Files restored and verified successfully

---

## Part 4: Disaster Recovery (15 minutes)

### Task 4.1: Cross-Region Replication

**Objective**: Set up geographic redundancy

```bash
# Step 1: Create replica bucket in different region
REPLICA_BUCKET="$BUCKET_NAME-replica-us-west"
aws s3api create-bucket \
  --bucket $REPLICA_BUCKET \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

# Step 2: Enable versioning on both buckets
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
  --bucket $REPLICA_BUCKET \
  --versioning-configuration Status=Enabled

# Step 3: Create replication configuration
cat > replication.json << 'EOF'
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication",
  "Rules": [
    {
      "ID": "ReplicateAll",
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {"Prefix": ""},
      "Destination": {
        "Bucket": "arn:aws:s3:::REPLICA_BUCKET"
      }
    }
  ]
}
EOF

# Note: Replace REPLICA_BUCKET with actual name
sed -i "s|REPLICA_BUCKET|$REPLICA_BUCKET|g" replication.json

# Step 4: Apply replication configuration
aws s3api put-bucket-replication \
  --bucket $BUCKET_NAME \
  --replication-configuration file://replication.json

# Step 5: Verify replication working
# Upload new file
echo "Test replication" > /tmp/replication-test.txt
aws s3 cp /tmp/replication-test.txt s3://$BUCKET_NAME/test/

# Wait for replication
sleep 10

# Verify in replica bucket
aws s3 ls s3://$REPLICA_BUCKET/test/

echo "Replication configured successfully"
```

**Verification**: ✅ Files replicated to secondary region

---

### Task 4.2: Test Failover Scenario

**Objective**: Simulate disaster recovery

```bash
# Scenario: Primary region fails, use replica

# Step 1: Simulate primary failure
echo "SIMULATING PRIMARY REGION FAILURE..."
echo "Primary bucket $BUCKET_NAME is now unavailable"

# Step 2: Switch to replica bucket
REPLICA_BUCKET="$BUCKET_NAME-replica-us-west"

# Step 3: Access data from replica
echo "Retrieving files from replica bucket..."
aws s3 ls s3://$REPLICA_BUCKET/backups/ --recursive

# Step 4: Restore from replica
aws s3 cp s3://$REPLICA_BUCKET/backups/ /tmp/recovered-backup/ --recursive

# Step 5: Verify restoration
ls -la /tmp/recovered-backup/

echo "Failover test completed - data accessible from replica"
```

**Verification**: ✅ Data accessible from replica bucket

---

### Task 4.3: Azure Storage Replication

**Objective**: Set up geo-redundancy for Azure

```bash
# Step 1: Check current replication status
az storage account show \
  --resource-group myresourcegroup \
  --name $STORAGE_ACCOUNT \
  --query "secondaryLocation" -o tsv

# Expected: westus (secondary region)

# Step 2: Enable read access to secondary region
az storage account update \
  --resource-group myresourcegroup \
  --name $STORAGE_ACCOUNT \
  --key-exp-days 0 \
  --set properties.accessTier=Hot

# Step 3: Test secondary access
az storage blob list \
  --container-name workshop-container \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --prefix backups/

# Step 4: Create snapshot of container
az storage blob snapshot \
  --container-name workshop-container \
  --name test-file.txt \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY

echo "Azure replication configured successfully"
```

**Verification**: ✅ Azure geo-redundancy configured

---

### Task 4.4: GCP Cross-Region Replication

**Objective**: Set up disaster recovery with GCP

```bash
# Step 1: Create replica bucket in different region
REPLICA_BUCKET="$BUCKET_NAME-replica"
gsutil mb -c STANDARD -l us-east1 gs://$REPLICA_BUCKET

# Step 2: Enable versioning on both
gsutil versioning set on gs://$BUCKET_NAME
gsutil versioning set on gs://$REPLICA_BUCKET

# Step 3: Copy data to replica bucket
gsutil -m cp -r gs://$BUCKET_NAME/* gs://$REPLICA_BUCKET/

# Step 4: Verify replica contains all data
echo "Primary bucket objects:"
gsutil ls -r gs://$BUCKET_NAME/ | wc -l

echo "Replica bucket objects:"
gsutil ls -r gs://$REPLICA_BUCKET/ | wc -l

# Step 5: Simulate failover - test reading from replica
gsutil ls -h gs://$REPLICA_BUCKET/backups/

echo "GCP replication configured successfully"
```

**Verification**: ✅ GCP cross-region replication working

---

## Part 5: Performance Optimization (15 minutes)

### Task 5.1: Monitor S3 Performance

**Objective**: Implement monitoring

```bash
# Step 1: Enable S3 request metrics
aws s3api put-bucket-metrics-configuration \
  --bucket $BUCKET_NAME \
  --id EntireBucket \
  --metrics-configuration '{
    "Id": "EntireBucket",
    "Filter": {"Prefix": ""}
  }'

# Step 2: Generate traffic to monitor
echo "Generating test traffic..."
for i in {1..100}; do
  echo "Test data $i" > /tmp/test-$i.txt
  aws s3 cp /tmp/test-$i.txt s3://$BUCKET_NAME/performance-test/ &
done

wait

echo "Test traffic generated"

# Step 3: Check S3 metrics in CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name NumberOfObjects \
  --dimensions Name=BucketName,Value=$BUCKET_NAME \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300

echo "Performance metrics collected"
```

**Verification**: ✅ Metrics collected and available in CloudWatch

---

### Task 5.2: Optimize Transfer Speed

**Objective**: Use multipart upload and acceleration

```bash
# Step 1: Create large test file
dd if=/dev/urandom bs=1M count=100 of=/tmp/large-file.bin

# Step 2: Enable S3 Transfer Acceleration
aws s3api put-bucket-accelerate-configuration \
  --bucket $BUCKET_NAME \
  --accelerate-configuration Status=Enabled

# Step 3: Upload with acceleration
time aws s3 cp /tmp/large-file.bin s3://$BUCKET_NAME/optimized/ \
  --expected-size 100000000

# Step 4: Download and measure speed
time aws s3 cp s3://$BUCKET_NAME/optimized/large-file.bin /tmp/downloaded-file.bin

echo "Transfer optimization complete"
```

**Verification**: ✅ Large file uploaded/downloaded successfully

---

### Task 5.3: Azure Performance Optimization

**Objective**: Optimize Blob Storage transfers

```bash
# Step 1: Create large test file
dd if=/dev/urandom bs=1M count=50 of=/tmp/azure-large-file.bin

# Step 2: Upload with AzCopy for parallel performance
azcopy copy /tmp/azure-large-file.bin \
  "https://$STORAGE_ACCOUNT.blob.core.windows.net/workshop-container/large-file.bin" \
  --recursive --parallel-count=8

# Step 3: Measure download speed
time azcopy copy \
  "https://$STORAGE_ACCOUNT.blob.core.windows.net/workshop-container/large-file.bin" \
  /tmp/azure-downloaded.bin

# Step 4: Check transfer statistics
azcopy jobs list

# Expected: Transfer completed with performance metrics
```

**Verification**: ✅ Azure transfer optimization completed

---

### Task 5.4: GCP Performance Optimization

**Objective**: Optimize Cloud Storage transfers

```bash
# Step 1: Create large test file
dd if=/dev/urandom bs=1M count=50 of=/tmp/gcp-large-file.bin

# Step 2: Configure parallel transfers
gsutil config set GSUtil:parallel_thread_count 24
gsutil config set GSUtil:parallel_process_count 8

# Step 3: Upload with parallel transfers
time gsutil -m cp /tmp/gcp-large-file.bin gs://$BUCKET_NAME/performance-test/

# Step 4: Download and measure speed
time gsutil cp gs://$BUCKET_NAME/performance-test/gcp-large-file.bin /tmp/gcp-downloaded.bin

# Step 5: Verify file integrity
md5sum /tmp/gcp-large-file.bin /tmp/gcp-downloaded.bin

# Expected: Files match (MD5 hashes identical)
```

**Verification**: ✅ GCP transfer performance optimized

---

## Part 6: Cost Analysis (10 minutes)

### Task 6.1: Calculate Total Cost

**Objective**: Understand storage costs

```bash
# Step 1: Get bucket statistics
TOTAL_SIZE=$(aws s3 ls s3://$BUCKET_NAME --recursive --summarize --human-readable | grep 'Total Size' | awk '{print $NF}' | sed 's/[G|M|K]iB//')

TOTAL_OBJECTS=$(aws s3 ls s3://$BUCKET_NAME --recursive --summarize | grep 'Total Objects' | awk '{print $NF}')

echo "Total Size: ${TOTAL_SIZE} GiB"
echo "Total Objects: $TOTAL_OBJECTS"

# Step 2: Calculate storage cost (Standard)
# Cost = size_in_GB * $0.023/month
STORAGE_COST=$(echo "scale=2; ${TOTAL_SIZE} * 0.023" | bc)

echo "Monthly storage cost (Standard): \$$STORAGE_COST"

# Step 3: Calculate request cost
# Assuming 1000 PUT/GET requests
REQUEST_COST=$(echo "scale=2; 1000 * 0.0004" | bc)

echo "Monthly request cost: \$$REQUEST_COST"

# Step 4: Total cost
TOTAL_COST=$(echo "scale=2; $STORAGE_COST + $REQUEST_COST" | bc)

echo "Total monthly cost: \$$TOTAL_COST"

# Step 5: Calculate with lifecycle savings
LIFECYCLE_COST=$(echo "scale=2; ($STORAGE_COST * 0.3) + ($STORAGE_COST * 0.7 * 0.17)" | bc)

SAVINGS=$(echo "scale=2; $STORAGE_COST - $LIFECYCLE_COST" | bc)

echo "Cost with lifecycle: \$$LIFECYCLE_COST"
echo "Monthly savings: \$$SAVINGS ($(echo "scale=1; ($SAVINGS/$STORAGE_COST)*100" | bc)%)"
```

**Verification**: ✅ Cost analysis completed and documented

---

### Task 6.2: Azure Storage Cost Analysis

**Objective**: Calculate and optimize Azure storage costs

```bash
# Step 1: Get storage account usage
STORAGE_SIZE_GB=$(az storage account show-usage \
  --resource-group myresourcegroup \
  --name $STORAGE_ACCOUNT \
  --query "value[0].currentValue" -o tsv)

STORAGE_SIZE_GB=$((STORAGE_SIZE_GB / 1024 / 1024 / 1024))

echo "Total storage used: ${STORAGE_SIZE_GB} GB"

# Step 2: Calculate current cost (Hot/Cool tiering)
# Hot: $0.018/GB, Cool: $0.01/GB, Archive: $0.002/GB
HOT_COST=$(echo "scale=3; $STORAGE_SIZE_GB * 0.018" | bc)
TRANSACTION_COST=$(echo "scale=3; 1000 * 0.00001" | bc)

TOTAL_AZURE_COST=$(echo "scale=3; $HOT_COST + $TRANSACTION_COST" | bc)

echo "Current monthly cost (Hot): \$$TOTAL_AZURE_COST"

# Step 3: Estimate with tiering
# 30% Hot, 50% Cool, 20% Archive
TIERED_HOT=$(echo "scale=3; $STORAGE_SIZE_GB * 0.30 * 0.018" | bc)
TIERED_COOL=$(echo "scale=3; $STORAGE_SIZE_GB * 0.50 * 0.010" | bc)
TIERED_ARCHIVE=$(echo "scale=3; $STORAGE_SIZE_GB * 0.20 * 0.002" | bc)
TIERED_TOTAL=$(echo "scale=3; $TIERED_HOT + $TIERED_COOL + $TIERED_ARCHIVE + $TRANSACTION_COST" | bc)

echo "Cost with tiering: \$$TIERED_TOTAL"
echo "Monthly savings: \$$(echo "scale=3; $TOTAL_AZURE_COST - $TIERED_TOTAL" | bc)"
```

**Verification**: ✅ Azure cost analysis completed

---

### Task 6.3: GCP Storage Cost Analysis

**Objective**: Analyze and optimize GCP Cloud Storage costs

```bash
# Step 1: Get bucket size and object count
BUCKET_SIZE_GB=$(gsutil du -s gs://$BUCKET_NAME | awk '{print $1 / 1024 / 1024 / 1024}')
OBJECT_COUNT=$(gsutil ls -r gs://$BUCKET_NAME/ | wc -l)

echo "Total bucket size: ${BUCKET_SIZE_GB} GB"
echo "Total objects: $OBJECT_COUNT"

# Step 2: Calculate current cost (all Standard)
# Standard: $0.020/GB, Network: $0.12/GB (egress)
STORAGE_COST_GCP=$(echo "scale=3; $BUCKET_SIZE_GB * 0.020" | bc)
REQUEST_COST_GCP=$(echo "scale=3; $OBJECT_COUNT * 0.0004" | bc)

TOTAL_GCP_COST=$(echo "scale=3; $STORAGE_COST_GCP + $REQUEST_COST_GCP" | bc)

echo "Current monthly cost (Standard): \$$TOTAL_GCP_COST"

# Step 3: Estimate with lifecycle tiering
# 20% Nearline ($0.010), 30% Coldline ($0.004), 50% Archive ($0.0012)
NEARLINE=$(echo "scale=3; $BUCKET_SIZE_GB * 0.20 * 0.010" | bc)
COLDLINE=$(echo "scale=3; $BUCKET_SIZE_GB * 0.30 * 0.004" | bc)
ARCHIVE=$(echo "scale=3; $BUCKET_SIZE_GB * 0.50 * 0.0012" | bc)
TIERED_GCP=$(echo "scale=3; $NEARLINE + $COLDLINE + $ARCHIVE + $REQUEST_COST_GCP" | bc)

echo "Cost with lifecycle tiering: \$$TIERED_GCP"
echo "Monthly savings: \$$(echo "scale=3; $TOTAL_GCP_COST - $TIERED_GCP" | bc)"

# Step 4: Compare all three clouds
echo ""
echo "=== Cloud Cost Comparison (Monthly) ==="
echo "AWS S3: \$$TOTAL_COST"
echo "Azure Blob: \$$TOTAL_AZURE_COST"
echo "GCP Cloud Storage: \$$TOTAL_GCP_COST"
```

**Verification**: ✅ GCP cost analysis completed with multi-cloud comparison

---

## Validation Checklist

- [ ] S3 bucket created with security enabled
- [ ] EBS volume provisioned and mounted
- [ ] EFS created and mounted
- [ ] Azure Storage Account created with blob container
- [ ] GCP Cloud Storage bucket created
- [ ] S3 lifecycle policy applied and working
- [ ] Azure lifecycle policy configured
- [ ] GCP lifecycle policy configured
- [ ] AWS backup created and restored
- [ ] Cross-region replication configured (AWS)
- [ ] Azure geo-replication configured
- [ ] GCP cross-region replication set up
- [ ] S3 performance optimization tested
- [ ] Azure performance optimization tested
- [ ] GCP performance optimization tested
- [ ] AWS cost analysis completed
- [ ] Azure cost analysis completed
- [ ] GCP cost analysis completed

---

## Summary

**Completed Tasks**:
✅ Provisioned 5 storage types (S3, EBS, EFS, Azure Blob, GCP Cloud Storage)  
✅ Configured lifecycle policies (AWS, Azure, GCP)  
✅ Created and restored from backups (multi-cloud)  
✅ Set up cross-region replication (AWS, Azure, GCP)  
✅ Tested disaster recovery scenarios (multi-cloud)  
✅ Optimized performance across platforms  
✅ Analyzed costs on all three clouds  

**Time Spent**: ~120 minutes (extended with multi-cloud tasks)

**Cloud Comparison Results**:
- **AWS**: Best for hybrid/on-prem integration (DataSync)
- **Azure**: Best for enterprise Microsoft environments
- **GCP**: Best for data analytics and ML workloads

**Next Steps**:
- Review [CONCEPT.md](CONCEPT.md) for advanced multi-cloud patterns
- Read [RUNBOOK.md](RUNBOOK.md) for production procedures
- Explore [BUSINESS.md](BUSINESS.md) for ROI across platforms
- Practice multi-cloud disaster recovery scenarios

---

**Document Version**: 1.1  
**Last Updated**: January 31, 2026  
**Level**: Beginner to Intermediate  
**Cloud Coverage**: AWS, Azure, GCP
