# Compute Infrastructure: Hands-On Workshop

Practical exercises covering compute infrastructure from VMs to Kubernetes.

---

## Workshop Overview

**Duration**: 6-8 hours (18 hands-on tasks)  
**Prerequisites**: Cloud account (AWS/Azure/GCP), basic Linux knowledge, terminal familiarity  
**Learning Outcomes**: Deploy, scale, monitor, and troubleshoot compute infrastructure

---

## Part 1: Cloud Instance Basics (2 hours)

### Task 1.1: Launch Your First Cloud Instance

**Objective**: Deploy a basic compute instance and verify connectivity

**AWS Path:**

```bash
# 1. Create SSH key pair
aws ec2 create-key-pair \
  --key-name my-workshop-key \
  --query 'KeyMaterial' \
  --output text > my-key.pem
chmod 600 my-key.pem

# 2. Create security group (SSH + HTTP)
SG_ID=$(aws ec2 create-security-group \
  --group-name workshop-sg \
  --description "Workshop security group" \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# 3. Launch instance
INSTANCE=$(aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name my-workshop-key \
  --security-group-ids $SG_ID \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Instance ID: $INSTANCE"

# 4. Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE

# 5. Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "Public IP: $PUBLIC_IP"

# 6. SSH into instance
ssh -i my-key.pem ubuntu@$PUBLIC_IP "echo 'Connected! OS: ' && uname -a"
```

**Expected Output:**
```
Instance ID: i-1234567890abcdef0
Public IP: 203.0.113.45
Connected! OS: Linux ip-10-0-1-234 5.15.0-1234-aws #1234-Ubuntu ...
```

**Verification**: ✓ SSH connection successful

---

### Task 1.2: Configure Instance with Bootstrap Script

**Objective**: Automate instance setup with Docker and monitoring

**AWS Path:**

```bash
# 1. SSH into instance
SSH_CMD="ssh -i my-key.pem ubuntu@$PUBLIC_IP"

# 2. Create bootstrap script on instance
$SSH_CMD << 'SCRIPT'
#!/bin/bash
set -e

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Verify Docker installation
docker --version

# Run simple web server
docker run -d \
  --name nginx \
  -p 80:80 \
  --restart always \
  nginx:latest

echo "✓ Bootstrap complete - Nginx running on port 80"
SCRIPT

# 3. Verify web server is running
curl -s http://$PUBLIC_IP | head -20
```

**Azure Path:**

```bash
# 1. SSH into Azure VM
SSH_CMD="ssh azureuser@$VM_ID"

# 2. Create bootstrap script
$SSH_CMD << 'SCRIPT'
#!/bin/bash
set -e

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add azureuser to docker group
sudo usermod -aG docker azureuser

# Verify Docker installation
docker --version

# Run simple web server
docker run -d \
  --name nginx \
  -p 80:80 \
  --restart always \
  nginx:latest

echo "✓ Bootstrap complete - Nginx running on port 80"
SCRIPT

# 3. Verify web server
curl -s http://$VM_ID | head -20
```

**GCP Path:**

```bash
# 1. SSH into GCP instance
gcloud compute ssh workshop-instance --zone=us-central1-a << 'SCRIPT'
#!/bin/bash
set -e

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker installation
docker --version

# Run simple web server
docker run -d \
  --name nginx \
  -p 80:80 \
  --restart always \
  nginx:latest

echo "✓ Bootstrap complete - Nginx running on port 80"
SCRIPT

# 2. Verify web server
curl -s http://$EXTERNAL_IP | head -20
```

**Expected Output:**
```
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
...
```

**Verification**: ✓ Nginx running and accessible on all clouds

---

### Task 1.3: Monitor Instance Metrics

**Objective**: Set up CloudWatch monitoring and view metrics

**AWS Path:**

```bash
# 1. Enable detailed monitoring
aws ec2 monitor-instances --instance-ids $INSTANCE

# 2. Create custom metric for tracking
aws cloudwatch put-metric-data \
  --namespace Workshop \
  --metric-name InstanceHealth \
  --value 1.0

# 3. Get CPU metrics from CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE \
  --start-time $(date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# 4. Load CPU (generate metrics)
$SSH_CMD "stress-ng --cpu 2 --timeout 2m --metrics" &

# 5. Check metrics again
sleep 30
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE \
  --start-time $(date -u -d "5 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average,Maximum
```

**Azure Path:**

```bash
# 1. Enable monitoring on VM
az vm update \
  --resource-group workshop-rg \
  --name workshop-vm \
  --set tags.monitoring=enabled

# 2. Create metric alert for CPU
az monitor metrics-alert create \
  --resource-group workshop-rg \
  --name cpu-alert-workshop \
  --scopes /subscriptions/{subscription-id}/resourceGroups/workshop-rg/providers/Microsoft.Compute/virtualMachines/workshop-vm \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m

# 3. Get CPU metrics
az monitor metrics list \
  --resource /subscriptions/{subscription-id}/resourceGroups/workshop-rg/providers/Microsoft.Compute/virtualMachines/workshop-vm \
  --metric "Percentage CPU" \
  --interval PT1M \
  --start-time $(date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ)

# 4. Load CPU
az vm run-command invoke \
  --resource-group workshop-rg \
  --name workshop-vm \
  --command-id RunShellScript \
  --scripts "sudo apt-get install -y stress-ng && stress-ng --cpu 2 --timeout 2m"

# 5. Check metrics again
sleep 30
az monitor metrics list \
  --resource /subscriptions/{subscription-id}/resourceGroups/workshop-rg/providers/Microsoft.Compute/virtualMachines/workshop-vm \
  --metric "Percentage CPU" \
  --interval PT1M
```

**GCP Path:**

```bash
# 1. Enable monitoring on instance
gcloud compute instances update workshop-instance \
  --zone=us-central1-a \
  --enable-display-device

# 2. Create uptime check
gcloud monitoring uptime-checks create workshop-check \
  --display-name="Workshop Instance Check" \
  --resource-type="uptime-url" \
  --http-url="http://$EXTERNAL_IP"

# 3. Get CPU metrics
gcloud monitoring metrics-descriptors list \
  --filter="metric.type:compute.googleapis.com/instance/cpu/utilization"

# 4. View recent metrics
gcloud compute instances get-serial-port-output workshop-instance \
  --zone=us-central1-a

# 5. Load CPU
gcloud compute ssh workshop-instance --zone=us-central1-a << 'SCRIPT'
sudo apt-get update && sudo apt-get install -y stress-ng
stress-ng --cpu 2 --timeout 2m
SCRIPT

# 6. Check Cloud Monitoring
echo "View metrics in Cloud Console:"
echo "https://console.cloud.google.com/monitoring/metrics-explorer"
```

**Expected Output:**
```
Datapoints:
  - Timestamp: 2024-01-31T10:05:00Z
    Average: 15.5
    Maximum: 45.3
  - Timestamp: 2024-01-31T10:04:00Z
    Average: 45.8
    Maximum: 89.2
```

**Verification**: ✓ CPU metrics showing in all cloud platforms

---

### Task 1.4: Azure VM Deployment

**Objective**: Create and configure Azure VM with web server

```bash
# 1. Create resource group
az group create \
  --name workshop-rg \
  --location eastus

# 2. Create VM
VM_ID=$(az vm create \
  --resource-group workshop-rg \
  --name workshop-vm \
  --image UbuntuLTS \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --query publicIpAddress \
  --output tsv)

echo "VM IP: $VM_ID"

# 3. Open ports
az vm open-port \
  --resource-group workshop-rg \
  --name workshop-vm \
  --port 80 \
  --priority 1001

az vm open-port \
  --resource-group workshop-rg \
  --name workshop-vm \
  --port 443 \
  --priority 1002

# 4. Install Nginx
az vm run-command invoke \
  --resource-group workshop-rg \
  --name workshop-vm \
  --command-id RunShellScript \
  --scripts "apt-get update && apt-get install -y nginx"

# 5. Verify
curl -s http://$VM_ID | head -5
```

**Expected Output:**
```
<!DOCTYPE html>
<html>
<head>
...
```

**Verification**: ✓ Azure VM running with Nginx

---

### Task 1.5: GCP Compute Engine Instance

**Objective**: Deploy GCP instance and configure firewall

```bash
# 1. Create instance
gcloud compute instances create workshop-instance \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --metadata startup-script='#!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl start nginx'

# 2. Create firewall rule
gcloud compute firewall-rules create allow-http-workshop \
  --allow=tcp:80 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server

# 3. Add tag to instance
gcloud compute instances add-tags workshop-instance \
  --zone=us-central1-a \
  --tags=http-server

# 4. Get external IP
EXTERNAL_IP=$(gcloud compute instances describe workshop-instance \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "GCP Instance IP: $EXTERNAL_IP"

# 5. Verify
curl -s http://$EXTERNAL_IP | head -5
```

**Expected Output:**
```
<!DOCTYPE html>
<html>
...
```

**Verification**: ✓ GCP instance running with Nginx

---

## Part 2: Scaling & Load Balancing (2 hours)

### Task 2.1: Create Auto-Scaling Group

**Objective**: Set up automatic instance scaling based on CPU

```bash
# 1. Create launch template
aws ec2 create-launch-template \
  --launch-template-name workshop-template \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.micro",
    "KeyName": "my-workshop-key",
    "SecurityGroupIds": ["'$SG_ID'"],
    "Monitoring": {"Enabled": true},
    "UserData": "IyEvYmluL2Jhc2gKY3VybCAtZnNTTCBodHRwczovL2dldC5kb2NrZXIuY29tIHwgc2gKdXNlcm1vZCAtYUcgZG9ja2VyIHVidW50dQpkb2NrZXIgcnVuIC1kIC1wIDgwOjgwIC1uYW1lIG5naW54IG5naW54"
  }'

# 2. Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name workshop-asg \
  --launch-template LaunchTemplateName=workshop-template,Version='$Latest' \
  --min-size 2 \
  --max-size 6 \
  --desired-capacity 2 \
  --vpc-zone-identifier "$(aws ec2 describe-subnets \
    --query 'Subnets[0:2].[SubnetId]' \
    --output text | tr '\t' ',')" \
  --health-check-type ELB \
  --health-check-grace-period 300 \
  --tags "Key=Name,Value=workshop-instance,PropagateAtLaunch=true"

echo "✓ Auto-scaling group created"

# 3. Create scaling policy
POLICY_ARN=$(aws autoscaling put-scaling-policy \
  --auto-scaling-group-name workshop-asg \
  --policy-name scale-up \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }' \
  --query 'PolicyARN' \
  --output text)

echo "✓ Scaling policy created: $POLICY_ARN"

# 4. Monitor group
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names workshop-asg \
  --query 'AutoScalingGroups[0].[AutoScalingGroupName,DesiredCapacity,MinSize,MaxSize,Instances]'
```

**Expected Output:**
```
[
  "workshop-asg",
  2,
  2,
  6,
  [
    {
      "InstanceId": "i-1111111111",
      "HealthStatus": "Healthy"
    },
    {
      "InstanceId": "i-2222222222",
      "HealthStatus": "Healthy"
    }
  ]
]
```

**Verification**: ✓ ASG with 2 instances running

---

### Task 2.2: Create Application Load Balancer

**Objective**: Set up load balancing across instances

**AWS Path:**

```bash
# 1. Create load balancer
ALB=$(aws elbv2 create-load-balancer \
  --name workshop-alb \
  --subnets $(aws ec2 describe-subnets \
    --query 'Subnets[0:2].[SubnetId]' \
    --output text) \
  --security-groups $SG_ID \
  --scheme internet-facing \
  --type application \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "Load Balancer DNS: $ALB_DNS"

# 2. Create target group
TG=$(aws elbv2 create-target-group \
  --name workshop-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id $(aws ec2 describe-vpcs \
    --filters Name=isDefault,Values=true \
    --query 'Vpcs[0].VpcId' \
    --output text) \
  --health-check-enabled \
  --health-check-path / \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# 3. Create listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG

# 4. Attach ASG to target group
aws autoscaling attach-load-balancer-target-groups \
  --auto-scaling-group-name workshop-asg \
  --target-group-arns $TG

# 5. Verify
for i in {1..5}; do
  echo "Request $i:"
  curl -s http://$ALB_DNS | grep -E "hostname|Server" | head -1
  sleep 1
done
```

**Azure Path:**

```bash
# 1. Create public IP for load balancer
az network public-ip create \
  --resource-group workshop-rg \
  --name workshop-pip \
  --sku Standard

# 2. Create load balancer
az network lb create \
  --resource-group workshop-rg \
  --name workshop-lb \
  --sku Standard \
  --public-ip-address workshop-pip \
  --frontend-ip-name workshop-frontend \
  --backend-pool-name workshop-backend

# 3. Create health probe
az network lb probe create \
  --resource-group workshop-rg \
  --lb-name workshop-lb \
  --name workshop-probe \
  --protocol http \
  --port 80 \
  --path /

# 4. Create load balancing rule
az network lb rule create \
  --resource-group workshop-rg \
  --lb-name workshop-lb \
  --name workshop-rule \
  --protocol tcp \
  --frontend-port 80 \
  --backend-port 80 \
  --frontend-ip-name workshop-frontend \
  --backend-pool-name workshop-backend \
  --probe-name workshop-probe

# 5. Get load balancer IP
LB_IP=$(az network public-ip show \
  --resource-group workshop-rg \
  --name workshop-pip \
  --query ipAddress \
  --output tsv)

# 6. Verify
for i in {1..5}; do
  echo "Request $i:"
  curl -s http://$LB_IP | grep -E "hostname|Server" | head -1
  sleep 1
done
```

**GCP Path:**

```bash
# 1. Create instance template
gcloud compute instance-templates create workshop-template \
  --machine-type=e2-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud

# 2. Create instance group
gcloud compute instance-groups managed create workshop-ig \
  --template=workshop-template \
  --base-instance-name=workshop \
  --size=2 \
  --zone=us-central1-a

# 3. Create health check
gcloud compute health-checks create http workshop-health \
  --request-path=/ \
  --port=80

# 4. Create backend service
gcloud compute backend-services create workshop-backend \
  --protocol=HTTP \
  --health-checks=workshop-health \
  --global

# 5. Add instance group to backend
gcloud compute backend-services add-backend workshop-backend \
  --instance-group=workshop-ig \
  --instance-group-zone=us-central1-a \
  --global

# 6. Create URL map
gcloud compute url-maps create workshop-map \
  --default-service=workshop-backend

# 7. Create HTTP proxy
gcloud compute target-http-proxies create workshop-proxy \
  --url-map=workshop-map

# 8. Create forwarding rule (load balancer)
gcloud compute forwarding-rules create workshop-lb \
  --global \
  --target-http-proxy=workshop-proxy \
  --address-region=us-central1 \
  --ports=80

# 9. Get load balancer IP
LB_IP=$(gcloud compute forwarding-rules describe workshop-lb \
  --global \
  --format='get(IPAddress)')

# 10. Verify
for i in {1..5}; do
  echo "Request $i:"
  curl -s http://$LB_IP | grep -E "hostname|Server" | head -1
  sleep 1
done
```

**Expected Output:**
```
Request 1:
Server: nginx/1.18.0 (Ubuntu)
Request 2:
Server: nginx/1.18.0 (Ubuntu)
Request 3:
Server: nginx/1.18.0 (Ubuntu)
```

**Verification**: ✓ Load balancer distributing traffic on all clouds

---

### Task 2.3: Trigger Scaling Event

**Objective**: Generate load and observe auto-scaling

**AWS Path:**

```bash
# 1. Start load generation
ab -n 100000 -c 100 http://$ALB_DNS/ > /dev/null 2>&1 &
echo "Load test started (PID: $!)"

# 2. Monitor ASG in real-time
echo "Watching ASG for 10 minutes..."
for i in {1..20}; do
  sleep 30
  COUNT=$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names workshop-asg \
    --query 'AutoScalingGroups[0].DesiredCapacity' \
    --output text)
  CPU=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --start-time $(date -u -d "5 minutes ago" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 60 \
    --statistics Average \
    --query 'Datapoints[0].Average' \
    --output text)
  
  echo "Time: $(date) | Instances: $COUNT | Avg CPU: ${CPU%.*}%"
done

# 3. Wait for scaling down
echo "Waiting for scale-down (300 sec cooldown)..."
sleep 360
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names workshop-asg \
  --query 'AutoScalingGroups[0].[DesiredCapacity,MinSize,MaxSize]'
```

**Azure Path:**

```bash
# 1. Start load generation
az vm run-command invoke \
  --resource-group workshop-rg \
  --name workshop-vmss-0 \
  --command-id RunShellScript \
  --scripts "sudo apt-get install -y apache2-utils" \
  > /dev/null 2>&1

# Get load balancer IP from VMSS
LB_IP=$(az network lb show \
  --resource-group workshop-rg \
  --name workshop-lb \
  --query frontendIpConfigurations[0].publicIpAddress \
  --output tsv)

# 2. Generate load on Azure VMSS
ab -n 100000 -c 100 http://$LB_IP/ > /dev/null 2>&1 &
echo "Load test started on Azure"

# 3. Monitor VMSS scaling
echo "Watching VMSS for scaling..."
for i in {1..20}; do
  sleep 30
  COUNT=$(az vmss list-instances \
    --resource-group workshop-rg \
    --name app-vmss \
    --query "length([])" \
    --output tsv)
  
  CPU=$(az monitor metrics list \
    --resource /subscriptions/{subscription-id}/resourceGroups/workshop-rg/providers/Microsoft.Compute/virtualMachineScaleSets/app-vmss \
    --metric "Percentage CPU" \
    --interval PT1M \
    --query "value[0].timeseries[0].data[-1].average" \
    --output tsv)
  
  echo "Time: $(date) | Instances: $COUNT | Avg CPU: ${CPU%.*}%"
done

# 4. Monitor scale-down
sleep 360
az vmss list-instances \
  --resource-group workshop-rg \
  --name app-vmss \
  --query "length([])"
```

**GCP Path:**

```bash
# 1. Start load generation
gcloud compute ssh workshop-instance --zone=us-central1-a << 'SCRIPT'
sudo apt-get install -y apache2-utils
SCRIPT

# 2. Generate load
ab -n 100000 -c 100 http://$LB_IP/ > /dev/null 2>&1 &
echo "Load test started on GCP"

# 3. Monitor instance group scaling
echo "Watching instance group for scaling..."
for i in {1..20}; do
  sleep 30
  COUNT=$(gcloud compute instance-groups managed list-instances workshop-ig \
    --zone=us-central1-a \
    --query "length([])" \
    --format="value")
  
  echo "Time: $(date) | Instances: $COUNT"
done

# 4. Check final state
gcloud compute instance-groups managed describe workshop-ig \
  --zone=us-central1-a \
  --format="value(currentActions.creating, currentActions.deleting, targetSize)"
```

**Expected Output:**
```
Time: 2024-01-31 10:05:00 | Instances: 2 | Avg CPU: 75%
Time: 2024-01-31 10:05:30 | Instances: 3 | Avg CPU: 72%
Time: 2024-01-31 10:06:00 | Instances: 4 | Avg CPU: 68%
Time: 2024-01-31 10:06:30 | Instances: 5 | Avg CPU: 45%
...
[After cooldown]
Time: 2024-01-31 10:15:00 | Instances: 2 | Avg CPU: 8%
```

**Verification**: ✓ Auto-scaling triggered (2→5 instances), then scaled down on all clouds

---

## Part 3: Container Orchestration (2 hours)

### Task 3.1: Deploy Kubernetes Cluster

**Objective**: Set up managed Kubernetes cluster

**AWS Path (EKS):**

```bash
# 1. Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# 2. Create EKS cluster (10-15 minutes)
eksctl create cluster \
  --name workshop-cluster \
  --region us-east-1 \
  --nodegroup-name workshop-nodes \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed

# 3. Verify cluster
kubectl cluster-info
kubectl get nodes
kubectl get pods -A
```

**Azure Path (AKS):**

```bash
# 1. Create resource group
az group create \
  --name workshop-rg \
  --location eastus

# 2. Create AKS cluster (10-15 minutes)
az aks create \
  --resource-group workshop-rg \
  --name workshop-aks \
  --node-count 2 \
  --vm-set-type VirtualMachineScaleSets \
  --load-balancer-sku standard \
  --enable-managed-identity \
  --network-plugin azure

# 3. Get kubeconfig
az aks get-credentials \
  --resource-group workshop-rg \
  --name workshop-aks

# 4. Verify cluster
kubectl cluster-info
kubectl get nodes
kubectl get pods -A
```

**GCP Path (GKE):**

```bash
# 1. Create GKE cluster (10-15 minutes)
gcloud container clusters create workshop-cluster \
  --zone us-central1-a \
  --num-nodes 2 \
  --machine-type n1-standard-2 \
  --enable-stackdriver-kubernetes \
  --enable-ip-alias \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing

# 2. Get credentials
gcloud container clusters get-credentials workshop-cluster \
  --zone us-central1-a

# 3. Verify cluster
kubectl cluster-info
kubectl get nodes
kubectl get pods -A
```

**Expected Output:**
```
NAME                                    STATUS   ROLES    AGE   VERSION
eks-workshop-nodes-NodeGroup-XXXX-...   Ready    <none>   5m    v1.28.0
eks-workshop-nodes-NodeGroup-YYYY-...   Ready    <none>   5m    v1.28.0

NAMESPACE     NAME                      READY   STATUS
kube-system   coredns-558bd4d5db-...    1/1     Running
kube-system   kube-proxy-xxxxx-...      1/1     Running
kube-system   aws-node-xxxxx-...        1/1     Running
```

**Verification**: ✓ Kubernetes cluster with 2 nodes running on AWS/Azure/GCP

---

### Task 3.2: Deploy Application to Kubernetes

**Objective**: Deploy multi-replica application with service

**All Cloud Paths (Kubernetes YAML is cloud-agnostic):**

```bash
# 1. Create deployment manifest
cat > app-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
EOF

# 2. Deploy on any cloud (AWS/Azure/GCP - kubectl works the same)
kubectl apply -f app-deployment.yaml

# 3. Wait for deployment
kubectl rollout status deployment/nginx-deployment

# 4. Get service details (different output per cloud)
kubectl get svc nginx-service

# AWS: Shows internal ELB DNS
# Azure: Shows internal LB IP/DNS
# GCP: Shows external LB IP

# 5. Test service
# AWS/Azure/GCP all use same pattern
LB_IP=$(kubectl get svc nginx-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
[ -z "$LB_IP" ] && LB_IP=$(kubectl get svc nginx-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s http://$LB_IP | head -5

# 6. Check pod distribution across nodes
kubectl get pods -o wide
kubectl get nodes
```

**Expected Output:**
```
# Deployment status
NAME                                READY   STATUS    RESTARTS   AGE   IP           NODE
nginx-deployment-8559b8c9-xxxxx     1/1     Running   0          2m    10.0.1.100   node-1
nginx-deployment-8559b8c9-yyyyy     1/1     Running   0          2m    10.0.1.101   node-2
nginx-deployment-8559b8c9-zzzzz     1/1     Running   0          2m    10.0.1.102   node-1

# Service (output varies by cloud)
NAME            TYPE           CLUSTER-IP     EXTERNAL-IP                                    PORT(S)
nginx-service   LoadBalancer   10.0.24.30     a1b2c3d4-1234567890.elb.us-east-1.amazonaws.com   80:31234/TCP  # AWS
nginx-service   LoadBalancer   10.0.15.5      40.12.34.56                                    80:31234/TCP  # Azure
nginx-service   LoadBalancer   10.32.0.50     34.56.78.90                                    80:31234/TCP  # GCP
```

**Verification**: ✓ 3 Nginx pods deployed and accessible via LoadBalancer on all clouds

---

### Task 3.3: Scale and Update Application

**Objective**: Perform scaling and rolling update with HPA on all clouds

**All Cloud Paths (HPA works on AWS/Azure/GCP):**

```bash
# 1. Manual scale deployment
kubectl scale deployment nginx-deployment --replicas=5

# Verify scaling
kubectl get deployment nginx-deployment
kubectl get pods

# 2. Setup Horizontal Pod Autoscaler (works on all clouds)
cat > hpa.yaml << 'EOF'
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF

kubectl apply -f hpa.yaml

# 3. Verify metrics server installed (required for HPA)
# AWS: Usually pre-installed in EKS
# Azure: Usually pre-installed in AKS
# GCP: Usually pre-installed in GKE
kubectl get deployment metrics-server -n kube-system

# 4. Generate load (cloud-agnostic)
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh
# Inside pod: while sleep 0.01; do wget -q -O- http://nginx-service; done

# 5. Watch HPA scale (works on all clouds)
kubectl get hpa nginx-hpa --watch

# 6. Update nginx version (rolling update)
kubectl set image deployment/nginx-deployment nginx=nginx:1.21

# 7. Watch rollout progress
kubectl rollout status deployment/nginx-deployment
kubectl rollout history deployment/nginx-deployment

# 8. Verify pods updated
kubectl describe pod nginx-deployment-xxxxx | grep Image

# 9. Rollback if needed
# kubectl rollout undo deployment/nginx-deployment
```

**Expected Output:**
```
# Initial scaling
NAME                      REFERENCE              TARGETS       MINPODS   MAXPODS   REPLICAS   AGE
nginx-hpa                 Deployment/nginx-dep   cpu: 45%/70%  2         10        5          3m

# After load generation (scales up)
nginx-hpa                 Deployment/nginx-dep   cpu: 85%/70%  2         10        8          5m

# Rollout status
Waiting for deployment "nginx-deployment" rollout to finish: 5 of 8 updated replicas are available...
Waiting for deployment "nginx-deployment" rollout to finish: 8 of 8 updated replicas are available...
deployment "nginx-deployment" successfully rolled out
```

**Verification**: ✓ Manual scaling, HPA configured, rolling update completed on AWS/Azure/GCP

---

## Part 4: Performance Tuning (1 hour)

### Task 4.1: Benchmark Instance Performance

**Objective**: Measure instance performance before/after tuning

```bash
# 1. SSH into instance
BENCH_INSTANCE=$INSTANCE

# 2. Install benchmarking tools
$SSH_CMD << 'BENCH'
sudo apt-get update
sudo apt-get install -y sysbench iperf3 fio apache2-utils

# CPU benchmark
echo "=== CPU Benchmark ==="
sysbench cpu --cpu-max-prime=20000 run

# Memory benchmark
echo -e "\n=== Memory Benchmark ==="
sysbench memory --memory-total-size=1G run

# Disk I/O benchmark
echo -e "\n=== Disk I/O Benchmark ==="
fio --name=randread --ioengine=libaio --iodepth=32 --rw=randread --bs=4k --direct=1 --size=1G --numjobs=4 --runtime=60

# Network performance
echo -e "\n=== Network Performance ==="
iperf3 -c 10.0.0.1 -t 10 -P 4

# HTTP benchmark
echo -e "\n=== HTTP Performance ==="
ab -n 10000 -c 100 http://localhost/
BENCH

# 3. Record results for comparison
```

**Expected Output:**
```
=== CPU Benchmark ===
total time: 45.2345s
total number of events: 100

=== Disk I/O Benchmark ===
iops=45000, bw=180MiB/s

=== HTTP Performance ===
Requests per second: 1250.50
```

**Verification**: ✓ Baseline performance captured

---

### Task 4.2: Apply Tuning and Retest

**Objective**: Optimize and measure improvement

```bash
# 1. Apply kernel tuning
$SSH_CMD "sudo bash -c 'cat >> /etc/sysctl.conf << EOF
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
fs.file-max = 2097152
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
EOF
sysctl -p'"

# 2. Rerun benchmarks
$SSH_CMD << 'BENCH2'
# CPU benchmark after tuning
sysbench cpu --cpu-max-prime=20000 run

# Disk I/O after tuning
fio --name=randread --ioengine=libaio --iodepth=64 --rw=randread --bs=4k --direct=1 --size=1G --numjobs=8 --runtime=60

# HTTP benchmark after tuning
ab -n 10000 -c 150 http://localhost/
BENCH2

# 3. Compare results
echo "Performance improvement summary:"
```

**Expected Outcome**:
```
Before: 1250 RPS
After:  1850 RPS (+48% improvement)
```

**Verification**: ✓ Performance improved 20-50%

---

## Part 5: Monitoring & Troubleshooting (1 hour)

### Task 5.1: Set Up Monitoring Dashboard

**Objective**: Create monitoring dashboard for key metrics

**AWS Path (CloudWatch):**

```bash
# 1. Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name WorkshopDashboard \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/EC2", "CPUUtilization", {"stat": "Average"}],
            ["AWS/EC2", "NetworkIn", {"stat": "Sum"}],
            ["AWS/EC2", "NetworkOut", {"stat": "Sum"}],
            ["AWS/ApplicationELB", "TargetResponseTime"],
            ["AWS/ApplicationELB", "RequestCount"]
          ],
          "period": 300,
          "stat": "Average",
          "region": "us-east-1",
          "title": "Application Performance"
        }
      }
    ]
  }'

# 2. Create alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name HighCPU \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# 3. View dashboard
echo "Dashboard: https://console.aws.amazon.com/cloudwatch/home#dashboards:"
```

**Azure Path (Azure Monitor):**

```bash
# 1. Create action group for alerts
az monitor action-group create \
  --name workshop-action-group \
  --resource-group workshop-rg

# 2. Create metric alert
az monitor metrics-alert create \
  --name HighCPU-Alert \
  --description "Alert when CPU > 80%" \
  --resource-group workshop-rg \
  --scopes /subscriptions/{subscription-id}/resourceGroups/workshop-rg/providers/Microsoft.Compute/virtualMachines/workshop-vm \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action workshop-action-group

# 3. Create diagnostic settings
az monitor diagnostic-settings create \
  --name workshop-diagnostics \
  --resource /subscriptions/{subscription-id}/resourceGroups/workshop-rg/providers/Microsoft.Compute/virtualMachines/workshop-vm \
  --logs '[{"category": "Administrative", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]' \
  --workspace /subscriptions/{subscription-id}/resourcegroups/workshop-rg/providers/microsoft.operationalinsights/workspaces/workshop-log-analytics

# 4. View metrics
az monitor metrics list \
  --resource /subscriptions/{subscription-id}/resourceGroups/workshop-rg/providers/Microsoft.Compute/virtualMachines/workshop-vm \
  --metric "Percentage CPU" \
  --interval PT5M
```

**GCP Path (Cloud Monitoring):**

```bash
# 1. Create uptime check
gcloud monitoring uptime-checks create workshop-uptime \
  --resource-type uptime-url \
  --monitored-resource-labels=host=workshop-lb-ip

# 2. Create metric alert
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name "High CPU Alert" \
  --condition-display-name "CPU > 80%" \
  --condition-threshold-value=80 \
  --condition-threshold-duration=300s

# 3. View dashboards
gcloud monitoring dashboards list

# 4. Create dashboard (JSON)
gcloud monitoring dashboards create \
  --config='{
    "displayName": "Workshop Dashboard",
    "gridLayout": {
      "widgets": [
        {
          "title": "Compute Engine CPU",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\""
                  }
                }
              }
            ]
          }
        }
      ]
    }
  }'
```

**Expected Output:**
```
# AWS: Dashboard URL shown
Dashboard: https://console.aws.amazon.com/cloudwatch/home#dashboards:

# Azure: Alert rules created
HighCPU-Alert       Enabled    Average CPU > 80%    PT5M

# GCP: Metrics retrieved
RESOURCE_TYPE          METRIC
gce_instance           compute.googleapis.com/instance/cpu/utilization
```

**Verification**: ✓ Monitoring dashboard created on AWS/Azure/GCP

---

### Task 5.2: Troubleshoot Performance Issues

**Objective**: Diagnose and resolve performance problem on all clouds

**AWS Path:**

```bash
# 1. Simulate performance issue
$SSH_CMD "stress-ng --cpu 4 --io 2 --vm 1 --vm-bytes 256M --timeout 5m &" &

# 2. Diagnose CPU issue from local machine
sleep 10
$SSH_CMD << 'DIAGNOSE'
echo "=== CPU Consumers ==="
top -bn1 | head -20

echo -e "\n=== Memory Usage ==="
free -h

echo -e "\n=== Disk I/O ==="
iostat -x 1 3

echo -e "\n=== Load Average ==="
uptime

echo -e "\n=== Process Limits ==="
ulimit -a
DIAGNOSE

# 3. Also check from AWS Console
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --start-time $(date -u -d "10 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average,Maximum
```

**Azure Path:**

```bash
# 1. Simulate performance issue
az vm run-command invoke \
  --resource-group workshop-rg \
  --name workshop-vm \
  --command-id RunShellScript \
  --scripts "stress-ng --cpu 4 --io 2 --vm 1 --vm-bytes 256M --timeout 5m &"

# 2. Diagnose using Azure Portal or CLI
# Get VM diagnostics
az vm diagnostics get-default-config

# Run diagnostic commands directly
az vm run-command invoke \
  --resource-group workshop-rg \
  --name workshop-vm \
  --command-id RunShellScript \
  --scripts '
echo "=== CPU Consumers ==="
top -bn1 | head -20

echo -e "\n=== Memory Usage ==="
free -h

echo -e "\n=== Azure Diagnostics ==="
systemctl status waagent

echo -e "\n=== Disk Space ==="
df -h
'

# 3. Check Azure Monitor metrics
az monitor metrics list \
  --resource /subscriptions/{subscription-id}/resourceGroups/workshop-rg/providers/Microsoft.Compute/virtualMachines/workshop-vm \
  --metric "Percentage CPU" \
  --start-time $(date -u -d "10 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --interval PT1M
```

**GCP Path:**

```bash
# 1. Simulate performance issue
gcloud compute ssh workshop-instance --zone=us-central1-a << 'STRESS'
stress-ng --cpu 4 --io 2 --vm 1 --vm-bytes 256M --timeout 5m &
STRESS

# 2. Diagnose via SSH
gcloud compute ssh workshop-instance --zone=us-central1-a << 'DIAGNOSE'
echo "=== CPU Consumers ==="
top -bn1 | head -20

echo -e "\n=== Memory Usage ==="
free -h

echo -e "\n=== Disk I/O ==="
iostat -x 1 3

echo -e "\n=== GCP Guest Agent Status ==="
systemctl status google-guest-agent

echo -e "\n=== System Logs ==="
journalctl -n 20
DIAGNOSE

# 3. Check Cloud Monitoring metrics
gcloud monitoring time-series list \
  --filter='resource.type="gce_instance" AND metric.type="compute.googleapis.com/instance/cpu/utilization"' \
  --interval-start-time=$(date -u -d "10 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%S)
```

**Expected Output:**
```
# AWS CloudWatch metrics
2024-01-31T09:50:00Z    CPUUtilization    Average    85.2%    Maximum    92.1%
2024-01-31T09:51:00Z    CPUUtilization    Average    88.7%    Maximum    95.3%

# Top processes (all clouds similar)
PID   USER   PR   NI    VIRT    RES  S %CPU %MEM    TIME+  COMMAND
1234  root   20   0  1234567  512M  R  450%  12.8%   2:15  stress-ng

# Memory status
Mem: 3.8Gi total, 2.1Gi used, 1.7Gi free
```

**Verification**: ✓ Performance issue reproduced, root cause identified on AWS/Azure/GCP

---

## Part 6: Cleanup & Cost Analysis (30 minutes)

### Task 6.1: Resource Cleanup

**Objective**: Properly decommission workshop resources on all clouds

**AWS Path:**

```bash
# 1. Delete EKS cluster
eksctl delete cluster --name workshop-cluster --wait

# 2. Delete load balancer
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?LoadBalancerName==`workshop-alb`].LoadBalancerArn' \
  --output text)

aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN

# 3. Delete target group
TG_ARN=$(aws elbv2 describe-target-groups \
  --query 'TargetGroups[?TargetGroupName==`workshop-tg`].TargetGroupArn' \
  --output text)

aws elbv2 delete-target-group --target-group-arn $TG_ARN

# 4. Delete auto-scaling group
aws autoscaling delete-auto-scaling-group \
  --auto-scaling-group-name workshop-asg \
  --force-delete

# 5. Delete launch template
aws ec2 delete-launch-template --launch-template-name workshop-template

# 6. Terminate remaining instances
aws ec2 terminate-instances --instance-ids $INSTANCE

# 7. Delete security group (wait for instances first)
sleep 60
aws ec2 delete-security-group --group-id $SG_ID

# 8. Delete key pair
aws ec2 delete-key-pair --key-name my-workshop-key
```

**Azure Path:**

```bash
# 1. Delete AKS cluster
az aks delete \
  --resource-group workshop-rg \
  --name workshop-aks \
  --yes

# 2. Delete entire resource group (includes VMs, LB, networking)
az group delete \
  --name workshop-rg \
  --yes

# Note: This also deletes associated storage, NICs, and public IPs
```

**GCP Path:**

```bash
# 1. Delete GKE cluster
gcloud container clusters delete workshop-cluster \
  --zone us-central1-a

# 2. Delete compute instances
gcloud compute instances delete workshop-instance \
  --zone=us-central1-a

# 3. Delete instance groups
gcloud compute instance-groups managed delete workshop-ig \
  --zone=us-central1-a

# 4. Delete load balancer resources
gcloud compute forwarding-rules delete workshop-forwarding-rule
gcloud compute target-http-proxies delete workshop-http-proxy
gcloud compute url-maps delete workshop-url-map
gcloud compute backend-services delete workshop-backend

# 5. Delete firewall rules
gcloud compute firewall-rules delete workshop-allow-http \
  workshop-allow-ssh

# 6. Delete networks
gcloud compute networks delete workshop-network
```

**Expected Output:**
```
# AWS: Resources deleted
Delete command successful
EKS cluster deleted
Security group deleted

# Azure: Resource group deletion status
100% Complete. Remove resource group succeeded.

# GCP: Deletion confirmation
Deleted [gce_instance/workshop-instance].
Deleted [gke/workshop-cluster].
```

**Verification**: ✓ All resources cleaned up on AWS/Azure/GCP, no ongoing charges

---

### Task 6.2: Cost Analysis

**Objective**: Calculate and analyze workshop costs across clouds

**AWS Path (Cost Explorer):**

```bash
# 1. Get daily cost breakdown
aws ce get-cost-and-usage \
  --time-period Start=2024-01-31,End=2024-02-01 \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[].Groups[].[Keys[0],Metrics.UnblendedCost.Amount]' \
  --output table

# 2. Get instance costs by type
aws ce get-cost-and-usage \
  --time-period Start=2024-01-31,End=2024-02-01 \
  --granularity DAILY \
  --metrics UnblendedCost \
  --filter file://filter.json \
  --query 'ResultsByTime[].Total.UnblendedCost'

# 3. Calculate workshop total
cat > cost_summary.txt << 'EOF'
=== AWS Workshop Cost Breakdown ===
EC2 instances (t3.micro × 4 hours):    $0.50
ELB/ALB (1 hour):                       $0.23
EKS Cluster (1 hour):                   $0.19
Data Transfer (10GB out):               $0.90
CloudWatch (logs & metrics):            $0.10
─────────────────────────────────────
AWS Total:                              $1.92
EOF

cat cost_summary.txt
```

**Azure Path (Cost Analysis):**

```bash
# 1. Get usage details
az consumption usage list \
  --start-date 2024-01-31 \
  --end-date 2024-02-01 \
  --query "value[].{Service:meterDetails.meterName, Usage:quantity, Cost:pretaxCost}" \
  --output table

# 2. Get budgets and spending
az consumption budget list \
  --query "[].{Name:name, Amount:amount, Status:currentSpend.amount}"

# 3. Calculate workshop total
cat > cost_summary.txt << 'EOF'
=== Azure Workshop Cost Breakdown ===
Virtual Machines (B2s × 2 hours):       $0.45
Load Balancer:                          $0.18
AKS Cluster (1 hour):                   $0.22
Public IPs (2):                         $0.09
Storage (5GB):                          $0.08
─────────────────────────────────────
Azure Total:                            $1.02
EOF

cat cost_summary.txt
```

**GCP Path (Cost Analysis):**

```bash
# 1. Get billed project report
gcloud billing projects list --billing-account=BILLING_ACCOUNT_ID

# 2. Get export to BigQuery (requires setup)
# bq query --use_legacy_sql=false '
#   SELECT
#     service.description,
#     SUM(cost) as total_cost,
#     CURRENT_DATE() as report_date
#   FROM `project.dataset.gcp_billing_export_v1_*`
#   WHERE DATE(_TABLE_SUFFIX) = "2024-01-31"
#   GROUP BY service.description
#   ORDER BY total_cost DESC'

# 3. Estimate from pricing calculator
cat > cost_summary.txt << 'EOF'
=== GCP Workshop Cost Breakdown ===
Compute Engine (n1-standard-2 × 2 hrs): $0.55
GKE Cluster (1 hour):                   $0.26
Load Balancer (1 hour):                 $0.20
Cloud Monitoring (custom metrics):      $0.05
Network egress (10GB):                  $0.80
─────────────────────────────────────
GCP Total:                              $1.86
EOF

cat cost_summary.txt
```

**Multi-Cloud Cost Comparison:**

```bash
# Compare all three platforms
cat > cost_comparison.txt << 'EOF'
╔════════════════════════════════════════════════════════╗
║         Workshop Cost Comparison (per hour)            ║
╠═══════════════════╦═════════════╦═════════════╦════════╣
║    Service        ║ AWS         ║ Azure       ║ GCP    ║
╠═══════════════════╬═════════════╬═════════════╬════════╣
║ Compute (2 inst)  │ $0.50       │ $0.45       │ $0.55  ║
║ Load Balancer     │ $0.23       │ $0.18       │ $0.20  ║
║ Kubernetes        │ $0.19       │ $0.22       │ $0.26  ║
║ Data Transfer     │ $0.90       │ $0.08       │ $0.80  ║
║ Monitoring        │ $0.10       │ $0.09       │ $0.05  ║
╠═══════════════════╬═════════════╬═════════════╬════════╣
║ **TOTAL/HOUR**    │ **$1.92**   │ **$1.02**   │ **$1.86** ║
║ **FOR 6 HOURS**   │ **$11.52**  │ **$6.12**   │ **$11.16** ║
╚═══════════════════╩═════════════╩═════════════╩════════╝

Key Findings:
• Azure cheapest for compute (network charges lower)
• AWS highest data transfer costs ($0.90/GB vs $0.08-0.80)
• GCP competitive for K8s, best for monitoring
• All provide free tier/credits for initial experiments

Cost Optimization Tips (All Clouds):
1. Use Reserved Instances/Commitments (30-70% savings)
2. Use Spot/Preemptible instances (50-80% savings)
3. Auto-shutdown dev/test resources (40% reduction)
4. Use managed services (reduce ops overhead)
5. Right-size instances (avoid over-provisioning)
6. Monitor with budget alerts (prevent surprises)
EOF

cat cost_comparison.txt
```

**Expected Output:**
```
=== AWS Workshop Cost Breakdown ===
EC2 instances (t3.micro × 4 hours):    $0.50
ELB/ALB (1 hour):                       $0.23
EKS Cluster (1 hour):                   $0.19
Data Transfer (10GB out):               $0.90
CloudWatch (logs & metrics):            $0.10
─────────────────────────────────────
AWS Total:                              $1.92

[Similar output for Azure and GCP, with comparison table]
```

**Verification**: ✓ Cost breakdown calculated for AWS/Azure/GCP, comparison completed

**Expected Output**:
```
Workshop cost summary:
- EC2: $0.50
- Load Balancer: $0.23
- EKS: $0.19
- Data Transfer: $0.90
Total: $1.82

Potential monthly savings if optimized:
- Reserved Instances: $650/month → $450/month (31% savings)
- Spot Instances (dev): $200/month → $40/month (80% savings)
```

**Verification**: ✓ Cost analysis completed

---

## Workshop Validation Checklist

```
Part 1: Cloud Instance Basics
☐ Launched EC2 instance and connected via SSH
☐ Configured instance with Docker and Nginx
☐ Set up CloudWatch monitoring and viewed metrics
☐ Deployed Azure VM and installed web server
☐ Created GCP instance with firewall rules

Part 2: Scaling & Load Balancing
☐ Created Auto-Scaling Group with 2-6 instances
☐ Deployed Application Load Balancer
☐ Triggered scaling event with load test
☐ Observed instances scale up then down

Part 3: Container Orchestration
☐ Deployed Kubernetes cluster (EKS/AKS/GKE)
☐ Deployed 3-replica Nginx application
☐ Scaled deployment and set up HPA
☐ Performed rolling update

Part 4: Performance Tuning
☐ Ran baseline benchmarks (CPU, memory, disk, network)
☐ Applied kernel tuning
☐ Measured 20-50% performance improvement

Part 5: Monitoring & Troubleshooting
☐ Created CloudWatch dashboard
☐ Set up performance alerts
☐ Diagnosed performance issue
☐ Documented troubleshooting steps

Part 6: Cleanup & Cost Analysis
☐ Deleted all workshop resources
☐ Verified no lingering charges
☐ Documented cost analysis and savings opportunities

Overall: All 18 tasks completed
```

**Estimated Completion Time**: 6-8 hours  
**Estimated Cost**: $2-5 (depending on region and resource utilization)

---

**Workshop Complete!**

You now have hands-on experience with:
- Cloud instance deployment across AWS, Azure, GCP
- Auto-scaling and load balancing
- Kubernetes container orchestration
- Performance monitoring and tuning
- Cost analysis and optimization

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Contact**: DevOps Training Team
