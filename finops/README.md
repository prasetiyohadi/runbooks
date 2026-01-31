# FinOps: Quick Reference & Implementation Guide

Practical guide for implementing Financial Operations across cloud infrastructure.

---

## Learning Paths

### Beginner Path (2 weeks)
1. **Week 1: Cost Visibility**
   - [CONCEPT.md](CONCEPT.md#3-cost-visibility--measurement) - Set up tagging and dashboards
   - Deploy cost allocation tags (Environment, CostCenter, Owner, Application)
   - Create Cost Explorer dashboard
   - Generate first cost report

2. **Week 2: Basic Optimization**
   - Review [CONCEPT.md](CONCEPT.md#5-resource-optimization-techniques) - Right-sizing
   - Identify top 10 most expensive resources
   - Right-size 3-5 instances (target: 20% savings)
   - Set up budget alerts

**Outcome**: Full visibility + basic cost reduction (15-20% savings)

### Intermediate Path (6 weeks)
1. **Weeks 1-2: Governance & Chargeback**
   - Implement team-based cost allocation
   - Create chargeback model
   - Set departmental budgets

2. **Weeks 3-4: Commitment Strategy**
   - Analyze workload patterns
   - Purchase Reserved Instances
   - Implement Spot instances (non-critical workloads)

3. **Weeks 5-6: Automation**
   - Set up cost anomaly detection
   - Automate resource cleanup
   - Create cost review process

**Outcome**: Managed costs + governance + 40-50% savings

### Advanced Path (3 months)
1. **Month 1: Advanced Optimization**
   - Multi-cloud cost optimization
   - Kubernetes cost management (Kubecost)
   - Architecture optimization

2. **Month 2: ML & Predictions**
   - Implement cost forecasting
   - Anomaly detection with ML
   - Predictive resource scaling

3. **Month 3: FinOps Maturity**
   - Embed FinOps in processes
   - Cultural transformation
   - Continuous optimization program

**Outcome**: Mature FinOps organization (50-60% savings)

---

## Essential Commands Cheatsheet

### AWS Cost Management

```bash
# View monthly costs by service
aws ce get-cost-and-usage \
  --time-period Start=$(date -d 'first day of month' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# List unused Elastic IPs
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null]'

# Find stopped instances (potential cleanup)
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=stopped" \
  --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0],LaunchTime]' \
  --output table

# Reserved Instance recommendations
aws ce get-reservation-purchase-recommendation \
  --service "EC2" \
  --lookback-period THIRTY_DAYS \
  --query 'Recommendations[0:5]'

# Get S3 bucket sizes (identify expensive storage)
aws s3 ls --recursive s3://bucket-name --summarize | tail -1
```

### Azure Cost Management

```bash
# Get current month's spending
az cost-management query start \
  --scope "subscriptions/{subscription-id}" \
  --timeframe MonthToDate \
  --type Usage

# List idle VMs (stopped state)
az vm list \
  --query "[?powerState=='VM deallocated'].[name,resourceGroup]" \
  --output table

# Check resource consumption
az consumption usage list \
  --query "value[*].[meterName,quantity,pretaxCost]" \
  --output table

# Reserved Instance recommendations
az reservations recommendations list --scope "subscriptions/{subscription-id}"
```

### GCP Cost Management

```bash
# Query billing data from BigQuery
bq query --use_legacy_sql=false '
SELECT
  service.description,
  SUM(cost) as total_cost,
  COUNT(*) as line_items
FROM `project.dataset.gcp_billing_export_v1_*`
WHERE DATE(_TABLE_SUFFIX) = CURRENT_DATE()
GROUP BY service
ORDER BY total_cost DESC'

# List idle compute instances (0% CPU avg)
gcloud compute instances list --format json | \
  jq '.[] | select(.status=="RUNNING") | .name'

# Check committed use discounts
gcloud compute commitments list --project=PROJECT_ID
```

---

## Quick Reference Tables

### Instance Right-Sizing Decisions

| Metric | Action | Savings |
|--------|--------|---------|
| CPU < 10% avg, Memory < 25% | Reduce 1-2 sizes | 20-30% |
| CPU 10-30% avg | Reduce 1 size | 15-20% |
| CPU > 80% avg, Memory > 80% | Increase size | Prevent issues |
| Stopped > 7 days | Terminate | 100% |
| Unattached volumes | Delete | $0.10/GB/month |

### Reserved Instance Purchase Decisions

| Workload Type | Commitment | Savings |
|---------------|-----------|---------|
| 24/7 production | 3-year all-upfront | 55-65% |
| 24/7 critical | 1-year partial upfront | 35-45% |
| Peak capacity | Spot + on-demand mix | 70-80% |
| Dev/test | On-demand / Spot | 10-20% |
| Batch jobs | Spot with auto-scaling | 70-90% |

### Storage Tiering Strategy

| Tier | Use Case | Access Pattern | Cost |
|------|----------|-----------------|------|
| Hot (Standard) | Active data | Daily | $0.023/GB |
| Warm (IA) | Occasional access | Weekly | $0.0125/GB |
| Cold (Glacier) | Archive/compliance | Monthly+ | $0.004/GB |

### Typical Optimization Timeline

| Phase | Duration | Effort | Savings | Tools |
|-------|----------|--------|---------|-------|
| Visibility (Phase 1) | 1-2 months | Low | 5-10% | Cost Explorer, tagging |
| Optimization (Phase 2) | 2-3 months | Medium | 25-35% | Right-sizing, RI, Spot |
| Automation (Phase 3) | 2-3 months | Medium | 35-45% | Policies, Lambda, ML |
| Maturity (Phase 4) | 3-6 months | High | 45-55% | Embedded processes |

---

## FAQ

### Q: What's the typical payback for FinOps investment?

**A**: Most organizations see payback in 3-6 months:
- Month 1-2: Foundation setup ($10-20K investment, $50-100K savings)
- Month 3-4: Optimization phase (automated, $100-200K savings)
- Month 5+: Continuous improvements ($150-300K savings recurring)

ROI Timeline: Positive in 60-90 days, 300-400% annual ROI

### Q: Should we move everything to Spot instances?

**A**: No. Use this strategy:
```
Spot + On-demand Mix:
  - Critical services: 100% on-demand or 1-year RI
  - High-availability services: 50% Spot + 50% on-demand
  - Batch/non-critical: 80-100% Spot
  - Dev/test: 100% Spot (cost-optimal)
```

### Q: How do we handle multi-cloud cost optimization?

**A**: Compare normalized costs:
```
1. Choose equivalent resource specs
2. Calculate all-in cost (compute + storage + transfer)
3. Factor in commitment discounts
4. Consider operational complexity
5. Use price vs. value matrix

Example: GCP might be cheaper for storage,
Azure for compute, AWS for breadth of services
```

### Q: What's the best tagging strategy?

**A**: Use hierarchical tags:
```yaml
# Mandatory (all resources)
Environment: production | staging | development
CostCenter: cc-001
Owner: team@company.com
Application: app-name

# Optional (context-specific)
AutoShutdown: true | false
Backup: daily | weekly | monthly
Compliance: hipaa | sox | pci-dss
```

### Q: How frequently should we review costs?

**A**: Implement tiered reviews:
```
Daily:   Automated anomaly alerts (cost spikes)
Weekly:  Team cost review (project status)
Monthly: Departmental review (budget vs. actual)
Quarterly: Strategic review (trends, forecasts)
```

### Q: What's a realistic savings target?

**A**: By phase:
```
Phase 1 (Visibility):     5-10% savings
Phase 2 (Optimization):  30-40% savings
Phase 3 (Automation):    40-50% savings
Phase 4 (Maturity):      50-60% savings

Total potential: 50-60% reduction from Day 1 costs
```

### Q: How do we prevent cost creep after optimization?

**A**: Implement continuous governance:
```
1. Weekly anomaly alerts (detect spikes)
2. Monthly budget reviews (vs. forecast)
3. Quarterly reserved capacity analysis
4. Annual architecture reviews
5. Automated policy enforcement
6. Team incentive programs
```

### Q: Should FinOps be a dedicated team?

**A**: Depends on organization size:
```
< $100K/month:  Part-time (finance + ops)
$100-500K/month: 1 FTE + distributed team
$500K+/month:    3-5 FTE dedicated team

Distributed model: Embed cost awareness in all teams
```

---

## Production Checklist

### Pre-Implementation
- [ ] Executive sponsorship and budget approved
- [ ] Cross-functional team identified (finance, eng, ops)
- [ ] Current cloud spend baseline calculated
- [ ] Cost data sources accessible
- [ ] Reporting tools selected

### Phase 1: Foundation
- [ ] Tagging policy documented and enforced
- [ ] Cost allocation model designed
- [ ] Dashboard created and accessible
- [ ] Chargeback process established
- [ ] Monthly reporting process running

### Phase 2: Optimization
- [ ] Reserved Instances purchased (cover 50%+ of compute)
- [ ] Spot instances deployed (20-30% of workload)
- [ ] Right-sizing complete (top 100 resources)
- [ ] Storage lifecycle policies active
- [ ] Budget alerts configured

### Phase 3: Automation
- [ ] Cost anomaly detection implemented
- [ ] Auto-cleanup policies deployed
- [ ] Commitment purchasing automated
- [ ] Cost forecasting model built
- [ ] Team training completed

### Phase 4: Governance
- [ ] Policies enforced (via code/automation)
- [ ] Cost data embedded in architecture decisions
- [ ] FinOps culture established
- [ ] Continuous improvement process active
- [ ] Annual strategic review scheduled

---

## Key Metrics Dashboard

### Primary Metrics (Weekly)
- Total cloud spend (current month forecast)
- Cost vs. budget (% of allocation used)
- Top 5 cost drivers (by service)
- Cost anomalies detected (yes/no)

### Secondary Metrics (Monthly)
- Cost per transaction / user / API call
- Cost trend (MoM % change)
- Cost by environment (prod/staging/dev)
- Optimization savings achieved ($)
- RI utilization rate (%)
- Spot savings achieved ($)

### Strategic Metrics (Quarterly)
- Cost per dollar revenue
- Cloud ROI improvement
- Team adoption of cost practices
- Forecast accuracy vs. actual
- Year-over-year cost reduction

---

## Support & Resources

### Documentation
- [CONCEPT.md](CONCEPT.md) - Complete technical reference (15+ sections)
- [RUNBOOK.md](RUNBOOK.md) - Infrastructure and monitoring setup
- [WORKSHOP.md](WORKSHOP.md) - Hands-on labs and exercises
- [BUSINESS.md](BUSINESS.md) - Business case and ROI analysis

### Tools
- **AWS**: Cost Explorer, Trusted Advisor, Compute Optimizer, CloudWatch
- **Azure**: Cost Analysis, Azure Advisor, Log Analytics
- **GCP**: Cost Management, Recommender API, BigQuery

### Community
- FinOps Foundation: https://www.finops.org/
- Cloud Economic Council (CEC)
- GitHub FinOps community

### Training
- FinOps Fundamentals certification
- Cloud provider cost training
- Organization-specific workshops

---

## Contributing

Found an issue or want to improve this guide? Please:
1. Check existing issues
2. Create detailed bug report or feature request
3. Propose changes with examples
4. Include relevant cost data / metrics

---

**Last Updated**: 2025-01-31  
**Version**: 1.0  
**Maintainer**: FinOps Team
