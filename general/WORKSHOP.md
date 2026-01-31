# Infrastructure Debugging Workshop: Hands-On Labs

## Overview

This workshop provides practical debugging exercises using [sadservers.com](https://sadservers.com), an open-source platform with temporary broken servers you can practice fixing. No registration required for most scenarios.

**Duration**: 60-90 minutes  
**Prerequisites**: Basic Linux knowledge, familiarity with CLI tools  
**Learning Outcome**: Develop systematic debugging skills and practice diagnostic workflows

---

## Part 1: Fundamentals (Tasks 1-3)

### Task 1: Find the Problem Source (Saint John scenario)

**Scenario**: [Saint John - What is writing to this log file?](https://sadservers.com/wargames/Saint%20John)

**Objective**: Identify what process is repeatedly writing to a log file

**Expected Time**: 10 minutes

**Steps**:

```bash
# 1. List running processes
ps aux

# 2. Find the suspicious log file (usually /tmp/*)
ls -la /tmp/ | head -20

# 3. Monitor the file in real-time to see what's writing to it
tail -f /var/log/some.log

# 4. While tail is running in another terminal, use lsof to find process
lsof /var/log/some.log

# 5. Identify the process and kill it
kill -9 <PID>

# 6. Verify the log file is no longer growing
ls -la /tmp/some.log
```

**Key Learning**: 
- Use `ps aux` to list all processes
- Use `tail -f` to observe file changes in real-time
- Use `lsof` (list open files) to find which process has file open
- Correlate process activity with file activity

**Verification**: File is no longer being written to

---

### Task 2: Data Processing (Saskatoon scenario)

**Scenario**: [Saskatoon - Counting IPs](https://sadservers.com/wargames/Saskatoon)

**Objective**: Extract and count unique IP addresses from a log file

**Expected Time**: 10 minutes

**Steps**:

```bash
# 1. Examine the log file structure
head -20 /var/log/some.log
tail -20 /var/log/some.log

# 2. Extract IP addresses (usually first field or after timestamp)
cat /var/log/some.log | awk '{print $1}' | head -10

# 3. Get unique IPs
cat /var/log/some.log | awk '{print $1}' | sort -u | wc -l

# 4. Sort by frequency to find top IPs
cat /var/log/some.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10

# 5. Validate the count
```

**Key Learning**:
- Text processing with `awk` and `grep`
- Sorting and counting with `sort`, `uniq`, `wc`
- Piping commands together (`|`)
- Verifying results with multiple methods

**Verification**: Count matches expected number

---

### Task 3: Secret Configuration (Santiago scenario)

**Scenario**: [Santiago - Find the secret combination](https://sadservers.com/wargames/Santiago)

**Objective**: Find a hidden combination by reading system files and configuration

**Expected Time**: 15 minutes

**Steps**:

```bash
# 1. List common configuration locations
ls -la /etc/ | grep -E "passwd|shadow|config"

# 2. Search for clues in files
grep -r "secret" /etc/ 2>/dev/null

# 3. Check environment variables
env | sort

# 4. Look in hidden files
cat ~/.bashrc
cat ~/.bash_history (if history saved)

# 5. Check process environment
ps aux | grep <process>
cat /proc/<PID>/environ | tr '\0' '\n'

# 6. Read protected files (may need sudo)
sudo cat /etc/shadow (need root)

# 7. Piece together the clues to find combination
```

**Key Learning**:
- System files contain important configuration
- Environment variables passed to processes
- Process details accessible in `/proc` filesystem
- Combining multiple clues to solve a problem
- Using grep to search for keywords

**Verification**: Secret combination revealed

---

## Part 2: Service Management (Tasks 4-7)

### Task 4: Database Connection Issues (Manhattan scenario)

**Scenario**: [Manhattan - Can't write data into database](https://sadservers.com/wargames/Manhattan)

**Objective**: Diagnose and fix database connection issues

**Expected Time**: 15 minutes

**Steps**:

```bash
# 1. Check if database service is running
sudo systemctl status postgresql@14-main
# Note: Use postgresql@14-main (not just postgresql)

# 2. If not running, start it
sudo systemctl start postgresql@14-main

# 3. Check database logs
sudo journalctl -u postgresql@14-main -n 50

# 4. Verify database is listening
sudo ss -tlnp | grep 5432

# 5. Test database connection
sudo -u postgres psql -d postgres -c "SELECT 1;"

# 6. Check file permissions
ls -la /var/lib/postgresql/14/main/

# 7. If permission issues, fix them
sudo chown -R postgres:postgres /var/lib/postgresql/14/main/

# 8. Try application connection
# Application should now connect successfully
```

**Key Learning**:
- Use `systemctl status` to check service health
- Identify exact service name (postgresql@14-main vs postgresql)
- Check service logs with `journalctl`
- Verify ports are listening
- Fix permission issues
- Restart service after fix

**Verification**: Application can write to database successfully

---

### Task 5: Nginx Configuration (Cape Town scenario)

**Scenario**: [Cape Town - Borked Nginx](https://sadservers.com/wargames/Cape%20Town)

**Objective**: Fix Nginx configuration and get web server working

**Expected Time**: 15 minutes

**Steps**:

```bash
# 1. Check Nginx status
sudo systemctl status nginx

# 2. Test Nginx configuration syntax
sudo nginx -t

# Output should show if config is invalid

# 3. Examine Nginx config
sudo cat /etc/nginx/nginx.conf
sudo ls -la /etc/nginx/sites-*

# 4. Check error logs
sudo tail -f /var/log/nginx/error.log

# 5. Common issues:
# - Missing semicolons in config
# - Wrong file paths
# - Port already in use
# - Permission issues on static files

# 6. Fix configuration errors
sudo nano /etc/nginx/sites-enabled/default

# 7. Test syntax again
sudo nginx -t

# 8. Reload/restart Nginx
sudo systemctl reload nginx
# or
sudo systemctl restart nginx

# 9. Verify it's working
curl http://localhost
curl localhost:80
```

**Key Learning**:
- Use `nginx -t` to validate configuration before restarting
- Check error logs for detailed error messages
- Common Nginx issues: syntax, paths, permissions, port conflicts
- Use `curl` to test web server locally
- `reload` vs `restart` (reload = no downtime)

**Verification**: curl returns expected HTML page

---

### Task 6: Docker Container Startup (Salta scenario)

**Scenario**: [Salta - Docker container won't start](https://sadservers.com/wargames/Salta)

**Objective**: Diagnose why Docker container fails to start

**Expected Time**: 15 minutes

**Steps**:

```bash
# 1. List all containers (including stopped)
docker ps -a

# 2. Check container status and exit code
docker container ls -a

# 3. Get detailed container info
docker inspect <container_name>

# 4. Check container logs
docker logs <container_name>

# Look for:
# - File not found errors
# - Permission denied
# - Port already in use
# - Memory/resource limits exceeded

# 5. Common issues:
# - Entrypoint script doesn't exist
# - Wrong permissions on script
# - Missing required files
# - Corrupted image

# 6. If issue in image, check image
docker image ls

# 7. Check image history
docker history <image_name>

# 8. Rebuild container (if needed)
# Note: In sadservers you cannot pull new images
# Work with existing images

# 9. Fix the underlying issue (e.g., fix script)
# Then restart container

docker rm <container> (remove failed container)
docker run ... (start new container with fixed image)
```

**Key Learning**:
- Use `docker logs` to see container output
- Use `docker inspect` for detailed container metadata
- Common startup failures: files, permissions, resources
- Exit codes indicate failure type
- Cannot rebuild images in sadservers (environment limitation)

**Verification**: Container starts and remains running (`docker ps` shows it)

---

### Task 7: Docker Network Connectivity (Bern scenario)

**Scenario**: [Bern - Docker web container can't connect to db container](https://sadservers.com/wargames/Bern)

**Objective**: Fix network connectivity between Docker containers

**Expected Time**: 20 minutes

**Steps**:

```bash
# 1. List running containers
docker ps

# 2. Get network information
docker network ls
docker network inspect bridge (or custom network name)

# 3. Check if containers are on same network
docker inspect <web_container> | grep -A 10 NetworkSettings
docker inspect <db_container> | grep -A 10 NetworkSettings

# 4. Verify both containers are on same network
# If not, fix:
docker network connect <network_name> <container>

# 5. Test connectivity between containers
docker exec <web_container> ping <db_container>
docker exec <web_container> ping <db_container_ip>

# 6. Check if ports are exposed
docker inspect <db_container> | grep -E "ExposedPorts|PortBindings"

# 7. Test specific port connectivity
docker exec <web_container> nc -zv <db_container_ip> 5432

# 8. Check container environment variables (may contain hostname)
docker inspect <web_container> | grep -E "Env|Cmd"

# 9. Check container hosts file
docker exec <web_container> cat /etc/hosts

# 10. Common issues:
# - Containers not on same network
# - Port not exposed
# - Firewall rules in container
# - Database not actually listening

# 11. Fix and verify
docker exec <web_container> <test_command>
```

**Key Learning**:
- Containers need to be on same network to communicate
- Use `docker network` to manage networks
- `docker exec` to run commands in running containers
- Verify network connectivity with `ping` and `nc`
- Check ports are actually listening
- Container hostname != container name (use name for DNS)

**Verification**: Web container can successfully connect to database container

---

## Part 3: System-Level Issues (Tasks 8-10)

### Task 8: Resource Exhaustion Issues

**Objective**: Identify and resolve CPU, memory, or disk bottlenecks

**Time**: 20 minutes

**Diagnostic Process**:

```bash
# 1. Overall resource usage
free -h (memory)
df -h (disk)
uptime (CPU load)

# 2. Per-process resource usage
top or htop (interactive view)
ps aux --sort=-%cpu (sort by CPU)
ps aux --sort=-%mem (sort by memory)

# 3. Disk I/O
iotop (if installed)
iostat -x 1 (if installed)

# 4. File system usage by directory
du -sh /home/*
du -sh /var/log/*
du -sh /tmp/*

# 5. Identify problematic process
ps aux | grep <process>
strace -p <PID> (trace system calls)

# 6. Fix options:
# - Increase limits (resize disk, increase RAM)
# - Reduce load (kill unnecessary processes)
# - Optimize process (tune parameters)
# - Archive old data (logs, temp files)
```

**Common Scenarios**:
- **Full Disk**: Delete logs, temporary files, or expand disk
- **High CPU**: Identify runaway process, tune parameters
- **High Memory**: Check for memory leaks, limit process memory

**Verification**: Resource usage returns to normal, services healthy

---

### Task 9: System Time Synchronization

**Objective**: Diagnose and fix time synchronization issues

**Time**: 15 minutes

**Steps**:

```bash
# 1. Check current system time
date
timedatectl (newer systems)

# 2. Check NTP status
systemctl status ntpd (or chrony)
timedatectl show-timesync

# 3. Verify NTP is synchronized
ntpstat
chronyc sources (chrony)

# 4. If not synchronized, restart NTP
sudo systemctl restart ntpd
sudo systemctl restart chrony

# 5. Manually set time (if needed)
sudo date -s "2024-01-15 14:30:00"

# 6. Verify synchronization
date +%s (current Unix timestamp)
```

**Why This Matters**:
- Incorrect time breaks SSL certificates (time validation)
- Causes log timestamp mismatches
- Breaks cron jobs
- Issues cluster coordination (Kubernetes, Consul)

**Verification**: System time matches reference time within 1 second

---

### Task 10: Volume Mount Issues

**Objective**: Fix mounted filesystem issues

**Time**: 15 minutes

**Steps**:

```bash
# 1. Check mounted filesystems
mount (all mounts)
df -h (disk usage per mount)
lsblk (block devices)

# 2. Check fstab (persistent mounts)
cat /etc/fstab

# 3. Check mount options
mount | grep <device>

# 4. Common issues:
# - Mount permission denied
# - Device not found
# - Mount point doesn't exist
# - Filesystem corrupted

# 5. Fix mount issues
# Create mount point if missing:
sudo mkdir -p /mnt/data

# Mount device:
sudo mount /dev/sdb1 /mnt/data

# Verify mount:
df -h /mnt/data

# 6. For persistent mount, edit fstab
sudo nano /etc/fstab
# Add: /dev/sdb1 /mnt/data ext4 defaults 0 2

# 7. Test fstab before reboot
sudo mount -a (mount all in fstab)
```

**Verification**: Device mounted successfully, accessible with correct permissions

---

## Part 4: Real-World Scenarios (Tasks 11-15)

### Task 11: Finding and Fixing Cascading Failures

**Objective**: In a broken system, identify the initial failure causing downstream issues

**Time**: 25 minutes

**Approach**:

```
Strategy: Start from the edge, work inward

1. Check cluster/service overview
   - Is primary service responsive?
   - Are dependencies responding?
   
2. Build dependency map
   - Service A requires: Service B, Service C
   - Service B requires: Database, Cache
   - Service C requires: Message Queue
   
3. Test each dependency in order
   - Is Service B responding? If not, investigate Service B first
   - Is Database responding? If not, fix database first
   
4. Timeline reconstruction
   - When did each service start failing?
   - Which failed first? (likely root cause)
   
5. Fix the root cause
   - Fix the first failure point
   - Monitor if downstream services recover automatically
```

**Common Cascading Failure Patterns**:

| Initial Failure | Observed Problem | How to Identify Root |
|---|---|---|
| Database down | All services return 503 | Check database logs first |
| DNS broken | All external connectivity fails | Test nslookup before other tests |
| Network policy too strict | Specific service unreachable | Check network policies for initial failure |
| Cache full | All cached operations fail | Check cache size and eviction |
| Secret missing | Pod crashes, CrashLoopBackOff | Check pod logs for "secret not found" |

**Verification**: Primary service responding, all dependencies functional

---

### Task 12: Multi-Component Debugging (Advanced)

**Objective**: Diagnose issues involving multiple components working together

**Time**: 30 minutes

**Case Study**: Web application with database, cache, and message queue

```
Architecture:
┌─────────────┐
│   Web App   │
└──────┬──────┘
       │
   ┌───┼───┬───────┐
   │   │   │       │
   ▼   ▼   ▼       ▼
 [DB][Cache][Queue][Auth Service]

Debugging Approach:
1. Identify which component is broken
   - Check web app logs: any errors?
   - Check which service the error mentions
   
2. Isolate to specific component
   - Can web app reach database? (test connection)
   - Can web app reach cache? (test connection)
   - Can web app reach message queue? (test connection)
   
3. Fix component-by-component
   - Fix database connectivity
   - Fix cache connectivity
   - Fix message queue connectivity
   
4. Verify integration
   - Test end-to-end flow
   - Monitor metrics for performance
```

**Key Debugging Techniques**:
- Simplify by removing components (test without cache first)
- Test each connection independently
- Use separate terminals for monitoring (logs, metrics, commands)
- Document findings as you go

**Verification**: All components connected, application functioning normally

---

## Part 5: Skill Consolidation (Tasks 16-18)

### Task 13: Complex Real-World Scenario

**Time**: 40 minutes

**Scenario**: Multiple issues compounded together

**Example Issues**:
- Service A container won't start (logs issue)
- Service B has DNS problems (can't reach service A)
- Service C has permission issues (can't read config file)
- Database connection pool exhausted

**Debugging Process**:

```
1. Triage all issues
   List: What's broken? (3-4 things)
   
2. Determine dependencies
   Which must be fixed first?
   (Usually: infrastructure → services → applications)
   
3. Fix in dependency order
   - Fix permissions (enables configs to load)
   - Fix DNS (enables service discovery)
   - Fix container images (enables startup)
   - Tune resource limits (enables stability)
   
4. Verify each fix
   Check metrics before/after each fix
   
5. End-to-end test
   Verify original functionality works
```

**Time Management**:
- Spend first 10 min understanding the issues
- Spend 20 min fixing issues in parallel (SSH to multiple terminals)
- Spend 10 min verifying and testing

**Verification**: All services operational, no errors in logs

---

### Task 14: Performance Debugging

**Time**: 30 minutes

**Objective**: Identify and fix performance bottlenecks

**Scenario**:
- Application responds slowly (p99 latency > 5 seconds)
- Not all requests slow (intermittent)
- Some endpoints fast, some slow

**Debugging Steps**:

```bash
# 1. Narrow down which requests are slow
kubectl logs <pod> | grep "duration=" | sort -t= -k2 -rn | head -10

# 2. Check resource usage during slow requests
# Terminal 1: Monitor resources
watch 'top -bn1 | head -20'

# Terminal 2: Trigger slow request
curl http://app:8080/slow-endpoint

# 3. Correlate resources with latency
- High CPU: Optimize algorithm or increase CPU allocation
- High memory: Check for memory leak or increase memory
- High disk I/O: Check for excessive logging or N+1 queries
- High network: Check for large response bodies or inefficient protocols

# 4. Check application-level metrics
- Query duration (database query analysis)
- Cache hit rate (is cache working?)
- External API latency (is external dependency slow?)

# 5. Check if pattern exists
- Specific time of day? (batch job running)
- Specific user? (data volume issue)
- Specific endpoint? (missing index or N+1 query)

# 6. Apply fix
- Add database index
- Increase cache TTL
- Optimize slow query
- Add rate limiting to prevent cascade

# 7. Verify improvement
- Measure p99 latency after fix
- Ensure fix doesn't break other metrics
```

**Key Metrics to Capture**:
- Latency (p50, p95, p99)
- Throughput (requests/sec)
- Error rate
- Resource usage (CPU, memory, disk I/O)

**Verification**: P99 latency < 500ms, no increase in error rate

---

### Task 15: Post-Incident Validation

**Time**: 20 minutes

**Objective**: Verify fix is complete and prevent recurrence

**Checklist**:

```
Verification:
  [ ] Issue is resolved (metric returns to normal)
  [ ] No side effects from fix (other metrics unchanged)
  [ ] Logs show no errors
  [ ] Alerts cleared
  [ ] Monitoring shows trend improving

Documentation:
  [ ] What was the root cause?
  [ ] Timeline of failure
  [ ] How was it fixed?
  [ ] Why did we not catch this earlier?
  
Prevention:
  [ ] Add monitoring/alert to catch earlier next time
  [ ] Add pre-check to prevent configuration error
  [ ] Add automated test for this scenario
  [ ] Document in runbook for on-call team

Sign-off:
  [ ] Stakeholders notified issue resolved
  [ ] All action items tracked
  [ ] Incident documented for learning
```

**Verification**: Incident fully resolved, documented, and preventive measures in place

---

## Recommended Practice Sequence

**For Beginners**:
1. Task 1 (find process)
2. Task 2 (counting data)
3. Task 4 (database issue)
4. Task 5 (Nginx config)
5. Task 6 (Docker startup)

**For Intermediate**:
6. Task 7 (Docker networking)
7. Task 8 (resource exhaustion)
8. Task 9 (time sync)
9. Task 13 (complex scenario)

**For Advanced**:
10. Task 12 (multi-component)
11. Task 14 (performance)
12. Task 15 (validation)

---

## Tips for Success

1. **Read error messages carefully** — they usually tell you what's wrong
2. **Check logs first** — logs contain the most information
3. **One change at a time** — change one thing, test, verify
4. **Build a mental model** — understand how components interact
5. **Practice narration** — explain what you're checking and why
6. **Document findings** — write down what you learn for future reference

---

**Last Updated**: January 2026
**Maintained by**: Platform Engineering Team
**Version**: 1.0.0

