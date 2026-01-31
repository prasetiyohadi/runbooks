# FinOps: Hands-On Workshop

Practical exercises for implementing and optimizing cloud costs across AWS, Azure, and GCP.

---

## Workshop Overview

**Duration**: 8-10 hours (18 hands-on tasks)  
**Prerequisites**: Cloud accounts (AWS/Azure/GCP), basic CLI knowledge, cost data access  
**Learning Outcomes**: Master FinOps implementation, cost optimization, and governance

---

## Part 1: Cost Visibility Foundation (2 hours)

### Task 1.1: Set Up Cost Tagging

**Objective**: Implement mandatory tagging across cloud resources

**AWS Path:**

```bash
# 1. Create tagging policy
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws organizations put-policy \
  --content '{
    "tags": {
      "Environment": {
        "tag_key": {"@@assign": "Environment"},
        "enforced_for": {"@@assign": ["ec2:*", "rds:*"]}
      },
      "CostCenter": {
        "tag_key": {"@@assign": "CostCenter"},
        "enforced_for": {"@@assign": ["ec2:*", "s3:*"]}
      },
      "Owner": {
        "tag_key": {"@@assign": "Owner"},
        "enforced_for": {"@@assign": ["ec2:*"]}
      }
    }
  }' \
  --type TAG_POLICY

# 2. Attach to organization
aws organizations attach-policy \
  --policy-id p-xxxxxxxxxx \
  --target-id ou-xxxx-yyyyyyyy

# 3. Tag existing resources
aws ec2 create-tags \
  --resources i-1234567890abcdef0 \
  --tags Key=Environment,Value=production \
          Key=CostCenter,Value=cc-001 \
          Key=Owner,Value=platform-team@company.com

# 4. Verify tagging compliance
aws ec2 describe-instances \
  --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Environment`].Value|[0]]'

# 5. Enable Cost Allocation Tags
aws ce create-cost-category-definition \
  --name "Environment-Category" \
  --rules '[{
    "Rule": {"Rule": "tag:Environment LIKE %"},
    "Value": "tag:Environment"
  }]'
```

**Azure Path:**

```bash
# 1. Create tagging policy
az policy definition create \
  --name "enforce-mandatory-tags" \
  --mode All \
  --rules '{
    "if": {
      "allOf": [
        {"field": "tags[Environment]", "exists": "false"},
        {"field": "tags[CostCenter]", "exists": "false"},
        {"field": "tags[Owner]", "exists": "false"}
      ]
    },
    "then": {"effect": "deny"}
  }'

# 2. Assign policy to resource group
az policy assignment create \
  --policy enforce-mandatory-tags \
  --scope "/subscriptions/{subscription-id}/resourcegroups/production-rg"

# 3. Tag existing resources
az resource tag \
  --resource-group production-rg \
  --tags Environment=production CostCenter=cc-001 Owner=platform-team@company.com

# 4. Verify tagging
az resource list \
  --resource-group production-rg \
  --query "[].{Name:name, Tags:tags}"

# 5. Export tags for cost allocation
az cost-management export create \
  --name "CostAllocationExport" \
  --scope "/subscriptions/{subscription-id}" \
  --schedule-period "Daily"
```

**GCP Path:**

```bash
# 1. Create labels (GCP equivalent to tags)
gcloud compute instances create workshop-vm \
  --zone=us-central1-a \
  --machine-type=n1-standard-1 \
  --labels=environment=production,cost-center=cc-001,owner=platform-team

# 2. Update labels on existing resources
gcloud compute instances update workshop-vm \
  --zone=us-central1-a \
  --update-labels=environment=production,cost-center=cc-001

# 3. Verify labels
gcloud compute instances describe workshop-vm \
  --zone=us-central1-a \
  --format="value(labels)"

# 4. Create org policy for labels
gcloud resource-manager org-policies create \
  --project=PROJECT_ID \
  --label-requirement="environment:required,cost-center:required"

# 5. Export labels to BigQuery
bq mk --dataset finops_labels

gcloud beta billing budgets create \
  --display-name="Budget-by-Label" \
  --budget-amount=5000 \
  --filter-labels=environment:production
```

**Expected Output:**
```
# Tagging verification
InstanceId              Environment
i-1234567890abcdef0    production
i-0987654321fedcba0    staging

# Tags applied to resources (all clouds)
Environment: production
CostCenter: cc-001
Owner: platform-team@company.com
```

**Verification**: ✓ Tagging policy enforced on AWS/Azure/GCP

---

### Task 1.2: Create Cost Dashboard

**Objective**: Build real-time cost monitoring dashboard

**AWS Path:**

```bash
# 1. Create CloudWatch dashboard
DASHBOARD_BODY='{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Billing", "EstimatedCharges", {"stat": "Average"}]
        ],
        "period": 86400,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Daily Estimated Charges"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "fields @timestamp, @message | stats sum(cost) by service",
        "region": "us-east-1",
        "title": "Cost by Service"
      }
    }
  ]
}'

aws cloudwatch put-dashboard \
  --dashboard-name FinOps-Dashboard \
  --dashboard-body "$DASHBOARD_BODY"

# 2. Query cost data
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output json > costs.json

# 3. Visualize in QuickSight (manual via console or SDK)
cat costs.json | python3 << 'PYTHON'
import json, sys
data = json.load(sys.stdin)
for item in data['ResultsByTime']:
    for group in item['Groups']:
        print(f"{group['Keys'][0]}: ${group['Metrics']['UnblendedCost']['Amount']}")
PYTHON

# 4. Set up email alerts
aws sns create-topic --name FinOps-Alerts

aws budgets create-budget \
  --account-id $ACCOUNT_ID \
  --budget BudgetName=Monthly-Budget,BudgetLimit={Amount=10000,Unit=USD},TimeUnit=MONTHLY,BudgetType=COST \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "FORECASTED",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 75,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "finops@company.com"}]
  }]'

# 5. View dashboard
echo "Dashboard: https://console.aws.amazon.com/cloudwatch/home#dashboards:"
```

**Azure Path:**

```bash
# 1. Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group finops-rg \
  --workspace-name finops-workspace

# 2. Export costs to Log Analytics
az costmanagement export create \
  --name "DailyCostAnalysis" \
  --scope "/subscriptions/{subscription-id}" \
  --definition-type "Usage" \
  --schedule-period "Daily" \
  --schedule-status "Active" \
  --destination resource-id="/subscriptions/{subscription-id}/resourcegroups/finops-rg/providers/microsoft.operationalinsights/workspaces/finops-workspace"

# 3. Create alerts
az monitor metrics alert create \
  --name "HighSpendAlert" \
  --resource-group finops-rg \
  --scopes "/subscriptions/{subscription-id}" \
  --condition "total SpendingAmount > 9000" \
  --description "Alert when spending exceeds 90% of budget"

# 4. Create Power BI dashboard (connect Log Analytics)
# Manual: Power BI Desktop → Connect to Log Analytics workspace

# 5. View costs
az consumption usage list \
  --query "value[*].[meterName,quantity,pretaxCost]" \
  --output table
```

**GCP Path:**

```bash
# 1. Create BigQuery dataset
bq mk --dataset \
  --description="FinOps cost analysis" \
  --location=US \
  finops_analysis

# 2. Export billing to BigQuery
gcloud billing accounts list  # Get BILLING_ACCOUNT_ID

bq mk --dataset finops_export

# 3. Query costs
bq query --use_legacy_sql=false '
SELECT
  DATE(TIMESTAMP_MICROS(usage_start_time)) as date,
  service.description,
  SUM(cost) as total_cost
FROM `project.dataset.gcp_billing_export_v1_*`
WHERE DATE(_TABLE_SUFFIX) BETWEEN DATE("2025-01-01") AND DATE("2025-01-31")
GROUP BY date, service
ORDER BY date DESC, total_cost DESC'

# 4. Create Data Studio dashboard
# Manual: Data Studio → New Report → BigQuery source

# 5. Set up budget alerts
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Monthly-Spend-Alert" \
  --budget-amount=10000 \
  --threshold-rule percent=75 \
  --threshold-rule percent=100
```

**Expected Output:**
```
Dashboard created successfully
Cost breakdown by service:
  EC2: $1,234.56 (35%)
  S3: $567.89 (16%)
  RDS: $456.78 (13%)
  Other: $1,240.77 (36%)

Budget status: $2,500/$10,000 (25%)
```

**Verification**: ✓ Dashboard active and monitoring costs on all clouds

---

### Task 1.3: Audit Existing Resources

**Objective**: Identify resource usage and cost allocation

**AWS Path:**

```bash
# 1. List all running instances
aws ec2 describe-instances \
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,LaunchTime,Tags[?Key==`Owner`].Value|[0]]' \
  --output table

# 2. Find stopped instances (potential cleanup)
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=stopped" \
  --query 'Reservations[*].Instances[*].[InstanceId,StateTransitionReason,Tags[?Key==`Environment`].Value|[0]]' \
  --output table > stopped_instances.txt

# 3. List unattached volumes
aws ec2 describe-volumes \
  --filters "Name=status,Values=available" \
  --query 'Volumes[*].[VolumeId,Size,CreateTime]' \
  --output table

# 4. Find unused Elastic IPs
aws ec2 describe-addresses \
  --filters "Name=association-id,Values=none" \
  --query 'Addresses[*].[PublicIp,AllocationId]' \
  --output table

# 5. Analyze cost allocation
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=TAG,Key=Owner \
  --output table
```

**Azure Path:**

```bash
# 1. List all VMs
az vm list --output table

# 2. Find deallocated VMs
az vm list \
  --query "[?powerState=='VM deallocated'].{Name:name, ResourceGroup:resourceGroup}" \
  --output table

# 3. Find unattached disks
az disk list \
  --query "[?managedBy==null].{Name:name, SizeGb:diskSizeGb, ResourceGroup:resourceGroup}" \
  --output table

# 4. Check resource group utilization
az group show \
  --name production-rg \
  --query "{Name:name, Location:location, Tags:tags}"

# 5. Cost by tag
az costmanagement query start \
  --scope "/subscriptions/{subscription-id}" \
  --timeframe MonthToDate \
  --type Usage \
  --dataset granularity=Daily grouping='[{"type":"Dimension","name":"Tags"}]'
```

**GCP Path:**

```bash
# 1. List all instances
gcloud compute instances list \
  --format="table(NAME,ZONE,MACHINE_TYPE,STATUS,INTERNAL_IP)"

# 2. Find stopped instances
gcloud compute instances list \
  --filter="status:TERMINATED" \
  --format="table(NAME,ZONE,CREATION_TIME)"

# 3. Find unattached disks
gcloud compute disks list \
  --filter="users:[]" \
  --format="table(NAME,ZONE,SIZE_GB,TYPE)"

# 4. Analyze instance usage (CPU utilization)
for instance in $(gcloud compute instances list --format="value(NAME)"); do
  gcloud monitoring time-series list \
    --filter="resource.type=gce_instance AND resource.labels.instance_id=$instance" \
    --interval-start-time=$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
    --format="table(metric.type,points[0].value.double_value)"
done
```

**Expected Output:**
```
Instance Audit Results:
Running Instances: 15
  - Production: 10
  - Staging: 3
  - Development: 2

Stopped Instances: 5 (potential cleanup targets)
Unattached Volumes: 3 (costing ~$15/month)
Unused EIPs: 2 (costing ~$7/month)

Cost by Owner:
  Platform-Team: $3,456
  Data-Team: $2,123
  Untagged: $567 (needs allocation)
```

**Verification**: ✓ Resource audit complete, baseline costs identified

---

## Part 2: Optimization Implementation (3 hours)

### Task 2.1: Implement Reserved Instances

**Objective**: Purchase and deploy Reserved/Committed Capacity

**All Clouds Path:**

```bash
# AWS: Get RI recommendations
aws ce get-reservation-purchase-recommendation \
  --service "EC2" \
  --lookback-period THIRTY_DAYS \
  --term-in-years 3 \
  --payment-option ALL_UPFRONT \
  --output json

# Azure: Get RI recommendations
az reservations recommendations list \
  --resource-group production-rg \
  --query "[0:5]"

# GCP: List commitment options
gcloud compute commitments list --project=PROJECT_ID

# Calculate target: 50-70% of compute spend on commitments
CURRENT_MONTHLY=$(aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --metrics UnblendedCost \
  --filter='{"Dimensions":{"Key":"SERVICE","Values":["Amazon EC2"]}}' \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' --output text)

TARGET_RI=$(($(echo "$CURRENT_MONTHLY * 12 * 0.6" | bc) | cut -d. -f1))

echo "Monthly EC2 spend: $CURRENT_MONTHLY"
echo "Annual RI target: $TARGET_RI (60% coverage)"
```

### Task 2.2: Right-Size Overprovisioned Instances

**Objective**: Identify and resize instances to match actual workload needs

```bash
# AWS: Get underutilized instances
aws compute-optimizer get-ec2-instance-recommendations \
  --query 'instanceRecommendations[?recommendation==`Underutilized`].[instanceArn,currentInstanceType,recommendationOptions[0].instanceType,recommendationOptions[0].savingsOpportunity.estimatedMonthlySavings.value]' \
  --output table

# Get CPU/memory metrics
for instance in i-1234567890abcdef0 i-0987654321fedcba0; do
  aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --dimensions Name=InstanceId,Value=$instance \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 3600 \
    --statistics Average,Maximum \
    --query 'Datapoints[*].[Average,Maximum]'
done

# Resize candidate instance
INSTANCE_ID="i-1234567890abcdef0"

# Stop instance
aws ec2 stop-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID

# Modify instance type
aws ec2 modify-instance-attribute \
  --instance-id $INSTANCE_ID \
  --instance-type "{\"Value\": \"t3.medium\"}"

# Start instance
aws ec2 start-instances --instance-ids $INSTANCE_ID

# Verify resize
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].InstanceType'

echo "Estimated savings: $500-1000/month"
```

### Task 2.3: Implement Spot/Preemptible Instances

**Objective**: Deploy non-critical workloads on Spot/Preemptible instances

**AWS Path:**

```bash
# Create launch template for Spot
aws ec2 create-launch-template \
  --launch-template-name spot-template \
  --version-description "Spot instance template" \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.medium",
    "KeyName": "my-key-pair",
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "SpotInstance", "Value": "true"}]
    }]
  }'

# Create auto-scaling group with Spot
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name spot-asg \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 5 \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateName": "spot-template",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "t3.medium", "WeightedCapacity": "1"},
        {"InstanceType": "t3.large", "WeightedCapacity": "2"},
        {"InstanceType": "m5.large", "WeightedCapacity": "2"}
      ]
    },
    "InstancesDistribution": {
      "OnDemandPercentageAboveBaseCapacity": 20,
      "SpotAllocationStrategy": "capacity-optimized",
      "SpotMaxPrice": ""
    }
  }' \
  --vpc-zone-identifier "subnet-12345678,subnet-87654321"

echo "Spot ASG created: 80% Spot + 20% on-demand mix"
echo "Estimated savings: $1,500-2,000/month"
```

**Azure Path:**

```bash
# Create VM with Spot billing
az vm create \
  --resource-group production-rg \
  --name spot-vm \
  --image UbuntuLTS \
  --priority Spot \
  --max-price 0.05 \
  --eviction-policy Deallocate

echo "Spot VM created with max price $0.05/hour"
echo "Estimated savings vs on-demand: 70-80%"
```

**GCP Path:**

```bash
# Create instance group with Preemptible instances
gcloud compute instance-groups managed create preemptible-ig \
  --base-instance-name preemptible-instance \
  --size 5 \
  --template preemptible-template \
  --zone us-central1-a

# Create template with Preemptible
gcloud compute instance-templates create preemptible-template \
  --machine-type=n1-standard-2 \
  --preemptible \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud

echo "Preemptible instance group created"
echo "Estimated savings: 70-90% vs on-demand"
```

**Verification**: ✓ Mixed pricing strategy deployed (on-demand + Spot + Reserved)

---

## Part 3: Governance & Automation (2 hours)

### Task 3.1: Enforce Cost Governance Policies

**Objective**: Implement resource constraints and approval workflows

```bash
# AWS: Deny expensive instance types
aws iam create-policy \
  --policy-name finops-compute-restrictions \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Deny",
        "Action": "ec2:RunInstances",
        "Resource": "arn:aws:ec2:*:*:instance/*",
        "Condition": {
          "StringLike": {
            "ec2:InstanceType": ["m5.2xlarge", "m5.4xlarge", "c5.4xlarge"]
          }
        }
      }
    ]
  }'

# Azure: Enforce tagging requirement
az policy assignment create \
  --policy-id "/subscriptions/{subscription-id}/providers/Microsoft.Authorization/policyDefinitions/enforce-tags" \
  --scope "/subscriptions/{subscription-id}/resourcegroups/production-rg"

# GCP: Set organizational constraints
gcloud resource-manager org-policies enforce \
  --project=PROJECT_ID \
  constraints/compute.restrictVmExternalIpAccess
```

### Task 3.2: Set Up Cost Anomaly Detection

**Objective**: Implement automated cost spike alerts

```bash
# AWS: Create anomaly detector
aws ce create-anomaly-detector \
  --anomaly-detector '{
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE",
    "MonitorSpecification": {
      "EventType": "COST_INCREASE",
      "Threshold": 0.25
    }
  }'

# Check anomalies
aws ce get-anomalies \
  --date-interval Start=2025-01-01,End=2025-01-31 \
  --feedback NOT_ANOMALOUS

# Azure: Create alert for spending anomalies
az monitor metrics alert create \
  --name "SpendingAnomaly" \
  --resource-group finops-rg \
  --scopes "/subscriptions/{subscription-id}" \
  --condition "total SpendingAmount > avg(last7Days) * 1.25"
```

---

## Part 4: Reporting & Analytics (1 hour)

### Task 4.1: Generate Cost Reports

**Objective**: Create actionable cost reports for stakeholders

```bash
# Generate comprehensive report
cat > cost_report.py << 'EOF'
import boto3
import json
from datetime import datetime, timedelta

ce = boto3.client('ce')

# Get costs by service
costs_by_service = ce.get_cost_and_usage(
    TimePeriod={'Start': '2025-01-01', 'End': '2025-01-31'},
    Granularity='MONTHLY',
    Metrics=['UnblendedCost'],
    GroupBy=[{'Type': 'DIMENSION', 'Key': 'SERVICE'}]
)

# Get costs by tag
costs_by_owner = ce.get_cost_and_usage(
    TimePeriod={'Start': '2025-01-01', 'End': '2025-01-31'},
    Granularity='MONTHLY',
    Metrics=['UnblendedCost'],
    GroupBy=[{'Type': 'TAG', 'Key': 'Owner'}]
)

# Generate report
print("=" * 50)
print(f"Monthly Cost Report - January 2025")
print("=" * 50)

total = 0
for group in costs_by_service['ResultsByTime'][0]['Groups']:
    service = group['Keys'][0]
    cost = float(group['Metrics']['UnblendedCost']['Amount'])
    total += cost
    print(f"{service}: ${cost:,.2f}")

print(f"\nTotal: ${total:,.2f}")
print("\n" + "=" * 50)
print("Costs by Owner:")
print("=" * 50)

for group in costs_by_owner['ResultsByTime'][0]['Groups']:
    owner = group['Keys'][0]
    cost = float(group['Metrics']['UnblendedCost']['Amount'])
    print(f"{owner}: ${cost:,.2f}")
EOF

python3 cost_report.py
```

---

## Part 5: Continuous Improvement (1 hour)

### Task 5.1: Implement Automated Cleanup

**Objective**: Set up automation to remove unused resources

```bash
# AWS Lambda function for cleanup
cat > cleanup_function.py << 'EOF'
import boto3
from datetime import datetime, timedelta

ec2 = boto3.client('ec2')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    # Delete stopped instances older than 30 days
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['stopped']}]
    )
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            if datetime.now(instance['LaunchTime'].tzinfo) - instance['LaunchTime'] > timedelta(days=30):
                ec2.terminate_instances(InstanceIds=[instance['InstanceId']])
                print(f"Terminated {instance['InstanceId']}")
    
    # Delete unattached volumes
    volumes = ec2.describe_volumes(
        Filters=[{'Name': 'status', 'Values': ['available']}]
    )
    
    for volume in volumes['Volumes']:
        if datetime.now(volume['CreateTime'].tzinfo) - volume['CreateTime'] > timedelta(days=30):
            ec2.delete_volume(VolumeId=volume['VolumeId'])
            print(f"Deleted {volume['VolumeId']}")
    
    return {'statusCode': 200, 'body': 'Cleanup completed'}
EOF

# Deploy Lambda
aws lambda create-function \
  --function-name finops-cleanup \
  --runtime python3.9 \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler cleanup_function.lambda_handler \
  --zip-file fileb://cleanup.zip

# Schedule daily
aws events put-rule \
  --name finops-cleanup-schedule \
  --schedule-expression "cron(0 2 * * ? *)"
```

---

## Part 6: Advanced Optimization (2 hours)

### Task 6.1: Multi-Cloud Cost Comparison

**Objective**: Analyze costs across cloud providers and identify best value

```bash
# Compare equivalent deployments
cat > cloud_comparison.sh << 'EOF'
#!/bin/bash

echo "=== 3-Year Total Cost Comparison ==="
echo "(2 vCPU, 8GB RAM, 100GB SSD, 24/7/365)"
echo ""

# AWS t3.large
AWS_ON_DEMAND=$((0.0832 * 730 * 36))  # $2,100.64
AWS_1YR_RI=$((0.0476 * 730 * 36))     # $1,189.92
AWS_3YR_RI=$((0.0318 * 730 * 36))     # $796.19

echo "AWS t3.large:"
echo "  On-Demand: \$$AWS_ON_DEMAND"
echo "  1-Year RI: \$$AWS_1YR_RI (43% savings)"
echo "  3-Year RI: \$$AWS_3YR_RI (62% savings)"
echo ""

# Azure Standard_B2s
AZURE_ON_DEMAND=$((0.0970 * 730 * 36))  # $2,543.64
AZURE_1YR_RI=$((0.0505 * 730 * 36))     # $1,327.44
AZURE_3YR_RI=$((0.0367 * 730 * 36))     # $964.56

echo "Azure Standard_B2s:"
echo "  On-Demand: \$$AZURE_ON_DEMAND"
echo "  1-Year RI: \$$AZURE_1YR_RI (48% savings)"
echo "  3-Year RI: \$$AZURE_3YR_RI (62% savings)"
echo ""

# GCP n1-standard-2
GCP_ON_DEMAND=$((0.0950 * 730 * 36))   # $2,494.20
GCP_1YR_CUD=$((0.0665 * 730 * 36))     # $1,744.02
GCP_3YR_CUD=$((0.0476 * 730 * 36))     # $1,247.87

echo "GCP n1-standard-2:"
echo "  On-Demand: \$$GCP_ON_DEMAND"
echo "  1-Year CUD: \$$GCP_1YR_CUD (30% savings)"
echo "  3-Year CUD: \$$GCP_3YR_CUD (50% savings)"
EOF

bash cloud_comparison.sh

echo ""
echo "Recommendation: Azure cheapest for committed 3-year @ $965/unit"
```

### Task 6.2: Create FinOps Culture

**Objective**: Establish cost awareness as organizational practice

```bash
# Create team communication
cat > finops_kickoff.md << 'EOF'
# FinOps Implementation Plan

## Goals (6 months)
- [ ] 40% reduction in cloud costs
- [ ] Full cost visibility and allocation
- [ ] Automated governance enforcement

## Team Responsibilities
- **Finance**: Budget allocation, forecasting, chargeback
- **Engineering**: Right-sizing, optimization, cost awareness
- **Operations**: Monitoring, automation, governance

## Success Metrics
- Cost per transaction down 40%
- 70% of resources properly tagged
- 60% of compute on commitments
- Zero policy violations

## Next Steps
1. Week 1: Implement tagging
2. Week 2-3: Set up dashboards
3. Week 4-6: Implement optimizations
4. Week 7-8: Automate governance
5. Week 9-12: Continuous improvement

## Contact
finops-team@company.com
EOF

# Schedule monthly cost review meeting
echo "Monthly FinOps Cost Review - Every last Thursday 10am"
```

**Verification**: ✓ All 18 hands-on tasks completed, FinOps program established

---

**Congratulations!** You've successfully implemented a comprehensive FinOps program with cost visibility, optimization, governance, and continuous improvement processes in place.

**Expected Outcomes**:
- ✓ Full cost visibility across all cloud resources
- ✓ 30-50% reduction in cloud costs
- ✓ Automated governance and policy enforcement
- ✓ Trained team with cost-aware culture
- ✓ Sustainable continuous optimization program

**Next Steps**:
1. Schedule weekly cost reviews
2. Monitor anomalies and trends
3. Quarterly strategy reviews
4. Continuous optimization

---

**Last Updated**: 2025-01-31  
**Version**: 1.0
