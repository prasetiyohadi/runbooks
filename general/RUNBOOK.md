# General Infrastructure Debugging Runbook

> [!NOTE]
> This document provides general debugging guides that offer rough direction for infrastructure troubleshooting. It is not a substitute for hands-on experience. Develop your debugging skills by working through real issues and building your own knowledge base. See [WORKSHOP.md](WORKSHOP.md) for hands-on labs and [CONCEPT.md](CONCEPT.md) for debugging framework.

## Table of Contents

- [Debugging Strategy](#debugging-strategy)
- [Quick Reference Matrix](#quick-reference-matrix)
- [Kubernetes Service Issues](#kubernetes-service-issues)
- [VM Service Issues](#vm-service-issues)
- [Network Issues](#network-issues)
- [System Issues](#system-issues)
- [SSH Issues](#ssh-issues)
- [Monitoring Issues](#monitoring-issues)

## Debugging Strategy

Follow this systematic approach for any infrastructure issue:

### 1. Correlate Logs and Metrics

- Examine application logs, system logs, and metrics together
- Look for error patterns and timing correlations
- Cross-reference timestamps across multiple data sources

### 2. Check for Recent Changes

- What changed recently? (deployments, configs, infrastructure, dependencies)
- Use change tracking tools (Git, deployment history, infrastructure audit logs)
- Compare current state with known-good baseline

### 3. Narrow Down the Problem

- **Time**: When did it start? Is it still happening? Is it intermittent?
- **Scope**: Which request paths or parameters are affected?
- **Location**: Which layer is failing (load balancer, ingress, pod, service)?

### 4. Replicate the Problem

- Can you reproduce it consistently or is it intermittent?
- For intermittent issues, identify patterns (request size, duration, hostnames, parameter combinations)
- Reproduce in non-production environment if possible

## Quick Reference Matrix

| Issue | Error Code | Root Cause | First Check | Link |
|-------|-----------|-----------|------------|------|
| Page not found | 404 | Route not found or DNS wrong | Route exists + DNS points correctly | [HTTP 404](#http-404) |
| No upstream available | 503 | Service selector wrong or no healthy pods | Service endpoints + pod health | [HTTP 503](#http-503) |
| Malformed upstream response | 502 | Upstream crashed or filtered request | Upstream health + access logs | [HTTP 502](#http-502) |
| Request timeout | 504 | Upstream too slow or not reached | Request duration + upstream logs | [HTTP 504](#http-504) |
| Connection timeout | Timeout | DNS/firewall/routing broken | DNS → firewall → routing → devices | [Connection Timeout](#connection-timeout) |
| Port closed | Connection refused | Service not running or wrong port | Service status + listening ports | [Connection Refused](#connection-refused) |
| Full disk | ENOSPC | Logs/files filling disk | Disk usage by directory | [No Space Left](#no-space-left-on-device) |

---

## Kubernetes Service Issues

### HTTP 404

**Meaning**: Page/route not found. However, any layer in the request path can cause this.

**Debugging Checklist**:

1. **Verify route exists in application**
   - For production: Check application logs in Logs explorer to confirm request reached the app
   - For development: Use port-forward to bypass other layers
   ```bash
   kubectl port-forward svc/<service-name> 8080:8080
   curl localhost:8080/path
   ```

2. **Check DNS resolution**
   ```bash
   nslookup example.company-internal.com
   # Should point to WAF or load balancer IP
   ```

3. **Verify WAF configuration** (if applicable)
   - Check WAF request logs in Logs explorer
   - Verify upstream points to correct cluster/service
   - Check if request was rate-limited or filtered

4. **Inspect ingress controller access logs**
   - **No logs in ingress + logs in WAF**: Request forwarded to wrong cluster
   - **Logs in ingress but wrong backend**: Check ingress resource configuration

5. **Check ingress resource**
   ```bash
   kubectl get ingress -A
   # Verify hostname matches your request domain
   kubectl describe ingress <name> -n <namespace>
   ```

6. **Verify service endpoints**
   ```bash
   kubectl get pod -o wide
   kubectl get endpoints <service-name>
   # Verify endpoint IPs match pod IPs
   ```

### HTTP 429

**Meaning**: Too many requests - rate limiting applied.

Currently no component in our infrastructure returns 429. Future: APISIX gateway will return 429 when rate limits exceeded.

### HTTP 4xx and 5xx (other)

**Meaning**: Usually returned by application, not infrastructure.

**Approach**: Follow HTTP 404 methodology to narrow down which layer is failing, then investigate application code/logs.

### HTTP 502

**Meaning**: Invalid or malformed HTTP response from upstream.

**Immediate 502** (returned right away):
- Check access logs: requests going to correct upstream?
- Check upstream health: especially WSGI (Python), FastCGI (PHP) servers
- Check request sizes in access logs
- Review proxy configuration

**Delayed 502** (few seconds after request):
- Something in the middle is filtering the request and returning empty response
- See [Connection Timeout](#connection-timeout)

### HTTP 503

**Meaning**: No available upstream - service selector wrong or no healthy pods.

**For standard services**:
- Similar to HTTP 404 debugging but focus on k8s service and ingress
- Check service selector: `kubectl get svc -A`
- Check pod health: `kubectl get pod -A`
- Verify pods match service selector

**For services with Istio**:

> [!WARNING]
> Istio returns 503 for many different root causes. This makes debugging difficult.

1. **Observe timing**: If returned after a few seconds, likely a network issue
2. **Check Istio logs**: Is request routed within mesh or outside?
3. **Unexpected external routing**: If you see `PassthroughCluster` in logs
   - Verify VirtualService exists and is correct
   - Verify ServiceEntry exists and hostname is correct
   - Similar to checking ingress resource configuration

### HTTP 504

**Meaning**: Request timeout - forwarded to upstream but no response received.

**Checklist**:

1. Check access logs: requests going to correct upstream?
2. Check request duration: is timeout too short for this workload?
3. Check upstream logs: did request reach it?
4. If request reached upstream: upstream is slow, investigate application performance
5. If request didn't reach upstream: see [Connection Timeout](#connection-timeout)

---

## VM Service Issues

### Service Status Check

```bash
# Check if service is running
sudo systemctl status kafka.service

# Alternative: check process directly
sudo ps -ef | grep kafka

# Alternative: check with journalctl (if stdout managed by systemd)
sudo journalctl -u kafka.service
```

### Check Logs

- **Managed clusters**: Find logs in Logs explorer (different indices for VM vs K8s logs)
- **New VMs without logging**: SSH directly to VM
- **Log locations**: Usually in `/var/log/` 
  - Example: `/var/log/kafka/server.log`, `/var/log/mongodb/mongodb.log`

### Check Cluster Health

Each service has different health check command:

```bash
# Elasticsearch
curl localhost:9200/_cluster/health

# Kafka
kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# MongoDB
mongo --eval "db.adminCommand('ping')"
```

If unhealthy:
- Check logs for shard allocation errors (Logs explorer)
- Verify nodes can reach each other (see [Network Issues](#network-issues))

### Check Resource Utilization

Check in Datadog dashboard, or directly on VM:

| Resource | Command | Issue |
|----------|---------|-------|
| CPU/Memory | `sudo htop` or `sudo top` | High CPU = slow service; OOM = service fails |
| Disk I/O | `sudo iotop` | High I/O = slow service |
| Disk usage | `sudo df -hT` | Out of disk = service fails |
| Disk per directory | `sudo du -sh <dir> \| sort -hr` | Identify where space is used |
| Network errors | `sudo ip -s link` | Dropped packets = unstable network |
| Connections | `sudo ss -s` | Exceeding conntrack = dropped connections |

---

## Network Issues

### Connection Timeout

**Meaning**: Source cannot reach destination IP:port. Usually a pure network issue.

**Check in this order** (most to least common):

| Order | Issue | Behavior | How to Check |
|-------|-------|----------|------------|
| 1 | DNS wrong | Persistent timeout | `dig +short hostname` |
| 2 | Firewall rules | Persistent timeout | Review cloud/K8s firewall rules |
| 3 | Routing | Persistent timeout | `ip route get <IP>` check route table |
| 4 | Network device issue | Intermittent, slow responses | `tcpdump` on network interfaces |

#### Cloud Firewall and K8s Network Policy Rules

**Our networks**:

- **Cloud ingress firewall**: Default DENY
- **Cloud egress firewall**: Default ALLOW
- **K8s clusters**:
  - Ingress: Default DENY
  - Egress: Default DENY to private IPv4, allow to public ranges

#### Timeout Troubleshooting by Source/Destination

| Source | Destination | Check |
|--------|-------------|-------|
| VM in VPC A | VM in VPC B | Cloud firewall in VPC B |
| VM in VPC A | K8s in VPC B | Cloud firewall in VPC B + K8s network policy |
| K8s A | K8s B | K8s network policy in A (egress) + Cloud firewall in B + K8s network policy in B (ingress) |

#### How to Check Firewall vs Routing

1. **Is firewall the issue?** Try another connection from source to destination
   - If one succeeds and one fails: firewall issue
   - If all fail: likely routing

2. **Check firewall and routing**: List rules and compare with source/destination IPs

3. **Use tcpdump to diagnose**:
   ```bash
   # On destination's network interface
   sudo tcpdump -i eth0 -n "host <source-ip>"
   
   # From source, trigger traffic:
   ping <dest-ip>
   
   # If tcpdump shows packets but connection still fails:
   # → Routes/firewall good in one direction, broken in other direction
   ```

#### Routing Issues

**Key concept**: Each network device has a route table. For packets to reach destination, a route must exist.

Check your routes:
```bash
ip route          # Show all routes
ip route get <IP> # Show route to specific IP
```

**Common scenarios**:

| Scenario | Routing Check |
|----------|---------------|
| Within same VPC | Usually automatic, rarely an issue |
| VPC peering | Verify routes in both VPCs to each other |
| Site-to-site VPN | Verify routes on both sides |
| VPC to public internet | Need NAT gateway + route to it |
| Point-to-site VPN (OpenVPN) | Verify VPN pushing correct routes |

#### Common Commands

- `nc <host> <port>`: Test if TCP port is open
- `ping` / `mtr`: Trace route (needs ICMP allowed)
- `ip a`: Show local network devices and IPs
- `ip r`: Show local routes
- `tcpdump -i <interface>`: Analyze packets on network interface

### Connection Refused

**Meaning**: Destination IP is reachable but port is closed or service not listening.

**Check on destination**:

```bash
# See which ports are listening and which process owns them
sudo ss -tlnp4
# t=TCP, l=listening, n=numeric IPs, p=process, 4=IPv4

# Verify service is running
sudo systemctl status <service>

# Common issue: app listening on localhost only
# It can't accept external requests
# Check listen address with ss or netstat
```

**If destination is cloud load balancer**: Likely no healthy upstream. See [HTTP 503](#http-503).

### Connection Reset by Peer

**Meaning**: Server actively terminated connection (sent RST packet).

Network connectivity is working (you got a packet back), but server rejected connection.

**Common causes**:

1. Client making too many simultaneous connections: server rejecting excess
2. Request taking too long: server timeout on socket

---

## System Issues

### No Space Left on Device

#### On VM

1. **Check disk usage**:
   ```bash
   sudo df -hT        # Overall disk usage by mount
   sudo du -sh * | sort -hr  # Disk usage by directory
   ```

2. **Delete old log files** (common culprit)
   ```bash
   sudo rm /var/log/kafka/*.log.1 /var/log/kafka/*.log.2
   ```

3. **If need to increase disk**:
   - Increase size in cloud provider portal/CLI
   - For boot disk: additional steps before resize (see [Google Cloud docs](https://cloud.google.com/compute/docs/disks/resize-persistent-disk))
   - Grow filesystem inside VM:

   ```bash
   # Check device name
   df  # or lsblk

   # Grow filesystem
   sudo resize2fs /dev/$DEVICE       # ext4
   sudo xfs_growfs $MOUNT_DIR        # xfs
   sudo btrfs filesystem resize max $MOUNT_DIR  # btrfs

   # Verify
   df -h
   ```

#### In Kubernetes

Rarely see this in Kubernetes (stateless workloads). Two exceptions:

1. **Memory limit too small**: Define `512m` or `512mi` instead of `512Mi`
   - Triggers "no space left" error (misleading)
   - Fix: correct the memory unit to `512Mi`

2. **PersistentVolume full**: Investigate like VM above

---

## SSH Issues

### General: Timeout

**Step 1: Verify VPN connection**

```bash
# Resolve bastion hostname
dig +short bastion.company-internal.com
# Output: 210.16.64.27

# Check route to bastion
ip route get 210.16.64.27

# Wrong route (not through VPN tunnel):
# 210.16.64.27 via 192.168.0.1 dev wlp0s20f3 src 192.168.0.193

# Correct route (through VPN):
# 210.16.64.27 via 10.0.16.5 dev tun0 src 10.0.16.6
```

If not going through VPN tunnel: Either VPN not connected or routes not configured.

**Step 2: Verify correct bastion**

Each environment has its own bastion. See bastion inventory. Check SSH config:

```bash
ssh -v 172.xx.xx.xx
# Look for "ProxyJump" in output indicating bastion jump
```

### Permission Denied

#### Check Username

```bash
# Error should show username:
# user@10.46.100.6: Permission denied (publickey).

# Verify username is correct
```

#### Ubuntu Version Mismatch

Ubuntu 22.04+ SSH client can't reach Ubuntu 18.04 servers (legacy protocol removed).

**Workaround**: Use ubuntu:focal Docker image locally to SSH
```bash
docker run -it ubuntu:focal /bin/bash
apt update && apt install -y openssh-client
ssh user@host
```

**Better solution**: Create infrastructure support ticket to upgrade server.

#### Check Server Auth Log

Ask infrastructure team to check `/var/log/auth.log` on the server.

### GCP-Specific: OS Login

**Check if enabled**:

- Project level metadata or instance level metadata
- Go to VM details in Cloud Console

**If OS Login enabled**:

You need these permissions:
- `roles/compute.osAdminLogin` on the VM
- `roles/iam.serviceAccountUser` on any attached service accounts (if any)

**If OS Login disabled**:

- Add your SSH public key to project or instance metadata
- No IAM permissions needed, but harder to manage offboarding

**Username format**:

- Standard: `email_with_underscores` (user_company_com)
- Different GCP org: `ext_` prefix (ext_user_company_com)

Check your username:
```bash
gcloud compute os-login describe-profile
```

### Azure-Specific: SSH Login

Note: Azure shows "Too many authentication failures" instead of "permission denied" but means the same.

**Required permissions**:
- Virtual Machine Administrator Login role on VM (minimum)
- Note: Virtual Machine Contributor doesn't include SSH login

**Required infrastructure**:
- VM must have system-assigned managed identity

---

## Monitoring Issues

### Missing Datadog Metrics

**Issue**: Datadog metrics missing during a time period, compared to logs available.

**Root cause**: Unhealthy Datadog agent pod.

**Check**:
1. Datadog agent pod status: `kubectl get pod -n datadog`
2. Pod in CrashLoopBackOff? Check logs: `kubectl logs -n datadog <pod>`
3. Resource consumption hitting limits? Check metrics

**Solutions**:
- Rolling restart: `kubectl rollout restart daemonset/datadog-agent -n datadog`
- Increase resource limits if CPU/memory exceeded

### Missing WAF Logs

**Issue**: WAF logs missing from Logs explorer during specific time.

**Root cause**: WAF can't send logs to SFTP server (usually broken GCS Fuse mount).

**GCP Legacy WAF SFTP Server** (IP: 172.xx.xx.xx):

1. SSH to server: `ssh 172.xx.xx.xx`
2. Check mount status: `sudo ls -alh /data/WAF-logs/`
3. If broken, remount:
   ```bash
   sudo umount /data/WAF-logs/company-production
   mount --target /data/WAF-logs/company-production
   ```

**WAF (Imperva) Portal** (https://management.service.imperva.com/):

1. Go to Company Production > Account Management
2. SIEM Logs > WAF Log Setup
3. Test connection with SFTP password
4. Repeat for Attack Analytics Logs Setup
5. Verify logs reappear in Logs explorer

### Kubernetes DNS Issues

**Common GCP GKE issues**: See post-mortem [Kube-DNS Issue](https://internal-wiki/postmortems)

**Debugging DNS in pod**:
```bash
# From inside pod
nslookup kubernetes.default
nslookup external-service.example.com

# Check kube-dns pod logs
kubectl logs -n kube-system -l k8s-app=kube-dns
```

**Common references**:
- [Why do domain names end with a dot?](https://mxtoolbox.com/article/dots-at-the-end-of-domain-names)
- [Alpine Linux DNS issues](https://wiki.alpinelinux.org/)

---

## Related Documentation

- **[CONCEPT.md](CONCEPT.md)**: Debugging frameworks, decision trees, tools reference
- **[WORKSHOP.md](WORKSHOP.md)**: Hands-on labs with 15 progressive scenarios
- **[README.md](README.md)**: Learning paths, FAQs, quick reference cheatsheet
