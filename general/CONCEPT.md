# Infrastructure Debugging Concepts & Methodologies

## Overview

This guide provides a comprehensive framework for debugging infrastructure issues across Kubernetes, VMs, networking, and cloud systems. Rather than providing quick fixes, this document teaches debugging methodologies that help you develop problem-solving skills and form your own experience.

**Core Principle**: These are general guides that point in rough directions. Every infrastructure issue is unique—use these frameworks to train your diagnostic thinking.

---

## 1. Debugging Framework & Strategy

### 1.1 The Four-Step Debugging Process

```
┌─────────────────────────────────────────────────────────────┐
│              INFRASTRUCTURE DEBUGGING PROCESS               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. OBSERVE          2. CORRELATE        3. NARROW DOWN     │
│  ↓                   ↓                    ↓                 │
│  Collect logs,    Match events to    Identify scope:        │
│  metrics,         timeline and       - Time window          │
│  events           symptoms           - Affected requests    │
│                                       - Location (node)     │
│                                                             │
│  4. REPLICATE       5. ROOT CAUSE      6. FIX & VERIFY      │
│  ↓                  ↓                   ↓                   │
│  Can you stably   Find the origin    Implement fix,         │
│  reproduce?       of the problem     verify metrics         │
│  Pattern analysis                    normalize              │
│  for intermittent                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Observation Phase: The Investigation Pyramid

**Start with the broadest signals, then narrow down**:

```
Level 1: SYSTEM HEALTH
├─ Overall availability (Is anything down?)
├─ Cluster/service status
└─ High-level metrics (CPU, memory, disk)

Level 2: APPLICATION SIGNALS
├─ Error rates & status codes
├─ Request latency (P50, P99)
└─ Log volume & severity

Level 3: REQUEST FLOW
├─ Request path (DNS → LB → Ingress → Pod)
├─ Log presence at each stage
└─ Response codes at each hop

Level 4: DETAILED DIAGNOSTICS
├─ Pod logs, events, resource usage
├─ Network captures (tcpdump)
└─ Application internals (debug endpoints)
```

### 1.3 Correlation Strategy: Building the Timeline

**Key questions to correlate events**:

```yaml
Time Correlation:
  - When did the issue start? (exact timestamp)
  - Is it still happening? (persistent vs intermittent)
  - Did it happen before this date? (historical pattern)
  - Any scheduled events at this time? (deployments, maintenance)

Request Correlation:
  - Does it happen for ALL requests? (scope)
  - Or specific endpoints? (path filtering)
  - Or specific parameters? (request characteristics)
  - Or specific clients? (geographic, user agent)

Location Correlation:
  - Does it happen in load balancer? (early in chain)
  - Or only in pods? (late in chain)
  - One worker node or all? (distributed problem)
  - One region or multiple? (infrastructure vs application)
```

### 1.4 Narrowing Down: Scope Reduction

**Decompose the problem into smaller domains**:

| Domain | Questions | Examples |
|--------|-----------|----------|
| **Time** | Duration? Sporadic or continuous? | 2 min duration, 15:30-15:32 UTC |
| **Request** | Path? Parameters? Method? Size? | GET /api/users?id=123, 50KB payload |
| **Geography** | Region? Zone? Node? Pod? | us-east1-b, worker-3, pod-replica-2 |
| **Services** | Which service affected? Dependencies? | api-service → database connection |
| **Users** | All users? Specific user types? | All users, or premium users only |

**Example**:
- Observed: 50x errors for 5 minutes
- Narrow down: Only in us-west region, only POST requests, only >1MB payloads, only to order-service
- Conclusion: Likely network buffer size issue in us-west load balancer

---

## 2. Common Scenarios & Diagnostic Flows

### 2.1 Kubernetes Service Returning 4xx/50x Errors

**Decision Tree**:

```
HTTP Error Response
│
├─ 404 Not Found
│  ├─ Does route exist in service?
│  │  ├─ YES → Check DNS pointing to correct IP
│  │  │      → Check Imperva/WAF routing
│  │  │      → Check ingress resource hostname matches
│  │  │      → Check no duplicate ingress resources
│  │  └─ NO → Endpoint doesn't exist, fix application route
│  │
│  └─ Is request reaching application logs?
│     ├─ YES in app → Route not found (expected)
│     └─ NO in app → Request stopped earlier (ingress/network)
│
├─ 502 Bad Gateway
│  ├─ Is 502 returned immediately?
│  │  ├─ YES → Check access logs for upstream routing
│  │  │      → Check upstream process health (WSGI/FastCGI)
│  │  │      → Check request sizes (buffer issue)
│  │  └─ NO (delay 2-5s) → Network issue, see Connection Timeout
│  │
│  └─ Common cause: Malformed HTTP response from backend
│
├─ 503 Service Unavailable
│  ├─ Check k8s service selector matches pods
│  ├─ kubectl get endpoints <service> (should show pod IPs)
│  └─ No healthy pods? Check pod status:
│     ├─ Pending → Check resource requests (no node capacity)
│     ├─ CrashLoopBackOff → Check pod logs
│     └─ Running but unhealthy → Check liveness probe
│
├─ 504 Gateway Timeout
│  ├─ Check if request reached upstream
│  │  ├─ YES → Upstream slow (slow query, blocked I/O)
│  │  └─ NO → Network timeout, see Connection Timeout
│  │
│  └─ Check access logs for actual duration vs timeout config
│
└─ Other 5xx (500, 429, etc.)
   └─ Usually application error, check app logs
```

**Verification Commands**:

```bash
# 1. Check if route exists
kubectl get ingress -A | grep <hostname>

# 2. Check service selector
kubectl describe service <service-name> -n <namespace>
kubectl get pod -n <namespace> --show-labels

# 3. Verify pod health
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>

# 4. Check service endpoints
kubectl get endpoints <service-name> -n <namespace>

# 5. Check ingress logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=100
```

### 2.2 VM Service Not Working (Kafka, Elasticsearch, MongoDB, PostgreSQL)

**Diagnostic Checklist**:

```
┌─ Service Status
│  ├─ systemctl status <service> (process running?)
│  ├─ ps -ef | grep <process> (verify process exists)
│  └─ netstat -tlnp (verify listening port)
│
├─ Logs
│  ├─ journalctl -u <service> -n 100 (recent logs)
│  ├─ tail -f /var/log/<service>/<service>.log (live logs)
│  └─ Check for ERROR or FATAL messages
│
├─ Cluster Health (for distributed services)
│  ├─ curl localhost:9200/_cluster/health (Elasticsearch)
│  ├─ kafka-broker-api-versions.sh --bootstrap-server localhost:9092 (Kafka)
│  ├─ mongo localhost:27017 (MongoDB)
│  └─ psql -U postgres -d postgres (PostgreSQL)
│
├─ Resource Constraints
│  ├─ htop or top (CPU, memory usage)
│  ├─ iotop (disk I/O contention)
│  ├─ df -h (disk space full?)
│  └─ free -h (memory available?)
│
└─ Network Connectivity
   ├─ ss -tlnp (listening on expected interface?)
   ├─ ip r (correct routing?)
   └─ Can other nodes reach this node?
```

### 2.3 Connection Issues (Timeout, Refused, Reset)

**Connection Timeout** (no response after 30s):

```
Likely causes (in order of frequency):
1. DNS fails → hostname doesn't resolve
   └─ dig/nslookup hostname (check resolution)

2. Firewall blocks traffic → packets never arrive
   └─ traceroute, tcpdump (see if packets reach destination)

3. Routing broken → packets go wrong direction
   └─ ip r get <destination> (check route table)

4. Network device issue → port exhaustion or congestion
   └─ Intermittent, hard to diagnose (see tcpdump analysis)

Verification:
  ping <destination> (ICMP, tests connectivity)
  nc -zv <host> <port> (TCP port test)
  traceroute <destination> (trace path)
  tcpdump -i eth0 'host <destination>' (packet capture)
```

**Connection Refused** (immediate error, port closed):

```
Means: Network good, but destination port not listening

Check destination:
  1. Is service running?
     └─ systemctl status <service>
  
  2. Is it listening on correct port/interface?
     └─ ss -tlnp (t=tcp, l=listening, n=numeric, p=process)
     └─ Example output: LISTEN 0 128 0.0.0.0:8080 0.0.0.0:* users:(("app",pid=1234))
  
  3. Is firewall blocking?
     └─ iptables -L (local firewall rules)

If cloud load balancer returns "Refused":
  └─ No healthy backends configured
  └─ Check: Does backend health check pass?
```

**Connection Reset by Peer** (TCP RST packet):

```
Server actively closes connection (not just timeout)

Possible causes:
1. Server hitting connection limit
   └─ Too many simultaneous connections
   └─ Fix: Increase max connections or reduce client connections

2. TCP timeout on server side
   └─ Request takes longer than timeout config
   └─ Fix: Increase server timeout or optimize slow operations

3. Application logic rejects connection
   └─ Authentication fails, rate limit, etc.
   └─ Check: Application logs
```

### 2.4 SSH Connection Issues

**Timeout** (no response):

```
[Step 1] Verify you're on correct VPN
  $ dig +short bastion.example.com
  10.0.16.5
  
  $ ip r get 10.0.16.5
  10.0.16.5 via 10.0.16.1 dev tun0 (✓ correct, goes through VPN)
  # vs
  10.0.16.5 via 192.168.1.1 dev eth0 (✗ wrong, doesn't use VPN)

[Step 2] Verify using correct bastion
  $ ssh -v <host>
  Look for: "Setting implicit ProxyCommand from ProxyJump: ssh -v -W..."
  This means it's correctly using bastion as jump host

[Step 3] Test firewall/routing
  $ traceroute <host> (see if path exists)
```

**Permission Denied**:

```
[Step 1] Verify username is correct
  $ gcloud compute os-login describe-profile (see expected username)
  # Usually: firstname_lastname_company_com (dots/@ replaced with _)
  # For cross-org access: ext_firstname_lastname_company_com

[Step 2] Verify SSH key is authorized
  $ gcloud compute os-login ssh-keys list (on GCP)
  $ aws ec2-instance-connect describe-instance-information (on AWS)

[Step 3] Check permissions
  GCP: Need roles/compute.osAdminLogin role
  Azure: Need "Virtual Machine Administrator Login" role
  AWS: Need ec2-instance-connect permissions

[Step 4] Check server logs (requires infra access)
  /var/log/auth.log (authentication attempts)
  journalctl -u ssh (SSH service logs)
```

### 2.5 Networking: DNS, Firewall, Routing Issues

**DNS Resolution Failure**:

```
symptom: "Name or service not known"

[Step 1] Can you resolve locally?
  $ nslookup service.default.svc.cluster.local
  $ dig @10.0.0.10 myservice.example.com

[Step 2] Check DNS service health
  kubectl get pod -n kube-system -l k8s-app=kube-dns
  kubectl logs -n kube-system -l k8s-app=kube-dns

[Step 3] Check DNS config
  cat /etc/resolv.conf (what nameservers are configured?)
  
[Step 4] Check if pod can reach DNS server
  kubectl exec -it <pod> -- nslookup 8.8.8.8
```

**Firewall/Network Policy Blocks Traffic**:

```
Symptom: Specific connection times out, other connections work

[Step 1] Identify source and destination clearly
  Source: 10.1.0.5 (pod A)
  Destination: 10.2.0.10:443 (pod B)

[Step 2] Check cloud firewall rules (GCP, AWS, Azure)
  gcloud compute firewall-rules list --filter="<SOURCE_RANGE> AND <DEST_RANGE>"
  
[Step 3] Check k8s network policies
  kubectl get networkpolicy -A
  kubectl describe networkpolicy <policy> -n <namespace>
  
  Does it allow ingress from source?
  Does source have egress rule to destination?

[Step 4] Verify with tcpdump
  # On destination node
  tcpdump -i any "host <source> and host <destination>"
  # If you see packets = firewall issue
  # If no packets = DNS or routing issue
```

**Routing Issue**:

```
Packets don't reach destination (wrong path)

[Step 1] Trace the route
  $ traceroute <destination>
  $ mtr <destination> (continuous monitoring)

[Step 2] Check local routing table
  $ ip r (Kernel route table)
  $ ip r get <destination> (where will this IP go?)
  
  Example output:
  10.2.0.0/16 via 10.1.0.1 dev eth0
  (means: to reach 10.2.0.0/16, send to gateway 10.1.0.1)

[Step 3] Verify connectivity exists
  If A→B times out, check if B→A works
  - If B→A works but A→B doesn't = asymmetric routing
  - If both don't work = full firewall/routing issue
```

---

## 3. Debugging Tools & Commands Reference

### 3.1 Kubernetes Debugging

```bash
# Pod status & logs
kubectl describe pod <pod> -n <ns>              # Full pod info & events
kubectl logs <pod> -n <ns> --all-containers=true  # All container logs
kubectl logs <pod> -n <ns> -c <container>      # Specific container
kubectl logs <pod> -n <ns> --previous          # Crashed container logs
kubectl logs <pod> -n <ns> -f                  # Stream logs (tail -f)

# Service & networking
kubectl get svc -n <ns> -o wide                # Services & IPs
kubectl get endpoints <svc> -n <ns>            # Service backend pods
kubectl get networkpolicy -n <ns>              # Network policies
kubectl describe networkpolicy <np> -n <ns>    # Policy details

# Ingress & routing
kubectl get ingress -A                         # All ingresses
kubectl describe ingress <ing> -n <ns>         # Ingress config
kubectl get ingress -A | grep <hostname>       # Find ingress by hostname

# Events & cluster info
kubectl get events -n <ns> --sort-by='.lastTimestamp'  # Recent events
kubectl cluster-info                           # Cluster endpoints
kubectl get nodes -o wide                      # Node status & IPs

# Interactive debugging
kubectl exec -it <pod> -n <ns> -- /bin/bash   # Connect to pod
kubectl port-forward <pod> 8080:8080 -n <ns>  # Port forward to pod
kubectl port-forward svc/<svc> 8080:80 -n <ns> # Port forward service
```

### 3.2 VM & System Debugging

```bash
# Service & process
systemctl status <service>                     # Service status & logs
systemctl list-units --type=service --all      # All services
ps aux | grep <process>                        # Find process
sudo journalctl -u <service> -n 50 -f          # Stream service logs

# Logs
tail -f /var/log/<service>/<service>.log       # Stream service log
grep ERROR /var/log/<service>/<service>.log    # Find errors
journalctl -p err -n 50                        # All errors, last 50

# System resources
top or htop                                    # CPU, memory (interactive)
free -h                                        # Memory usage
df -h                                          # Disk usage
iotop                                          # Disk I/O usage
lsof -i :<port>                               # Process using port

# Network
ss -tlnp                                       # Listening ports & process
netstat -an | grep ESTABLISHED                # Active connections
ip a                                           # Network interfaces & IPs
ip r                                           # Routing table
ip r get <destination>                         # Where does this IP go?
```

### 3.3 Networking Tools

```bash
# DNS
dig <hostname>                                 # Full DNS lookup
nslookup <hostname>                            # Simple DNS lookup
host <hostname>                                # Quick DNS check
dig +trace <hostname>                          # Trace DNS resolution chain

# Connectivity
ping <host>                                    # ICMP reachability
nc -zv <host> <port>                          # TCP port test
telnet <host> <port>                          # TCP connection test

# Routing
traceroute <destination>                       # Trace path to destination
mtr <destination>                              # Continuous trace (better than traceroute)

# Packet capture
tcpdump -i any 'host <ip>'                    # Capture all packets to/from IP
tcpdump -i eth0 'tcp port 8080'               # Capture port 8080
tcpdump -i any -n 'src 10.0.0.1 and dst 10.0.0.2' # Specific flow
```

---

## 4. Special Cases & Non-Obvious Issues

### 4.1 "No Space Left on Device" (Misleading Error)

**Possible causes**:

```yaml
1. Actual Disk Full
   - Symptoms: df -h shows 100% usage
   - Solution: Delete old logs, increase disk size
   
2. Inode Exhaustion (not disk space)
   - Symptoms: df -h shows <90%, but mkdir fails
   - Check: df -i (inode count)
   - Solution: Delete many small files or increase inodes

3. Kubernetes Memory Limit Bug
   - Symptoms: Mount fails with "No space", but disk has space
   - Cause: Memory limit set incorrectly (512m vs 512Mi)
   - Solution: Fix resource limits
   - Example: resources.limits.memory: 512Mi (not 512m)
```

### 4.2 Intermittent TCP Port Exhaustion

**Symptoms**:
- Random connection timeouts that recover quickly
- Not consistent (hard to reproduce)
- More common during high load

**Causes**:
- NAT device running out of ports (SNAT port table)
- Client-side port reuse too aggressive
- Proxy holding TIME_WAIT connections too long

**Diagnosis**:
```bash
netstat -an | grep TIME_WAIT | wc -l         # Too many TIME_WAIT?
cat /proc/sys/net/ipv4/tcp_tw_reuse          # Check reuse setting (should be 1)
cat /proc/sys/net/netfilter/nf_conntrack_max # Max connections
cat /proc/sys/net/netfilter/nf_conntrack_count # Current connections
```

### 4.3 Istio Service Mesh Debugging

**Why debugging Istio is hard**:
- Istio returns 503 for many different problems
- Requests go through sidecar proxies (Envoy)
- Hard to trace where error actually originates

**Approach**:

```
1. Check if issue happens immediately or after delay
   - Immediate = wrong route configuration
   - After 2-5s = network issue (see timeout troubleshooting)

2. Check Envoy/Istio logs in sidecar
   kubectl logs <pod> -c istio-proxy
   
3. Look for PassthroughCluster in logs (wrong routing)
   - Check VirtualService config
   - Check ServiceEntry definitions
   - Verify hostnames match

4. Compare with non-Istio pod
   - Deploy same app without Istio
   - If non-Istio works, it's Istio config issue
```

---

## 5. Building Debugging Experience

### 5.1 Common Debugging Mistakes to Avoid

| Mistake | Better Approach |
|---------|-----------------|
| Assume something works without testing | Test each step: DNS → firewall → routing → app |
| Change multiple things at once | Change one thing, test, verify metrics normalize |
| Look at only one metric | Correlate multiple signals (logs + metrics + events) |
| Start debugging at the app | Start from the edge (DNS, firewall) and work inward |
| Trust that "it should work" | Actually verify each component |
| Ignore timezone in timestamps | Always convert to UTC for correlation |

### 5.2 Systematic Narrowing Process

```
Given: Service returns 502 errors
│
├─ Step 1: WHEN does it happen?
│  └─ Only during 14:00-14:05 UTC on Nov 15
│
├─ Step 2: WHICH requests are affected?
│  └─ Only POST /api/users with >1MB payload
│
├─ Step 3: WHERE in the stack?
│  └─ Check: ingress logs (yes, requests received)
│  └─ Check: app logs (no, requests never arrived)
│  └─ Conclusion: Blocked between ingress and app pods
│
├─ Step 4: WHY is it blocked?
│  └─ Check: Network policies (found: allow ingress, but port wrong)
│  └─ Check: Ingress config (found: forwarding to port 8080, but app listening 8081)
│
└─ Resolution: Fix port mismatch, verify metrics normalize
```

---

## 6. When to Escalate vs. Self-Debug

### Escalate to Specialists When

```
Infrastructure/Network Issues:
  - Consistent timeout across multiple pods/nodes
  - Cloud firewall rules not working as expected
  - VPN/routing issues (contact networking team)
  - Cloud provider API errors

Security Issues:
  - Unauthorized access attempts in audit logs
  - Suspected compromise or intrusion
  - Permission/RBAC issues beyond scope

Hardware/VM Issues:
  - VM won't start
  - Physical disk/network hardware failure
  - Cloud quota exceeded

When to Self-Debug:
  - Application errors (check app logs first)
  - Kubernetes configuration (check YAML, selectors)
  - Local service misconfiguration
  - Networking between components you own
```

---

**Last Updated**: January 2026
**Maintained by**: Platform Engineering Team
**Version**: 1.0.0

