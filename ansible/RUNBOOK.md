# Ansible Production Runbook

## 1. Overview

Ansible is an agentless infrastructure automation platform used for configuration management, application deployment, and infrastructure-as-code. This runbook provides operational procedures for deploying, maintaining, and troubleshooting Ansible in production environments.

**Key Capabilities**:
- Infrastructure provisioning and configuration
- Application deployment and updates
- Multi-tier orchestration
- Disaster recovery automation
- Compliance and security automation

---

## 2. Standard Deployment Configuration

### 2.1 Ansible Control Node Setup

The control node is the machine where Ansible executes playbooks. Recommended specifications:

**System Requirements**:
- **OS**: Linux (Ubuntu 20.04 LTS or CentOS 8+)
- **Python**: 3.8+
- **CPU**: 2+ cores
- **Memory**: 4GB+ RAM
- **Storage**: 50GB+ for playbooks, inventories, logs

**Installation**:

```bash
#!/bin/bash
# Install Ansible on Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y python3 python3-pip git

# Install Ansible and essential collections
pip3 install ansible>=2.11
pip3 install ansible-lint  # For linting

# Create directory structure
mkdir -p /opt/ansible/{playbooks,roles,inventories,logs}
cd /opt/ansible

# Clone or initialize repository
git clone <your-ansible-repo> .
```

**Essential Configuration** (`ansible.cfg`):

```ini
[defaults]
# Inventory and host settings
inventory = inventories/production/hosts
host_key_checking = False
remote_user = ansible
private_key_file = ~/.ssh/ansible_key

# Execution settings
forks = 10              # Parallel task execution
timeout = 30            # SSH timeout
log_path = /var/log/ansible.log

# Performance optimization
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_cache
fact_caching_timeout = 86400

# Display settings
force_color = True
display_skipped_hosts = False
deprecation_warnings = False

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

### 2.2 SSH Key Setup

Ansible requires SSH access to all managed hosts:

```bash
# Generate SSH key for Ansible user (if not exists)
ssh-keygen -t ed25519 -f ~/.ssh/ansible_key -N ""

# Set proper permissions
chmod 600 ~/.ssh/ansible_key
chmod 700 ~/.ssh

# Copy public key to all managed hosts
for host in web1.example.com web2.example.com; do
  ssh-copy-id -i ~/.ssh/ansible_key.pub ansible@$host
done

# Verify connectivity
ansible all -i inventories/production/hosts -m ping
```

### 2.3 Inventory Configuration

**Static Inventory** (`inventories/production/hosts`):

```ini
[webservers]
web1.example.com
web2.example.com
web3.example.com

[databases]
db1.example.com db_primary=true
db2.example.com db_primary=false

[caching]
cache1.example.com

[all:vars]
ansible_user=ansible
ansible_ssh_private_key_file=~/.ssh/ansible_key
ansible_python_interpreter=/usr/bin/python3
```

**Dynamic Inventory** (AWS example - `aws_ec2.yml`):

```yaml
plugin: aws_ec2
regions:
  - us-east-1
  - us-west-2

filters:
  tag:Environment: production

keyed_groups:
  - key: tags.Role
    separator: _
  - key: placement.region
    prefix: aws
```

### 2.4 Group Variables

Define variables for host groups:

**`inventories/production/group_vars/webservers.yml`**:

```yaml
---
# Web server configuration
http_port: 80
https_port: 443
app_version: "2.0.0"

# Performance tuning
max_connections: 1000
worker_processes: 4

# Monitoring
enable_monitoring: true
metrics_port: 9090
```

**`inventories/production/group_vars/databases.yml`**:

```yaml
---
# Database configuration
db_port: 5432
db_backup_enabled: true
db_backup_schedule: "0 2 * * *"  # 2 AM daily

# Replication
db_replication: true
replication_lag_threshold: 10  # seconds
```

---

## 3. Standard Playbook Structure

### 3.1 Directory Layout

```
ansible-project/
├── ansible.cfg
├── inventory/
│   ├── production/
│   │   ├── hosts
│   │   ├── group_vars/
│   │   │   ├── all.yml
│   │   │   ├── webservers.yml
│   │   │   └── databases.yml
│   │   └── host_vars/
│   ├── staging/
│   └── development/
├── roles/
│   ├── common/
│   │   ├── tasks/main.yml
│   │   ├── handlers/main.yml
│   │   ├── vars/main.yml
│   │   ├── defaults/main.yml
│   │   └── templates/
│   ├── webserver/
│   ├── database/
│   └── monitoring/
├── playbooks/
│   ├── site.yml
│   ├── deploy.yml
│   ├── upgrade.yml
│   └── maintenance.yml
├── templates/
├── files/
├── group_vars/
└── requirements.yml
```

### 3.2 Main Playbook Template (`site.yml`)

```yaml
---
- name: Deploy infrastructure
  hosts: all
  gather_facts: yes
  any_errors_fatal: true
  
  vars:
    app_name: myapp
    app_version: "2.0.0"
    environment: production
  
  pre_tasks:
    - name: Validate prerequisites
      assert:
        that:
          - ansible_os_family == 'Debian' or ansible_os_family == 'RedHat'
          - ansible_memtotal_mb >= 2048
          - ansible_processor_vcpus >= 2
        fail_msg: "Host does not meet minimum requirements"
    
    - name: Check connectivity
      wait_for_connection:
        delay: 1
        timeout: 10
    
    - name: Record deployment start
      set_fact:
        deploy_start_time: "{{ ansible_date_time.iso8601 }}"
  
  roles:
    - role: common
      tags: [common, setup]
    
    - role: monitoring
      tags: [monitoring, setup]
    
    - role: application
      tags: [app, deploy]
      vars:
        version: "{{ app_version }}"
  
  post_tasks:
    - name: Health check
      uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        status_code: 200
      register: health_check
      retries: 5
      delay: 10
      when: "'webservers' in group_names"
    
    - name: Verify deployment
      assert:
        that:
          - health_check.status is defined
          - health_check.status == 200
        fail_msg: "Application health check failed"
      when: health_check is defined
    
    - name: Record deployment end
      set_fact:
        deploy_end_time: "{{ ansible_date_time.iso8601 }}"
    
    - name: Send deployment notification
      mail:
        host: smtp.example.com
        port: 587
        to: devops@example.com
        subject: "Deployment completed: {{ app_name }} v{{ app_version }}"
        body: |
          Deployment Summary:
          - Application: {{ app_name }}
          - Version: {{ app_version }}
          - Environment: {{ environment }}
          - Start: {{ deploy_start_time }}
          - End: {{ deploy_end_time }}
          - Status: SUCCESS
      when: deploy_result is succeeded
```

---

## 4. Deployment Procedures

### 4.1 Pre-Deployment Checklist

Before any deployment, verify:

```bash
# 1. Syntax check
ansible-playbook --syntax-check playbooks/site.yml

# 2. Inventory validation
ansible-inventory -i inventories/production/hosts --list

# 3. Connectivity test
ansible all -i inventories/production/hosts -m ping

# 4. Gather facts (optional, can take time)
ansible all -i inventories/production/hosts -m setup
```

### 4.2 Dry-Run Deployment

Always test with `--check` mode first:

```bash
# Dry-run on staging
ansible-playbook -i inventories/staging playbooks/site.yml --check --diff

# Test on single host first
ansible-playbook -i inventories/production playbooks/site.yml \
  --check --diff \
  --limit web1.example.com
```

### 4.3 Production Deployment

Execute deployment with proper logging:

```bash
# Full deployment
export ANSIBLE_LOG_PATH=/var/log/ansible/deployment-$(date +%Y%m%d-%H%M%S).log
ansible-playbook -i inventories/production playbooks/site.yml -v

# Rolling deployment (one host at a time)
ansible-playbook -i inventories/production playbooks/site.yml \
  --limit webservers \
  --serial 1 \
  -v

# Deployment with tags
ansible-playbook -i inventories/production playbooks/site.yml \
  --tags "app,deploy" \
  -v
```

### 4.4 Rollback Procedure

If deployment fails:

```bash
# Revert to previous version
export ROLLBACK_VERSION="1.9.0"
ansible-playbook -i inventories/production playbooks/rollback.yml \
  -e "app_version=$ROLLBACK_VERSION" \
  -v

# Verify rollback
ansible all -i inventories/production -m shell -a "curl http://localhost:8080/version"
```

---

## 5. Monitoring & Health Checks

### 5.1 Monitoring Configuration

Add monitoring role to all hosts:

```yaml
roles:
  - role: monitoring
    vars:
      metrics_port: 9090
      enable_prometheus: true
      enable_logging: true
```

### 5.2 Critical Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| Ansible playbook execution time | > 30 min | Investigate | 
| SSH connection failures | > 5% | Check network |
| Task failure rate | > 0% | Review logs |
| Playbook success rate | < 99% | Alert team |

### 5.3 Health Check Commands

```bash
# Check last deployment status
ansible-playbook -i inventories/production playbooks/health_check.yml

# Verify all hosts are reachable
ansible all -i inventories/production -m ping

# Check specific service status
ansible webservers -i inventories/production -m systemd -a "name=myapp state=started"

# Review recent deployment logs
tail -100f /var/log/ansible.log
```

---

## 6. Maintenance & Upgrades

### 6.1 Ansible Version Upgrade

```bash
# Check current version
ansible --version

# Backup current installation
pip3 freeze > requirements-backup.txt

# Upgrade Ansible
pip3 install --upgrade ansible

# Verify upgrade
ansible --version

# Test with staging inventory
ansible-playbook -i inventories/staging playbooks/site.yml --syntax-check
```

### 6.2 Collection Updates

```bash
# Check for collection updates
ansible-galaxy collection list

# Update all collections
ansible-galaxy collection install --upgrade -r requirements.yml

# Update specific collection
ansible-galaxy collection install --upgrade community.general
```

### 6.3 Role Updates

Roles should be version-controlled. Update via Git:

```bash
# Pull latest changes
git pull origin main

# Verify changes
git diff HEAD~1

# Test updated roles
ansible-playbook -i inventories/staging playbooks/site.yml --check --diff
```

---

## 7. Troubleshooting

### 7.1 Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| **SSH Connection Failed** | `UNREACHABLE! => {... "msg": "Failed to connect to the host via ssh..."}` | Verify SSH key permissions: `chmod 600 ~/.ssh/ansible_key`, check network connectivity, verify host is reachable: `ping <host>` |
| **Python Not Found** | `fatal: [host]: FAILED! => {"msg": "python3 not found..."}` | Install Python: `ansible all -i hosts -m raw -a "apt-get install -y python3"`, or set `ansible_python_interpreter` in inventory |
| **Privilege Escalation Failed** | `fatal: [host]: FAILED! => {"msg": "sudo: sorry..."}` | Ensure `become_user` has sudo access without password, check sudoers file: `visudo` |
| **Task Timeout** | `fatal: [host]: FAILED! - TimeoutError...` | Increase timeout: `timeout = 60` in `ansible.cfg`, check host performance |
| **Variable Not Defined** | `fatal: [host]: FAILED! => {"msg": "The variable 'xyz' is not defined..."}` | Check variable spelling, verify variable scope (defaults/vars/group_vars), use `debug: var=xyz` to inspect |
| **Handler Not Triggered** | Service restart doesn't occur even with `notify` | Ensure task has `changed_when` or `notify` is correctly spelled, handlers run at end of play |
| **Template Syntax Error** | `fatal: [host]: FAILED! => {"msg": "TypeError - unsupported..."}` | Validate Jinja2 template syntax, test locally: `jinja2 template.j2`, use `try-except` in complex templates |
| **Inventory Parse Error** | `[WARNING] Unable to parse /inventory as an inventory source` | Validate YAML/INI syntax, check file encoding (UTF-8), verify file permissions |

### 7.2 Debugging Techniques

**Enable Verbose Output**:

```bash
# Single verbose (-v): Task names
ansible-playbook playbooks/site.yml -i inventories/production -v

# Double verbose (-vv): Task names and facts
ansible-playbook playbooks/site.yml -i inventories/production -vv

# Triple verbose (-vvv): Extremely verbose with connection debug
ansible-playbook playbooks/site.yml -i inventories/production -vvv

# Maximum verbose (-vvvv): Connection debugging
ansible-playbook playbooks/site.yml -i inventories/production -vvvv
```

**Debug Specific Tasks**:

```yaml
# Use debug module to inspect variables
- name: Debug variables
  debug:
    msg: |
      Variable 1: {{ var1 }}
      Variable 2: {{ var2 }}
    verbosity: 2  # Only shown with -vv

# Use pause to inspect state
- name: Pause for debugging
  pause:
    prompt: "Press ENTER to continue"

# Register output for inspection
- name: Run command
  shell: /opt/app/bin/check-status
  register: status_output

- name: Show output
  debug:
    var: status_output
```

**Step-by-Step Execution**:

```bash
# Execute tasks one at a time with confirmation
ansible-playbook playbooks/site.yml -i inventories/production --step

# Start from specific task
ansible-playbook playbooks/site.yml -i inventories/production \
  --start-at-task="Task Name"

# Run only specific tags
ansible-playbook playbooks/site.yml -i inventories/production \
  --tags "debug,important"
```

**Review Logs**:

```bash
# Show Ansible logs
tail -100f /var/log/ansible.log

# Search for errors
grep ERROR /var/log/ansible.log

# Show last deployment
cat /var/log/ansible/deployment-*.log | tail -200
```

### 7.3 Essential Commands

```bash
# List all hosts in inventory
ansible-inventory -i inventories/production/hosts --list

# Display inventory in graph format
ansible-inventory -i inventories/production/hosts --graph

# Get facts from specific host
ansible <hostname> -i inventories/production -m setup

# Run adhoc command on all webservers
ansible webservers -i inventories/production -m shell -a "systemctl status myapp"

# Copy file to all hosts
ansible all -i inventories/production -m copy -a "src=file.txt dest=/tmp/"

# Execute playbook with extra variables
ansible-playbook playbooks/site.yml -e "app_version=2.0.0 env=prod"

# Check syntax without executing
ansible-playbook playbooks/site.yml --syntax-check

# Show what would change (dry-run)
ansible-playbook playbooks/site.yml --check --diff

# Get execution time summary
ansible-playbook playbooks/site.yml --stats
```

---

## 8. Disaster Recovery

### 8.1 Backup Strategy

**Backup Configuration**:

```bash
# Daily backup of all playbooks and inventories
0 2 * * * tar -czf /backups/ansible-$(date +\%Y\%m\%d).tar.gz \
  /opt/ansible/{playbooks,roles,inventories,requirements.yml}

# Backup to remote storage (S3)
0 3 * * * aws s3 sync /opt/ansible s3://ansible-backups/ --delete
```

### 8.2 Recovery Procedures

**Restore from Backup**:

```bash
# List available backups
ls -la /backups/ansible-*.tar.gz

# Restore to specific date
tar -xzf /backups/ansible-20240131.tar.gz -C /opt/

# Verify restored content
ls -la /opt/ansible/playbooks/
```

**Verify Critical Hosts**:

```bash
# After recovery, verify connectivity
ansible all -i inventories/production -m ping

# Run health check playbook
ansible-playbook -i inventories/production playbooks/health_check.yml

# Manual verification
ssh ansible@<host> "systemctl status myapp"
```

---

## 9. Security Best Practices

### 9.1 Secrets Management

```bash
# Encrypt sensitive files
ansible-vault encrypt inventories/production/group_vars/databases.yml

# Edit encrypted file
ansible-vault edit inventories/production/group_vars/databases.yml

# View encrypted content
ansible-vault view inventories/production/group_vars/databases.yml

# Run playbook with vault password
ansible-playbook playbooks/site.yml --vault-password-file ~/.vault-pass

# Create encrypted variable file
echo "db_password: supersecret" | ansible-vault encrypt /dev/stdin
```

### 9.2 SSH Key Security

```bash
# Restrict SSH key permissions
chmod 600 ~/.ssh/ansible_key
chmod 700 ~/.ssh

# Use SSH agent for key management
eval $(ssh-agent)
ssh-add ~/.ssh/ansible_key

# Verify SSH key is loaded
ssh-add -l
```

### 9.3 Audit Logging

```bash
# Enable Ansible logging in config
log_path = /var/log/ansible.log

# Review deployment logs
grep -i "changed" /var/log/ansible.log

# Archive logs for compliance
tar -czf /archive/ansible-logs-$(date +%Y%m).tar.gz /var/log/ansible.log
```

---

## 10. Performance Tuning

### 10.1 Optimization Settings

```ini
[defaults]
# Parallelization
forks = 20                 # Increase for large inventories

# Fact caching (improves performance significantly)
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_cache
fact_caching_timeout = 86400

# Connection pooling
[ssh_connection]
pipelining = True
control_path = /tmp/ansible-ssh-%%h-%%p-%%r
```

### 10.2 Performance Monitoring

```bash
# Show execution time per task
ansible-playbook playbooks/site.yml --stats

# Profile slow tasks
ansible-playbook playbooks/site.yml -vvv 2>&1 | grep -E "TASK|elapsed"

# Monitor system during execution
watch -n 1 'ps aux | grep ansible'
```

---

## Appendix: Reference Commands

```bash
# Inventory Operations
ansible-inventory -i hosts --list              # List all hosts
ansible-inventory -i hosts --graph             # Graph view

# Playbook Operations
ansible-playbook playbooks/site.yml            # Run playbook
ansible-playbook playbooks/site.yml --check    # Dry-run
ansible-playbook playbooks/site.yml --diff     # Show changes
ansible-playbook playbooks/site.yml -v         # Verbose output
ansible-playbook playbooks/site.yml --step     # Step through

# Adhoc Commands
ansible all -m ping                            # Ping all hosts
ansible webservers -m setup                    # Get host facts
ansible all -m shell -a "date"                 # Run command
ansible all -m copy -a "src=file dest=/tmp"    # Copy file

# Vault Operations
ansible-vault encrypt file.yml                 # Encrypt file
ansible-vault decrypt file.yml                 # Decrypt file
ansible-vault edit file.yml                    # Edit encrypted file
ansible-vault view file.yml                    # View encrypted file

# Collection Management
ansible-galaxy collection list                 # List collections
ansible-galaxy collection install community.general  # Install
ansible-galaxy collection install -r requirements.yml # From file
```

---

## Contact & Escalation

- **Slack Channel**: #ansible-operations
- **On-Call**: ops-team@example.com
- **Documentation**: [CONCEPT.md](./CONCEPT.md)
- **Workshop**: [WORKSHOP.md](./WORKSHOP.md)

---

**Last Updated**: January 31, 2026  
**Maintained By**: Infrastructure & Automation Team
