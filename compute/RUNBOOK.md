# Compute Infrastructure: Operational Runbooks

Production procedures and troubleshooting for compute infrastructure operations.

---

## Table of Contents

1. [Infrastructure Setup](#infrastructure-setup)
2. [Instance Deployment](#instance-deployment)
3. [Scaling Operations](#scaling-operations)
4. [Performance Optimization](#performance-optimization)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Troubleshooting](#troubleshooting)
7. [Disaster Recovery](#disaster-recovery)
8. [Security Hardening](#security-hardening)

---

## 1. Infrastructure Setup

### AWS VPC & Networking Setup

**Objective**: Create production-grade VPC with multi-AZ deployment

```bash
# Set variables
REGION=us-east-1
ENVIRONMENT=production
PROJECT=myapp
VPC_CIDR="10.0.0.0/16"

# Create VPC
aws ec2 create-vpc \
  --cidr-block $VPC_CIDR \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT-vpc},{Key=Environment,Value=$ENVIRONMENT}]"

# Output: vpc-xxxxx
VPC_ID="vpc-xxxxx"

# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT-igw}]" \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

# Attach IGW to VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID

# Create public subnets (2 AZs)
SUBNET1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT-public-1a}]" \
  --query 'Subnet.SubnetId' \
  --output text)

SUBNET2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT-public-1b}]" \
  --query 'Subnet.SubnetId' \
  --output text)

# Create private subnets (2 AZs)
SUBNET3=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.10.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT-private-1a}]" \
  --query 'Subnet.SubnetId' \
  --output text)

SUBNET4=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT-private-1b}]" \
  --query 'Subnet.SubnetId' \
  --output text)

# Create route table for public subnets
RT_PUBLIC=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT-rt-public}]" \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Add default route to IGW
aws ec2 create-route \
  --route-table-id $RT_PUBLIC \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Associate public subnets with public route table
aws ec2 associate-route-table --subnet-id $SUBNET1 --route-table-id $RT_PUBLIC
aws ec2 associate-route-table --subnet-id $SUBNET2 --route-table-id $RT_PUBLIC

# Create security group
SG=$(aws ec2 create-security-group \
  --group-name "$PROJECT-app-sg" \
  --description "Security group for $PROJECT application" \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT-app-sg}]" \
  --query 'GroupId' \
  --output text)

# Add inbound rules
aws ec2 authorize-security-group-ingress \
  --group-id $SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG \
  --protocol tcp \
  --port 22 \
  --cidr 203.0.113.0/24  # Your IP range

echo "✓ VPC setup complete"
echo "VPC ID: $VPC_ID"
echo "Public Subnets: $SUBNET1, $SUBNET2"
echo "Private Subnets: $SUBNET3, $SUBNET4"
echo "Security Group: $SG"
```

### Azure Resource Group & Network Setup

```bash
# Set variables
RESOURCE_GROUP="myapp-rg"
LOCATION="eastus"
VNET_NAME="myapp-vnet"
VNET_CIDR="10.0.0.0/16"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create virtual network
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name $VNET_NAME \
  --address-prefix $VNET_CIDR \
  --subnet-name public-subnet-1 \
  --subnet-prefix 10.0.1.0/24

# Add additional subnets
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name public-subnet-2 \
  --address-prefix 10.0.2.0/24

az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name private-subnet-1 \
  --address-prefix 10.0.10.0/24

# Create network security group
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name "$VNET_NAME-nsg"

# Add inbound rules
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name "$VNET_NAME-nsg" \
  --name AllowHTTP \
  --priority 100 \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 80 \
  --access Allow

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name "$VNET_NAME-nsg" \
  --name AllowHTTPS \
  --priority 110 \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443 \
  --access Allow

echo "✓ Azure network setup complete"
echo "Resource Group: $RESOURCE_GROUP"
echo "Virtual Network: $VNET_NAME"
```

---

## 2. Instance Deployment

### AWS EC2 Instance Launch

**Objective**: Deploy production web server instance

```bash
# Set variables
INSTANCE_TYPE="m5.large"
IMAGE_ID="ami-0c55b159cbfafe1f0"  # Ubuntu 22.04 LTS
KEY_NAME="my-key-pair"
SECURITY_GROUP="sg-12345678"
SUBNET_ID="subnet-12345678"
VOLUME_SIZE=100
VOLUME_TYPE="gp3"
ENVIRONMENT="production"
APPLICATION="webserver"

# Create user data script (runs on first boot)
cat > user-data.sh << 'EOF'
#!/bin/bash
set -e

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

echo "✓ User data script completed"
EOF

# Launch instance
aws ec2 run-instances \
  --image-id $IMAGE_ID \
  --instance-type $INSTANCE_TYPE \
  --key-name $KEY_NAME \
  --security-group-ids $SECURITY_GROUP \
  --subnet-id $SUBNET_ID \
  --associate-public-ip-address \
  --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=$VOLUME_SIZE,VolumeType=$VOLUME_TYPE,DeleteOnTermination=true,Encrypted=true}" \
  --iam-instance-profile Name=ec2-cloudwatch-role \
  --user-data file://user-data.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APPLICATION},{Key=Environment,Value=$ENVIRONMENT},{Key=Owner,Value=devops-team}]" \
  --tag-specifications "ResourceType=volume,Tags=[{Key=Name,Value=$APPLICATION-root},{Key=Environment,Value=$ENVIRONMENT}]" \
  --monitoring Enabled=true

# Output
echo "✓ Instance launched"
echo "Check instance status with:"
echo "aws ec2 describe-instances --query 'Reservations[].Instances[].{ID:InstanceId,State:State.Name,IP:PrivateIpAddress}'"
```

### Azure VM Creation

```bash
# Set variables
RESOURCE_GROUP="myapp-rg"
VM_NAME="webserver-01"
IMAGE="UbuntuLTS"
SIZE="Standard_B2s"
VNET_NAME="myapp-vnet"
SUBNET_NAME="public-subnet-1"
NIC_NAME="$VM_NAME-nic"
OS_DISK_SIZE=100

# Create network interface
az network nic create \
  --resource-group $RESOURCE_GROUP \
  --name $NIC_NAME \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME

# Create VM
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --nics $NIC_NAME \
  --image $IMAGE \
  --size $SIZE \
  --os-disk-size-gb $OS_DISK_SIZE \
  --os-disk-name "$VM_NAME-osdisk" \
  --generate-ssh-keys \
  --assign-identity \
  --role Contributor \
  --scope /subscriptions/{subscription-id}

# Enable managed identity for monitoring
az vm update \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --set identity.type='SystemAssigned'

# Add custom script extension (bootstrap)
az vm extension set \
  --resource-group $RESOURCE_GROUP \
  --vm-name $VM_NAME \
  --name CustomScript \
  --publisher Microsoft.Azure.Extensions \
  --settings '{"fileUris": ["https://raw.githubusercontent.com/yourepo/bootstrap.sh"], "commandToExecute": "bash bootstrap.sh"}'

echo "✓ Azure VM created"
```

### GCP Compute Engine Instance

```bash
# Set variables
PROJECT_ID="my-project"
ZONE="us-central1-a"
INSTANCE_NAME="webserver-01"
MACHINE_TYPE="e2-medium"
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
BOOT_DISK_SIZE="100GB"
BOOT_DISK_TYPE="pd-ssd"

# Create instance
gcloud compute instances create $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=$MACHINE_TYPE \
  --image-family=$IMAGE_FAMILY \
  --image-project=$IMAGE_PROJECT \
  --boot-disk-size=$BOOT_DISK_SIZE \
  --boot-disk-type=$BOOT_DISK_TYPE \
  --enable-display-device \
  --tags=webserver,http-server,https-server \
  --labels=environment=production,application=webserver,owner=devops \
  --metadata-from-file startup-script=./bootstrap.sh \
  --create-disk size=200GB,type=pd-ssd,name="$INSTANCE_NAME-data"

# Attach disk
gcloud compute instances attach-disk $INSTANCE_NAME \
  --disk="$INSTANCE_NAME-data" \
  --zone=$ZONE

# Configure firewall rules
gcloud compute firewall-rules create allow-http \
  --project=$PROJECT_ID \
  --allow=tcp:80 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server

gcloud compute firewall-rules create allow-https \
  --project=$PROJECT_ID \
  --allow=tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=https-server

echo "✓ GCP instance created"
```

---

## 3. Scaling Operations

### Enable Auto-Scaling on AWS

```bash
# Set variables
ASG_NAME="app-asg"
MIN_SIZE=2
MAX_SIZE=10
DESIRED_CAPACITY=3
LAUNCH_TEMPLATE="app-lt-v1"
SUBNETS="subnet-12345,subnet-67890"

# Create launch template
aws ec2 create-launch-template \
  --launch-template-name $LAUNCH_TEMPLATE \
  --version-description "Production template" \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.large",
    "KeyName": "my-key",
    "SecurityGroupIds": ["sg-12345678"],
    "Monitoring": {"Enabled": true},
    "MetadataOptions": {
      "HttpTokens": "required",
      "HttpPutResponseHopLimit": 1
    }
  }'

# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name $ASG_NAME \
  --launch-template "LaunchTemplateName=$LAUNCH_TEMPLATE,Version=\$Latest" \
  --min-size $MIN_SIZE \
  --max-size $MAX_SIZE \
  --desired-capacity $DESIRED_CAPACITY \
  --vpc-zone-identifier $SUBNETS \
  --health-check-type ELB \
  --health-check-grace-period 300 \
  --tags "Key=Name,Value=app-instance,PropagateAtLaunch=true" \
           "Key=Environment,Value=production,PropagateAtLaunch=true"

# Create scaling policy (scale up)
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name $ASG_NAME \
  --policy-name "scale-up-policy" \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }'

echo "✓ Auto-scaling configured"
echo "ASG: $ASG_NAME"
echo "Min: $MIN_SIZE, Max: $MAX_SIZE, Desired: $DESIRED_CAPACITY"
```

### Azure Virtual Machine Scale Set

```bash
# Set variables
RESOURCE_GROUP="myapp-rg"
VMSS_NAME="app-vmss"
MIN_SIZE=2
MAX_SIZE=10
DESIRED_CAPACITY=3
IMAGE="UbuntuLTS"
SIZE="Standard_B2s"

# Create VM Scale Set
az vmss create \
  --resource-group $RESOURCE_GROUP \
  --name $VMSS_NAME \
  --image $IMAGE \
  --vm-sku $SIZE \
  --instance-count $DESIRED_CAPACITY \
  --min-count $MIN_SIZE \
  --max-count $MAX_SIZE \
  --admin-username azureuser \
  --generate-ssh-keys \
  --upgrade-policy-mode Automatic

# Create autoscale settings
az monitor autoscale create \
  --resource-group $RESOURCE_GROUP \
  --resource-name $VMSS_NAME \
  --resource-type "Microsoft.Compute/virtualMachineScaleSets" \
  --min-count $MIN_SIZE \
  --max-count $MAX_SIZE \
  --count $DESIRED_CAPACITY

# Add scale-up rule (CPU > 70%)
az monitor autoscale rule create \
  --resource-group $RESOURCE_GROUP \
  --autoscale-name "autoscale-$VMSS_NAME" \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1

# Add scale-down rule (CPU < 30%)
az monitor autoscale rule create \
  --resource-group $RESOURCE_GROUP \
  --autoscale-name "autoscale-$VMSS_NAME" \
  --condition "Percentage CPU < 30 avg 5m" \
  --scale in 1

echo "✓ Azure VMSS autoscaling configured"
```

### GCP Instance Group Autoscaling

```bash
# Set variables
PROJECT_ID="my-project"
ZONE="us-central1-a"
INSTANCE_GROUP_NAME="app-ig"
MIN_SIZE=2
MAX_SIZE=10
TEMPLATE_NAME="app-template"
TARGET_CPU=70

# Create instance template
gcloud compute instance-templates create $TEMPLATE_NAME \
  --project=$PROJECT_ID \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=100GB \
  --boot-disk-type=pd-ssd

# Create managed instance group
gcloud compute instance-groups managed create $INSTANCE_GROUP_NAME \
  --project=$PROJECT_ID \
  --base-instance-name=app \
  --template=$TEMPLATE_NAME \
  --size=3 \
  --zone=$ZONE

# Set autoscaling policy
gcloud compute instance-groups managed set-autoscaling $INSTANCE_GROUP_NAME \
  --project=$PROJECT_ID \
  --min-num-replicas=$MIN_SIZE \
  --max-num-replicas=$MAX_SIZE \
  --target-cpu-utilization=$((TARGET_CPU / 100)) \
  --zone=$ZONE

echo "✓ GCP autoscaling configured"
echo "Instance Group: $INSTANCE_GROUP_NAME"
```

---

## 4. Performance Optimization

### Linux Kernel Tuning

```bash
#!/bin/bash

# Network optimizations for high-throughput workloads
cat >> /etc/sysctl.conf << EOF

# Increase TCP connection queue lengths
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Increase max file descriptors
fs.file-max = 2097152
fs.nr_open = 2097152

# TCP buffer optimization
net.core.rmem_default = 134217728
net.core.wmem_default = 134217728
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864

# Enable TCP window scaling
net.ipv4.tcp_window_scaling = 1

# Enable IP forward (for NAT, load balancing)
net.ipv4.ip_forward = 1

# Increase UDP queue sizes
net.core.netdev_max_backlog = 65535

# Connection tracking
net.netfilter.nf_conntrack_max = 262144
EOF

sysctl -p

# Disk I/O tuning
cat > /etc/udev/rules.d/99-disk-tuning.rules << EOF
# Set deadline scheduler and increase queue depth for NVMe
ACTION=="add|change", SUBSYSTEM=="block", DEVPATH=="*/nvme*", ATTR{queue/scheduler}="mq-deadline", ATTR{queue/nr_requests}="256"
ACTION=="add|change", SUBSYSTEM=="block", DEVPATH=="*/sd*", ATTR{queue/scheduler}="mq-deadline", ATTR{queue/nr_requests}="256", ATTR{queue/read_ahead_kb}="1024"
EOF

udevadm control --reload-rules && udevadm trigger

# Verify settings
sysctl net.core.somaxconn
cat /sys/block/nvme0n1/queue/nr_requests
cat /sys/block/sda/queue/scheduler

echo "✓ Kernel tuning applied"
```

### Database Performance Tuning

PostgreSQL optimized config:

```bash
# postgresql.conf settings for 32GB server with 8 vCPU

# Memory settings (25% of system RAM)
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 2GB
maintenance_work_mem = 2GB

# Connection settings
max_connections = 400
superuser_reserved_connections = 3

# Parallelization
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8

# WAL tuning
wal_buffers = 16MB
checkpoint_timeout = 30min
checkpoint_completion_target = 0.9
wal_level = replica

# Query planning
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 100

# Logging
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'mod'
log_duration = off
log_min_duration_statement = 1000  # Log queries > 1s

# Apply and reload
systemctl restart postgresql
```

---

## 5. Monitoring & Alerting

### Prometheus Metrics Collection

```yaml
# prometheus.yml - Scrape configuration

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: production
    cluster: us-east-1

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  # Node exporter (OS metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100', 'server1:9100', 'server2:9100']

  # Application metrics
  - job_name: 'application'
    static_configs:
      - targets: ['app1:8080', 'app2:8080', 'app3:8080']
    relabel_configs:
      - source_labels: [__address__]
        regex: '([^:]+)(?::\d+)?'
        target_label: instance

  # Database metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['db1:9187']

  # Docker containers
  - job_name: 'docker'
    unix_sock_opts:
      path: /var/run/docker.sock
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        target_label: container

  # Kubernetes (if using K8s)
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
      - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
```

Alert rules:

```yaml
# /etc/prometheus/rules/alerts.yml

groups:
  - name: compute
    interval: 30s
    rules:
      # CPU alerts
      - alert: HighCPUUtilization
        expr: rate(node_cpu_seconds_total{mode="user"}[5m]) > 0.8
        for: 5m
        annotations:
          summary: "High CPU utilization on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | humanizePercentage }}"

      # Memory alerts
      - alert: LowMemoryAvailable
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
        for: 5m
        annotations:
          summary: "Low available memory on {{ $labels.instance }}"
          description: "Only {{ $value | humanizePercentage }} available"

      # Disk space
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{fstype!~"tmpfs"} / node_filesystem_size_bytes) < 0.1
        for: 5m
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"

      # Network issues
      - alert: HighNetworkErrors
        expr: rate(node_network_receive_errs_total[5m]) > 100
        for: 5m
        annotations:
          summary: "High network errors on {{ $labels.instance }}"

      # Instance down
      - alert: InstanceDown
        expr: up{job="node"} == 0
        for: 1m
        annotations:
          summary: "Instance {{ $labels.instance }} is down"
```

---

## 6. Troubleshooting

### CPU Exhaustion - Diagnosis & Recovery

```bash
#!/bin/bash

# 1. Check overall CPU usage
echo "=== CPU Usage Overview ==="
top -bn1 | head -15

# 2. Identify top CPU consumers
echo -e "\n=== Top 10 CPU Consuming Processes ==="
ps aux --sort=-%cpu | head -11 | tail -10

# 3. Check CPU throttling (container)
echo -e "\n=== CPU Throttling ==="
cat /sys/fs/cgroup/cpuacct/cpuacct.stat
cat /sys/fs/cgroup/cpu,cpuacct/cpu.stat | grep nr_throttled

# 4. Check load average
echo -e "\n=== Load Average ==="
uptime

# 5. Check process-specific CPU
PID=$(pgrep -f "java")
if [ ! -z "$PID" ]; then
  echo -e "\n=== Java Process CPU Details ==="
  cat /proc/$PID/stat | awk '{print "CPU time (ticks):", $14, $15}'
  grep Threads /proc/$PID/status
fi

# Recovery actions
echo -e "\n=== Recovery Actions ==="

# Option 1: Restart service
echo "1. Restarting application:"
systemctl restart myapp

# Option 2: Scale horizontally (if using orchestration)
echo "2. Scale up instances:"
# aws autoscaling set-desired-capacity --auto-scaling-group-name app-asg --desired-capacity 5

# Option 3: Kill specific process (if runaway found)
# kill -9 $PID

echo "✓ CPU troubleshooting complete"
```

### Memory Issues - Diagnosis & Recovery

```bash
#!/bin/bash

# 1. Memory overview
echo "=== Memory Usage ==="
free -h
echo ""

# 2. Check for memory leaks
echo "=== Memory per Process ==="
ps aux --sort=-%mem | head -11

# 3. Check for swapping
echo -e "\n=== Swap Usage ==="
swapon -s
vmstat 1 5 | tail -3

# 4. OOM killer events
echo -e "\n=== OOM Killer Events ==="
dmesg | grep -i "out of memory" | tail -5

# 5. Page cache usage
echo -e "\n=== Memory Details ==="
cat /proc/meminfo | grep -E "^MemTotal|^MemAvailable|^MemFree|^Cached|^Buffers"

# 6. Container memory limits
echo -e "\n=== Container Memory Limits ==="
if [ -f /sys/fs/cgroup/memory/memory.limit_in_bytes ]; then
  echo "Memory limit: $(numfmt --to=iec $(cat /sys/fs/cgroup/memory/memory.limit_in_bytes))"
  echo "Memory usage: $(numfmt --to=iec $(cat /sys/fs/cgroup/memory/memory.usage_in_bytes))"
fi

# Recovery
echo -e "\n=== Recovery Actions ==="

# Option 1: Increase memory
echo "1. Increase instance memory (manual scaling)"

# Option 2: Restart service to clear memory
echo "2. Restarting service to clear memory:"
systemctl restart myapp
sleep 5
free -h

# Option 3: Check for memory leaks
echo "3. Enable verbose garbage collection (Java):"
echo "   Add: -Xlog:gc*:file=gc.log"

echo "✓ Memory troubleshooting complete"
```

### Network Latency Investigation

```bash
#!/bin/bash

# 1. Check basic connectivity
echo "=== Connectivity Check ==="
ping -c 4 8.8.8.8

# 2. Measure latency to target
echo -e "\n=== Latency to Application ==="
for i in {1..10}; do
  curl -o /dev/null -s -w "%{time_total}\n" http://app-server:8080/health
done

# 3. Check network interface status
echo -e "\n=== Network Interface Status ==="
ip link show
ethtool eth0 | grep Speed

# 4. Monitor packet loss
echo -e "\n=== Packet Loss Test ==="
mtr -r -c 100 app-server

# 5. Check network stack
echo -e "\n=== Network Stack Stats ==="
netstat -s | grep -E "total packets|packet loss|retransmitted"

# 6. Check TCP connections
echo -e "\n=== TCP Connection Status ==="
ss -s
echo ""
ss -tan | grep ESTAB | wc -l

# 7. DNS resolution
echo -e "\n=== DNS Resolution ==="
nslookup app-server
dig app-server

# 8. Trace route
echo -e "\n=== Route Trace ==="
traceroute -m 10 app-server

echo "✓ Network troubleshooting complete"
```

---

## 7. Disaster Recovery

### Automated Backup to S3

```bash
#!/bin/bash

# Backup EC2 volumes to S3
INSTANCE_ID="i-1234567890abcdef0"
BACKUP_BUCKET="s3://company-backups/compute"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d-%H:%M:%S)

# Get all volumes for instance
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[].Instances[].BlockDeviceMappings[].Ebs.VolumeId' \
  --output text | while read VOLUME_ID; do
  
  # Create snapshot
  SNAPSHOT_ID=$(aws ec2 create-snapshot \
    --volume-id $VOLUME_ID \
    --description "Backup-$DATE" \
    --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=backup-$INSTANCE_ID-$DATE},{Key=Retention,Value=$RETENTION_DAYS}]" \
    --query 'SnapshotId' \
    --output text)
  
  echo "✓ Snapshot created: $SNAPSHOT_ID for volume $VOLUME_ID"
done

# Clean up old snapshots (older than retention period)
aws ec2 describe-snapshots \
  --owner-ids self \
  --query "Snapshots[?StartTime<='$(date -u -d "$RETENTION_DAYS days ago" +%Y-%m-%dT%H:%M:%S.000Z)'].SnapshotId" \
  --output text | while read SNAP_ID; do
  if [ ! -z "$SNAP_ID" ]; then
    aws ec2 delete-snapshot --snapshot-id $SNAP_ID
    echo "✓ Deleted old snapshot: $SNAP_ID"
  fi
done
```

### Failover Procedure

```bash
#!/bin/bash

# Multi-AZ failover automation

PRIMARY_INSTANCE="i-111111111111111"
STANDBY_INSTANCE="i-222222222222222"
ELB_ID="arn:aws:elasticloadbalancing:us-east-1:123456789:loadbalancer/app/my-app"
ROUTE53_ZONE="Z12345ABCDEF"
HOSTNAME="app.example.com"

# 1. Check primary instance health
echo "=== Checking primary instance health ==="
PRIMARY_STATE=$(aws ec2 describe-instances \
  --instance-ids $PRIMARY_INSTANCE \
  --query 'Reservations[].Instances[].State.Name' \
  --output text)

if [ "$PRIMARY_STATE" == "running" ]; then
  PRIMARY_STATUS_CHECK=$(aws ec2 describe-instance-status \
    --instance-ids $PRIMARY_INSTANCE \
    --query 'InstanceStatuses[0].SystemStatus.Status' \
    --output text)
fi

# 2. If primary is down, initiate failover
if [ "$PRIMARY_STATE" != "running" ] || [ "$PRIMARY_STATUS_CHECK" != "ok" ]; then
  echo "⚠ Primary instance unhealthy. Initiating failover..."
  
  # Start standby instance
  aws ec2 start-instances --instance-ids $STANDBY_INSTANCE
  echo "✓ Started standby instance"
  
  # Wait for instance to be ready
  aws ec2 wait instance-running --instance-ids $STANDBY_INSTANCE
  echo "✓ Standby instance is running"
  
  # Update Route53 DNS
  STANDBY_IP=$(aws ec2 describe-instances \
    --instance-ids $STANDBY_INSTANCE \
    --query 'Reservations[].Instances[].PrivateIpAddress' \
    --output text)
  
  aws route53 change-resource-record-sets \
    --hosted-zone-id $ROUTE53_ZONE \
    --change-batch "{
      \"Changes\": [{
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"$HOSTNAME\",
          \"Type\": \"A\",
          \"TTL\": 300,
          \"ResourceRecords\": [{\"Value\": \"$STANDBY_IP\"}]
        }
      }]
    }"
  
  echo "✓ DNS updated to standby instance ($STANDBY_IP)"
  echo "✓ Failover complete"
else
  echo "✓ Primary instance is healthy"
fi
```

---

## 8. Security Hardening

### Instance Security Scan

```bash
#!/bin/bash

echo "=== Instance Security Audit ==="

# 1. SSH Configuration
echo -e "\n1. SSH Security:"
echo "   - Root login: $(grep -E '^PermitRootLogin' /etc/ssh/sshd_config || echo 'Not explicitly set')"
echo "   - Password auth: $(grep -E '^PasswordAuthentication' /etc/ssh/sshd_config || echo 'Not explicitly set')"
echo "   - X11 forwarding: $(grep -E '^X11Forwarding' /etc/ssh/sshd_config || echo 'Not explicitly set')"

# 2. Firewall Status
echo -e "\n2. Firewall Status:"
systemctl status ufw 2>/dev/null || systemctl status firewalld 2>/dev/null || echo "   Firewall not configured"

# 3. Listening Ports
echo -e "\n3. Listening Ports (should be minimal):"
ss -tuln | grep LISTEN

# 4. User Accounts
echo -e "\n4. User Accounts (non-system):"
awk -F: '$3 >= 1000 {print $1 " - UID:" $3}' /etc/passwd

# 5. Sudo Configuration
echo -e "\n5. Sudo Access:"
echo "   Users in sudo group:"
getent group sudo | cut -d: -f4

# 6. File Permissions
echo -e "\n6. Critical File Permissions:"
ls -la /etc/passwd /etc/shadow /etc/sudoers

# 7. Fail2Ban Status
echo -e "\n7. Fail2Ban Status (if enabled):"
systemctl status fail2ban 2>/dev/null || echo "   Not installed"

# 8. SELinux Status
echo -e "\n8. SELinux Status:"
getenforce 2>/dev/null || echo "   Not enabled"

# 9. AppArmor Status
echo -e "\n9. AppArmor Status:"
aa-status 2>/dev/null || echo "   Not enabled"

# 10. Security Updates
echo -e "\n10. Security Updates Pending:"
apt list --upgradable 2>/dev/null | wc -l

echo -e "\n✓ Security audit complete"
```

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Audience**: DevOps Engineers, System Administrators  
**Contact**: Infrastructure Operations Team
