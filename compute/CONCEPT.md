# Compute Infrastructure: Comprehensive Technical Reference

Complete guide to compute technologies from physical servers to cloud-native instances.

---

## Table of Contents

1. [Compute Spectrum Overview](#compute-spectrum-overview)
2. [Physical Servers & Bare Metal](#physical-servers--bare-metal)
3. [Virtualization & Hypervisors](#virtualization--hypervisors)
4. [Cloud Compute Platforms](#cloud-compute-platforms)
5. [Container Orchestration](#container-orchestration)
6. [Resource Management](#resource-management)
7. [Performance Tuning](#performance-tuning)
8. [Scaling Strategies](#scaling-strategies)
9. [Cost Optimization](#cost-optimization)
10. [Disaster Recovery & High Availability](#disaster-recovery--high-availability)
11. [Security & Compliance](#security--compliance)
12. [Monitoring & Observability](#monitoring--observability)
13. [Migration Strategies](#migration-strategies)
14. [Best Practices](#best-practices)
15. [Production Checklist](#production-checklist)

---

## 1. Compute Spectrum Overview

### The Compute Continuum

```
┌─────────────────────────────────────────────────────────────┐
│              Compute Technology Spectrum                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Physical Servers                                            │
│   ├─ Bare metal hardware                                   │
│   ├─ On-premise data centers                               │
│   └─ High performance compute (HPC)                        │
│        ↓ (Control, Performance)                           │
│                                                              │
│ Virtualization                                              │
│   ├─ VMware vSphere                                        │
│   ├─ KVM (Linux)                                           │
│   └─ Hyper-V (Windows)                                     │
│        ↓ (Efficiency, Consolidation)                      │
│                                                              │
│ Cloud Compute                                               │
│   ├─ AWS EC2, Azure VMs, GCP Compute Engine               │
│   ├─ Dedicated hosts vs. shared infrastructure            │
│   └─ Burstable vs. reserved instances                     │
│        ↓ (Flexibility, Scale)                             │
│                                                              │
│ Container Orchestration                                     │
│   ├─ Kubernetes (self-managed vs. managed)                │
│   ├─ ECS, AKS, GKE                                         │
│   └─ Serverless (Lambda, Functions)                       │
│        ↓ (Density, Automation)                            │
│                                                              │
│ Serverless                                                  │
│   ├─ AWS Lambda, Azure Functions, GCP Cloud Functions    │
│   ├─ Event-driven, auto-scaling                           │
│   └─ Managed infrastructure                               │
│        ↓ (Scale-to-zero, Simplicity)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Tradeoff Axis:
  Control    ← → Simplicity
  Performance ← → Elasticity
  Cost       ← → Flexibility
```

### Key Characteristics by Layer

| Layer | Control | Performance | Cost | Scaling | Time to Deploy |
|-------|---------|-------------|------|---------|-----------------|
| **Physical** | Maximum | Optimal | High | Slow | Weeks |
| **Virtualization** | High | Good | Medium | Medium | Hours |
| **Cloud VMs** | Medium | Good | Variable | Fast | Minutes |
| **Containers** | Medium | Good | Low-Medium | Very Fast | Seconds |
| **Serverless** | Low | Fair | Pay-as-used | Automatic | Milliseconds |

---

## 2. Physical Servers & Bare Metal

### Characteristics

```
Bare Metal Hardware:
├─ No hypervisor overhead → optimal performance
├─ Direct hardware access → specialized workloads
├─ On-premise or dedicated cloud (AWS Bare Metal, Azure Dedicated Host)
├─ Predictable performance (no noisy neighbor)
└─ High upfront cost, long lifecycle (5-7 years)
```

### Use Cases

```
Physical servers optimal for:
├─ High-performance computing (HPC) clusters
├─ Databases with strict latency requirements (<1ms)
├─ GPU/ML workloads requiring full performance
├─ Financial systems (trading, settlement)
├─ Regulated compliance (dedicated hardware required)
└─ Very long-term workloads (5+ year horizon)
```

### Server Components

```
CPU Architecture:
  Intel Xeon:     Enterprise standard, 2-socket, 24-96 cores
  AMD EPYC:       Competitive, 2-socket, up to 128 cores
  ARM (Graviton): Cloud native, energy efficient

Memory:
  Per-server: 128GB - 2TB+
  NUMA aware (architecture consideration for applications)

Storage:
  NVMe SSDs:  Ultra-high IOPS (1M+)
  SAS SSDs:   High endurance, battery-backed cache
  RAID:       Hardware RAID 1/5/6/10 for reliability

Network:
  10GbE Standard, 25GbE/40GbE/100GbE for high-performance
  NIC bonding for redundancy
```

### Management Tools

```
Physical Server Management:
├─ IPMI (Intelligent Platform Management Interface)
├─ Redfish API (modern replacement)
├─ Out-of-band management (separate network)
├─ Power management, console access
├─ Firmware/BIOS updates
└─ Health monitoring (temperature, fans, power)
```

### TCO Calculation

```
5-Year Total Cost of Ownership:

Hardware Cost:
  1x Server (48-core, 512GB):         $25,000
  Network switches, cables:            $5,000
  Rack, power, cooling:                $10,000
  Subtotal:                           $40,000

Operational Costs (5 years):
  Power: 1000W × 24hrs × 365 × 5 × $0.12/kWh =  $5,260
  Cooling: ~equal to power =                      $5,260
  Space: $500/month × 60 months =                $30,000
  Staffing: 0.5 FTE × $150K/year × 5 =         $375,000
  Maintenance: $5K/year × 5 =                   $25,000
  Subtotal:                                    $440,520

Total 5-Year Cost:                            ~$480,520
Per-Year Cost:                                ~$96,104
```

---

## 3. Virtualization & Hypervisors

### Hypervisor Types

#### Type 1: Bare Metal Hypervisors

```
ESXi (VMware)      - Enterprise standard, no OS
Hyper-V            - Microsoft, integrated with Windows Server
KVM                - Linux-based, open-source, production-grade
Xen                - Lightweight, containerization support
```

**Characteristics**:
- Direct hardware access
- Lower overhead (no host OS layer)
- Better performance
- Higher cost/complexity

#### Type 2: Hosted Hypervisors

```
VirtualBox         - Free, development/testing
VMware Fusion      - Mac/Linux, development
Parallels Desktop  - Mac, consumer-focused
```

**Characteristics**:
- Run on existing OS
- Lower performance
- Simpler deployment
- Development/testing focus

### VM Resource Allocation

```
vCPU Allocation:
├─ 1 vCPU: Web servers, caches, development
├─ 2-4 vCPU: Application servers, small databases
├─ 8-16 vCPU: Database servers, batch processing
└─ 32+ vCPU: Analytics, specialized workloads

Memory Allocation:
├─ 512MB-1GB: Web servers
├─ 2-4GB: Application servers
├─ 8-32GB: Database servers
├─ 64GB+: In-memory caches, analytics
└─ Note: Over-subscription possible (memory ballooning), not recommended

Storage:
├─ Thin provisioning: Allocate max, use as needed
├─ Thick provisioning: Pre-allocate all space (performance)
├─ Snapshots: Point-in-time copies (use carefully)
└─ Consider I/O patterns: IOPS, latency, throughput
```

### VM Density Calculation

```
Example: 2-socket server with 48 cores, 512GB RAM

Conservative deployment (for production):
  CPU: 48 cores ÷ 2 vCPU per VM = 24 VMs max
  Memory: 512GB ÷ 8GB per VM = 64 VMs max
  → Limited by CPU: ~20-24 VMs for production

Moderate deployment:
  CPU: 48 cores ÷ 4 vCPU per VM = 12 VMs
  Memory: 512GB ÷ 32GB per VM = 16 VMs
  → Balanced: ~12-14 VMs per server

High-density deployment (dev/test):
  CPU: 48 cores ÷ 1 vCPU per VM = 48 VMs
  Memory: 512GB ÷ 2GB per VM = 256 VMs
  → Limited by CPU: ~40-48 small VMs

Production Rule of Thumb:
  CPU oversubscription: 1:3 to 1:5 (1 physical core : 3-5 vCPU)
  Memory oversubscription: 1:1.2 to 1:1.5 (limited ballooning)
```

### vSphere Architecture

```
ESXi Cluster Configuration:

┌──────────────────────────────────────────┐
│       vCenter Server (Management)         │
└──────────────────────────────────────────┘
         │
    ┌────┼────┬─────┐
    ▼    ▼    ▼     ▼
┌─────┬─────┬─────┬─────┐
│ESXi1│ESXi2│ESXi3│ESXi4│  (4-node cluster)
├─────┼─────┼─────┼─────┤
│ VM1 │ VM2 │ VM3 │ VM4 │
│ VM5 │ VM6 │ VM7 │ VM8 │
│ ... │ ... │ ... │ ... │
└─────┴─────┴─────┴─────┘
    │       │       │       │
    └───────┴───────┴───────┘
       Shared Storage (SAN/NFS)
         - VMFS datastore
         - VM files, snapshots
         - HA/DRS enabled
```

**Key Features**:
- vSphere HA: VM restart on host failure
- vSphere DRS: Load balancing, performance optimization
- Storage vMotion: Live migration between datastores
- vSphere Replication: Disaster recovery
- vSAN: Distributed storage (no SAN required)

---

## 4. Cloud Compute Platforms

### AWS EC2

```
Instance Types:
├─ General Purpose (M-series): Web, app servers, development
├─ Compute Optimized (C-series): Batch, HPC, analytics
├─ Memory Optimized (R/X-series): Databases, in-memory caches
├─ GPU/Accelerated (G/P/F-series): ML, graphics, HPC
├─ Storage Optimized (I/D/H-series): NoSQL, data warehousing
└─ Burstable (T-series): Low-traffic workloads, development

Instance Size Strategy:
├─ Right-sizing: Match workload requirements
├─ Monitor CloudWatch metrics: CPU, memory, network
├─ Adjust size based on actual utilization
└─ Rule of thumb: 30-40% average utilization optimal
```

### Azure VMs

```
VM Types:
├─ General Purpose (B/D/E-series): Development, testing
├─ Compute Optimized (F/H-series): Web, app servers
├─ Memory Optimized (D-series): Databases, in-memory
├─ GPU Optimized (N-series): ML, graphics, HPC
├─ Storage Optimized (L-series): NoSQL, data warehousing
└─ High Performance Compute (H-series): Complex simulations

Spot Instances:
├─ Up to 90% discount vs. on-demand
├─ Subject to eviction if capacity needed
├─ Good for: batch jobs, non-critical workloads
└─ Not recommended for: production databases, transactional systems
```

### GCP Compute Engine

```
Machine Types:
├─ Predefined: N1, N2, N2D, E2 (compute, memory, cost optimized)
├─ Custom: Create exact vCPU/memory combination
├─ High-memory/CPU: For specialized workloads
├─ Shared-core: E2-micro, burstable, for low-traffic

Commitment Discounts:
├─ 1-year: 25-30% discount
├─ 3-year: 52-70% discount (deeper savings, long-term commitment)
└─ Use for: Baseline/steady-state workloads
```

### Pricing Models

```
On-Demand (Hourly):
  Cost: Pay per hour used
  Best for: Unpredictable workloads, development/testing
  Commitment: None

Reserved Instances (1-3 years):
  AWS: 31-72% discount, upfront payment
  Azure: 40-72% discount
  GCP: 25-70% discount
  Best for: Baseline usage, production steady-state
  Commitment: Fixed term

Spot/Preemptible Instances (Dynamic):
  Cost: 60-90% discount vs. on-demand
  Availability: Not guaranteed, eviction possible
  Best for: Batch jobs, development, non-critical workloads
  Commitment: None (but expect interruptions)

Savings Plans:
  AWS: Compute Savings Plans (any instance type)
  Flexibility: Use across regions, instance families
  Commitment: 1-3 year commitment
```

### Multi-Cloud Comparison

| Feature | AWS EC2 | Azure VMs | GCP Compute |
|---------|---------|-----------|------------|
| **Instance variety** | 700+ | 200+ | 100+ |
| **Spot discount** | 70-90% | 80-90% | 80-90% |
| **Reserved term** | 1-3 years | 1-3 years | 1-3 years |
| **Startup time** | 30-60 sec | 30-60 sec | 20-40 sec |
| **Network bandwidth** | 10-100 Gbps | 10-100 Gbps | 10-100 Gbps |
| **Committed use** | RI + Savings Plan | Reserved | Commitment |
| **Maturity** | Most mature | Mature | Growing |

---

## 5. Container Orchestration

### Kubernetes Fundamentals

```
Kubernetes Architecture:

┌────────────────────────────────────────┐
│      Control Plane                     │
├────────────────────────────────────────┤
│ API Server │ Scheduler │ Controller    │
│ Manager    │ etcd      │ kubelet       │
└────────────────────────────────────────┘
           │
    ┌──────┼──────┬──────┐
    ▼      ▼      ▼      ▼
┌──────┬──────┬──────┬──────┐
│Node1 │Node2 │Node3 │Node4 │
├──────┼──────┼──────┼──────┤
│ Pod  │ Pod  │ Pod  │ Pod  │
│ Pod  │ Pod  │ Pod  │ Pod  │
│ Pod  │ Pod  │ Pod  │ Pod  │
└──────┴──────┴──────┴──────┘
     Container Runtime (Docker, containerd)
```

**Key Concepts**:
- Pod: Smallest deployable unit (1+ containers)
- Service: Load balancer for pods
- Deployment: Declarative pod management
- StatefulSet: Ordered, stable pod identities
- DaemonSet: Run pod on every node

### Managed vs. Self-Managed

```
Self-Managed Kubernetes:
├─ Full control over all components
├─ Operator responsibility: high
├─ Cost: Infrastructure + management effort
├─ Flexibility: Maximum
└─ Complexity: High

Managed Kubernetes:
├─ EKS (AWS), AKS (Azure), GKE (GCP)
├─ Control plane managed by cloud provider
├─ Operator responsibility: Nodes, networking
├─ Cost: Control plane fee + node cost
├─ Flexibility: Good
└─ Complexity: Lower than self-managed
```

### Pod Density & Node Sizing

```
Node Resource Reservation:
  Kubernetes system pods: 5-10% CPU, 10-15% memory
  Kubelet daemon: 2-3% CPU, 100-200MB memory
  Container runtime: 1-2% CPU, 50-100MB memory
  ──────────────────────────────────
  System overhead: ~10% of node capacity

Usable Capacity Calculation:
  16 vCPU, 64GB memory node
  System overhead: 1.6 vCPU, 6.4GB
  Available for pods: 14.4 vCPU, 57.6GB

Pod Density Example:
  Pod requirement: 0.5 vCPU, 512MB memory
  Number of pods per node: min(14.4/0.5, 57.6/0.5) = 29 pods
  Conservative production: 15-20 pods per node (leave headroom)
```

### Scaling in Kubernetes

```
Horizontal Pod Autoscaling (HPA):
├─ Scale replicas based on metrics (CPU, memory, custom)
├─ Min/max replicas configured
├─ Response time: 15-60 seconds
└─ Good for: Traffic spikes, predictable patterns

Vertical Pod Autoscaling (VPA):
├─ Adjust resource requests/limits
├─ Requires pod restart
├─ Response time: Minutes to hours
└─ Good for: Finding optimal resource requests

Cluster Autoscaling:
├─ Scale cluster nodes up/down
├─ Responds to pending pods
├─ Response time: 30 seconds to 5 minutes
└─ Good for: Long-term capacity planning
```

### ECS vs. Kubernetes

```
ECS (AWS Elastic Container Service):
├─ Simpler than Kubernetes
├─ Deep AWS integration (IAM, CloudWatch, ALB)
├─ Less operational overhead
├─ Smaller learning curve
└─ Trade-off: Less flexible, AWS-specific

Kubernetes:
├─ More complex than ECS
├─ Cloud-agnostic (AWS, Azure, GCP, on-prem)
├─ Larger ecosystem (Helm, operators, addons)
├─ Steeper learning curve
└─ Trade-off: Maximum flexibility, more ops work
```

---

## 6. Resource Management

### CPU & Memory Limits

```
Container Resource Requests:
  Requests: Minimum guaranteed resources
  Limits: Maximum resources allowed
  
  Good Practice:
  ├─ Set requests = expected usage
  ├─ Set limits = maximum burst capacity
  ├─ Limits > Requests (buffer for spikes)
  └─ Example: Request 500m CPU, Limit 1000m CPU
```

### NUMA Awareness

```
Non-Uniform Memory Architecture:

┌─────────────────────────────────┐
│  CPU Socket 0     │  CPU Socket 1 │
├───────────────────┼───────────────┤
│ L3 Cache          │ L3 Cache      │
│ Local NUMA 0      │ Local NUMA 1  │
│ ↓                 │ ↓             │
│ Memory Bank 0     │ Memory Bank 1 │
│ (fast)            │ (fast)        │
│                   │               │
└─────────────────────────────────┘
       ↓ Remote Latency
       Cross-socket memory access (30-50% slower)
```

**Optimization**:
- Pin vCPU/processes to NUMA node
- Allocate memory on same NUMA node
- CPU affinity settings
- Benefits: 10-30% latency reduction

### CPU Throttling

```
CPU Throttling Scenario:

Pod resource limit: 1000m (1 core)
Pod CPU usage: 1200m (wants 1.2 cores)
├─ Actual CPU granted: 1000m
├─ Remaining demand: 200m (throttled)
└─ Result: Pod performance degrades 17%

Prevention:
├─ Set realistic limits (leave 20% headroom)
├─ Monitor CPU throttling metrics
├─ Implement HPA based on CPU usage
└─ Use CPU requests for scheduling
```

---

## 7. Performance Tuning

### Network Optimization

```
Network Tuning:
├─ TCP buffer sizes (rmem_max, wmem_max)
├─ Number of connections (ulimits, net.core.somaxconn)
├─ TCP window scaling (net.ipv4.tcp_window_scaling)
├─ Fast retransmit (net.ipv4.tcp_sack)
└─ NIC interrupt coalescing

Expected Improvements:
  Throughput: +30-50%
  Latency: -10-20%
  Connection rate: +50-100%
```

### Disk I/O Tuning

```
I/O Scheduler Options:
├─ CFQ: Fair, desktop-friendly
├─ Deadline: Predictable latency
├─ NOOP: Bypass kernel scheduler (best for SSDs/NVMe)
├─ mq-deadline: Multi-queue variant

Block Device Tuning:
├─ Read-ahead: Increase from 128KB to 256KB-1MB
├─ nr_requests: Increase queue depth
├─ rq_affinity: Bind to CPU core
└─ Expected: +20-40% throughput improvement
```

### JVM Tuning

```
JVM Flags for Production:
├─ -XX:+UseG1GC: Modern garbage collector
├─ -XX:MaxGCPauseMillis=200: GC pause target
├─ -XX:InitiatingHeapOccupancyPercent=45: When to start concurrent GC
├─ -XX:+ParallelRefProcEnabled: Reference processing parallelism
└─ -XX:+UnlockDiagnosticVMOptions -XX:+PrintGCDetails: Diagnostics

Heap Sizing:
  Initial heap (-Xms): Set = Max (avoid dynamic resizing)
  Max heap (-Xmx): 75% of container memory limit
  Example: 8GB container → -Xms6g -Xmx6g
```

### Database Tuning

```
PostgreSQL:
├─ shared_buffers: 25% of system RAM
├─ effective_cache_size: 50-75% of system RAM
├─ work_mem: RAM / (max_connections × 2)
├─ max_connections: 100-400 (depends on workload)
└─ fsync=off only for non-critical data (write speed boost)

MySQL:
├─ innodb_buffer_pool_size: 50-75% of RAM
├─ innodb_log_file_size: 256MB-1GB
├─ max_connections: 100-400
├─ query_cache: Disable on modern versions
└─ Consider NUMA binding for large buffers
```

---

## 8. Scaling Strategies

### Horizontal Scaling

```
Add more instances:
├─ Web tier: Stateless, easy to scale
├─ Application tier: May require session management
├─ Database: Complex, requires replication/sharding
└─ Load balancer: Distributes traffic

Pattern:
  1 instance → N instances
  Typical: 5-50 instances per tier
  Kubernetes: 1-1000+ pods easily
```

### Vertical Scaling

```
Increase instance size:
├─ Bigger CPU, memory
├─ Same application code
├─ Simpler than horizontal for stateful workloads
└─ Limited by max instance size available

Limits:
  AWS m6i.32xlarge: 128 vCPU, 512GB memory (max practical limit)
  Beyond: Requires horizontal scaling or architecture change
```

### Auto-Scaling Triggers

```
Metrics to Monitor:
├─ CPU utilization: 60-70% target
├─ Memory utilization: 70-80% target
├─ Request rate: Scale when 80% of capacity
├─ Custom metrics: Application-specific (queue depth, latency)
└─ Predictive scaling: Historical patterns

Scale-Out Triggers:
  Scale down: Wait 5-10 minutes to avoid thrashing
  Scale up: Respond within 30-60 seconds
```

### Multi-Region Scaling

```
Geographic Distribution:

┌─────────────────────┐     ┌─────────────────────┐
│   US Region         │     │   EU Region         │
│ ├─ 50+ instances    │     │ ├─ 30+ instances    │
│ └─ Active-Active    │     │ └─ Active-Active    │
└─────────────────────┘     └─────────────────────┘
        ↓                             ↓
      DNS Failover / Global Load Balancer
        
Benefits:
├─ High availability (regional failure tolerance)
├─ Reduced latency (serve users locally)
├─ Compliance (data residency requirements)
└─ Disaster recovery (RTO/RPO improvement)
```

---

## 9. Cost Optimization

### Instance Right-Sizing

```
Before (Over-provisioned):
├─ 48-core instance
├─ 256GB memory
├─ Average utilization: CPU 15%, Memory 20%
├─ Monthly cost: $3,000

After (Right-sized):
├─ 8-core instance
├─ 32GB memory
├─ Average utilization: CPU 60%, Memory 65%
├─ Monthly cost: $400
└─ Savings: $2,600/month (87% reduction)
```

### Commitment Strategy

```
Capacity Planning:

Baseline workload (minimum): 20 instances
Peak workload (maximum): 100 instances
On-demand for bursts: 50 instances

Cost Optimization:
├─ Reserved instances: 20 baseline (70% discount)
├─ Savings plans: Flexible coverage
├─ Spot instances: 30 instances (85% discount)
└─ On-demand: 20 instances for flexibility

Monthly Cost Example (AWS EC2 m5.large):
  Baseline reserved: 20 × $0.05/hr × 730 × 70% = $511
  Spot (peak demand): 30 × $0.02/hr × 200 = $120
  On-demand (spike): 50 × $0.10/hr × 100 = $500
  ────────────────────────────────────────────
  Total: ~$1,131/month (vs. $5,840 full on-demand)
  Savings: 81%
```

### Containerization ROI

```
Physical Servers:
  5 servers × $25K hardware + operations = $150K/year

Virtualization:
  2 servers × $25K + software licensing = $60K/year
  Savings: 60%

Containerization:
  Kubernetes cluster (3-5 nodes) = $40K/year
  Plus cloud compute savings
  Overall savings: 73%
```

---

## 10. Disaster Recovery & High Availability

### RTO/RPO Targets

```
Recovery Time Objective (RTO):
  Critical systems: 15 minutes - 1 hour
  Important systems: 1-4 hours
  Non-critical: 24+ hours

Recovery Point Objective (RPO):
  Critical systems: 15 minutes (real-time replication)
  Important systems: 1-4 hours (frequent backups)
  Non-critical: 24 hours (daily backups)

Cost tradeoff:
  RTO/RPO 15 min: 3-5x cost (real-time replication)
  RTO/RPO 4 hours: 1.5-2x cost (sync backups)
  RTO/RPO 24 hours: 1.1x cost (async backups)
```

### High Availability Patterns

```
Multi-AZ Deployment:

┌──────────────────────┐    ┌──────────────────────┐
│  Availability Zone 1 │    │  Availability Zone 2 │
│ ├─ Instance 1        │    │ ├─ Instance 2        │
│ ├─ Instance 3        │    │ ├─ Instance 4        │
│ └─ Database primary  │    │ └─ Database replica  │
└──────────────────────┘    └──────────────────────┘
        ↓                            ↓
        └────────────────────────────┘
          Load Balancer (health checks)
          RTO: 30 seconds (auto-failover)
```

### Backup Strategy

```
3-2-1 Rule:
├─ 3 copies of data (original + 2 backups)
├─ 2 different storage types (disk + cloud)
├─ 1 copy offsite (different region/provider)

Implementation:
├─ Daily snapshots (local EBS/disk)
├─ Weekly full backups (cloud object storage)
├─ Monthly archive (Glacier/cold storage)
└─ Quarterly restore tests (verify recovery works)
```

---

## 11. Security & Compliance

### Network Security

```
Security Layers:

┌─────────────────────────────────────┐
│    Internet                         │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    AWS Security Group / NSG         │
│    ├─ Inbound rules (ports, IPs)    │
│    ├─ Outbound rules                │
│    └─ Stateful filtering            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    OS Firewall (iptables, Windows)  │
│    ├─ Host-based rules              │
│    └─ Application-specific          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    Application                      │
│    ├─ Authentication                │
│    ├─ Authorization                 │
│    └─ Encryption                    │
└─────────────────────────────────────┘
```

### Compliance Requirements

```
PCI DSS (Payment Card Industry):
├─ Data encryption (in transit, at rest)
├─ Network segmentation
├─ Regular security assessments
├─ Audit logging
└─ Access controls

HIPAA (Healthcare):
├─ Encryption (AES-256)
├─ Access logging (all access recorded)
├─ Network isolation
├─ Annual risk assessment
└─ Business Associate Agreements (BAAs)

SOC 2 / ISO 27001:
├─ Security controls documentation
├─ Regular audit trails
├─ Incident response procedures
├─ Configuration management
└─ Annual third-party audits
```

### Instance Hardening

```
Hardening Checklist:
├─ Disable unnecessary services
├─ Close unused ports (firewall)
├─ Update OS regularly (security patches)
├─ Configure SELinux / AppArmor
├─ Remove default accounts
├─ Implement SSH key authentication (no passwords)
├─ Enable audit logging
├─ Use encrypted filesystems
├─ Configure AIDE for file integrity
└─ Regular security scanning (Nessus, OpenVAS)
```

---

## 12. Monitoring & Observability

### Key Metrics to Monitor

```
Compute Performance:
├─ CPU utilization: Should be 30-70% (headroom)
├─ Memory utilization: Should be 40-80%
├─ Disk I/O: Monitor IOPS and throughput
├─ Network throughput: Monitor bandwidth usage
└─ Load average: Should be < number of cores

Application Health:
├─ Response time: Track latency trends
├─ Error rate: P50/P95/P99 percentiles
├─ Throughput: Requests per second
├─ Resource consumption: Memory/CPU per request
└─ Queue depth: Buffered requests
```

### Observability Stack

```
┌─────────────────────────────────────┐
│  Application                        │
│  └─ Instrumentation (metrics, logs) │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Collection Layer                   │
│  ├─ Prometheus (metrics)            │
│  ├─ ELK/Loki (logs)                │
│  └─ Jaeger (traces)                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Visualization & Alerting           │
│  ├─ Grafana (dashboards)           │
│  ├─ AlertManager (alerting)        │
│  └─ PagerDuty (incident response)  │
└─────────────────────────────────────┘
```

### Alert Thresholds

```
CPU Utilization:
  Warning: > 75% for > 5 minutes
  Critical: > 90% for > 2 minutes

Memory Utilization:
  Warning: > 80% available
  Critical: > 90% available (risk of OOM)

Disk Space:
  Warning: > 80% used
  Critical: > 95% used

Network Errors:
  Warning: > 1% packet loss
  Critical: > 5% packet loss
```

---

## 13. Migration Strategies

### Physical to Virtual

```
Lift & Shift:
├─ Minimal changes to application
├─ Reduced upfront effort
├─ Potential for optimization post-migration
└─ Risk: Misses virtualization benefits

Phased Migration:
├─ Migrate non-critical workloads first
├─ Learn processes before critical systems
├─ Reduce deployment risk
└─ Take advantage of optimization opportunities

P2V (Physical to Virtual) Tools:
├─ VMware vCenter Converter
├─ AWS DataSync, Azure Migrate, GCP Migrate for Compute
├─ Snapshot-based migration
└─ Agent-based migration
```

### Virtual to Cloud

```
VM Import:
├─ AWS VM Import/Export
├─ Azure Migrate
├─ GCP VM Import

Network Considerations:
├─ VPC/VNet configuration
├─ Security groups/NSGs
├─ Route tables
├─ Private connectivity (Direct Connect, ExpressRoute)
└─ DNS configuration
```

### Cloud to Kubernetes

```
Containerization Steps:
├─ 1. Application analysis (dependencies, resources)
├─ 2. Create Dockerfile
├─ 3. Build container image
├─ 4. Test in local environment
├─ 5. Push to container registry
├─ 6. Create Kubernetes manifests (Deployment, Service)
├─ 7. Deploy to staging cluster
├─ 8. Test in staging
├─ 9. Deploy to production
└─ 10. Monitor and optimize

Benefits:
├─ Better resource efficiency
├─ Simpler scaling
├─ Improved portability
└─ 50-70% cost reduction possible
```

---

## 14. Best Practices

### Capacity Planning

```
1. Collect Historical Data
   ├─ Track usage over 6-12 months
   ├─ Identify trends (growth rate)
   └─ Note seasonal patterns

2. Forecast Future Demand
   ├─ Apply growth trend (e.g., 20% YoY)
   ├─ Add buffer for peak (30-50%)
   └─ Account for new features

3. Right-Size Infrastructure
   ├─ Match forecast + buffer
   ├─ Avoid over-provisioning (cost waste)
   ├─ Avoid under-provisioning (performance issues)
   └─ Review quarterly, adjust as needed
```

### Change Management

```
Change Process:
├─ 1. Document proposed change
├─ 2. Impact assessment (blast radius)
├─ 3. Rollback plan (if things go wrong)
├─ 4. Change approval (CAB)
├─ 5. Schedule maintenance window
├─ 6. Execute change
├─ 7. Monitor closely (first 30 minutes)
├─ 8. Verify success
└─ 9. Document lessons learned

Maintenance Windows:
├─ Schedule during low-traffic periods
├─ Communicate with stakeholders in advance
├─ Maintain change log
└─ Post-implementation review
```

### Tagging Strategy

```
Cloud Resource Tags:

Cost Allocation:
├─ environment (production, staging, development)
├─ project (team, business unit)
├─ cost-center (billing department)
└─ owner (responsible person/team)

Operational:
├─ application (app name)
├─ version (app version)
├─ data-classification (public, internal, confidential)
├─ backup-policy (frequency, retention)
└─ backup-status (latest backup date)

Mandatory Tags:
├─ All resources must have: environment, owner, cost-center
├─ Enforce via IAM policy
├─ Regular audits for compliance
└─ Use for cost tracking and forecasting
```

### Documentation

```
Infrastructure as Code (IaC):
├─ Terraform: Multi-cloud (AWS, Azure, GCP)
├─ CloudFormation: AWS-specific
├─ ARM Templates: Azure-specific
├─ Version control: Track all changes

Benefits:
├─ Reproducible infrastructure
├─ Consistent across environments
├─ Easy disaster recovery
├─ Audit trail of all changes
└─ Self-documenting (code is documentation)
```

---

## 15. Production Checklist

### Pre-Launch Checklist

```
Capacity & Performance:
☐ Load testing completed (2-3x expected peak)
☐ CPU/memory utilization acceptable (< 70% target)
☐ Response time within SLA
☐ Disk I/O performance acceptable
☐ Network latency measured and acceptable
☐ Database query performance optimized

High Availability:
☐ Multi-AZ deployment configured
☐ Load balancer health checks enabled
☐ Auto-scaling policies configured
☐ Failover tested manually
☐ Disaster recovery plan documented

Security:
☐ Security groups/NSGs locked down (least privilege)
☐ Firewall rules verified
☐ Encryption enabled (data in transit, at rest)
☐ SSH/RDP access restricted to admins
☐ Security scanning passed
☐ Secrets management configured

Monitoring & Alerting:
☐ All metrics collected (CPU, memory, disk, network)
☐ Alerts configured for critical thresholds
☐ Dashboards created
☐ Logging configured and verified
☐ Incident response procedures documented
☐ On-call rotation established

Backup & Disaster Recovery:
☐ Backup policy configured
☐ Backup verification tests passed (restore procedure works)
☐ Recovery time objective (RTO) < threshold
☐ Recovery point objective (RPO) < threshold
☐ Disaster recovery runbook created

Documentation:
☐ Architecture diagram created
☐ Runbook for common operations created
☐ Troubleshooting guide created
☐ Change log started
☐ Team trained on new infrastructure
☐ On-call playbook created
```

### Runbook Template

```
Common Operations Runbook:

1. Scaling up
   ├─ Manual: AWS CLI command
   ├─ Auto-scaling: Monitor trigger metrics
   └─ Estimated time: 5-10 minutes

2. Restarting instance/pod
   ├─ Command: systemctl restart app / kubectl restart pod
   ├─ Health check verification
   └─ Estimated time: 2-5 minutes

3. Patching/Updates
   ├─ Staging verification first
   ├─ Multi-step rolling update
   └─ Rollback procedure if issues

4. Emergency failover
   ├─ Automated: DNS failover triggers
   ├─ Manual: DNS change + load balancer adjustment
   ├─ Communications: Notify stakeholders
   └─ Estimated time: < 5 minutes

5. Incident response
   ├─ Escalation path
   ├─ Decision tree (rollback vs. fix forward)
   ├─ Communications template
   └─ Post-incident review
```

---

## Summary

Compute infrastructure encompasses a wide spectrum from physical servers to serverless platforms. Key success factors:

1. **Right-sizing**: Match compute resources to workload requirements
2. **Scaling**: Implement auto-scaling for dynamic workloads
3. **Reliability**: Multi-AZ deployment, health checks, auto-recovery
4. **Cost optimization**: Reserved instances, spot, right-sizing
5. **Monitoring**: Observe all metrics, alert on anomalies
6. **Automation**: IaC, deployment pipelines, auto-remediation

The optimal solution combines technologies across the spectrum based on workload characteristics and business requirements.

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Audience**: Infrastructure Engineers, DevOps, Architecture  
**Contact**: Infrastructure Team
