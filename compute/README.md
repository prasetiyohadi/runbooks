# Compute Infrastructure: Quick Reference & Learning Paths

Essential guides and checklists for compute infrastructure management.

---

## 1. Learning Paths

### Beginner: Fundamentals (2-3 weeks)

```
Week 1: Core Concepts
├─ Read: Compute Spectrum Overview (CONCEPT.md §1)
├─ Understand: Physical vs. Virtual vs. Cloud
├─ Lab: Launch first VM/instance
│  ├─ AWS: Launch EC2 instance
│  ├─ Azure: Create Azure VM
│  └─ Local: Spin up VirtualBox VM
└─ Goal: Comfortable with basic instance creation

Week 2: Virtualization Basics
├─ Read: Virtualization & Hypervisors (CONCEPT.md §3)
├─ Understand: vSphere, KVM, Hyper-V basics
├─ Lab: Create and configure 2-3 VMs
│  ├─ CPU/memory sizing
│  ├─ Network configuration
│  └─ Storage attachment
└─ Goal: Understand VM resource allocation

Week 3: Cloud Compute Platforms
├─ Read: Cloud Compute Platforms (CONCEPT.md §4)
├─ Understand: EC2, Azure VMs, GCP Compute
├─ Lab: Compare instance types
│  ├─ Size up, size down an instance
│  ├─ Monitor costs
│  └─ Try spot instances
└─ Goal: Comfortable with cloud pricing models
```

**Beginner Milestones**:
- ✓ Create and manage VMs across one platform
- ✓ Understand compute spectrum tradeoffs
- ✓ Comfortable with cloud pricing

### Intermediate: Architecture & Operations (3-4 weeks)

```
Week 1-2: Container Basics
├─ Read: Container Orchestration (CONCEPT.md §5)
├─ Understand: Kubernetes fundamentals
├─ Lab: Deploy application in Kubernetes
│  ├─ Minikube or managed K8s (EKS/AKS/GKE)
│  ├─ Create Deployment, Service
│  ├─ Scale pods with HPA
│  └─ Deploy multiple replicas
└─ Goal: Comfortable with K8s basics

Week 2-3: Performance & Tuning
├─ Read: Performance Tuning (CONCEPT.md §7)
├─ Understand: Network, disk, JVM tuning
├─ Lab: Tune instance for workload
│  ├─ Monitor actual resource usage
│  ├─ Apply tuning guidelines
│  ├─ Measure performance improvement
│  └─ Document changes
└─ Goal: 10-20% performance improvement achieved

Week 3-4: Scaling & Cost Optimization
├─ Read: Scaling Strategies (CONCEPT.md §8)
├─ Read: Cost Optimization (CONCEPT.md §9)
├─ Lab: Implement auto-scaling
│  ├─ Configure scaling policies
│  ├─ Set up cost monitoring
│  ├─ Right-size instances
│  └─ Calculate potential savings
└─ Goal: Understand scaling architecture
```

**Intermediate Milestones**:
- ✓ Deploy and manage Kubernetes cluster
- ✓ Implement auto-scaling for workload
- ✓ Reduce costs 20-30% via optimization
- ✓ Achieve 60-70% CPU utilization target

### Advanced: Design & Multi-Cloud (4-6 weeks)

```
Week 1-2: High Availability & DR
├─ Read: Disaster Recovery & HA (CONCEPT.md §10)
├─ Understand: Multi-AZ, multi-region strategies
├─ Lab: Design HA/DR architecture
│  ├─ Multi-AZ deployment
│  ├─ Automated failover testing
│  ├─ Backup strategy implementation
│  └─ RTO/RPO validation
└─ Goal: Achieve RPO < 1 hour, RTO < 15 minutes

Week 2-3: Security & Compliance
├─ Read: Security & Compliance (CONCEPT.md §11)
├─ Understand: PCI DSS, HIPAA, SOC 2
├─ Lab: Implement security hardening
│  ├─ Security scanning
│  ├─ Compliance automation
│  ├─ Access control verification
│  └─ Audit logging
└─ Goal: Pass compliance audit

Week 3-5: Migration & IaC
├─ Read: Migration Strategies (CONCEPT.md §13)
├─ Understand: Lift & shift, containerization
├─ Lab: Migrate workload to new platform
│  ├─ Plan migration
│  ├─ Execute migration
│  ├─ Validate post-migration
│  └─ Decommission old infrastructure
├─ IaC: Write Terraform/CloudFormation
│  ├─ Infrastructure as code
│  ├─ Version control
│  └─ Reproducible deployments
└─ Goal: Infrastructure fully codified

Week 5-6: Multi-Cloud Management
├─ Understand: Hybrid and multi-cloud architectures
├─ Lab: Deploy across AWS, Azure, GCP
│  ├─ Cost optimization across clouds
│  ├─ Disaster recovery across regions
│  └─ Load balancing across clouds
└─ Goal: Multi-cloud architecture design
```

**Advanced Milestones**:
- ✓ Design and implement HA/DR architecture
- ✓ Pass compliance audit (PCI/HIPAA/SOC 2)
- ✓ Full infrastructure as code deployment
- ✓ Multi-cloud workload management

---

## 2. Essential Commands Cheatsheet

### AWS EC2

```bash
# List instances
aws ec2 describe-instances --region us-east-1 \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name,PrivateIpAddress]'

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name my-key \
  --security-group-ids sg-12345678 \
  --subnet-id subnet-12345678

# Stop instance
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Start instance
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Terminate instance
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0

# Monitor CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300 \
  --statistics Average
```

### Azure VMs

```bash
# List VMs
az vm list --output table

# Create VM
az vm create \
  --resource-group myResourceGroup \
  --name myVM \
  --image UbuntuLTS \
  --size Standard_B2s \
  --generate-ssh-keys

# Start VM
az vm start --resource-group myResourceGroup --name myVM

# Stop VM
az vm deallocate --resource-group myResourceGroup --name myVM

# Delete VM
az vm delete --resource-group myResourceGroup --name myVM

# Monitor metrics
az monitor metrics list-definitions \
  --resource /subscriptions/{subscription}/resourceGroups/{group}/providers/Microsoft.Compute/virtualMachines/{vm}
```

### GCP Compute Engine

```bash
# List instances
gcloud compute instances list

# Create instance
gcloud compute instances create my-instance \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud

# Start instance
gcloud compute instances start my-instance --zone=us-central1-a

# Stop instance
gcloud compute instances stop my-instance --zone=us-central1-a

# Delete instance
gcloud compute instances delete my-instance --zone=us-central1-a

# SSH into instance
gcloud compute ssh my-instance --zone=us-central1-a
```

### Kubernetes

```bash
# Get pods
kubectl get pods -A

# Get nodes
kubectl get nodes -o wide

# Describe pod
kubectl describe pod <pod-name> -n <namespace>

# View logs
kubectl logs <pod-name> -n <namespace>
kubectl logs -f <pod-name> -n <namespace>  # Follow

# Create deployment
kubectl create deployment nginx --image=nginx:latest
kubectl scale deployment nginx --replicas=3

# View events
kubectl get events -n <namespace>

# Execute command in pod
kubectl exec -it <pod-name> -n <namespace> -- /bin/bash

# Port forward
kubectl port-forward <pod-name> 8080:8080
```

### Linux Performance Monitoring

```bash
# CPU usage
top -b -n 1
htop

# Memory usage
free -h
vmstat 1 10

# Disk I/O
iostat -xz 1
iotop

# Network
iftop
netstat -an | grep ESTABLISHED | wc -l  # Connection count

# Process CPU/memory
ps aux --sort=-%cpu | head -10

# System load
uptime
cat /proc/loadavg

# Kernel messages
dmesg -f | tail -50
journalctl -xe
```

### Docker Commands

```bash
# Build image
docker build -t myapp:1.0 .

# Run container
docker run -d -p 8080:8080 --name myapp myapp:1.0

# List containers
docker ps -a

# View logs
docker logs -f myapp

# Stop container
docker stop myapp

# Remove container
docker rm myapp

# Push to registry
docker tag myapp:1.0 myregistry.azurecr.io/myapp:1.0
docker push myregistry.azurecr.io/myapp:1.0

# Resource limits
docker run -d --cpus="0.5" --memory="512m" myapp:1.0
```

---

## 3. Quick Reference Tables

### Instance Type Selection Matrix

| Workload | AWS | Azure | GCP | Characteristics |
|----------|-----|-------|-----|-----------------|
| Web servers | t3/t4g | B/D | e2 | Low cost, burstable |
| App servers | m5/m6i | D/E | n2/n2d | Balanced |
| Batch processing | c5/c6i | F/H | c2/n1 | High CPU |
| Databases | r5/r6i | E/M | m2 | High memory |
| Graphics/ML | g4/p3 | NC/ND | n1-highmem | GPU/Accelerator |

### Pricing Comparison (per vCPU/month, approx)

| Instance Size | AWS On-Demand | AWS 1-Year RI | Azure (Pay-as-you-go) | GCP (Monthly Commit) |
|---------------|---------------|--------------|-----------------------|----------------------|
| 1 vCPU, 4GB | $30 | $9 (70% off) | $25 | $8 (73% off) |
| 4 vCPU, 16GB | $120 | $36 (70% off) | $100 | $32 (73% off) |
| 8 vCPU, 32GB | $240 | $72 (70% off) | $200 | $64 (73% off) |

### Scaling Decision Matrix

| Metric | Horizontal | Vertical | Both |
|--------|-----------|----------|------|
| **Can grow beyond hardware limit** | ✓ | ✗ | ✓ |
| **Implementation complexity** | Medium | Low | High |
| **Cost efficiency** | High | Medium | Optimal |
| **Response time (to scale)** | 30s-5m | 5-10 min | Balanced |
| **Stateless workloads** | ✓✓✓ | ✓ | ✓✓ |
| **Stateful workloads** | Medium | ✓✓ | ✓ |

### Resource Allocation Guidelines

| Workload | CPU | Memory | Disk |
|----------|-----|--------|------|
| Web server (nginx) | 0.1-0.5 | 128-256MB | 1GB |
| App server (Java) | 0.5-2 | 1-4GB | 10GB |
| Database (PostgreSQL) | 2-8 | 4-32GB | 50GB+ |
| Cache (Redis) | 1-4 | 8-64GB | 100GB |
| Message queue (Kafka) | 2-8 | 8-32GB | 500GB+ |

---

## 4. Troubleshooting Guide

### High CPU Utilization

```
Symptom: CPU consistently above 80%
Diagnosis:
├─ Check top/htop for high-CPU processes
├─ Review application logs for errors
├─ Check if runaway process exists
└─ Verify no DDoS/brute force attack

Resolution:
├─ Quick: Restart service/pod
├─ Medium: Scale up instance size
├─ Long-term: Optimize code, add auto-scaling
└─ Investigate: Performance bottleneck analysis
```

### Out of Memory (OOM)

```
Symptom: Application crashes, "Killed" in kernel logs
Diagnosis:
├─ Check free memory: free -h
├─ Review memory limits: ulimit -a
├─ Check application memory usage
└─ Review logs for OOM killer invocation

Resolution:
├─ Quick: Restart service to flush memory
├─ Medium: Increase instance memory
├─ Long-term: Optimize code, reduce memory footprint
└─ Investigate: Memory leak detection (Valgrind, jmap)
```

### Disk Space Full

```
Symptom: Write errors, application crashes
Diagnosis:
├─ Check disk usage: df -h
├─ Find large files: du -sh /* | sort -h
├─ Check for old logs: find /var/log -name "*.log" -mtime +30
└─ Review application-specific storage

Resolution:
├─ Quick: Clean old logs, temporary files
├─ Medium: Expand disk/volume
├─ Long-term: Implement log rotation, cleanup jobs
└─ Investigate: Storage capacity planning
```

### Network Connectivity Issues

```
Symptom: Slow performance, timeouts, connection refused
Diagnosis:
├─ Check network connectivity: ping, traceroute
├─ Verify security groups/NSGs
├─ Check network metrics (packet loss, latency)
├─ Review DNS resolution
└─ Verify firewall rules

Resolution:
├─ Quick: Restart networking
├─ Medium: Adjust security group rules
├─ Long-term: Network architecture optimization
└─ Investigate: Latency analysis (mtr, tcpdump)
```

### Instance Won't Start

```
Symptom: Instance fails to boot, not available
Diagnosis:
├─ Check instance logs (console output)
├─ Verify storage/image integrity
├─ Check for hardware issues
├─ Review resource limits
└─ Check if EBS volume attached

Resolution:
├─ Quick: Reboot instance
├─ Medium: Launch new instance from same image
├─ Long-term: Use EBS snapshots, backup strategy
└─ Investigate: Boot failure root cause
```

---

## 5. FAQ

### Q: Should I use physical servers, VMs, or cloud?

**A**: Depends on your requirements:
- **Physical**: High-performance, long-term, regulated (dedicated hardware)
- **VMs**: On-prem consolidation, flexibility, existing infrastructure
- **Cloud**: Elasticity, global reach, minimal ops burden
- **Best practice**: Hybrid approach based on workload characteristics

---

### Q: How many vCPUs/memory should my instance have?

**A**: Use this sizing process:
1. Monitor actual usage of similar applications
2. Add 30-50% buffer for peaks
3. Set CPU target at 60-70% utilization
4. Set memory target at 70-80% utilization
5. Review and adjust quarterly

Example: App averages 2 vCPU, peaks at 3 vCPU
- Recommended: 4-5 vCPU (30-50% overhead)

---

### Q: How do I reduce compute costs?

**A**: Multi-pronged approach:
1. **Right-sizing**: Match resources to actual need (40% of waste)
2. **Reserved instances**: 60-70% discount for committed workloads
3. **Spot/Preemptible**: 80-90% discount for non-critical
4. **Shutdown unused**: Development/test environments
5. **Auto-scaling**: Scale down during low-traffic periods
6. **Container consolidation**: Higher density than VMs (50-70% savings)

Expected savings: 40-60% via combination

---

### Q: What's the difference between reserved and spot instances?

**A**:
| Feature | Reserved | Spot |
|---------|----------|------|
| Cost | 30-70% off | 80-90% off |
| Availability | Guaranteed | Interruptible |
| Duration | 1-3 years | Minutes to hours |
| Best for | Baseline workloads | Batch, non-critical |
| Use case | Production apps | Development, CI/CD |

---

### Q: How do I implement high availability?

**A**: Multi-step approach:
1. Multi-AZ deployment (at least 2 zones)
2. Health checks on load balancer
3. Auto-recovery on failure
4. RDS Multi-AZ or database replication
5. Automated backups + restore testing
6. Incident response runbook

Result: RTO < 5 minutes, RPO < 1 hour, 99.99% uptime

---

### Q: Should I use Kubernetes?

**A**: Consider if you have:
- ✓ Multiple applications (consolidation benefit)
- ✓ Dynamic workloads (scaling benefit)
- ✓ Multi-team environment (isolation benefit)
- ✓ Desire for cloud-agnostic platform
- ✗ Single application, static workload (over-engineered)
- ✗ Small team, no DevOps expertise (steep learning curve)

**Alternative**: If you only have 1-2 applications, consider ECS, App Service, or managed serverless

---

## 6. Production Readiness Checklist

```
Capacity Planning:
☐ Baseline workload documented
☐ Peak usage analyzed (historical data)
☐ Growth rate calculated (12-month forecast)
☐ Headroom allocated (30-50% buffer)
☐ Quarterly reviews scheduled

Cost Management:
☐ Reserved instances purchased for baseline
☐ Spot instances for variable load
☐ Right-sizing verified (CPU/memory targets)
☐ Cost allocation tags applied
☐ Budget alerts configured

High Availability:
☐ Multi-AZ deployment
☐ Auto-scaling configured
☐ Health checks enabled
☐ Load balancer active
☐ Failover tested

Security:
☐ Security groups/NSGs locked down
☐ SSH/RDP access restricted
☐ Encryption enabled (data at rest, in transit)
☐ Firewall rules verified
☐ Security scanning passed

Monitoring:
☐ CPU, memory, disk, network metrics collected
☐ Alerts configured (email, PagerDuty)
☐ Dashboards created (Grafana, CloudWatch)
☐ Logging enabled (application, system)
☐ APM tool configured (optional but recommended)

Backup & DR:
☐ Backup policy defined
☐ Backup tested (restore procedure verified)
☐ RTO < threshold (hours)
☐ RPO < threshold (hours)
☐ Disaster recovery runbook created

Documentation:
☐ Architecture diagram
☐ Deployment runbook
☐ Operations runbook
☐ Troubleshooting guide
☐ Incident response procedures
☐ Team trained on infrastructure
```

---

## 7. Cost Calculation Examples

### Example 1: Single Web Application

```
Scenario: Small web app, 1000 users, 50% utilization during peak

Infrastructure:
├─ 2× web servers (t3.large)
├─ 1× database (db.t3.medium RDS)
├─ Load balancer
└─ NAT gateway for outbound traffic

Monthly Costs (AWS US East 1):
  2× t3.large on-demand: 2 × 730 × $0.1037 = $151
  db.t3.medium on-demand: 730 × $0.245 = $179
  RDS storage (100GB): $25
  Load balancer: $16
  NAT gateway: $45 (1TB outbound)
  ──────────────────────────────────
  Total: ~$416/month on-demand

With Reserved Instances (70% discount):
  2× t3.large reserved: 2 × 730 × $0.031 = $45
  db.t3.medium reserved: 730 × $0.074 = $54
  Storage + LB + NAT: $86
  ──────────────────────────────────
  Total: ~$185/month (55% savings)
```

### Example 2: Large SaaS Application

```
Scenario: 100K users, 24/7 operation, strict availability

Infrastructure:
├─ 20× app servers (m5.large) - 2 per AZ across 5 regions
├─ 2× cache layers (r5.2xlarge)
├─ 5× database replicas (db.r5.2xlarge)
├─ Load balancers (5 regions)
├─ Message queues, monitoring
└─ Multi-region setup

Monthly Costs (5 regions):
  
Compute (on-demand):
  20 app servers: 20 × 730 × $0.192 = $2,803
  2 caches: 2 × 730 × $1.46 = $2,132
  5 databases: 5 × 730 × $1.46 = $5,330
  ──────────────────────────────── = $10,265

With Reserved Instances + Spot (65% avg discount):
  Baseline (70% of resources reserved): $3,593
  Variable (30% spot at 85% discount): $476
  ──────────────────────────────── = $4,069

Additional (load balancers, storage, data transfer): $2,000
  ──────────────────────────────
  Total: ~$6,069/month optimized (vs. $12K on-demand)
```

---

## 8. Maturity Levels & Roadmap

### Level 1: Basic (Current)
- Manual deployments
- Single datacenter/region
- No auto-scaling
- Minimal monitoring
- Estimated adoption: Start here

### Level 2: Standardized
- Infrastructure as Code
- Multi-AZ deployment
- Auto-scaling enabled
- Centralized monitoring
- Timeline: 3-6 months

### Level 3: Optimized
- Container orchestration (Kubernetes)
- Multi-cloud deployment
- 99.99% uptime SLA
- Cost optimization 40-60%
- Timeline: 6-12 months from Level 1

### Level 4: Advanced
- AI-driven resource optimization
- Chaos engineering, automated resilience
- Cross-cloud failover
- Serverless for elastic workloads
- Timeline: 12-18 months from Level 1

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Audience**: Engineers, DevOps, Architecture  
**Contact**: Infrastructure Team
