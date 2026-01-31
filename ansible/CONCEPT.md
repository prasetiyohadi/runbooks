# Ansible: Concepts and Best Practices for Infrastructure Automation

**Purpose**: A comprehensive guide to Ansible concepts, best practices, and patterns for automating infrastructure deployment and configuration management.

## Table of Contents

- [Overview](#overview)
- [What is Ansible](#what-is-ansible)
- [Core Concepts](#core-concepts)
- [Architecture Patterns](#architecture-patterns)
- [Best Practices](#best-practices)
- [Collection Management](#collection-management)
- [Inventories and Dynamic Discovery](#inventories-and-dynamic-discovery)
- [Playbook Organization](#playbook-organization-and-structure)
- [Development Workflow](#development-workflow)
- [Cloud Integration](#cloud-integration)
- [Image Management and Provisioning](#image-management-and-provisioning)
- [Testing and Validation](#testing-and-validation)

## Overview

This document provides foundational concepts and battle-tested practices for using Ansible to automate infrastructure provisioning and application deployment. Whether you're managing VMs, containers, or cloud infrastructure, Ansible offers a simple, agentless approach to infrastructure-as-code.

**Core Value Propositions**:
- **Agentless**: SSH-based communication, no agents to manage
- **Idempotent**: Safe to run multiple times, always reaches same state
- **Human-readable**: YAML syntax anyone can understand
- **Comprehensive**: Cover servers, network, storage, security
- **Flexible**: Works with any infrastructure provider

## What is Ansible

### Definition

Ansible is an open-source automation platform that enables:
- Infrastructure provisioning and configuration management
- Application deployment automation
- Continuous delivery workflows
- Multi-tier orchestration
- Infrastructure-as-code (IaC) implementation

### Key Differences from Other Tools

| Aspect | Ansible | Terraform | Chef/Puppet |
|--------|---------|-----------|------------|
| **Architecture** | Agentless (SSH) | Agentless (API) | Agent-based |
| **Configuration** | Procedural | Declarative | Declarative |
| **Learning Curve** | Low (YAML) | Medium (HCL) | High (DSL) |
| **Strength** | Configuration mgmt | Infrastructure provisioning | Enterprise compliance |
| **Best For** | Day-2 operations | Day-0 infrastructure | Large enterprises |

### Typical Use Cases

1. **Application Deployment**: Push releases to servers
2. **Configuration Management**: Ensure consistent system state
3. **Orchestration**: Coordinate multi-step deployments
4. **Provisioning**: Configure newly created infrastructure
5. **Incident Response**: Rapid remediation playbooks
6. **Testing**: Automated environment setup

## Core Concepts

### Playbooks

A playbook is a YAML file containing a sequence of plays.

```yaml
---
- name: Deploy web application
  hosts: webservers
  gather_facts: yes
  vars:
    app_version: "1.0.0"
  
  tasks:
    - name: Install application
      package:
        name: myapp
        state: present
    
    - name: Start service
      service:
        name: myapp
        state: started
        enabled: yes
```

### Plays

A play maps a set of hosts to a set of tasks:

```yaml
- name: Configure database servers
  hosts: database          # Target hosts
  become: yes             # Privilege escalation
  serial: 1               # Rolling update (one at a time)
  
  roles:
    - common
    - database
```

### Tasks

Tasks are units of work executed sequentially:

```yaml
- name: Create application directory
  file:
    path: /opt/myapp
    state: directory
    owner: appuser
    group: appuser
    mode: '0755'
```

### Roles

Roles are reusable collections of tasks, handlers, variables, and templates.

**Directory Structure**:
```
roles/
├── common/
│   ├── tasks/main.yml              # Main tasks
│   ├── handlers/main.yml           # Event handlers
│   ├── vars/main.yml               # Role variables
│   ├── defaults/main.yml           # Default variables
│   ├── templates/                  # Jinja2 templates
│   ├── files/                      # Static files
│   └── meta/main.yml               # Role dependencies
└── database/
    ├── tasks/main.yml
    └── ...
```

**Usage in Playbooks**:
```yaml
roles:
  - common
  - role: database
    vars:
      db_name: production_db
```

### Handlers

Handlers are tasks triggered by other tasks (like service restarts):

```yaml
tasks:
  - name: Update configuration
    template:
      src: config.j2
      dest: /etc/myapp/config.yaml
    notify: Restart myapp service

handlers:
  - name: Restart myapp service
    service:
      name: myapp
      state: restarted
```

Handlers only run once, even if notified multiple times.

### Variables

Variables allow dynamic configuration:

```yaml
# Defaults (role-level)
defaults/main.yml:
  app_port: 8080
  app_user: appuser

# Variables (role-level, higher priority)
vars/main.yml:
  app_home: /opt/app
  app_logdir: /var/log/app

# Inventory variables (group or host level)
group_vars/webservers.yml:
  server_count: 3
  environment: production

# Extra variables (command-line)
ansible-playbook site.yml -e "version=1.0.0"
```

**Variable Precedence** (highest to lowest):
1. Extra vars: `-e "var=value"`
2. Task vars
3. Block vars
4. Play vars
5. Inventory host vars
6. Inventory group vars
7. Role and include vars
8. Role defaults

### Templates

Jinja2 templates enable dynamic file generation:

```jinja2
# /roles/app/templates/config.j2
[app]
port = {{ app_port }}
workers = {{ ansible_processor_vcpus }}
environment = {{ environment }}

# Database configuration
{% if db_type == 'postgresql' %}
database_url = postgresql://{{ db_user }}:{{ db_password }}@{{ db_host }}/{{ db_name }}
{% elif db_type == 'mysql' %}
database_url = mysql://{{ db_user }}:{{ db_password }}@{{ db_host }}/{{ db_name }}
{% endif %}
```

**Usage in Tasks**:
```yaml
- name: Deploy application configuration
  template:
    src: config.j2
    dest: /etc/myapp/config.yaml
    owner: appuser
    mode: '0644'
  notify: Restart application
```

### Facts

Facts are system information gathered from managed hosts:

```yaml
- name: Show system information
  debug:
    msg: |
      Hostname: {{ ansible_hostname }}
      OS: {{ ansible_os_family }}
      CPU cores: {{ ansible_processor_vcpus }}
      Memory: {{ ansible_memtotal_mb }} MB
      IP address: {{ ansible_default_ipv4.address }}
```

Common facts:
- `ansible_os_family` — OS type (Debian, RedHat, Windows, etc.)
- `ansible_processor_vcpus` — Number of CPUs
- `ansible_memtotal_mb` — Total memory
- `ansible_default_ipv4` — Primary IP address
- `ansible_hostname` — System hostname

## Architecture Patterns

### Simple Deployment

Single playbook deploying to one environment:

```yaml
# site.yml
---
- name: Deploy application
  hosts: all
  
  roles:
    - common
    - application
    - monitoring
```

### Multi-Environment

Separate inventory files per environment:

```
inventories/
├── production/
│   ├── inventory.ini          # Prod hosts
│   ├── group_vars/
│   │   ├── all.yml
│   │   └── webservers.yml
│   └── host_vars/
│       └── web1.example.com.yml
└── staging/
    ├── inventory.ini          # Staging hosts
    └── ...
```

**Execution**:
```bash
# Deploy to staging
ansible-playbook -i inventories/staging site.yml

# Deploy to production
ansible-playbook -i inventories/production site.yml
```

### Rolling Updates

Update systems one at a time to maintain availability:

```yaml
- name: Rolling application update
  hosts: webservers
  serial: 1                     # Update one host at a time
  
  pre_tasks:
    - name: Remove from load balancer
      uri:
        url: "http://lb.internal:8080/remove/{{ inventory_hostname }}"
        method: POST
  
  roles:
    - deploy_application
  
  post_tasks:
    - name: Health check
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 5
      delay: 10
    
    - name: Add back to load balancer
      uri:
        url: "http://lb.internal:8080/add/{{ inventory_hostname }}"
        method: POST
```

## Best Practices

### 1. Idempotency

**Principle**: Running a playbook multiple times produces the same result.

**Why it Matters**:
- Safe for reruns after failures
- Enables infrastructure-as-code mindset
- Simplifies disaster recovery

**How to Achieve**:

```yaml
# ✅ Good: Idempotent
- name: Ensure application package is installed
  package:
    name: myapp
    state: present

- name: Ensure service is running
  service:
    name: myapp
    state: started
    enabled: yes

# ❌ Bad: Not idempotent (runs every time)
- name: Install application
  shell: |
    cd /tmp
    ./install.sh
  
# ✅ Better: Check if already installed
- name: Check if application is installed
  stat:
    path: /opt/myapp/bin/myapp
  register: app_installed

- name: Install application
  shell: |
    cd /tmp
    ./install.sh
  when: not app_installed.stat.exists
```

### 2. Error Handling

Graceful error management prevents cascading failures:

```yaml
- name: Critical database migration
  block:
    - name: Create backup
      command: pg_dump mydb > /tmp/mydb.backup.sql
      register: backup_result
      failed_when: backup_result.rc != 0
    
    - name: Run migration
      command: /opt/myapp/bin/migrate
      register: migration_result
    
    - name: Verify migration
      postgresql_query:
        db: mydb
        query: "SELECT COUNT(*) FROM schema_migrations"
      register: migration_count
  
  rescue:
    - name: Log migration failure
      debug:
        msg: "Migration failed: {{ migration_result.stderr }}"
    
    - name: Restore from backup
      shell: psql mydb < /tmp/mydb.backup.sql
      when: backup_result is succeeded
    
    - name: Fail with clear message
      fail:
        msg: "Database migration failed and was rolled back"
```

### 3. Security Best Practices

#### Secrets Management

```yaml
# Store sensitive data with ansible-vault
---
db_password: supersecretpassword
api_token: abc123def456
ssh_private_key: |
  -----BEGIN PRIVATE KEY-----
  ...
  -----END PRIVATE KEY-----

# Use vault in playbooks
- name: Configure database
  template:
    src: db_config.j2
    dest: /etc/app/db.conf
  vars:
    db_password: "{{ vault_db_password }}"
```

**Commands**:
```bash
# Encrypt a file
ansible-vault encrypt secrets.yml

# Edit encrypted file
ansible-vault edit secrets.yml

# Run playbook with vault
ansible-playbook site.yml --vault-password-file ~/.vault-pass

# View encrypted content
ansible-vault view secrets.yml
```

#### Privilege Escalation

```yaml
# Use become explicitly
- name: Install system packages
  package:
    name: nginx
    state: present
  become: yes                 # Use sudo
  become_user: root          # Specific user
  become_method: sudo        # Escalation method

# Use for specific tasks
- name: Configure server
  hosts: all
  
  tasks:
    - name: User-level task
      debug:
        msg: "Running as {{ ansible_user_id }}"
    
    - name: Sudo-required task
      package:
        name: git
        state: present
      become: yes
```

#### SSH Key Management

```yaml
# Use SSH keys (not passwords)
- name: Deploy application
  hosts: servers
  remote_user: deploy
  private_key_file: ~/.ssh/deploy_key
  
  tasks:
    - name: Clone repository
      git:
        repo: "git@github.com:org/repo.git"
        dest: /opt/app
        version: v1.0.0
```

### 4. Playbook Organization

```yaml
---
- name: Deploy application stack
  hosts: all
  gather_facts: yes
  any_errors_fatal: true
  
  vars:
    app_name: myapp
    app_version: "1.0.0"
  
  # Validation before deployment
  pre_tasks:
    - name: Verify prerequisites
      assert:
        that:
          - ansible_os_family == 'Debian'
          - ansible_memtotal_mb >= 2048
        fail_msg: "System does not meet minimum requirements"
    
    - name: Check connectivity
      wait_for_connection:
        delay: 1
        timeout: 10
  
  # Core deployment
  roles:
    - common                      # Base system setup
    - role: application
      vars:
        version: "{{ app_version }}"
    - monitoring                  # Monitoring setup
  
  # Post-deployment verification
  post_tasks:
    - name: Verify application
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
      register: health_check
      retries: 5
      delay: 10
    
    - name: Send notification
      mail:
        host: smtp.example.com
        subject: "Deployment successful"
        body: "{{ app_name }} v{{ app_version }} deployed successfully"
      when: health_check is succeeded
```

### 5. Conditional Execution

```yaml
# Using when conditions
- name: Configure for production
  template:
    src: prod_config.j2
    dest: /etc/app/config.yaml
  when: environment == 'production'

- name: Enable debug logging
  lineinfile:
    path: /etc/app/app.conf
    line: "debug=true"
  when:
    - debug_mode | bool
    - inventory_hostname in groups['staging']

# Using loop
- name: Create users
  user:
    name: "{{ item.username }}"
    groups: "{{ item.groups }}"
    state: present
  loop: "{{ users }}"
  when: users is defined
```

### 6. Tags and Selective Execution

Tags enable running specific parts of playbooks:

```yaml
- name: Configure application
  hosts: all
  
  tasks:
    - name: Install packages
      package:
        name: "{{ item }}"
        state: present
      loop: "{{ packages }}",
      tags: [packages, setup]
    
    - name: Configure application
      template:
        src: app_config.j2
        dest: /etc/app/config.yaml
      tags: [config, always]  # 'always' runs regardless of tag filter
    
    - name: Run smoke tests
      shell: /opt/app/bin/smoke-test
      tags: [test, verify]
```

**Execution**:
```bash
# Run only setup tasks
ansible-playbook site.yml --tags setup

# Skip packages task
ansible-playbook site.yml --skip-tags packages

# Run config and test tasks
ansible-playbook site.yml --tags "config,test"
```

### 7. Logging and Debugging

**Enable Debug Output**:
```bash
# Verbosity levels
ansible-playbook -v site.yml      # Show task names
ansible-playbook -vv site.yml     # Show tasks and facts
ansible-playbook -vvv site.yml    # Extremely verbose
ansible-playbook -vvvv site.yml   # Connection debugging

# Log to file
export ANSIBLE_LOG_PATH=/var/log/ansible.log
ansible-playbook site.yml
```

**Debug Tasks in Playbooks**:
```yaml
- name: Check variable values
  debug:
    var: my_variable
  
- name: Show formatted output
  debug:
    msg: |
      System: {{ ansible_hostname }}
      Environment: {{ environment }}
      App version: {{ app_version }}

# Debug only when verbose
- name: Debug only when verbose
  debug:
    msg: "Detailed diagnostic info"
    verbosity: 2  # Only shown with -vv or higher
```

## Collection Management

### What are Collections?

Collections are packages containing roles, modules, plugins, and playbooks.

**Benefits**:
- Namespace content for organization
- Version control for content
- Share via Ansible Galaxy
- Encapsulate related functionality

### Collection Structure

```
my_collection/
├── galaxy.yml                 # Collection metadata
├── README.md
├── plugins/
│   ├── modules/              # Custom modules
│   ├── filters/              # Custom filters
│   └── lookup_plugins/       # Custom lookup plugins
├── roles/
│   ├── deploy/
│   ├── configure/
│   └── monitor/
├── playbooks/
│   ├── deploy.yml
│   └── update.yml
└── collections/
    └── requirements.yml       # Dependency specifications
```

### Collection Naming Convention

**Fully Qualified Collection Names (FQCNs)**:

```
{namespace}.{collection_name}.{plugin_or_role}
```

| Component | Rules | Examples |
|-----------|-------|----------|
| Namespace | Lowercase, no spaces | `community`, `mycompany` |
| Collection | Lowercase, no spaces | `general`, `cloud_infrastructure` |
| Plugin/Role | Lowercase, underscores, singular | `deploy_vm`, `configure_db` |

**Examples**:
- `community.general.debug_task`
- `community.postgresql.postgresql_db`
- `community.aws.ec2_instance`

### Using Collections

**In Playbooks** (explicit FQCN):
```yaml
- name: Deploy application
  hosts: all
  
  roles:
    - mycompany.infrastructure.deploy_app
    - mycompany.infrastructure.configure_monitoring
  
  tasks:
    - name: Create VM
      mycompany.cloud.provision_instance:
        name: web01
        size: medium
```

**In Galaxy Requirements** (`requirements.yml`):
```yaml
---
collections:
  - name: community.general
    version: ">=3.0.0"
  
  - name: community.aws
    version: "5.0.0"
  
  - name: community.postgresql
    version: "2.1.0"
```

**Install Dependencies**:
```bash
ansible-galaxy collection install -r requirements.yml
```

## Inventories and Dynamic Discovery

### Static Inventory

Simple host list (INI format):

```ini
[webservers]
web1.example.com
web2.example.com
web3.example.com

[databases]
db1.example.com
db2.example.com

[all:vars]
ansible_user=deploy
ansible_ssh_private_key_file=~/.ssh/id_rsa
```

### Dynamic Inventory

Automatic host discovery from cloud providers:

```yaml
# Dynamic inventory plugin (e.g., AWS)
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
    prefix: aws_region
```

**Execution**:
```bash
# Use dynamic inventory
ansible-playbook -i aws_ec2.yml site.yml

# List inventory
ansible-inventory -i aws_ec2.yml --graph
```

### Group Variables

Define variables for groups of hosts:

```yaml
# group_vars/webservers.yml
---
app_port: 8080
web_user: www-data
cache_backend: redis

# group_vars/databases.yml
---
db_backup_enabled: true
db_replication: true
```

### Host Variables

Define variables for specific hosts:

```yaml
# host_vars/web1.example.com.yml
---
host_id: 1
server_role: primary

# host_vars/web2.example.com.yml
---
host_id: 2
server_role: secondary
```

## Playbook Organization and Structure

### Project Layout

```
project/
├── ansible.cfg                # Ansible configuration
├── inventory/
│   ├── production/
│   │   ├── hosts              # Production inventory
│   │   ├── group_vars/
│   │   │   ├── all.yml
│   │   │   ├── webservers.yml
│   │   │   └── databases.yml
│   │   └── host_vars/
│   ├── staging/
│   │   └── ...                # Staging inventory
│   └── development/
│       └── ...                # Development inventory
├── roles/
│   ├── common/
│   │   ├── tasks/main.yml
│   │   ├── handlers/main.yml
│   │   ├── vars/main.yml
│   │   ├── defaults/main.yml
│   │   └── templates/
│   ├── webserver/
│   └── database/
├── playbooks/
│   ├── site.yml               # Main playbook
│   ├── deploy.yml
│   ├── update.yml
│   └── maintenance.yml
├── templates/
│   └── [shared templates]
├── files/
│   └── [shared files]
├── group_vars/
│   └── all.yml                # Global variables
├── host_vars/
│   └── [host-specific vars]
├── library/
│   └── [custom modules]
├── requirements.yml           # Collection dependencies
└── README.md
```

### ansible.cfg Configuration

```ini
[defaults]
# Inventory settings
inventory = inventory/production/hosts
host_key_checking = False

# Execution settings
forks = 10
timeout = 30

# Logging
log_path = ./ansible.log

# Display settings
force_color = True
display_skipped_hosts = False

# Fact caching (improves performance)
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_cache

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

## Development Workflow

### Playbook Development Process

1. **Design**: Plan tasks and roles
2. **Implement**: Write YAML playbooks
3. **Test Syntax**: Validate YAML structure
4. **Test Execution**: Dry-run with `--check`
5. **Deploy**: Run in target environment
6. **Verify**: Confirm expected state

### Testing Your Playbooks

**Syntax Validation**:
```bash
ansible-playbook --syntax-check site.yml
```

**Dry-Run (Check Mode)**:
```bash
# Show what would change without making changes
ansible-playbook --check site.yml

# Show detailed diff
ansible-playbook --check --diff site.yml
```

**Lint with ansible-lint**:
```bash
# Install linter
pip install ansible-lint

# Check for best practice violations
ansible-lint playbooks/
```

**Run on Single Host**:
```bash
ansible-playbook site.yml -l web1.example.com
```

**Debug Mode**:
```bash
# Step through tasks interactively
ansible-playbook site.yml --step

# Pause between tasks
ansible-playbook site.yml --start-at-task="Configure application"
```

## Cloud Integration

### Cloud Provider Integration

Ansible integrates with major cloud providers:

**AWS Example**:
```yaml
- name: Provision AWS infrastructure
  hosts: localhost
  gather_facts: no
  
  tasks:
    - name: Create security group
      amazon.aws.ec2_group:
        name: web_sg
        description: Web server security group
        rules:
          - proto: tcp
            ports: [80, 443]
            cidr_ip: 0.0.0.0/0
    
    - name: Launch EC2 instances
      amazon.aws.ec2_instances:
        image_id: ami-12345678
        instance_type: t3.medium
        count: 3
        security_group: web_sg
        register: instances
```

**Azure Example**:
```yaml
- name: Provision Azure VMs
  hosts: localhost
  gather_facts: no
  
  tasks:
    - name: Create virtual machine
      azure.azcollection.azure_rm_virtualmachine:
        resource_group: mygroup
        name: myvm
        vm_size: Standard_B2s
        image: UbuntuLTS
```

**Google Cloud Example**:
```yaml
- name: Provision GCP instances
  hosts: localhost
  gather_facts: no
  
  tasks:
    - name: Create instance
      google.cloud.gcp_compute_instance:
        name: instance-1
        machine_type: n1-standard-1
        zone: us-central1-a
```

### Cloud-Init Integration

Combine cloud-init with Ansible for VM provisioning:

```yaml
---
#cloud-config
packages:
  - python3
  - git

runcmd:
  # Install Ansible
  - pip3 install ansible
  
  # Clone configuration repository
  - git clone https://github.com/myorg/ansible-configs /root/ansible
  
  # Configure hostname, network, etc.
  - hostnamectl set-hostname web1
  
  # Run Ansible playbook
  - ansible-playbook -i localhost, -c local /root/ansible/site.yml
```

## Image Management and Provisioning

### Base Image Preparation

Pre-install Ansible and dependencies in base VM images:

```bash
#!/bin/bash
# base_image_setup.sh

# Install Python (Ansible requirement)
apt-get update
apt-get install -y python3 python3-pip git

# Install Ansible
pip3 install ansible==2.11

# Create Ansible directory
mkdir -p /opt/ansible
virtualenv /opt/ansible/venv
/opt/ansible/venv/bin/pip install ansible==2.11 boto3 azure-cli

# Validate installation
/opt/ansible/venv/bin/ansible --version
```

### Image Building with Packer

```hcl
# main.pkr.hcl
source "azure-arm" "ubuntu" {
  client_id       = var.client_id
  client_secret   = var.client_secret
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id

  managed_image_resource_group_name = "images"
  managed_image_name                = "ubuntu-ansible-20-04"

  os_type       = "Linux"
  image_publisher = "Canonical"
  image_offer     = "UbuntuServer"
  image_sku       = "20_04-lts-gen2"

  location = "eastus"
  vm_size  = "Standard_D2s_v3"
}

build {
  sources = ["source.azure-arm.ubuntu"]

  provisioner "shell" {
    inline = [
      "apt-get update",
      "apt-get install -y python3 python3-pip",
      "pip3 install ansible"
    ]
  }

  provisioner "file" {
    source      = "playbooks/"
    destination = "/tmp/playbooks"
  }

  provisioner "shell" {
    inline = [
      "ansible-playbook -i localhost, -c local /tmp/playbooks/base_config.yml"
    ]
  }
}
```

## Testing and Validation

### Testing Strategy

**Unit Testing**: Test individual tasks and roles

```bash
# Test a specific role
ansible-playbook -i localhost, test_role.yml --tags setup

# Test with specific variables
ansible-playbook site.yml -e "environment=staging debug=true"
```

**Integration Testing**: Test playbooks against staging environment

```bash
# Deploy to staging
ansible-playbook -i inventory/staging site.yml

# Run verification playbooks
ansible-playbook -i inventory/staging verify_deployment.yml
```

**Smoke Testing**: Quick validation after deployment

```yaml
# verify_deployment.yml
---
- name: Smoke tests
  hosts: all
  gather_facts: no
  
  tasks:
    - name: Check service status
      systemd:
        name: app
      register: service_status
    
    - name: Verify service is running
      assert:
        that:
          - service_status.status.ActiveState == 'active'
        fail_msg: "Application service is not running"
    
    - name: Health check endpoint
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 5
      delay: 10
```

### Validation Patterns

**Pre-Flight Checks**:
```yaml
pre_tasks:
  - name: Validate prerequisites
    assert:
      that:
        - ansible_os_family == 'Debian'
        - ansible_memtotal_mb >= 2048
        - ansible_processor_vcpus >= 2
      fail_msg: "Host does not meet minimum requirements"
```

**Post-Deployment Verification**:
```yaml
post_tasks:
  - name: Verify application is running
    systemd:
      name: app
    register: app_service
    failed_when: app_service.status.ActiveState != 'active'
  
  - name: Check application logs for errors
    shell: grep -i error /var/log/app/app.log | wc -l
    register: error_count
    failed_when: error_count.stdout | int > 0
```

---

## Summary

This guide covers essential Ansible concepts and patterns:

- **Fundamentals**: Playbooks, tasks, roles, handlers, variables
- **Best Practices**: Idempotency, error handling, security, organization
- **Scalability**: Collections, dynamic inventory, multi-environment setup
- **Integration**: Cloud providers, image provisioning, cloud-init
- **Quality**: Testing, validation, and deployment strategies

Ansible enables infrastructure-as-code by combining simplicity with power, making complex automation accessible to teams of all sizes.

### Key Takeaways

✅ Write idempotent tasks that are safe to rerun  
✅ Organize code into reusable roles and collections  
✅ Use dynamic inventories for cloud infrastructure  
✅ Implement proper error handling and validation  
✅ Test playbooks before production deployment  
✅ Version control all automation code  
✅ Document your playbooks and roles  
✅ Use secrets management for sensitive data  

### Next Steps

1. Install Ansible: `pip3 install ansible`
2. Create your first playbook
3. Test in a dev environment
4. Integrate with your infrastructure
5. Build reusable roles for your organization
6. Share via Ansible Galaxy

For more information, visit the [official Ansible documentation](https://docs.ansible.com/).
