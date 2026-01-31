# FinOps: Implementation Runbook

Complete operational guide for deploying and managing FinOps infrastructure and processes across AWS, Azure, and GCP.

---

## Overview

This runbook provides step-by-step instructions for implementing FinOps across multi-cloud environments, including cost visibility setup, optimization implementation, and governance enforcement. Each phase includes provider-specific commands, verification procedures, and best practices.

**Target Audience**: Cloud architects, FinOps engineers, infrastructure teams, finance teams  
**Expected Timeline**: 8-12 weeks for full implementation  
**Expected Cost Reduction**: 25-40% with complete implementation

---

## Standard Deployment

### Phase 1: Cost Visibility Foundation (Week 1-2)

#### 1.1 AWS Cost Visibility Setup

**Prerequisites**:
- AWS Account with billing admin or Cost Management access
- IAM permissions: `ce:*`, `budgets:*`, `cloudtrail:*`, `organizations:*`
- CloudTrail enabled with S3 logging configured
- Management account access (for organization-wide policies)
- S3 bucket for cost and usage reports

**Key AWS Tools**:
- **Cost Explorer**: Visual cost analysis and trend forecasting
- **Cost Anomaly Detection**: ML-based unusual spending detection
- **AWS Budgets**: Threshold-based alerts and forecasting
- **Cost and Usage Reports**: Granular billing data export
- **Compute Optimizer**: Instance right-sizing recommendations
- **Trusted Advisor**: General infrastructure optimization

**Steps**:

```bash
# 1. Verify prerequisites and permissions
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Working with AWS Account: $ACCOUNT_ID"

# Check IAM permissions
aws iam get-user --query 'User.UserId' && echo "✓ IAM access verified" || exit 1

# Verify CloudTrail is enabled
aws cloudtrail describe-trails --query 'trailList[0].S3BucketName' && echo "✓ CloudTrail enabled" || exit 1

# 2. Create S3 bucket for cost and usage reports (if not exists)
BUCKET_NAME="finops-reports-${ACCOUNT_ID}"
aws s3 ls "s3://${BUCKET_NAME}" 2>/dev/null || {
  aws s3 mb "s3://${BUCKET_NAME}" --region us-east-1
  aws s3api put-bucket-versioning \
    --bucket "${BUCKET_NAME}" \
    --versioning-configuration Status=Enabled
  echo "✓ Created S3 bucket for reports"
}

# 3. Enable Cost Explorer (enable detailed billing first)
aws ce create-cost-category-definition \
  --name "CostCenter" \
  --rules '[{
    "Rule": {
      "Rule": "tag:CostCenter LIKE %"
    },
    "Value": "tag:CostCenter"
  }]' 2>/dev/null || echo "Cost category may already exist"

# 4. Set up comprehensive tagging policy for organizations
aws organizations put-policy \
  --content '{
    "tags": {
      "Environment": {
        "tag_key": {"@@assign": "Environment"},
        "enforced_for": {"@@assign": ["ec2:*", "rds:*", "s3:*", "dynamodb:*", "lambda:*"]},
        "tag_value": {"@@assign": ["production", "staging", "development", "test"]}
      },
      "CostCenter": {
        "tag_key": {"@@assign": "CostCenter"},
        "enforced_for": {"@@assign": ["ec2:*", "s3:*", "rds:*", "lambda:*"]}
      },
      "Owner": {
        "tag_key": {"@@assign": "Owner"},
        "enforced_for": {"@@assign": ["ec2:*", "rds:*"]}
      },
      "Application": {
        "tag_key": {"@@assign": "Application"},
        "enforced_for": {"@@assign": ["ec2:*", "rds:*", "lambda:*"]}
      }
    }
  }' \
  --type TAG_POLICY 2>/dev/null || echo "Policy may already exist"

# 5. Create additional cost allocation tags
for TAG_NAME in Application Owner Team Project; do
  aws ce create-cost-category-definition \
    --name "${TAG_NAME}" \
    --rules "[{\"Rule\": {\"Rule\": \"tag:${TAG_NAME} LIKE %\"}, \"Value\": \"tag:${TAG_NAME}\"}]" \
    2>/dev/null || echo "Tag category ${TAG_NAME} exists"
done

# 6. Generate Cost and Usage Report (detailed billing)
aws cur put-report-definition \
  --report-definition '{
    "ReportName": "FinOps-Daily-Cost-Report",
    "ReportFormat": "Parquet",
    "Compression": "Parquet",
    "TimeUnit": "DAILY",
    "IncludeResourceIds": true,
    "IncludeSupport": true,
    "IncludeDiscounts": true,
    "IncludeRefunds": true,
    "AdditionalSchemaElements": ["MANIFEST"],
    "RefreshClosedReports": true,
    "ReportVersioningType": "OVERWRITE_REPORT",
    "S3Bucket": "'"${BUCKET_NAME}"'",
    "S3Prefix": "cost-reports/",
    "S3Region": "us-east-1"
  }' 2>/dev/null || echo "Report definition may already exist"

# 7. Create Budget with multiple alert thresholds
BUDGET_ID="monthly-production-budget"
aws budgets create-budget \
  --account-id "${ACCOUNT_ID}" \
  --budget '{
    "BudgetName": "'"${BUDGET_ID}"'",
    "BudgetLimit": {
      "Amount": "5000",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {
      "TagKeyValue": ["Environment$production"]
    }
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "FORECASTED",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 75,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "team@company.com"}
      ]
    },
    {
      "Notification": {
        "NotificationType": "FORECASTED",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 90,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "finance@company.com"}
      ]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "cfo@company.com"}
      ]
    }
  ]' 2>/dev/null || echo "Budget may already exist"

# 8. Enable Cost Anomaly Detection with ML
aws ce create-anomaly-detector \
  --anomaly-detector '{
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE",
    "MonitorSpecification": {
      "InvocationFrequency": "DAILY"
    }
  }' 2>/dev/null || echo "Anomaly detector may already exist"

# Set up anomaly monitor subscription
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }' 2>/dev/null || echo "Monitor may already exist"

# 9. Create EventBridge rule for cost anomalies
aws events put-rule \
  --name FinOps-Anomaly-Alert \
  --event-bus-name default \
  --state ENABLED \
  --event-pattern '{
    "source": ["aws.ce"],
    "detail-type": ["Cost Anomaly Detection"],
    "detail": {
      "detector": [{"state": ["ACTIVE"]}]
    }
  }' 2>/dev/null || echo "Rule may already exist"

# 10. Create SNS topic for alerts
SNS_TOPIC_ARN=$(aws sns create-topic \
  --name finops-alerts \
  --query 'TopicArn' \
  --output text 2>/dev/null)
echo "SNS Topic for alerts: $SNS_TOPIC_ARN"

# Add email subscription
aws sns subscribe \
  --topic-arn "${SNS_TOPIC_ARN}" \
  --protocol email \
  --notification-endpoint "team@company.com"

# 11. Create CloudWatch dashboard for cost monitoring
aws cloudwatch put-dashboard \
  --dashboard-name FinOps-Cost-Dashboard \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [["AWS/Billing", "EstimatedCharges", {"stat": "Average"}]],
          "period": 86400,
          "stat": "Sum",
          "region": "us-east-1",
          "title": "Estimated Monthly Charges"
        }
      },
      {
        "type": "log",
        "properties": {
          "query": "fields @timestamp, @message | stats sum(@message) by bin(5m)",
          "region": "us-east-1",
          "title": "Hourly Cost Trends"
        }
      }
    ]
  }' 2>/dev/null || echo "Dashboard may already exist"
```

**Verification Steps**:
```bash
# 1. Verify cost categories exist
aws ce describe-cost-category-definitions --query 'CostCategoryDefinitions[*].CostCategoryArn'

# 2. Verify tagging policy
aws organizations list-policies --filter TAG_POLICY --query 'Policies[*].Name'

# 3. Verify budgets configured
aws budgets describe-budgets \
  --account-id "${ACCOUNT_ID}" \
  --query 'Budgets[*].[BudgetName,BudgetLimit.Amount,TimeUnit]' \
  --output table

# 4. Verify anomaly detection is active
aws ce describe-anomaly-detectors \
  --query 'AnomalyDetectors[*].[AnomalyDetectorArn,MonitorType,Status]'

# 5. Check Cost and Usage Report generation
aws cur describe-report-definitions \
  --query 'ReportDefinitions[*].[ReportName,ReportFormat,TimeUnit]'

# 6. Verify S3 bucket has cost data (wait 24-48 hours for first report)
aws s3 ls "s3://${BUCKET_NAME}/cost-reports/" --recursive --human-readable --summarize

# 7. Test cost explorer query
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0]' --output table
```

#### 1.2 Azure Cost Visibility Setup

**Prerequisites**:
- Azure subscription with Owner or Contributor role
- Enterprise Agreement (EA) or pay-as-you-go billing
- Resource Group for cost management resources
- Storage account for cost export

**Key Azure Tools**:
- **Cost Management + Billing**: Central cost analysis and budgeting
- **Azure Monitor**: Real-time metrics and alerts
- **Resource Graph**: Query resources across subscriptions
- **Azure Advisor**: Optimization recommendations
- **Log Analytics**: Historical cost and usage data
- **Power BI**: Advanced cost analytics and reporting

```bash
# 1. Verify prerequisites
SUBSCRIPTION_ID=$(az account show --query id --output tsv)
RESOURCE_GROUP="finops-rg"
echo "Working with subscription: $SUBSCRIPTION_ID"

# Verify access
az account show --query '[name, state]' && echo "✓ Azure access verified" || exit 1

# 2. Create resource group for finops resources
az group create \
  --name "${RESOURCE_GROUP}" \
  --location eastus \
  --tags Environment=finops Purpose=cost-management \
  2>/dev/null || echo "Resource group may already exist"

# 3. Create storage account for cost exports
STORAGE_NAME="finopsstg$(date +%s | tail -c 6)"
az storage account create \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${STORAGE_NAME}" \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  2>/dev/null || echo "Storage account may already exist"

# 4. Create container for exports
az storage container create \
  --account-name "${STORAGE_NAME}" \
  --name cost-exports 2>/dev/null || echo "Container may already exist"

# 5. Set up cost management export (daily)
EXPORT_NAME="daily-cost-export"
az costmanagement export create \
  --scope "/subscriptions/${SUBSCRIPTION_ID}" \
  --name "${EXPORT_NAME}" \
  --definition-type "Usage" \
  --schedule-period "Daily" \
  --schedule-status "Active" \
  --time-period From="2025-01-01T00:00:00" To="2025-12-31T23:59:59" \
  --format Csv 2>/dev/null || echo "Export may already exist"

# 6. Create Log Analytics workspace for cost data
WORKSPACE_NAME="finops-workspace-${SUBSCRIPTION_ID:0:8}"
az monitor log-analytics workspace create \
  --resource-group "${RESOURCE_GROUP}" \
  --workspace-name "${WORKSPACE_NAME}" \
  --location eastus 2>/dev/null || echo "Workspace may already exist"

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group "${RESOURCE_GROUP}" \
  --workspace-name "${WORKSPACE_NAME}" \
  --query id --output tsv)
echo "Log Analytics Workspace ID: $WORKSPACE_ID"

# 7. Create action group for alerts
ACTION_GROUP_NAME="FinOps-Alerts"
az monitor action-group create \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${ACTION_GROUP_NAME}" \
  --short-name "FinOps" 2>/dev/null || echo "Action group may already exist"

# Add email receiver
az monitor action-group receiver email add \
  --resource-group "${RESOURCE_GROUP}" \
  --action-group-name "${ACTION_GROUP_NAME}" \
  --receiver-name "TeamEmail" \
  --email-receiver team@company.com 2>/dev/null || echo "Email receiver exists"

# 8. Create budget with alerts at multiple thresholds
az costmanagement budget create \
  --scope "/subscriptions/${SUBSCRIPTION_ID}" \
  --name "monthly-budget" \
  --category "Cost" \
  --amount 5000 \
  --time-period Start="2025-01-01T00:00:00Z" End="2025-12-31T23:59:59Z" \
  --time-grain Monthly 2>/dev/null || echo "Budget may already exist"

# 9. Create metric alerts for high spending
az monitor metrics alert create \
  --name "HighSpendAlert-75Percent" \
  --resource-group "${RESOURCE_GROUP}" \
  --scopes "/subscriptions/${SUBSCRIPTION_ID}" \
  --description "Alert when spending reaches 75% of budget" \
  --condition "total > 3750" \
  --window-size PT1H \
  --evaluation-frequency PT1H \
  --action "${ACTION_GROUP_NAME}" 2>/dev/null || echo "Alert may already exist"

# 10. Create resource groups with cost allocation tags
for ENV in production staging development; do
  az group create \
    --name "workload-${ENV}-rg" \
    --location eastus \
    --tags Environment="${ENV}" CostCenter="cc-001" Owner="team@company.com" \
    2>/dev/null || echo "RG workload-${ENV}-rg exists"
done

# 11. Create Azure Policy for mandatory tagging
POLICY_DEFINITION='{
  "mode": "Indexed",
  "policyRule": {
    "if": {
      "field": "tags",
      "exists": "false"
    },
    "then": {
      "effect": "deny"
    }
  }
}'

az policy definition create \
  --name "require-resource-tags" \
  --description "Enforce mandatory resource tagging" \
  --rules "'"${POLICY_DEFINITION}"'" \
  2>/dev/null || echo "Policy definition may exist"

# 12. Create Power BI or Grafana dashboard for cost visualization
# This typically requires manual setup, but export configuration is ready
echo "Cost export configured. Set up Power BI dashboard manually at Azure Portal"
```

**Verification Steps**:
```bash
# 1. Verify storage account setup
az storage account list --resource-group "${RESOURCE_GROUP}" --query '[*].[name,kind]' --output table

# 2. Verify cost export configuration
az costmanagement export list --scope "/subscriptions/${SUBSCRIPTION_ID}" \
  --query '[*].[name,definition.type,schedule.status]' --output table

# 3. Verify Log Analytics workspace
az monitor log-analytics workspace list \
  --resource-group "${RESOURCE_GROUP}" \
  --query '[*].[name,provisioningState]' --output table

# 4. Verify budget exists
az costmanagement budget list --scope "/subscriptions/${SUBSCRIPTION_ID}" \
  --query '[*].[name,amount,category]' --output table

# 5. Verify action group
az monitor action-group list --resource-group "${RESOURCE_GROUP}" \
  --query '[*].[name,shortName]' --output table

# 6. Test cost data extraction (run after first export completes)
az monitor log-analytics query \
  --workspace "${WORKSPACE_ID}" \
  --analytics-query "AzureBillingData | summarize TotalCost=sum(ChargeAmount) by BillingPeriod" \
  2>/dev/null || echo "Run after first cost export completes"

# 7. Check tag compliance
az policy state summarize \
  --resource-group "${RESOURCE_GROUP}"
```

#### 1.3 GCP Cost Visibility Setup

**Prerequisites**:
- GCP Project with billing enabled
- Organization or Billing Account admin role
- BigQuery API enabled
- Cloud Logging API enabled
- Sufficient IAM permissions

**Key GCP Tools**:
- **Cloud Billing**: Cost analysis and budgeting
- **BigQuery**: Billing data analysis and custom queries
- **Data Studio**: Visualize billing data
- **Recommender API**: Automatic optimization recommendations
- **Cloud Monitoring**: Metrics and alerting
- **Cloud Audit Logs**: Resource creation and modification tracking

```bash
# 1. Set up environment variables
PROJECT_ID=$(gcloud config get-value project)
BILLING_ACCOUNT=$(gcloud billing accounts list --format='value(name)' | head -1)
echo "Working with project: $PROJECT_ID, Billing: $BILLING_ACCOUNT"

# 2. Enable required APIs
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  cloudbilling.googleapis.com \
  bigquery.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  recommender.googleapis.com \
  --project="${PROJECT_ID}"

# 3. Create BigQuery dataset for billing data
bq mk \
  --dataset \
  --description="FinOps billing and cost analysis" \
  --location=US \
  --default_table_expiration=7776000 \
  finops_dataset

# 4. Export Cloud Billing data to BigQuery
gcloud billing budgets create \
  --billing-account="${BILLING_ACCOUNT}" \
  --display-name="Monthly-Overall-Budget" \
  --budget-amount=5000 \
  --threshold-rule percent=50 \
  --threshold-rule percent=75 \
  --threshold-rule percent=100

# 5. Link BigQuery billing export (may require manual setup via console for first-time)
echo "Enabling BigQuery export for billing data..."
# This requires at least one budget to be created; export happens automatically

# 6. Create budget alerts at multiple thresholds
for THRESHOLD in 50 75 90 100; do
  gcloud billing budgets create \
    --billing-account="${BILLING_ACCOUNT}" \
    --display-name="Alert-${THRESHOLD}Percent" \
    --budget-amount=5000 \
    --threshold-rule percent="${THRESHOLD}" \
    2>/dev/null || echo "Budget threshold ${THRESHOLD} may exist"
done

# 7. Create monitoring alert policy for billing
gcloud alpha monitoring policies create \
  --notification-channels=[CHANNEL_ID] \
  --display-name="High-Daily-Cost" \
  --condition-display-name="Daily cost exceeds threshold" \
  --condition-threshold-value=200 \
  --condition-threshold-duration=300s \
  2>/dev/null || echo "Alert policy may exist"

# 8. Create Pub/Sub topic for budget alerts
gcloud pubsub topics create finops-budget-alerts \
  --project="${PROJECT_ID}" 2>/dev/null || echo "Topic may exist"

# Create subscription
gcloud pubsub subscriptions create finops-budget-alerts-sub \
  --topic=finops-budget-alerts \
  --project="${PROJECT_ID}" 2>/dev/null || echo "Subscription may exist"

# 9. Create Cloud Function to process budget alerts
cat > process_budget_alert.py << 'EOF'
import json
import functions_framework
from google.cloud import logging_v2

@functions_framework.cloud_event
def process_budget_alert(cloud_event):
    """Process budget alert from Pub/Sub"""
    import base64
    
    pubsub_message = base64.b64decode(cloud_event.data["message"]["data"]).decode()
    budget_alert = json.loads(pubsub_message)
    
    logging_client = logging_v2.Client()
    logger = logging_client.logger('finops-budget-alerts')
    
    if budget_alert.get('budgetExceeded'):
        logger.log_struct({
            'severity': 'CRITICAL',
            'message': 'Budget threshold exceeded',
            'budget_name': budget_alert.get('budgetDisplayName'),
            'alert_threshold': budget_alert.get('alertThresholdExceeded'),
        })
        # Could also trigger remediation actions here
    
    return 'Alert processed', 200
EOF

gcloud functions deploy process-budget-alert \
  --runtime python39 \
  --trigger-topic finops-budget-alerts \
  --entry-point process_budget_alert \
  --project="${PROJECT_ID}" 2>/dev/null || echo "Function may exist"

# 10. Enable Cost Anomaly Detection (via Recommender API)
gcloud recommender recommendations list \
  --recommender=google.compute.instances.MachineTypeRecommender \
  --location=global \
  --project="${PROJECT_ID}" \
  --format=json > machine_type_recommendations.json

# 11. Create Cloud Monitoring dashboard
gcloud monitoring dashboards create --config='{
  "displayName": "FinOps-Cost-Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Estimated Monthly Cost",
          "xyChart": {
            "chartOptions": {"mode": "COLOR"},
            "timeSeries": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"billing.googleapis.com/gcp_billing_export_v1\" resource.type=\"billing_export\"",
                  "aggregation": {"alignmentPeriod": "86400s", "perSeriesAligner": "ALIGN_SUM"}
                }
              }
            }]
          }
        }
      }
    ]
  }
}' 2>/dev/null || echo "Dashboard may exist"

# 12. Set up Cloud Audit Logs for compliance
gcloud logging sinks create finops-audit-sink \
  bigquery.googleapis.com/projects/"${PROJECT_ID}"/datasets/audit_logs \
  --log-filter='protoPayload.serviceName="compute.googleapis.com" OR protoPayload.serviceName="storage.googleapis.com"' \
  --project="${PROJECT_ID}" 2>/dev/null || echo "Sink may exist"
```

**Verification Steps**:
```bash
# 1. Verify APIs are enabled
gcloud services list --enabled --filter="name:(billing|bigquery|logging|monitoring)" \
  --project="${PROJECT_ID}"

# 2. Verify BigQuery dataset
bq ls -d --project_id="${PROJECT_ID}" | grep finops_dataset

# 3. Verify budgets
gcloud billing budgets list --billing-account="${BILLING_ACCOUNT}" \
  --format='table(displayName, budgetAmount.nanos, name)'

# 4. Verify Pub/Sub resources
gcloud pubsub topics list --project="${PROJECT_ID}" | grep finops

# 5. Query billing data (wait 24-48 hours after enabling export)
bq query --nouse_legacy_sql \
  'SELECT SUM(cost) as total_cost, DATE(usage_start_time) as date 
   FROM finops_dataset.gcp_billing_export_v1 
   WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
   GROUP BY date ORDER BY date DESC LIMIT 30'

# 6. Check recommendations
gcloud recommender recommendations list \
  --recommender=google.compute.instances.MachineTypeRecommender \
  --location=global --project="${PROJECT_ID}" \
  --format='table(name, description, stateInfo.state, content.overview)'
```

---

### Phase 2: Cost Optimization (Week 3-5)

#### 2.1 AWS Reserved Instance & Savings Plan Strategy

**Reserved Instance Types**:
- **Compute Savings Plans**: 10-17% discount (1-year), 20-25% (3-year) - flexible across instance types/sizes/regions
- **EC2 Instance Savings Plans**: 19% discount (1-year), 29% (3-year) - specific to instance family/region
- **EC2 Reserved Instances**: 20-40% discount - most restrictive but highest savings
- **RDS/DynamoDB Reserved Capacity**: 30-35% savings for database workloads

**Strategy**:
1. Analyze 12 months of usage (don't rely on current traffic alone)
2. Use Compute Optimizer for recommendations (ML-based)
3. Mix RI/Savings Plans based on flexibility needs
4. Reserve only baseline stable workloads (20-70% of capacity)
5. Use On-Demand for spiky/variable workloads

```bash
# 1. Comprehensive instance analysis
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Get detailed instance metrics (last 30 days)
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,LaunchTime,Tags[?Key==`Name`].Value|[0]]' \
  --output table > running_instances.txt

# Collect CPU and Network metrics
for INSTANCE_ID in $(aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query 'Reservations[*].Instances[*].InstanceId' --output text); do
  echo "Analyzing $INSTANCE_ID..."
  aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --dimensions Name=InstanceId,Value="${INSTANCE_ID}" \
    --statistics Average,Maximum \
    --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 3600 \
    --query 'Datapoints | [avg(@[*].Average), max(@[*].Maximum)]' \
    --output text >> instance_metrics.txt
done

# 2. Get Compute Optimizer recommendations (ML-based analysis)
aws compute-optimizer get-ec2-instance-recommendations \
  --recommendation-preferences \
    includeExistingRecommendations=true,lookBackPeriod=THIRTY_DAYS \
  --query 'instanceRecommendations[*].[instanceId,currentInstanceType,recommendationOptions[0].instanceType,recommendationOptions[0].savingsOpportunity.percentage]' \
  --output table > right_sizing_recommendations.txt

# 3. Analyze Savings Plans coverage
aws ce get-savings-plans-coverage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics CoverageBenefit,OnDemandCost,SavingsPlansAmortizedCost \
  --group-by Type=DIMENSION,Key=REGION

# 4. Get Reserved Instance recommendations
aws ce get-reservation-purchase-recommendation \
  --service "EC2" \
  --lookback-period THIRTY_DAYS \
  --payment-option ALL_UPFRONT \
  --term-in-years 3 \
  --filter '[{
    "Type": "REGION",
    "Value": "us-east-1"
  }]' \
  --query 'Recommendations[*].[
    recommendationTarget,
    metadata[0],
    recommendedNumberOfUnitsToPurchase,
    estimatedMonthlySavingsAmount,
    estimatedMonthlyOnDemandCost
  ]' --output table

# 5. Purchase Compute Savings Plans (most flexible)
# First, identify the right amount to reserve (typically 30-50% of on-demand spend)
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --filter '{
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["EC2 - Compute"]
    }
  }' \
  --query 'ResultsByTime[*].Total.UnblendedCost' --output text

echo "Compute Savings Plans pricing available at: https://aws.amazon.com/savingsplans/pricing/"
echo "Purchase Savings Plans manually via AWS Console or via AWS Marketplace"

# 6. For aggressive optimization, purchase 1-3 year RIs for baseline workloads
# Example: 10 t3.medium instances in us-east-1
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id "438012d3-644d-4496-9d84-1234567890ab" \
  --instance-count 10 \
  --dry-run 2>&1 | head -20 || echo "Remove --dry-run to execute purchase"

# 7. Monitor RI/Savings Plans utilization
aws ce get-reservation-coverage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost,BlendedCost \
  --group-by Type=DIMENSION,Key=LINKED_ACCOUNT \
  --query 'CoveragesByTime[*].[
    TimePeriod.Start,
    Total.CoverageHours.OnDemandHours,
    Total.CoverageHours.ReservedHours,
    Total.CoverageNormalizedUnits.UnderCoverageQuantity
  ]' --output table

# 8. Set up CloudWatch alerts for low RI utilization
aws cloudwatch put-metric-alarm \
  --alarm-name "RI-Utilization-Low-Alert" \
  --alarm-description "Alert if RI utilization drops below 50%" \
  --metric-name EstimatedReservedInstancesNormalizedUnitsUtilization \
  --namespace AWS/Billing \
  --statistic Average \
  --period 86400 \
  --threshold 50 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1
```

**Verification**:
```bash
# 1. Verify RI/Savings Plans are applied
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics AmortizedCost,NetAmortizedCost,NetUnblendedCost \
  --query 'ResultsByTime[].{Date: TimePeriod.Start, Cost: Total.NetAmortizedCost.amount}' \
  --output table

# 2. Show actual savings achieved
aws ce get-savings-plans-utilization-details \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --query 'SavingsPlansUtilizationsByTime[*].[
    TimePeriod.Start,
    Total.UtilizationPercentage,
    Total.AmortizedCommitment,
    Total.TotalCommitmentToDate
  ]' --output table

# 3. Track monthly savings trend
for MONTH in {1..6}; do
  START=$(date -d "${MONTH} months ago" +%Y-%m-01)
  END=$(date -d "${MONTH} months ago +1 month -1 day" +%Y-%m-%d)
  SAVINGS=$(aws ce get-reservation-coverage \
    --time-period Start="${START}",End="${END}" \
    --query 'CoveragesByTime[*].Total.SavingsMonthly.amount' --output text)
  echo "${START}: ${SAVINGS}"
done
```

#### 2.2 Azure Reserved Instance & Savings Plan Strategy

**Reservation Types**:
- **Reserved Instances**: 30-35% discount (1-year), 60-70% (3-year) - specific to VM size/region
- **Azure Hybrid Benefit**: Up to 40% additional savings (bring your own license)
- **Spot VMs**: 50-90% discount - for fault-tolerant workloads
- **Commitment-based discounts**: Database and App Service discounts

```bash
# 1. Set up environment
SUBSCRIPTION_ID=$(az account show --query id --output tsv)
RESOURCE_GROUP="finops-rg"

# 2. Analyze current VM deployment and costs
az vm list --query '[*].[name,hardwareProfile.vmSize,osProfile.osType]' --output table

# 3. Get reservation recommendations
az reservations recommendations list \
  --resource-group "${RESOURCE_GROUP}" \
  --recommendation-location eastus \
  --filter "properties.recommendationKind eq 'Recommended'"

# 4. Purchase 3-year reserved instances for stable workloads
# Example: Reserve 5 Standard_D2s_v3 instances in eastus
RESERVATION_ORDER=$(az reservations reservation-order create \
  --sku "Standard_D2s_v3" \
  --location "eastus" \
  --term "P3Y" \
  --billing-scope "/subscriptions/${SUBSCRIPTION_ID}" \
  --quantity 5 \
  --friendly-name "prod-vm-reservation" \
  --query 'name' --output tsv 2>/dev/null)

echo "Reservation Order: ${RESERVATION_ORDER}"

# 5. Enable Azure Hybrid Benefit for Windows Server and SQL Server licenses
az vm update \
  --resource-group production-rg \
  --name prod-vm-01 \
  --license-type Windows_Server \
  --no-wait

az vm update \
  --resource-group production-rg \
  --name prod-vm-02 \
  --license-type SUSE_Linux \
  --no-wait

# 6. Monitor reservation utilization
az reservations reservations list \
  --query '[*].[id, name, expiryDate, utilization.utilized, utilization.trend, utilization.aggregated_kind]' \
  --output table

# 7. Set up spending alerts based on reservation thresholds
az monitor metrics alert create \
  --name "ReservationUtilizationLow" \
  --resource-group "${RESOURCE_GROUP}" \
  --scopes "/subscriptions/${SUBSCRIPTION_ID}" \
  --description "Alert if reservation utilization below 70%" \
  --condition "avg(ReservationUtilizationPercentage) < 70" \
  --window-size PT1H \
  --evaluation-frequency PT1H

# 8. Use Spot VMs for batch and non-critical workloads
az vm create \
  --resource-group dev-workloads \
  --name batch-job-vm \
  --image UbuntuLTS \
  --priority Spot \
  --eviction-policy Delete \
  --max-price 0.05 \
  --size Standard_B2s \
  --no-wait

# 9. Query reservation coverage
az reservations reservations list \
  --query "[?properties.sku.name=='Standard_D2s_v3'].{
    Name: name,
    SKU: properties.sku.name,
    Term: properties.term,
    ExpiryDate: properties.expiryDate,
    Utilization: properties.utilization.utilized
  }"
```

**Verification**:
```bash
# 1. Verify reservations are applied
az reservations reservations list \
  --query '[*].[name, provisioningState, expiryDate]' --output table

# 2. Check cost impact
az costmanagement query --timeframe MonthToDate \
  --type "Usage" \
  --dataset \
    granularity=Daily \
    aggregation='{
      totalCost: {name: PreTaxCost, function: Sum}
    }' \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"

# 3. Verify Hybrid Benefit is active
az vm show --resource-group production-rg --name prod-vm-01 \
  --query 'licenseType' --output table

# 4. Monitor Spot VM evictions
az vm get-instance-view \
  --resource-group dev-workloads \
  --name batch-job-vm \
  --query 'instanceView.statuses[*].[code, displayStatus]' --output table
```

#### 2.3 GCP Committed Use Discount (CUD) Strategy

**Commitment Types**:
- **Compute Engine commitments**: 25-52% discount (1-year), 40-65% (3-year)
- **Cloud SQL commitments**: 25-35% discount
- **Datastore/Firestore commitments**: 35% discount
- **Flexible Slots (BigQuery)**: 25% discount
- **GPU/TPU commitments**: Available for ML workloads

```bash
# 1. Set environment
PROJECT_ID=$(gcloud config get-value project)
BILLING_ACCOUNT=$(gcloud billing accounts list --format='value(name)' | head -1)

# 2. Analyze current compute usage
gcloud compute instances list --format=table \
  --format='table(name,zone,machineType.size(),status)' \
  > compute_instances.txt

# Collect CPU and memory metrics
for INSTANCE in $(gcloud compute instances list --format='value(name)'); do
  for ZONE in $(gcloud compute instances list --format='value(zone)' --filter="name=${INSTANCE}"); do
    echo "Analyzing ${INSTANCE}..."
    gcloud compute instances get-serial-port-output "${INSTANCE}" \
      --zone="${ZONE}" | grep -i "cpu\|memory" || true
  done
done

# 3. Get Recommender recommendations (ML-based sizing)
gcloud recommender recommendations list \
  --recommender=google.compute.instances.MachineTypeRecommender \
  --location=global \
  --project="${PROJECT_ID}" \
  --format='table(
    name,
    description,
    content.overview.resourceName,
    stateInfo.state,
    content.overview.estimatedCostSavings
  )'

# 4. Analyze 30-day usage for commitment planning
# Query usage data from BigQuery
bq query --nouse_legacy_sql \
  'SELECT 
    resource.name,
    resource.location,
    DATE(usage_time) as date,
    ROUND(SUM(CAST(compute.vcpu_seconds AS FLOAT64) / 3600 / 24), 2) as avg_vcpus,
    ROUND(SUM(CAST(compute.memory_byte_seconds AS FLOAT64) / 3600 / 24 / 1024 / 1024 / 1024), 2) as avg_memory_gb
  FROM `'"${PROJECT_ID}"'.gcp_billing_export_v1.gcp_billing_export_*`
  WHERE _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE("%Y%m%d", DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE("%Y%m%d", CURRENT_DATE())
  GROUP BY resource.name, resource.location, date
  ORDER BY avg_vcpus DESC'

# 5. Purchase Compute Engine commitments (1-year for fast ROI)
# For n1-standard-4 machines in us-central1
gcloud compute commitments create web-server-commitment \
  --plan=one-year \
  --machine-type=n1-standard-4 \
  --region=us-central1 \
  --resource-count=10 \
  --project="${PROJECT_ID}"

# 6. Purchase 3-year commitments for stable production workloads
# For higher savings (40-65% discount)
gcloud compute commitments create prod-db-commitment \
  --plan=three-year \
  --machine-type=m1-ultramem-40 \
  --region=us-central1 \
  --resource-count=2 \
  --project="${PROJECT_ID}"

# 7. Create commitments with GPU/TPU for ML workloads
gcloud compute commitments create ml-gpu-commitment \
  --plan=one-year \
  --machine-type=n1-standard-8 \
  --accelerator=type=nvidia-tesla-p100,count=1 \
  --region=us-west1 \
  --project="${PROJECT_ID}"

# 8. Set up commitment alerts and dashboards
gcloud monitoring dashboards create --config='{
  "displayName": "GCP-Commitment-Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 12,
        "height": 4,
        "widget": {
          "title": "Active Commitments",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"commitment\" AND metric.type=\"compute.googleapis.com/commitment/commitment_utilization\""
              }
            }
          }
        }
      }
    ]
  }
}' 2>/dev/null || echo "Dashboard config syntax may need adjustment"

# 9. Monitor commitment usage and buy more if needed
gcloud compute commitments list \
  --project="${PROJECT_ID}" \
  --format='table(
    name,
    plan,
    region,
    resourcesValues[].size,
    creationTimestamp,
    endTimestamp
  )'

# 10. Set up Pub/Sub alerts when commitments are running low
gcloud pubsub topics create gcp-commitment-alerts \
  --project="${PROJECT_ID}" 2>/dev/null || echo "Topic exists"

# Cloud Function to monitor commitments
cat > monitor_commitments.py << 'EOF'
import functions_framework
from google.cloud import compute_v1
from google.cloud import pubsub_v1
import json

@functions_framework.cloud_event
def check_commitment_usage(cloud_event):
    """Monitor commitment usage and alert if low"""
    
    client = compute_v1.CommitmentsClient()
    project_id = os.environ.get('GCP_PROJECT')
    
    request = compute_v1.AggregatedListCommitmentsRequest(project=project_id)
    agg_list = client.aggregated_list(request=request)
    
    for zone, commitment_list in agg_list:
        for commitment in commitment_list.commitments:
            if commitment.status == 'ACTIVE':
                # Calculate utilization
                # Alert if utilization < 50%
                pass
EOF

# Deploy the function
gcloud functions deploy monitor-commitments \
  --runtime python39 \
  --trigger-topic gcp-commitment-alerts \
  --entry-point check_commitment_usage \
  --project="${PROJECT_ID}"
```

**Verification**:
```bash
# 1. List all active commitments
gcloud compute commitments list --project="${PROJECT_ID}" \
  --format='table(name, plan, status, region, endTimestamp)'

# 2. Check commitment utilization
gcloud compute commitments describe <COMMITMENT_NAME> \
  --region=us-central1 --project="${PROJECT_ID}" \
  --format='json' | grep -i utilization

# 3. Calculate savings from commitments
bq query --nouse_legacy_sql \
  'SELECT 
    SUM(CASE WHEN discount_id != "" THEN -CAST(discount_id AS FLOAT64) ELSE 0 END) as commitment_savings,
    SUM(CAST(cost AS FLOAT64)) as total_cost
  FROM `'"${PROJECT_ID}"'.gcp_billing_export_v1.gcp_billing_export_*`
  WHERE _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE("%Y%m%d", DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE("%Y%m%d", CURRENT_DATE())'

# 4. Verify no resource is over-committed
gcloud compute instances list --project="${PROJECT_ID}" \
  --filter='status:RUNNING' --format='json' | \
  jq '.[] | select(.machineType | contains("n1-standard")) | .name'
```

#### 2.4 Instance Right-Sizing

```bash
# AWS: Using Compute Optimizer
aws compute-optimizer get-ec2-instance-recommendations \
  --query 'instanceRecommendations[?recommendation==`Underprovisioned`]' \
  --output table

# Find underutilized instances (CPU < 20%, Memory < 30%)
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average \
  --dimensions Name=InstanceId,Value=i-xxxxxxxxx

# Resize instance (stop first, then change type)
aws ec2 stop-instances --instance-ids i-xxxxxxxxx
aws ec2 modify-instance-attribute \
  --instance-id i-xxxxxxxxx \
  --instance-type "{\"Value\": \"t3.small\"}"
aws ec2 start-instances --instance-ids i-xxxxxxxxx
```

#### 2.5 Storage Optimization

```bash
# Create S3 lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "Archive-old-data",
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
          }
        ],
        "Expiration": {
          "Days": 365
        }
      }
    ]
  }'

# Find and delete orphaned snapshots
aws ec2 describe-snapshots \
  --owner-ids self \
  --query 'Snapshots[?VolumeSize==`100` && StartTime<`2024-01-01`]' \
  --output json

# Delete unused volumes
aws ec2 describe-volumes \
  --filters "Name=status,Values=available" \
  --query 'Volumes[*].[VolumeId,Size,CreateTime]'
```

---

### Phase 3: Governance & Automation (Week 6-8)

#### 3.1 AWS Policy Enforcement

```bash
# Create Lambda function for resource cleanup
cat > cleanup.py << 'EOF'
import boto3
import json
from datetime import datetime, timedelta

ec2 = boto3.client('ec2')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    # Terminate instances stopped > 30 days
    response = ec2.describe_instances(
        Filters=[
            {'Name': 'instance-state-name', 'Values': ['stopped']},
            {'Name': 'state-transition-reason', 'Values': ['*']}
        ]
    )
    
    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            stopped_time = instance['StateTransitionReason']
            if datetime.now() - instance['LaunchTime'].replace(tzinfo=None) > timedelta(days=30):
                ec2.terminate_instances(InstanceIds=[instance['InstanceId']])
                print(f"Terminated {instance['InstanceId']}")
    
    return {
        'statusCode': 200,
        'body': json.dumps('Cleanup completed')
    }
EOF

# Deploy Lambda
aws lambda create-function \
  --function-name FinOps-Cleanup \
  --runtime python3.9 \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-role \
  --handler cleanup.lambda_handler \
  --zip-file fileb://cleanup.zip

# Schedule with EventBridge (daily)
aws events put-rule \
  --name finops-cleanup-schedule \
  --schedule-expression "cron(0 2 * * ? *)"
```

#### 3.2 Azure Policy Enforcement

```bash
# Create policy to require tagging
az policy definition create \
  --name "require-environment-tag" \
  --mode All \
  --rules '{
    "if": {
      "field": "tags[environment]",
      "exists": "false"
    },
    "then": {
      "effect": "deny"
    }
  }'

# Assign policy
az policy assignment create \
  --policy "require-environment-tag" \
  --scope "/subscriptions/{subscription-id}/resourcegroups/production-rg"

# Create auto-shutdown policy
az policy definition create \
  --name "auto-shutdown-dev-resources" \
  --rules '{
    "if": {
      "allOf": [
        {
          "field": "tags[environment]",
          "equals": "development"
        },
        {
          "field": "type",
          "equals": "Microsoft.Compute/virtualMachines"
        }
      ]
    },
    "then": {
      "effect": "deployIfNotExists",
      "details": {
        "type": "Microsoft.DevTestLab/schedules"
      }
    }
  }'
```

#### 3.3 GCP Policy Enforcement

```bash
# Create org policy to restrict VM types
gcloud resource-manager org-policies enforce \
  --project=PROJECT_ID \
  compute.restrictVmExternalIpAccess

# Create budget with alerts
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Monthly-Budget" \
  --budget-amount=5000 \
  --threshold-rule percent=75 \
  --threshold-rule percent=100

# Set up Cloud Function for cost optimization
gcloud functions deploy finops-cleanup \
  --runtime python39 \
  --trigger-topic cost-optimization \
  --entry-point cleanup
```

---

### Phase 4: Monitoring & Continuous Optimization

#### 4.1 Cost Anomaly Detection

```bash
# AWS: Create anomaly detector
aws ce create-anomaly-detector \
  --anomaly-detector '{
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE",
    "MonitorSpecification": {
      "EventType": "COST_INCREASE",
      "Threshold": 0.2
    }
  }'

# Get anomalies
aws ce get-anomalies \
  --date-interval Start=2025-01-01,End=2025-01-31 \
  --feedback NOT_ANOMALOUS

# Azure: Create metric alert for anomalies
az monitor metrics alert create \
  --name "CostAnomalyAlert" \
  --resource-group finops-rg \
  --scopes "/subscriptions/{subscription-id}" \
  --condition "total SpendingAmount > Baseline + 20%"
```

#### 4.2 Reporting & Dashboards

```bash
# AWS: Generate cost report
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=TAG,Key=CostCenter \
  --output json > cost_report.json

# Create email report
cat > send_report.sh << 'EOF'
#!/bin/bash
python3 << 'PYTHON'
import json
import subprocess
from datetime import datetime

# Get cost data
result = subprocess.run(['aws', 'ce', 'get-cost-and-usage', ...], capture_output=True)
costs = json.loads(result.stdout)

# Generate HTML report
html = "<html><body>"
html += f"<h1>Monthly Cost Report - {datetime.now().strftime('%B %Y')}</h1>"
for item in costs['ResultsByTime']:
    html += f"<p>{item}</p>"
html += "</body></html>"

# Send email
subprocess.run(['mail', '-s', 'Monthly FinOps Report', 'team@company.com'], input=html)
PYTHON
EOF

chmod +x send_report.sh
```

---

## Storage

### S3 Cost Optimization

**Implement tiered storage**:
```bash
# Create lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket production-data \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "ArchiveOldLogs",
        "Status": "Enabled",
        "Prefix": "logs/",
        "Transitions": [
          {"Days": 30, "StorageClass": "STANDARD_IA"},
          {"Days": 60, "StorageClass": "GLACIER"},
          {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
        ],
        "Expiration": {"Days": 2555}
      }
    ]
  }'

# Monitor storage usage
aws s3 ls s3://production-data --recursive --summarize
```

### Azure Storage Tiering

```bash
# Create storage account with tiering
az storage account create \
  --name finopsstorage \
  --resource-group finops-rg \
  --access-tier Hot

# Set lifecycle management
az storage account blob-service-properties update \
  --account-name finopsstorage \
  --resource-group finops-rg \
  --enable-delete-retention true
```

---

## Upgrades

### Reserved Capacity Renewal

**Review quarterly**:
```bash
# AWS: Check RI expiration
aws ec2 describe-reserved-instances \
  --filters "Name=state,Values=active" \
  --query 'ReservedInstances[*].[ReservedInstancesId,InstanceType,End,State]'

# Purchase new RIs before expiration
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id rifxxxxxxxx \
  --instance-count 10
```

---

## Disaster Recovery

### Cost-Optimized DR Setup

**Multi-region strategy**:
```bash
# Primary region: full capacity
aws ec2 run-instances \
  --image-id ami-xxxxxxxx \
  --instance-type t3.xlarge \
  --min-count 5 \
  --max-count 5 \
  --region us-east-1

# DR region: on-demand ready, scaled down
aws ec2 run-instances \
  --image-id ami-xxxxxxxx \
  --instance-type t3.xlarge \
  --min-count 2 \
  --max-count 2 \
  --region us-west-2

# Use Reserved Instances in primary, On-demand/Spot in DR
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: High Cloud Costs Without Obvious Root Cause

**Symptoms**:
- Monthly bill 20%+ higher than expected
- No recent major deployments
- Multiple cost drivers unclear

**Diagnostic Procedure**:

```bash
# AWS Diagnosis
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# 1. Analyze costs by service in last 30 days
echo "=== Cost by Service (Last 30 Days) ==="
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[].{Date:TimePeriod.Start, Groups:Groups[?Keys[0]!="Unblended Cost"].{Service:Keys[0],Amount:Metrics.UnblendedCost.Amount}}' \
  --output table | sort -k3 -nr | head -20

# 2. Check for anomalies reported by Cost Anomaly Detection
echo "=== Cost Anomalies ==="
aws ce get-anomalies \
  --date-interval Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --query 'Anomalies[*].[DimensionValues,TotalExpectedSpend,TotalActualSpend,TotalImpact]' \
  --output table

# 3. Find newly created resources
echo "=== Resources Created in Last 7 Days ==="
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=CreateInstance,AttributeValue=CreateDBInstance,AttributeValue=CreateFunction \
  --max-results 50 \
  --query 'Events[*].[EventTime,EventName,CloudTrailEvent]' | grep -o '"instanceId":"[^"]*"' | sort | uniq

# 4. Check for unattached/unused resources
echo "=== Unattached EBS Volumes ==="
aws ec2 describe-volumes \
  --filters "Name=status,Values=available" \
  --query 'Volumes[*].[VolumeId,Size,CreateTime,State]' --output table

echo "=== Unattached Elastic IPs ==="
aws ec2 describe-addresses \
  --filters "Name=association-state,Values=disassociated" \
  --query 'Addresses[*].[PublicIp,AllocationId,AssociationId]' --output table

echo "=== Stopped Instances (>30 days) ==="
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=stopped" \
  --query 'Reservations[*].Instances[?LaunchTime<=`'$(date -d '30 days ago' +%Y-%m-%dT%H:%M:%S)'`].[InstanceId,InstanceType,LaunchTime,BlockDeviceMappings[*].Ebs.VolumeId]' --output table

# 5. Check data transfer costs (common culprit)
echo "=== Data Transfer Analysis ==="
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost,UsageQuantity \
  --group-by Type=DIMENSION,Key=OPERATION \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["EC2 - Data Transfer"]}}' \
  --output table

# 6. Check for Reserved Instance underutilization
echo "=== RI Utilization ==="
aws ce get-reservation-coverage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --group-by Type=DIMENSION,Key=INSTANCE_TYPE \
  --query 'CoveragesByTime[*].Groups[?Keys[0]!="Unblended Cost"]' --output table

# 7. Check for unused NAT Gateways
echo "=== NAT Gateway Charges ==="
aws ec2 describe-nat-gateways \
  --filter "Name=state,Values=available" \
  --query 'NatGateways[*].[NatGatewayId,State,CreateTime,PublicIpAddress]' --output table
```

**Azure Diagnosis**:
```bash
# 1. Top cost drivers by service
az costmanagement query --timeframe LastMonth \
  --type "Usage" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}" \
  --dataset \
    granularity=Daily \
    aggregation='{
      totalCost: {name: PreTaxCost, function: Sum}
    }' \
    grouping='[
      {type: "Dimension", name: "ServiceName"}
    ]'

# 2. Find unused resources
echo "=== Deallocated VMs (not deleted) ==="
az vm list --query "[?powerState=='deallocated'].{Name:name, ResourceGroup:resourceGroup}" --output table

echo "=== Unattached Disks ==="
az disk list --query "[?managedBy==null].{Name:name, SizeGb:diskSizeGb, TimeCreated:timeCreated}" --output table

echo "=== Public IPs Not Associated ==="
az network public-ip list --query "[?ipConfiguration==null].{Name:name, IpAddress:ipAddress, ProvisioningState:provisioningState}" --output table

# 3. Check data egress costs
az monitor metrics list-definitions \
  --resource-group finops-rg \
  --resource-type "Microsoft.Network/publicIPAddresses" \
  --query "[?name.value contains 'Bytes'].name.value"
```

**GCP Diagnosis**:
```bash
# 1. Top services by cost
bq query --nouse_legacy_sql \
  'SELECT 
    service.description,
    ROUND(SUM(CAST(cost AS FLOAT64)), 2) as total_cost,
    COUNT(*) as line_items
  FROM `'"${PROJECT_ID}"'.gcp_billing_export_v1.gcp_billing_export_*`
  WHERE _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE("%Y%m%d", DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE("%Y%m%d", CURRENT_DATE())
  GROUP BY service.description
  ORDER BY total_cost DESC
  LIMIT 20'

# 2. Find idle resources
echo "=== Idle Compute Instances ==="
gcloud compute instances list --format=json | \
  jq '.[] | select(.status=="RUNNING") | 
  {name: .name, zone: .zone, creationTimestamp: .creationTimestamp}'

# 3. Check committed discounts usage
echo "=== Commitment Usage ==="
gcloud compute commitments list --project="${PROJECT_ID}" \
  --format='table(name, plan, status, creationTimestamp)'
```

**Resolution Steps**:
1. Terminate unattached volumes and stopped instances
2. Release unassociated IP addresses  
3. Verify RI/CUD utilization is >80%
4. Check for data transfer - consider CloudFront/CDN
5. Analyze recent changes via CloudTrail/Activity Logs
6. Contact cloud support if cost increase >50%

---

#### Issue 2: RI/Savings Plan Underutilization

**Symptoms**:
- RI/CUD coverage <70%
- Unused capacity "wasting" money

**Diagnosis**:
```bash
# AWS
aws ce get-reservation-coverage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --query 'CoveragesByTime[*].{
    Date: TimePeriod.Start,
    Coverage: Total.CoveragePercentage,
    UnderCovered: Total.CoverageHours.UnCoveredHours
  }' --output table

# Azure
az reservations reservations list --query "[*].[name, expiryDate, utilization.utilized]"

# GCP
gcloud compute commitments list --project="${PROJECT_ID}" \
  --format='table(name, status, region)' | while read name; do
  gcloud compute commitments describe "$name" --region=us-central1
done
```

**Resolution**:
- Buy only 40-60% of peak capacity as reserved
- Use On-Demand/Spot for variable workloads
- Exchange/modify commitments to match actual usage
- Set up automated scaling to match commitment capacity

---

#### Issue 3: Budget Alerts Not Triggering

**AWS Resolution**:
```bash
# 1. Verify budget exists
aws budgets describe-budgets \
  --account-id "${ACCOUNT_ID}" \
  --query 'Budgets[*].[BudgetName, BudgetStatus]'

# 2. Test manually with spike
# Create test resources temporarily to verify alerts trigger

# 3. Check SNS subscription confirmed
aws sns list-subscriptions-by-topic --topic-arn $TOPIC_ARN
```

**Azure Resolution**:
```bash
# Verify alert rule is enabled
az monitor metrics alert show \
  --name "HighSpendAlert-75Percent" \
  --resource-group "${RESOURCE_GROUP}" \
  --query 'enabled'

# Test alert (requires manual cost spike)
```

**GCP Resolution**:
```bash
# Verify Pub/Sub topic has subscribers
gcloud pubsub topics list-subscriptions finops-budget-alerts \
  --project="${PROJECT_ID}"

# Check Cloud Function is deployed
gcloud functions list --project="${PROJECT_ID}" | grep budget
```

---

## Quick Reference: Provider-Specific Commands

### AWS Quick Commands
```bash
# Get yesterday's costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '2 days ago' +%Y-%m-%d),End=$(date -d 'yesterday' +%Y-%m-%d) \
  --granularity DAILY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE

# Stop all dev instances
aws ec2 stop-instances --instance-ids $(aws ec2 describe-instances --filters "Name=tag:Environment,Values=development" --query 'Reservations[*].Instances[*].InstanceId' --output text)

# Find idle RDS instances
aws rds describe-db-instances --query 'DBInstances[?DBInstanceStatus==`available`].[DBInstanceIdentifier,DBInstanceClass,Engine]'
```

### Azure Quick Commands
```bash
# Get top resource groups by cost
az costmanagement query --timeframe LastMonth --type Usage \
  --scope "/" --dataset granularity=Daily aggregation='{totalCost:{name:PreTaxCost,function:Sum}}'

# Stop all dev VMs
az vm list --query "[?tags.Environment=='development'].id" -o tsv | xargs -I {} az vm deallocate --ids {}

# Find unmanaged disks
az disk list --query "[?managedBy==null]"
```

### GCP Quick Commands
```bash
# Get top services by cost
bq query 'SELECT service.description, SUM(CAST(cost AS FLOAT64)) as total FROM `'"$PROJECT_ID"'.gcp_billing_export_v1.gcp_billing_export_*` GROUP BY service.description ORDER BY total DESC'

# Delete idle instances
gcloud compute instances list --filter="lastStopTimestamp<2025-01-01" --format='value(name,zone)' | while read name zone; do
  gcloud compute instances delete "$name" --zone="$zone"
done

# Check commitment coverage
gcloud compute commitments list --format='table(name, status, plan)'
```

---

Complete FinOps infrastructure is now operational with cost visibility, optimization, and governance in place.
Estimated implementation timeline: **8-12 weeks** for full optimization  
Typical cost reduction: **25-40%** with all initiatives implemented
