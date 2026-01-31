# Ansible Workshop: Hands-On Lab

**Duration**: 90-120 minutes  
**Difficulty**: Beginner to Intermediate  
**Prerequisites**: Linux/macOS terminal, SSH access to at least 2 systems (real or VMs)

> [!NOTE]
> This workshop provides practical, step-by-step exercises to deepen your understanding of Ansible through hands-on experience. Each task includes copy-pasteable commands and expected outputs.

---

## Lab Environment Setup

Before starting the workshop, prepare your environment:

```bash
# 1. Verify Ansible installation
ansible --version

# Expected output:
# ansible [core 2.15.0]
#   config file = /etc/ansible/ansible.cfg
#   configured module search path = ['/root/.ansible/plugins/modules']
#   ...

# 2. Create working directory
mkdir -p ~/ansible-workshop/{playbooks,roles,inventories,templates}
cd ~/ansible-workshop

# 3. Create ansible.cfg
cat > ansible.cfg << 'EOF'
[defaults]
inventory = inventories/hosts
host_key_checking = False
remote_user = ansible
log_path = ./ansible.log
gathering = smart
EOF

# 4. Verify directory structure
tree -L 2 .
# Expected: Shows playbooks/, roles/, inventories/, templates/ directories
```

---

## Part 1: Ansible Setup & Basics (20 minutes | 3 tasks)

### Task 1.1: Create and Configure Static Inventory

**Objective**: Set up a static inventory with multiple host groups and verify connectivity.

**Steps**:

```bash
# 1. Create hosts file
cat > inventories/hosts << 'EOF'
[webservers]
web1.local ansible_host=192.168.1.10
web2.local ansible_host=192.168.1.11

[databases]
db1.local ansible_host=192.168.1.20

[all:vars]
ansible_user=ansible
ansible_ssh_private_key_file=~/.ssh/id_rsa
ansible_python_interpreter=/usr/bin/python3
EOF

# 2. List all hosts
ansible-inventory -i inventories/hosts --list

# Expected output shows:
# {
#   "_meta": {
#     "hostvars": {...}
#   },
#   "all": {...},
#   "databases": {...},
#   "webservers": {...}
# }

# 3. Graph view
ansible-inventory -i inventories/hosts --graph

# Expected output:
# @all:
#   |--@databases:
#   |  |--db1.local
#   |--@ungrouped:
#   |--@webservers:
#   |  |--web1.local
#   |  |--web2.local
```

**Verification**:

```bash
# Test connectivity to all hosts
ansible all -i inventories/hosts -m ping

# Expected output (for each host):
# web1.local | SUCCESS => {
#     "changed": false,
#     "ping": "pong"
# }
```

---

### Task 1.2: Run Ad-Hoc Commands

**Objective**: Execute ad-hoc commands to gather facts and system information.

**Steps**:

```bash
# 1. Gather system facts
ansible webservers -i inventories/hosts -m setup -a "filter=ansible_os_family"

# Expected output shows:
# "ansible_os_family": "Debian"
# or
# "ansible_os_family": "RedHat"

# 2. Check disk usage
ansible all -i inventories/hosts -m shell -a "df -h / | tail -1"

# Expected output:
# /dev/sda1  50G  10G  40G  20% /

# 3. List running services
ansible webservers -i inventories/hosts -m service_facts

# Expected output shows list of services with their states

# 4. Get current user
ansible all -i inventories/hosts -m shell -a "whoami"

# Expected output:
# ansible
```

**Verification**:

```bash
# Confirm facts were collected
ansible all -i inventories/hosts -m debug -a "msg={{ ansible_os_family }}"

# Expected: Shows OS family for each host
```

---

### Task 1.3: Create Your First Playbook

**Objective**: Write and execute a basic playbook to configure hosts.

**Steps**:

```bash
# 1. Create basic playbook
cat > playbooks/01_basic.yml << 'EOF'
---
- name: Basic host configuration
  hosts: all
  gather_facts: yes
  
  tasks:
    - name: Print system information
      debug:
        msg: "Host {{ inventory_hostname }} is {{ ansible_os_family }}"
    
    - name: Update package cache (Debian)
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
      become: yes
    
    - name: Check if user ansible exists
      getent:
        database: passwd
        key: ansible
      register: ansible_user
      ignore_errors: yes
    
    - name: Display user check result
      debug:
        msg: "Ansible user exists: {{ ansible_user.ansible_facts.getent_passwd | length > 0 }}"
EOF

# 2. Check playbook syntax
ansible-playbook playbooks/01_basic.yml --syntax-check

# Expected output:
# playbook: playbooks/01_basic.yml

# 3. Run playbook with dry-run
ansible-playbook -i inventories/hosts playbooks/01_basic.yml --check

# 4. Execute playbook
ansible-playbook -i inventories/hosts playbooks/01_basic.yml -v

# Expected output shows:
# PLAY [Basic host configuration]
# TASK [Print system information]
# TASK [Update package cache (Debian)]
# TASK [Check if user ansible exists]
# TASK [Display user check result]
# PLAY RECAP (shows task results)
```

**Verification**:

```bash
# Review execution log
tail -30 ansible.log | grep -E "TASK|PLAY RECAP"

# Expected: Shows all tasks executed with status
```

---

## Part 2: Inventory & Variables (20 minutes | 3 tasks)

### Task 2.1: Group Variables and Host Variables

**Objective**: Use group and host-specific variables for configuration management.

**Steps**:

```bash
# 1. Create group variables directory
mkdir -p inventories/group_vars inventories/host_vars

# 2. Create group variables for webservers
cat > inventories/group_vars/webservers.yml << 'EOF'
---
# Web server configuration
http_port: 80
https_port: 443
max_clients: 200
app_name: "myapp"
app_version: "1.0.0"
EOF

# 3. Create group variables for databases
cat > inventories/group_vars/databases.yml << 'EOF'
---
# Database configuration
db_port: 5432
db_name: "production_db"
db_user: "dbadmin"
backup_enabled: true
backup_time: "02:00"
EOF

# 4. Create host variables for specific host
cat > inventories/host_vars/web1.local.yml << 'EOF'
---
# Override for web1.local
app_version: "1.0.1"  # Different version for canary testing
enable_debug: true
EOF

# 5. List variables for webservers group
ansible webservers -i inventories/hosts -m debug -a "msg={{ http_port }}"

# Expected output:
# web1.local | SUCCESS => {
#     "msg": 80
# }

# 6. Display merged variables
ansible all -i inventories/hosts -m debug -a "msg={{ hostvars[inventory_hostname] | to_nice_json }}"

# Expected: Shows all variables for each host
```

**Verification**:

```bash
# Test variable override on specific host
ansible web1.local -i inventories/hosts -m debug -a "msg=Version={{ app_version }}"

# Expected output shows version 1.0.1 (overridden value)

# Compare with web2
ansible web2.local -i inventories/hosts -m debug -a "msg=Version={{ app_version }}"

# Expected output shows version 1.0.0 (group variable)
```

---

### Task 2.2: Dynamic Inventory with Facts

**Objective**: Use Ansible facts as variables in playbooks.

**Steps**:

```bash
# 1. Create playbook that uses facts
cat > playbooks/02_facts.yml << 'EOF'
---
- name: Use facts in configuration
  hosts: all
  gather_facts: yes
  
  tasks:
    - name: Display gathered facts
      debug:
        msg: |
          Hostname: {{ ansible_hostname }}
          OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
          CPU cores: {{ ansible_processor_vcpus }}
          Memory: {{ ansible_memtotal_mb }}MB
          IP Address: {{ ansible_default_ipv4.address }}
    
    - name: Create host report
      copy:
        content: |
          Host Report - {{ inventory_hostname }}
          ======================================
          Hostname: {{ ansible_hostname }}
          OS: {{ ansible_distribution }}
          CPUs: {{ ansible_processor_vcpus }}
          Memory: {{ ansible_memtotal_mb }}MB
          Kernel: {{ ansible_kernel }}
          Date: {{ ansible_date_time.iso8601 }}
        dest: /tmp/host_report.txt
      register: report_created
    
    - name: Confirm report created
      debug:
        msg: "Report created at {{ report_created.dest }}"
EOF

# 2. Run playbook
ansible-playbook -i inventories/hosts playbooks/02_facts.yml

# Expected output shows facts for each host
```

**Verification**:

```bash
# Check report content
ansible all -i inventories/hosts -m command -a "cat /tmp/host_report.txt"

# Expected: Shows formatted report with system information
```

---

### Task 2.3: Register and Debug Variables

**Objective**: Capture command output into variables and use for conditionals.

**Steps**:

```bash
# 1. Create playbook with registered variables
cat > playbooks/03_register.yml << 'EOF'
---
- name: Register and use variables
  hosts: webservers
  
  tasks:
    - name: Check if nginx is installed
      shell: which nginx
      register: nginx_check
      ignore_errors: yes
    
    - name: Display nginx check result
      debug:
        msg: "Nginx installed: {{ nginx_check is succeeded }}"
    
    - name: Get current uptime
      shell: uptime | awk -F'up' '{print $2}'
      register: uptime_output
    
    - name: Show uptime
      debug:
        msg: "System uptime: {{ uptime_output.stdout }}"
    
    - name: Count processes
      shell: ps aux | wc -l
      register: process_count
    
    - name: Show process count
      debug:
        msg: "Running processes: {{ process_count.stdout }}"
    
    - name: Create summary
      copy:
        content: |
          Host: {{ inventory_hostname }}
          Nginx Installed: {{ nginx_check is succeeded }}
          Uptime: {{ uptime_output.stdout }}
          Process Count: {{ process_count.stdout }}
        dest: /tmp/system_summary.txt
EOF

# 2. Execute playbook
ansible-playbook -i inventories/hosts playbooks/03_register.yml -v

# Expected output shows:
# - Nginx check status
# - System uptime
# - Process count
# - File created
```

**Verification**:

```bash
# Verify summary file
ansible webservers -i inventories/hosts -m command -a "cat /tmp/system_summary.txt"

# Expected: Shows summary information for each web server
```

---

## Part 3: Playbooks & Roles (20 minutes | 3 tasks)

### Task 3.1: Create a Reusable Role

**Objective**: Build a role for common server configuration and test it.

**Steps**:

```bash
# 1. Initialize role structure
mkdir -p roles/common/{tasks,handlers,vars,defaults,templates,files}

# 2. Create role tasks
cat > roles/common/tasks/main.yml << 'EOF'
---
- name: Update system
  apt:
    update_cache: yes
    upgrade: dist
    autoclean: yes
    autoremove: yes
  when: ansible_os_family == "Debian"
  become: yes

- name: Install common packages
  package:
    name: "{{ common_packages }}"
    state: present
  become: yes

- name: Configure NTP
  package:
    name: chrony
    state: present
  become: yes
  register: ntp_install

- name: Start NTP service
  service:
    name: chrony
    state: started
    enabled: yes
  become: yes

- name: Create /etc/profile.d/ansible.sh
  copy:
    content: "# Ansible managed\n"
    dest: /etc/profile.d/ansible.sh
    mode: '0644'
  become: yes
  notify: update profile
EOF

# 3. Create role handlers
cat > roles/common/handlers/main.yml << 'EOF'
---
- name: update profile
  shell: source /etc/profile
EOF

# 4. Create role variables
cat > roles/common/defaults/main.yml << 'EOF'
---
common_packages:
  - curl
  - wget
  - git
  - vim
  - htop
  - net-tools
EOF

# 5. Create playbook using role
cat > playbooks/04_roles.yml << 'EOF'
---
- name: Apply common role to all hosts
  hosts: all
  gather_facts: yes
  become: yes
  
  roles:
    - common
EOF

# 6. Check syntax
ansible-playbook playbooks/04_roles.yml --syntax-check

# Expected output:
# playbook: playbooks/04_roles.yml

# 7. Run with check mode first
ansible-playbook -i inventories/hosts playbooks/04_roles.yml --check -v

# 8. Execute role
ansible-playbook -i inventories/hosts playbooks/04_roles.yml -v
```

**Verification**:

```bash
# Verify common packages installed
ansible all -i inventories/hosts -m shell -a "which curl && which git && which htop"

# Expected: Shows paths to installed commands

# Verify NTP service
ansible all -i inventories/hosts -m service -a "name=chrony" --check

# Expected: Shows service state is running
```

---

### Task 3.2: Use Templates for Configuration

**Objective**: Generate configuration files from templates with variables.

**Steps**:

```bash
# 1. Create template for nginx configuration
cat > roles/common/templates/nginx.conf.j2 << 'EOF'
# Ansible managed configuration
server {
    listen {{ http_port }};
    server_name {{ inventory_hostname }};
    
    client_max_body_size 20M;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /health {
        access_log off;
        return 200 "{{ app_name }} {{ app_version }}";
    }
}
EOF

# 2. Create playbook to deploy template
cat > playbooks/05_templates.yml << 'EOF'
---
- name: Deploy configuration templates
  hosts: webservers
  gather_facts: yes
  
  tasks:
    - name: Deploy nginx config from template
      template:
        src: roles/common/templates/nginx.conf.j2
        dest: /tmp/nginx.conf
        backup: yes
      register: nginx_config
    
    - name: Display rendered template
      debug:
        msg: "Nginx config deployed to {{ nginx_config.dest }}"
    
    - name: Show rendered config
      command: cat /tmp/nginx.conf
      register: config_content
    
    - name: Display config content
      debug:
        msg: "{{ config_content.stdout_lines }}"
EOF

# 3. Execute playbook
ansible-playbook -i inventories/hosts playbooks/05_templates.yml -v

# Expected output shows rendered configuration with variables
```

**Verification**:

```bash
# Compare rendered configs from different hosts
ansible web1.local -i inventories/hosts -m command -a "cat /tmp/nginx.conf"
ansible web2.local -i inventories/hosts -m command -a "cat /tmp/nginx.conf"

# Expected: Both show different app_version values (1.0.1 vs 1.0.0)
```

---

### Task 3.3: Conditional Execution and Loops

**Objective**: Use when conditionals and loops for flexible playbooks.

**Steps**:

```bash
# 1. Create playbook with conditionals and loops
cat > playbooks/06_conditionals.yml << 'EOF'
---
- name: Conditionals and loops
  hosts: all
  gather_facts: yes
  
  vars:
    services_to_check:
      - ssh
      - cron
      - systemd-resolved
  
  tasks:
    - name: Display OS-specific message
      debug:
        msg: "This is {{ ansible_distribution }} {{ ansible_distribution_version }}"
    
    - name: Install EPEL repo (RedHat only)
      yum:
        name: epel-release
        state: present
      when: ansible_os_family == "RedHat"
      become: yes
      ignore_errors: yes
    
    - name: Install packages (Debian)
      apt:
        name: "{{ item }}"
        state: present
      loop:
        - curl
        - wget
        - git
      when: ansible_os_family == "Debian"
      become: yes
    
    - name: Check service status
      service:
        name: "{{ item }}"
        state: started
      register: service_check
      loop: "{{ services_to_check }}"
      ignore_errors: yes
      become: yes
    
    - name: Report service status
      debug:
        msg: "{{ item.item }}: {{ 'Running' if item is succeeded else 'Not available' }}"
      loop: "{{ service_check.results }}"
    
    - name: Create numbered files
      file:
        path: /tmp/test_file_{{ item }}.txt
        state: touch
      loop: "{{ range(1, 4) }}"
EOF

# 2. Execute playbook
ansible-playbook -i inventories/hosts playbooks/06_conditionals.yml -v

# Expected output shows:
# - OS-specific tasks executed only on relevant hosts
# - Package installation on Debian systems
# - Service status checks with results
# - Created files 1, 2, 3
```

**Verification**:

```bash
# Verify files created
ansible all -i inventories/hosts -m shell -a "ls -la /tmp/test_file_*.txt"

# Expected: Shows files 1, 2, 3 created on each host
```

---

## Part 4: Idempotency & Error Handling (15 minutes | 3 tasks)

### Task 4.1: Write Idempotent Tasks

**Objective**: Create tasks that can be run multiple times safely.

**Steps**:

```bash
# 1. Create playbook demonstrating idempotency
cat > playbooks/07_idempotent.yml << 'EOF'
---
- name: Idempotent configuration
  hosts: all
  
  tasks:
    - name: Create directory (idempotent)
      file:
        path: /tmp/ansible-managed
        state: directory
        mode: '0755'
    
    - name: Copy file (idempotent)
      copy:
        content: "Ansible managed file\n"
        dest: /tmp/ansible-managed/config.txt
        mode: '0644'
    
    - name: Ensure package installed
      package:
        name: curl
        state: present
      become: yes
    
    - name: Add cron job (idempotent)
      cron:
        name: "System update check"
        hour: "2"
        minute: "0"
        job: "/usr/bin/apt update > /dev/null 2>&1"
        user: root
      become: yes
    
    - name: Update file with timestamp (non-idempotent - DEMO)
      shell: echo "Updated at $(date)" >> /tmp/ansible-managed/log.txt
      changed_when: true
      register: non_idempotent
    
    - name: Show non-idempotent result
      debug:
        msg: "This task changes state every run"
EOF

# 2. Run playbook first time
ansible-playbook -i inventories/hosts playbooks/07_idempotent.yml -v

# Expected output shows "changed: false" for idempotent tasks

# 3. Run playbook second time
ansible-playbook -i inventories/hosts playbooks/07_idempotent.yml -v

# Expected output shows same "changed: false" (except non-idempotent task)

# 4. Compare outputs
echo "First run completed. Run again to verify idempotency."
```

**Verification**:

```bash
# Verify files exist but weren't recreated
ansible all -i inventories/hosts -m stat -a "path=/tmp/ansible-managed/config.txt"

# Expected: Shows file exists with correct mode

# Check cron job only added once
ansible all -i inventories/hosts -m shell -a "crontab -l | grep 'System update check'" --become

# Expected: Shows cron job appears once only
```

---

### Task 4.2: Error Handling and Rescue

**Objective**: Handle errors gracefully and provide recovery procedures.

**Steps**:

```bash
# 1. Create playbook with error handling
cat > playbooks/08_error_handling.yml << 'EOF'
---
- name: Error handling demonstration
  hosts: all
  
  tasks:
    - name: Try to read non-existent file
      block:
        - name: Read missing file
          slurp:
            src: /etc/missing-file.conf
          register: file_content
      
      rescue:
        - name: Handle missing file
          debug:
            msg: "File not found, using default configuration"
        
        - name: Create default file
          copy:
            content: "# Default configuration\n"
            dest: /tmp/missing-file.conf
          register: default_created
      
      always:
        - name: Report status
          debug:
            msg: "Task block completed"
    
    - name: Conditional error handling
      block:
        - name: Run command that might fail
          shell: /usr/bin/test-command 2>/dev/null
          register: test_result
          failed_when: false
        
        - name: Check result
          debug:
            msg: "Command {{ 'succeeded' if test_result.rc == 0 else 'failed' }}"
      
      rescue:
        - name: Handle unexpected error
          debug:
            msg: "Unexpected error occurred"
    
    - name: Assert with custom message
      assert:
        that:
          - ansible_os_family is defined
          - ansible_processor_vcpus >= 1
        fail_msg: "System does not meet requirements"
        success_msg: "System meets requirements"
EOF

# 2. Execute playbook
ansible-playbook -i inventories/hosts playbooks/08_error_handling.yml -v

# Expected output shows:
# - Missing file handled gracefully
# - Default file created
# - Error handling completed
# - Assertions passed
```

**Verification**:

```bash
# Verify default file was created
ansible all -i inventories/hosts -m command -a "cat /tmp/missing-file.conf"

# Expected: Shows default configuration content
```

---

### Task 4.3: Validate and Verify Deployments

**Objective**: Use assertions and custom validation to verify deployment success.

**Steps**:

```bash
# 1. Create validation playbook
cat > playbooks/09_validation.yml << 'EOF'
---
- name: Deployment validation
  hosts: all
  
  tasks:
    - name: Validate system resources
      assert:
        that:
          - ansible_memtotal_mb >= 512
          - ansible_processor_vcpus >= 1
        fail_msg: "System does not have minimum resources"
    
    - name: Validate network connectivity
      wait_for_connection:
        delay: 1
        timeout: 10
      register: connectivity
    
    - name: Check required services
      service_facts:
      register: services
    
    - name: Validate required packages
      package_facts:
      register: packages
    
    - name: Create validation report
      copy:
        content: |
          Validation Report - {{ inventory_hostname }}
          ==========================================
          Timestamp: {{ ansible_date_time.iso8601 }}
          
          System Resources:
          - Memory: {{ ansible_memtotal_mb }}MB
          - CPUs: {{ ansible_processor_vcpus }}
          - Disk: {{ ansible_mounts[0].size_total | int / 1024**3 | round(2) }}GB
          
          Network: Connected
          
          Validation Status: PASSED
        dest: /tmp/validation_report.txt
      register: report
    
    - name: Display validation result
      debug:
        msg: "Validation report saved to {{ report.dest }}"
EOF

# 2. Execute validation
ansible-playbook -i inventories/hosts playbooks/09_validation.yml -v

# Expected output shows:
# - System resource validation passed
# - Network connectivity confirmed
# - Validation report generated
```

**Verification**:

```bash
# Review validation reports
ansible all -i inventories/hosts -m command -a "cat /tmp/validation_report.txt"

# Expected: Shows validation report for each host with PASSED status
```

---

## Part 5: Advanced Features (15 minutes | 3 tasks)

### Task 5.1: Vault for Secrets Management

**Objective**: Securely store and use sensitive data.

**Steps**:

```bash
# 1. Create vault password file
echo "workshop-password-123" > .vault-pass

# 2. Create file with sensitive data
cat > inventories/group_vars/databases/vault.yml << 'EOF'
---
db_password: "super-secret-password-123"
api_token: "abc123def456ghi789"
ssl_certificate: |
  -----BEGIN CERTIFICATE-----
  MIIDXTCCAkWgAwIBAgIJAJe8KI+...
  -----END CERTIFICATE-----
EOF

# 3. Encrypt the file
ansible-vault encrypt inventories/group_vars/databases/vault.yml \
  --vault-password-file=.vault-pass

# Expected: File encrypted successfully

# 4. View encrypted content (without decryption on disk)
ansible-vault view inventories/group_vars/databases/vault.yml \
  --vault-password-file=.vault-pass

# Expected: Shows decrypted content

# 5. Create playbook using secrets
cat > playbooks/10_vault.yml << 'EOF'
---
- name: Use vault secrets
  hosts: databases
  
  tasks:
    - name: Display vault variable
      debug:
        msg: "Database password is set"
      no_log: true
    
    - name: Create config file with secret
      template:
        src: /dev/stdin
        dest: /tmp/db_config.conf
        mode: '0600'
      vars:
        template_input: |
          # Database configuration
          password={{ db_password }}
          token={{ api_token }}
      register: config_created
    
    - name: Verify file created
      file:
        path: /tmp/db_config.conf
        state: file
        mode: '0600'
EOF

# 6. Run playbook with vault
ansible-playbook -i inventories/hosts playbooks/10_vault.yml \
  --vault-password-file=.vault-pass -v

# Expected output shows playbook executed with secrets available
```

**Verification**:

```bash
# Verify encrypted file
file inventories/group_vars/databases/vault.yml

# Expected: Shows "data" (encrypted file indicator)

# Verify config file created with restricted permissions
ansible databases -i inventories/hosts -m stat -a "path=/tmp/db_config.conf"

# Expected: Shows file exists with mode 0600
```

---

### Task 5.2: Handlers and Notifications

**Objective**: Use handlers for triggered actions (service restarts, etc.).

**Steps**:

```bash
# 1. Create playbook with handlers
cat > playbooks/11_handlers.yml << 'EOF'
---
- name: Configuration with handlers
  hosts: all
  
  handlers:
    - name: restart sshd
      service:
        name: ssh
        state: restarted
      become: yes
      listen: "restart ssh service"
    
    - name: reload nginx
      service:
        name: nginx
        state: reloaded
      become: yes
      ignore_errors: yes
      listen: "reload nginx"
    
    - name: restart chrony
      service:
        name: chrony
        state: restarted
      become: yes
      listen: "restart time service"
  
  tasks:
    - name: Update system configuration
      copy:
        content: "# System configuration\n"
        dest: /tmp/system.conf
      notify: "restart ssh service"
      register: config_change
    
    - name: Create nginx config
      template:
        src: roles/common/templates/nginx.conf.j2
        dest: /tmp/nginx.conf
        backup: yes
      notify: "reload nginx"
      ignore_errors: yes
    
    - name: Update time configuration
      copy:
        content: "# Chrony configuration\n"
        dest: /tmp/chrony.conf
      notify: "restart time service"
      when: ansible_os_family == "Debian"
    
    - name: Display notification status
      debug:
        msg: "Handlers will be triggered if configuration changed"
EOF

# 2. Execute playbook
ansible-playbook -i inventories/hosts playbooks/11_handlers.yml -v

# Expected output shows:
# - Configuration changes made
# - NOTIFIED handlers section
# - Handlers executed for changed tasks
```

**Verification**:

```bash
# Run playbook again - handlers should not fire (idempotent)
ansible-playbook -i inventories/hosts playbooks/11_handlers.yml -v

# Expected: Shows "changed: false" for tasks, no handlers triggered
```

---

### Task 5.3: Tags for Selective Execution

**Objective**: Use tags to run specific tasks or skip others.

**Steps**:

```bash
# 1. Create playbook with tags
cat > playbooks/12_tags.yml << 'EOF'
---
- name: Playbook with tags
  hosts: webservers
  
  vars:
    services:
      - nginx
      - php-fpm
  
  tasks:
    - name: Install packages
      package:
        name: "{{ item }}"
        state: present
      loop: "{{ services }}"
      tags:
        - install
        - setup
      become: yes
    
    - name: Configure service
      copy:
        content: "# Service configuration\n"
        dest: /tmp/service.conf
      tags:
        - configure
        - setup
    
    - name: Start services
      service:
        name: "{{ item }}"
        state: started
        enabled: yes
      loop: "{{ services }}"
      tags:
        - start
        - runtime
      ignore_errors: yes
      become: yes
    
    - name: Verify services running
      service:
        name: "{{ item }}"
        state: started
      check_mode: yes
      loop: "{{ services }}"
      tags:
        - verify
        - debug
      ignore_errors: yes
      become: yes
EOF

# 2. List all tags
ansible-playbook playbooks/12_tags.yml --list-tags

# Expected output:
# play #1 (webservers): Playbook with tags
#   TASK TAGS: [configure, debug, install, runtime, setup, start, verify]

# 3. Run only setup tasks
ansible-playbook -i inventories/hosts playbooks/12_tags.yml --tags setup -v

# Expected output shows only install and configure tasks

# 4. Skip specific tags
ansible-playbook -i inventories/hosts playbooks/12_tags.yml --skip-tags start -v

# Expected output skips start tasks

# 5. Run multiple tags
ansible-playbook -i inventories/hosts playbooks/12_tags.yml \
  --tags "install,verify" -v

# Expected output shows only install and verify tasks
```

**Verification**:

```bash
# Show task execution summary
ansible-playbook -i inventories/hosts playbooks/12_tags.yml --tags setup --list-tasks

# Expected: Shows only setup-tagged tasks
```

---

## Part 6: Disaster Recovery & Testing (10 minutes | 3 tasks)

### Task 6.1: Create Backup Playbook

**Objective**: Implement automated backup procedures.

**Steps**:

```bash
# 1. Create backup playbook
cat > playbooks/13_backup.yml << 'EOF'
---
- name: Create system backups
  hosts: all
  
  vars:
    backup_dir: /tmp/ansible-backup
    backup_date: "{{ ansible_date_time.date }}"
  
  tasks:
    - name: Create backup directory
      file:
        path: "{{ backup_dir }}"
        state: directory
        mode: '0755'
    
    - name: Backup important files
      shell: |
        tar -czf {{ backup_dir }}/config-{{ backup_date }}.tar.gz \
          /tmp/nginx.conf \
          /tmp/db_config.conf \
          /tmp/system.conf 2>/dev/null || true
      register: backup_result
    
    - name: List backup files
      find:
        path: "{{ backup_dir }}"
        patterns: "*.tar.gz"
      register: backup_files
    
    - name: Display backup information
      debug:
        msg: |
          Backup Summary for {{ inventory_hostname }}:
          - Backup directory: {{ backup_dir }}
          - Files backed up: {{ backup_files.files | length }}
          - Latest backup: {{ backup_files.files | last | default('None') }}
    
    - name: Create backup manifest
      copy:
        content: |
          Backup Manifest - {{ inventory_hostname }}
          ==========================================
          Date: {{ ansible_date_time.iso8601 }}
          Files: {{ backup_files.files | length }}
          
          Backed up files:
          {% for file in backup_files.files %}
          - {{ file.path }} ({{ file.size }} bytes)
          {% endfor %}
        dest: "{{ backup_dir }}/manifest-{{ backup_date }}.txt"
      register: manifest
    
    - name: Show manifest location
      debug:
        msg: "Backup manifest: {{ manifest.dest }}"
EOF

# 2. Execute backup
ansible-playbook -i inventories/hosts playbooks/13_backup.yml -v

# Expected output shows:
# - Backup directory created
# - Files archived
# - Backup manifest created
```

**Verification**:

```bash
# List backup files
ansible all -i inventories/hosts -m shell -a "ls -lh /tmp/ansible-backup/"

# Expected: Shows backup archive and manifest files

# Verify backup content
ansible all -i inventories/hosts -m shell -a "cat /tmp/ansible-backup/manifest-*.txt"

# Expected: Shows backup manifest with file list
```

---

### Task 6.2: Test Playbook Execution

**Objective**: Validate playbooks before production deployment.

**Steps**:

```bash
# 1. Create comprehensive test playbook
cat > playbooks/14_test.yml << 'EOF'
---
- name: Test all playbooks
  hosts: all
  
  pre_tasks:
    - name: Start test suite
      debug:
        msg: "Starting comprehensive test suite for {{ inventory_hostname }}"
  
  tasks:
    - name: Test 1 - Verify facts gathered
      assert:
        that:
          - ansible_hostname is defined
          - ansible_os_family is defined
          - ansible_distribution is defined
        fail_msg: "Required facts not gathered"
    
    - name: Test 2 - Verify network connectivity
      wait_for_connection:
        delay: 1
        timeout: 5
      register: connectivity
    
    - name: Test 3 - Check required commands
      shell: which {{ item }}
      loop:
        - python3
        - curl
        - git
      register: commands
      failed_when: commands.rc != 0
      ignore_errors: yes
    
    - name: Test 4 - Verify directory structure
      file:
        path: /tmp/ansible-managed
        state: directory
      register: dir_test
    
    - name: Test 5 - Verify permissions
      assert:
        that:
          - dir_test.mode == '0755' or dir_test.mode == '0700'
        fail_msg: "Incorrect permissions"
  
  post_tasks:
    - name: Create test report
      copy:
        content: |
          Test Report - {{ inventory_hostname }}
          ====================================
          Date: {{ ansible_date_time.iso8601 }}
          Status: PASSED
          
          Tests completed:
          - Facts verification: PASSED
          - Network connectivity: PASSED
          - Commands availability: {{ 'PASSED' if commands is succeeded else 'WARNING' }}
          - Directory structure: PASSED
          - Permissions: PASSED
        dest: /tmp/test_report.txt
    
    - name: Test suite completed
      debug:
        msg: "Test suite completed for {{ inventory_hostname }}"
EOF

# 2. Run test playbook
ansible-playbook -i inventories/hosts playbooks/14_test.yml -v

# Expected output shows all tests passing
```

**Verification**:

```bash
# Review test reports
ansible all -i inventories/hosts -m command -a "cat /tmp/test_report.txt"

# Expected: Shows test report with PASSED status
```

---

### Task 6.3: Create Rollback Procedure

**Objective**: Implement safe rollback mechanism.

**Steps**:

```bash
# 1. Create rollback playbook
cat > playbooks/15_rollback.yml << 'EOF'
---
- name: Rollback procedure
  hosts: all
  
  vars:
    rollback_version: "1.0.0"
    backup_dir: /tmp/ansible-backup
  
  pre_tasks:
    - name: Confirm rollback
      pause:
        prompt: |
          WARNING: This will rollback to version {{ rollback_version }}
          Press ENTER to continue or Ctrl+C to abort
      register: rollback_confirm
  
  tasks:
    - name: Check backup exists
      stat:
        path: "{{ backup_dir }}/config-*.tar.gz"
      register: backup_check
    
    - name: Assert backup exists
      assert:
        that:
          - backup_check.stat.exists or backup_check.stat.isdir
        fail_msg: "No backup found"
    
    - name: Stop services
      service:
        name: "{{ item }}"
        state: stopped
      loop:
        - nginx
        - php-fpm
      ignore_errors: yes
      become: yes
    
    - name: Restore from backup
      shell: |
        cd / && tar -xzf {{ backup_dir }}/config-*.tar.gz || true
      register: restore_result
    
    - name: Start services
      service:
        name: "{{ item }}"
        state: started
      loop:
        - nginx
        - php-fpm
      ignore_errors: yes
      become: yes
    
    - name: Verify rollback
      copy:
        content: |
          Rollback Completed
          ==================
          Date: {{ ansible_date_time.iso8601 }}
          Version: {{ rollback_version }}
          Status: SUCCESS
        dest: /tmp/rollback_status.txt
      register: rollback_status
    
    - name: Display rollback result
      debug:
        msg: "Rollback completed. Status saved to {{ rollback_status.dest }}"
EOF

# 2. Preview rollback (without actually running it)
ansible-playbook playbooks/15_rollback.yml --check -v

# Expected output shows tasks that would be executed

# 3. Show available backups
ansible all -i inventories/hosts -m find -a "path=/tmp/ansible-backup patterns='*.tar.gz'"

# Expected: Lists available backup files
```

**Verification**:

```bash
# After rollback, verify system state
ansible all -i inventories/hosts -m command -a "cat /tmp/rollback_status.txt"

# Expected: Shows rollback completion status
```

---

## Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| **SSH Key Permission Error** | `chmod 600 ~/.ssh/id_rsa` and verify `authorized_keys` on remote host |
| **Python Not Found on Remote** | Install Python: `ansible all -m raw -a "apt-get install -y python3"` |
| **Become (sudo) Password Required** | Add `ansible_become_pass` to inventory or use `--ask-become-pass` flag |
| **Inventory File Not Found** | Verify path in `ansible.cfg` or use `-i` flag: `ansible-playbook -i inventories/hosts playbook.yml` |
| **Task Hangs on wait_for** | Reduce timeout or verify network connectivity to remote host |
| **Handler Not Triggered** | Ensure task has `changed_when` condition or creates actual change |
| **Template Variable Undefined** | Check variable spelling and scope (defaults, vars, group_vars, host_vars) |
| **Vault File Permission Denied** | Check file permissions: `chmod 644 .vault-pass` |

---

## Validation Checklist

Before completing the workshop, verify:

- [ ] **Part 1**: Created inventory with groups, ran ad-hoc commands, created first playbook
- [ ] **Part 2**: Used group variables, host variables, registered variables, used facts
- [ ] **Part 3**: Created reusable role, used templates, applied conditionals and loops
- [ ] **Part 4**: Demonstrated idempotency, implemented error handling, created validation
- [ ] **Part 5**: Encrypted secrets with vault, used handlers, applied tags for selective execution
- [ ] **Part 6**: Created backups, ran test suite, implemented rollback procedure
- [ ] **All Files**: Verified all playbooks in `playbooks/` directory with correct syntax
- [ ] **All Hosts**: Confirmed tasks executed successfully on all target hosts
- [ ] **Logs**: Reviewed `ansible.log` for any warnings or errors

---

## Quick Reference

```bash
# Most useful commands from workshop
ansible-playbook playbooks/01_basic.yml -v              # Run with verbose
ansible-playbook playbooks/01_basic.yml --check         # Dry-run
ansible-playbook playbooks/01_basic.yml --diff          # Show changes
ansible-playbook playbooks/01_basic.yml --step          # Interactive
ansible-playbook playbooks/01_basic.yml --tags setup    # Specific tags
ansible-playbook playbooks/01_basic.yml --check -C      # Check mode syntax
ansible-inventory -i inventories/hosts --list           # List inventory
ansible-inventory -i inventories/hosts --graph          # Graph view
ansible all -m ping                                      # Test connectivity
ansible-vault encrypt file.yml                          # Encrypt secrets
ansible-vault decrypt file.yml                          # Decrypt secrets
```

---

## Next Steps

After completing this workshop:

1. **Review** [CONCEPT.md](./CONCEPT.md) for deeper understanding of Ansible concepts
2. **Consult** [README.md](./README.md) for quick reference and FAQ
3. **Reference** [RUNBOOK.md](./RUNBOOK.md) for production deployment procedures
4. **Contribute**: Add custom playbooks to your `playbooks/` directory
5. **Automate**: Deploy your playbooks to production using CI/CD pipelines

---

**Workshop Completion Time**: 90-120 minutes  
**Skill Level After**: Intermediate Ansible User  
**Last Updated**: January 31, 2026

For questions or issues, refer to [CONCEPT.md](./CONCEPT.md) or contact the Infrastructure & Automation team.
