# Infrastructure Debugging & Troubleshooting Guide

## Quick Navigation

Learn infrastructure debugging skills systematically or find quick answers to common infrastructure problems.

### Three Learning Paths

**🟢 Beginner Path** (2-3 hours)
Best for: New to infrastructure debugging, want foundational skills
1. Read [CONCEPT.md - Debugging Framework (Section 1)](CONCEPT.md#1-debugging-framework--strategy)
2. Complete [WORKSHOP.md - Fundamentals (Tasks 1-3)](WORKSHOP.md#part-1-fundamentals-tasks-1-3)
3. Complete [WORKSHOP.md - Service Management (Tasks 4-5)](WORKSHOP.md#part-2-service-management-tasks-4-7)
4. Reference: [RUNBOOK.md - Common Scenarios](RUNBOOK.md)

**🟡 Intermediate Path** (4-6 hours)
Best for: Comfortable with Linux/Kubernetes, want systematic debugging approach
1. Read [CONCEPT.md - All Sections](CONCEPT.md)
2. Complete [WORKSHOP.md - All Tasks 1-10](WORKSHOP.md#part-3-system-level-issues-tasks-8-10)
3. Practice: Real-world scenarios from your infrastructure
4. Reference: [RUNBOOK.md - All Sections](RUNBOOK.md)

**🔴 Advanced Path** (6-8 hours)
Best for: Experienced debuggers, want to master complex scenarios
1. Master [CONCEPT.md - Special Cases (Section 4)](CONCEPT.md#4-special-cases--non-obvious-issues)
2. Complete [WORKSHOP.md - Tasks 11-15](WORKSHOP.md#part-4-real-world-scenarios-tasks-11-15)
3. Create custom debugging runbooks for your infrastructure
4. Teach others (best way to solidify knowledge)

---

## Quick Reference: Debugging Scenarios

### When to use each document

| Problem | Start Here | Then Read |
|---------|-----------|-----------|
| Kubernetes pod not responding | [RUNBOOK.md - 404/50x errors](RUNBOOK.md#kubernetes-service-is-4xx-or-50x) | [CONCEPT.md - K8s decision tree](CONCEPT.md#21-kubernetes-service-returning-4xx50x-errors) |
| SSH permission denied | [RUNBOOK.md - SSH issues](RUNBOOK.md#ssh-permission-denied-or-timeout) | [CONCEPT.md - SSH debugging](CONCEPT.md#24-ssh-connection-issues) |
| Database not starting | [RUNBOOK.md - VM service issues](RUNBOOK.md#vm-elasticsearchkafkacassandramongodb-is-not-working-as-expected) | [CONCEPT.md - VM debugging](CONCEPT.md#22-vm-service-not-working-kafka-elasticsearch-mongodb-postgresql) |
| Network timeout | [RUNBOOK.md - Connection timeout](RUNBOOK.md#connection-time-out) | [CONCEPT.md - Connection timeout](CONCEPT.md#23-connection-issues-timeout-refused-reset) |
| Disk full | [RUNBOOK.md - No space](RUNBOOK.md#no-space-left-on-device) | [CONCEPT.md - Misleading errors](CONCEPT.md#41-no-space-left-on-device-misleading-error) |

---

## Essential Commands Cheatsheet

### Kubernetes Debugging (Most Used)

```bash
# Pod status & logs
kubectl describe pod <pod> -n <ns>              # Full details
kubectl logs <pod> -n <ns> -f                   # Stream logs
kubectl logs <pod> -n <ns> --previous           # Crashed pod

# Service & networking
kubectl get svc -n <ns> -o wide                 # All services
kubectl get endpoints <svc> -n <ns>             # Service backends
kubectl exec -it <pod> -n <ns> -- bash          # Shell into pod

# Ingress & routing
kubectl get ingress -A | grep <hostname>        # Find ingress
kubectl describe ingress <ing> -n <ns>          # Ingress details

# Recent events
kubectl get events -n <ns> --sort-by='.lastTimestamp'
```

### VM/System Debugging (Most Used)

```bash
# Service & process
sudo systemctl status <service>                 # Service status
sudo journalctl -u <service> -n 50 -f          # Stream service logs
ps aux | grep <process>                         # Find process

# Resources
free -h                                         # Memory usage
df -h                                           # Disk usage
top or htop                                     # CPU/memory (interactive)

# Network
ss -tlnp                                        # Listening ports
netstat -an | grep ESTABLISHED                 # Active connections
ip r                                            # Routing table
```

### Networking Debugging (Most Used)

```bash
# DNS & connectivity
dig <hostname>                                  # Full DNS lookup
nc -zv <host> <port>                          # TCP port test
ping <host>                                     # ICMP reachability
traceroute <destination>                        # Trace path

# Routing & firewall
ip r get <destination>                          # Where does this IP go?
tcpdump -i any 'host <ip>'                     # Capture packets
```

---

## Common Debugging Scenarios (FAQ)

### Q1: Kubernetes pod returns 503 Service Unavailable

**A:**
```bash
# 1. Check if service has healthy backends
kubectl get endpoints <service> -n <namespace>
# Should show pod IPs

# 2. If empty, check pod status
kubectl get pods -n <namespace>

# 3. Check pod health
kubectl describe pod <pod> -n <namespace>
# Look for: Liveness probe failures, CrashLoopBackOff

# 4. Check pod logs
kubectl logs <pod> -n <namespace> --previous  # If crashed
```

**Reference**: [CONCEPT.md - 503 errors](CONCEPT.md#kubernetes-service-returning-4xx50x-errors)

---

### Q2: Connection times out when accessing service

**A:**
```bash
# Quick check order:
1. DNS resolution works?
   $ nslookup <hostname>

2. Firewall allows traffic?
   $ nc -zv <host> <port>

3. Service actually listening?
   $ ssh <destination>
   $ ss -tlnp | grep <port>

4. Routing is correct?
   $ ip r get <destination>
   # Should show path through VPN/gateway if needed
```

**Reference**: [CONCEPT.md - Connection timeout](CONCEPT.md#connection-issues-timeout-refused-reset)

---

### Q3: Database service won't start

**A:**
```bash
# 1. Check service status
sudo systemctl status postgresql

# 2. Check service logs (usually more detailed)
sudo journalctl -u postgresql -n 50

# 3. Common issues:
   - Port already in use: lsof -i :5432
   - Permission denied: ls -la /var/lib/postgresql
   - Corrupted data: check logs for recovery needed
   - Insufficient disk space: df -h /var

# 4. Fix and restart
sudo systemctl restart postgresql
```

**Reference**: [RUNBOOK.md - VM services](RUNBOOK.md#vm-elasticsearchkafkacassandramongodb-is-not-working-as-expected)

---

### Q4: SSH says "Permission denied" or times out

**A:**
```bash
# For Permission Denied:
# 1. Check username is correct
gcloud compute os-login describe-profile  # GCP
# Usually: firstname_lastname_company_com

# 2. Check SSH key is in authorized keys
cat ~/.ssh/id_ed25519.pub | ssh <host> 'cat >> ~/.ssh/authorized_keys'

# For Timeout:
# 1. Verify VPN connected (if needed)
ip r get <destination> | grep tun  # Should show tun0 device

# 2. Test connectivity
ping <host>  # ICMP reachability
nc -zv <host> 22  # SSH port open
```

**Reference**: [CONCEPT.md - SSH debugging](CONCEPT.md#24-ssh-connection-issues)

---

### Q5: High latency or slow responses

**A:**
```bash
# 1. Identify slow requests
kubectl logs <pod> | grep "duration=" | sort -t= -k2 -rn | head -5

# 2. Check resource usage during slow requests
top or htop  # In one terminal
# Make request in another terminal

# 3. Narrow down cause:
   High CPU → Optimize code or increase CPU
   High memory → Check for leaks, increase memory
   High disk I/O → Reduce logging, optimize queries
   High network → Reduce response size

# 4. Application-level metrics
   - Database query duration (too slow?)
   - Cache hit rate (is caching working?)
   - External API latency (is dependency slow?)
```

**Reference**: [WORKSHOP.md - Performance debugging](WORKSHOP.md#task-14-performance-debugging)

---

### Q6: Disk full but I've deleted files

**A:**
```bash
# Not actually full, but inode exhaustion:
df -i  # Check inode usage
# If > 90% inodes used but disk has space = inode problem

# Fix:
1. Find directories with too many small files
   find / -type f | wc -l  # Count all files

2. Delete old files (e.g., logs with many small entries)
   rm -rf /var/log/*.1  # Delete rotated logs

3. Or increase inodes when expanding disk
   mkfs.ext4 -N 2000000 /dev/sdb1
```

**Reference**: [CONCEPT.md - No space left on device](CONCEPT.md#41-no-space-left-on-device-misleading-error)

---

## Debugging Tools Comparison

| Tool | Purpose | When to Use | Example |
|------|---------|-----------|---------|
| `kubectl logs` | See pod output | Application errors, debugging | `kubectl logs pod -f` |
| `kubectl describe` | Pod details & events | Pod status, resource issues | `kubectl describe pod` |
| `kubectl exec` | Connect to pod | Debug inside container | `kubectl exec -it pod -- bash` |
| `systemctl status` | Service status | VM service health | `systemctl status nginx` |
| `journalctl` | Service logs | VM service errors | `journalctl -u nginx -f` |
| `ss` / `netstat` | Network connections | Port conflicts, listening | `ss -tlnp` |
| `tcpdump` | Packet capture | Network issues, deep debug | `tcpdump -i eth0 host X` |
| `top` / `htop` | System resources | CPU/memory bottlenecks | `htop` |
| `strace` | System calls | Detailed process behavior | `strace -p <PID>` |
| `dig` | DNS lookup | DNS issues | `dig example.com` |

---

## Decision Trees for Common Issues

### "My service is down" troubleshooting flow

```
Is service in Kubernetes?
├─ YES
│  ├─ kubectl get pods (running?)
│  │  ├─ NOT RUNNING → Check events, logs
│  │  └─ RUNNING → Check service endpoint
│  │
│  └─ kubectl get endpoints (backends?)
│     ├─ EMPTY → Pods not matching selector
│     └─ IPs shown → Check if accessible
│
└─ NO (VM service)
   ├─ systemctl status <svc> (running?)
   │  ├─ NOT RUNNING → Start and check logs
   │  └─ RUNNING → Check port listening
   │
   └─ ss -tlnp | grep <port> (listening?)
      ├─ NOT LISTENING → Check logs, restart
      └─ LISTENING → Network/firewall issue
```

### "Cannot reach service" troubleshooting flow

```
Can you reach it from inside cluster?
├─ NO (in cluster)
│  ├─ kubectl exec pod -- curl http://svc
│  │  ├─ Timeout → DNS/firewall/routing
│  │  └─ Refused → Service not running
│  │
│  └─ Check network policies
│     kubectl get networkpolicy -n ns
│     (allow ingress from source pod?)
│
└─ YES (in cluster, but not external)
   ├─ Check ingress resource
   │  kubectl get ingress -A | grep hostname
   │  (correct hostname? backend pointing to svc?)
   │
   └─ Check cloud firewall
      (allow public traffic to load balancer?)
```

---

## When to Escalate

### Escalate to Infrastructure Team If:
- Kubernetes control plane issues (API server unresponsive)
- Cloud provider API errors
- VPN/network connectivity issues
- Storage/volume mounting issues
- Node hardware failure

### Escalate to Security Team If:
- Unauthorized access attempts
- Suspected security breach
- Permission/RBAC issues
- Certificate validation failures

### Self-Debug (Your Responsibility):
- Application crashes or errors
- Service misconfiguration
- Database/cache connection issues
- Resource utilization problems

---

## Learning Resources

### Progressive Difficulty

| Level | Materials | Time | Focus |
|-------|-----------|------|-------|
| **Beginner** | [WORKSHOP.md Tasks 1-5](WORKSHOP.md#part-1-fundamentals-tasks-1-3) | 2-3 hrs | Hands-on fundamentals |
| **Intermediate** | [WORKSHOP.md Tasks 6-10](WORKSHOP.md#part-2-service-management-tasks-4-7) | 2-3 hrs | Service management |
| **Advanced** | [WORKSHOP.md Tasks 11-15](WORKSHOP.md#part-4-real-world-scenarios-tasks-11-15) | 3-4 hrs | Complex scenarios |

### External Resources

- **[sadservers.com](https://sadservers.com)**: Free broken server labs (referenced in WORKSHOP.md)
- **Linux manual pages**: `man systemctl`, `man journalctl`, `man ss`
- **Kubernetes docs**: [Troubleshoot Applications](https://kubernetes.io/docs/tasks/debug-application-cluster/debug-application/)

---

## Common Debugging Patterns

### Pattern 1: Service Health Check

```
Question: Is my service healthy?

Answer using:
1. kubectl get pods (is pod running?)
2. kubectl logs (any errors?)
3. kubectl describe pod (events, resources?)
4. curl http://svc:port/health (app responding?)
```

### Pattern 2: Request Flow Analysis

```
Question: Why doesn't my request reach the app?

Trace the path:
1. DNS → Does hostname resolve?
2. Firewall → Can packets reach service?
3. Ingress → Is ingress routing correctly?
4. Service → Does service have backends?
5. Pod → Can pod process request?
```

### Pattern 3: Resource Bottleneck

```
Question: Why is my service slow?

Check in order:
1. CPU usage (processes maxed out?)
2. Memory usage (OOM? Leaks?)
3. Disk I/O (disk busy?)
4. Network (packets dropped?)
5. Application (database slow? API calls slow?)
```

---

## Recommended Reading Order

**For Immediate Problem**:
1. Go to [RUNBOOK.md](RUNBOOK.md)
2. Find your scenario in the table of contents
3. Follow the quick diagnostic steps

**For Learning**:
1. Start with [CONCEPT.md - Framework (Section 1-2)](CONCEPT.md#1-debugging-framework--strategy)
2. Practice [WORKSHOP.md - Beginner tasks](WORKSHOP.md#part-1-fundamentals-tasks-1-3)
3. Read [CONCEPT.md - Specific scenario](CONCEPT.md#2-common-scenarios--diagnostic-flows)
4. Practice [WORKSHOP.md - Corresponding tasks](WORKSHOP.md)
5. Reference [RUNBOOK.md](RUNBOOK.md) for quick lookup

**For Teaching Others**:
1. Assign [WORKSHOP.md - Task](WORKSHOP.md) as homework
2. Have them document findings
3. Review [CONCEPT.md - Frameworks](CONCEPT.md) together
4. Practice [real-world scenarios](WORKSHOP.md#part-4-real-world-scenarios-tasks-11-15)

---

## Quick Metrics to Monitor

When debugging, always check these metrics:

```yaml
Application:
  - Request latency (P50, P99)
  - Error rate (5xx, 4xx)
  - Request throughput (req/sec)
  - Status code distribution

Infrastructure:
  - CPU usage (%)
  - Memory usage (%)
  - Disk usage (%)
  - Network latency (ms)
  - Network errors/drops

Service-specific:
  - Database: Query duration, connection pool usage
  - Cache: Hit rate, eviction rate
  - Message Queue: Message lag, throughput
```

---

## Support & Community

**Need Help?**
- Check [CONCEPT.md](CONCEPT.md) for theory
- Follow [WORKSHOP.md](WORKSHOP.md) for hands-on practice
- Reference [RUNBOOK.md](RUNBOOK.md) for quick answers
- Ask on team Slack (provide: error, logs, metrics, what you've tried)

**Contributing**
- Found a bug in documentation? Create an issue
- Have a new debugging scenario? Create a PR to RUNBOOK.md
- Solved a unique problem? Add to WORKSHOP.md

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Maintained by**: Platform Engineering Team

For questions or improvements, reach out to the infrastructure team.

