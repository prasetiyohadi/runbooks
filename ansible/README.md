# Ansible

## Contents

- [Production Runbook](./RUNBOOK.md)
- [Comprehensive Concepts Guide](./CONCEPT.md)
- [Workshop](./WORKSHOP.md) (Hands-on lab)

## Overview

Ansible is an open-source infrastructure automation platform that enables configuration management, application deployment, and infrastructure-as-code practices through simple, agentless SSH-based communication. This documentation provides production-grade guidance for deploying, managing, and troubleshooting Ansible in enterprise environments.

## Maintainers

- **Team**: Infrastructure & Automation
- **Primary Owner**: DevOps/Platform Engineering Team

## Learning Paths

### 🟢 Beginner Path (0-2 weeks)
1. **Read**: [CONCEPT.md](./CONCEPT.md) - "Overview" and "What is Ansible" sections
2. **Learn**: Understand playbooks, tasks, and roles
3. **Try**: Run your first playbook with `ansible-playbook`
4. **Do**: [WORKSHOP.md](./WORKSHOP.md) - Part 1 & 2

### 🟡 Intermediate Path (2-6 weeks)
1. **Read**: [CONCEPT.md](./CONCEPT.md) - "Core Concepts" and "Best Practices"
2. **Learn**: Variables, handlers, conditionals, loops, and error handling
3. **Try**: Build multi-environment playbooks and roles
4. **Do**: [WORKSHOP.md](./WORKSHOP.md) - Part 3 & 4, then [RUNBOOK.md](./RUNBOOK.md)

### 🔴 Advanced Path (6+ weeks)
1. **Read**: [CONCEPT.md](./CONCEPT.md) - "Collection Management", "Cloud Integration", "Testing"
2. **Learn**: Collections, dynamic inventory, cloud provider integration
3. **Try**: Build reusable collections, implement CI/CD automation
4. **Do**: [WORKSHOP.md](./WORKSHOP.md) - Part 5 & 6, design production-grade automation

## Quick Reference

### Installation

```bash
# Install Ansible via pip
pip install ansible

# Verify installation
ansible --version
```

### Essential Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `ansible-playbook` | Execute playbooks | `ansible-playbook site.yml` |
| `ansible-inventory` | List inventory | `ansible-inventory -i hosts --graph` |
| `ansible-galaxy` | Manage collections/roles | `ansible-galaxy collection install community.general` |
| `ansible-vault` | Encrypt sensitive data | `ansible-vault encrypt secrets.yml` |
| `ansible-lint` | Validate playbooks | `ansible-lint playbooks/` |

### Playbook Structure

```yaml
---
- name: Example playbook
  hosts: webservers
  gather_facts: yes
  become: yes
  
  vars:
    app_version: "1.0.0"
  
  pre_tasks:
    - name: Validate prerequisites
      assert:
        that: []
  
  roles:
    - common
    - application
  
  post_tasks:
    - name: Verify deployment
      uri:
        url: "http://localhost:8080/health"
```

### Quick Tips

- ✅ Always use `--check` mode to test before production
- ✅ Write idempotent tasks that are safe to rerun
- ✅ Use `handlers` for service restarts, not direct tasks
- ✅ Organize code into roles for reusability
- ✅ Use dynamic inventory for cloud infrastructure
- ❌ Avoid `shell` module when specific modules exist
- ❌ Never hardcode sensitive data (use `ansible-vault`)
- ❌ Don't run playbooks as root unless necessary

## Common Use Cases

### 1. Application Deployment
Deploy application releases to multiple servers with zero downtime:

```bash
ansible-playbook deploy.yml --limit=webservers
```

### 2. Configuration Management
Ensure consistent system state across all hosts:

```bash
ansible-playbook site.yml --tags=config
```

### 3. Infrastructure Provisioning
Configure newly created infrastructure automatically:

```bash
ansible-playbook provision.yml -e "environment=production"
```

### 4. Incident Response
Rapidly remediate security issues or performance problems:

```bash
ansible-playbook remediation.yml --tags=critical
```

## Frequently Asked Questions

### Q: Should I use Ansible or Terraform?

**A**: Use Terraform for infrastructure provisioning (day-0) and Ansible for configuration management (day-2).
- **Terraform**: EC2, VPCs, databases, storage
- **Ansible**: Server setup, application deployment, system configuration

### Q: How do I store passwords securely?

**A**: Use `ansible-vault` to encrypt sensitive files:

```bash
# Encrypt a file
ansible-vault encrypt secrets.yml

# Run playbook with vault
ansible-playbook site.yml --vault-password-file ~/.vault-pass
```

### Q: What's the difference between roles and playbooks?

**A**: 
- **Playbook**: Entry point that defines what to do (e.g., `site.yml`)
- **Role**: Reusable component that encapsulates tasks, handlers, vars, templates (e.g., `roles/common/`)

### Q: How do I handle secrets in CI/CD?

**A**: Store vault password in CI/CD secrets, pass as environment variable:

```bash
# In CI/CD pipeline
export ANSIBLE_VAULT_PASSWORD_FILE=/tmp/vault-pass
ansible-playbook site.yml
```

### Q: Can I run playbooks on Windows?

**A**: Yes, Ansible supports Windows hosts via WinRM (Windows Remote Management):

```yaml
- name: Deploy on Windows
  hosts: windows_servers
  gather_facts: yes
  
  tasks:
    - name: Install Chocolatey package
      chocolatey.chocolatey.win_chocolatey:
        name: nodejs
        state: present
```

### Q: How do I test playbooks before deployment?

**A**: Use dry-run and syntax checking:

```bash
# Syntax check
ansible-playbook --syntax-check site.yml

# Dry-run (check mode)
ansible-playbook --check site.yml

# Dry-run with diff
ansible-playbook --check --diff site.yml
```

### Q: What's the best way to organize large projects?

**A**: Follow the standard project layout with separate inventory per environment:

```
project/
├── ansible.cfg
├── inventory/
│   ├── production/
│   ├── staging/
│   └── development/
├── roles/
│   ├── common/
│   ├── database/
│   └── webserver/
└── playbooks/
    ├── site.yml
    └── deploy.yml
```

## Tools & Extensions

### Popular Collections

| Collection | Purpose | Install |
|-----------|---------|---------|
| `community.general` | General utilities | `ansible-galaxy collection install community.general` |
| `community.aws` | AWS operations | `ansible-galaxy collection install community.aws` |
| `community.postgresql` | PostgreSQL management | `ansible-galaxy collection install community.postgresql` |
| `community.docker` | Docker container management | `ansible-galaxy collection install community.docker` |

### Useful Tools

- **ansible-lint**: Validate playbooks against best practices
- **molecule**: Test roles in isolated environments
- **ansible-navigator**: Interactive playbook execution and debugging
- **AWX**: Web UI and REST API for Ansible

### Maturity Levels

| Level | Capability | Timeline |
|-------|-----------|----------|
| **Foundation** | Basic playbooks, manual execution | Week 1-2 |
| **Intermediate** | Multi-environment setup, roles, collections | Week 3-8 |
| **Advanced** | Dynamic inventory, CI/CD integration, testing | Week 9-16 |
| **Enterprise** | Self-service, RBAC, audit logging, HA | Week 17+ |

## Production Deployment Checklist

Before deploying to production, verify:

- [ ] All playbooks pass `--syntax-check`
- [ ] Tested in staging with `--check --diff`
- [ ] Sensitive data encrypted with `ansible-vault`
- [ ] SSH keys configured for all hosts
- [ ] Backup strategy defined and tested
- [ ] Rollback procedure documented
- [ ] Monitoring and alerting configured
- [ ] Team trained on runbook procedures

## Support & Community

- **Documentation**: [Ansible Official Docs](https://docs.ansible.com/)
- **Community**: [Ansible Community](https://www.ansible.com/community)
- **Collections**: [Ansible Galaxy](https://galaxy.ansible.com/)
- **Issue Tracker**: [GitHub - ansible/ansible](https://github.com/ansible/ansible)

## Related Documentation

- [Comprehensive Concepts Guide](./CONCEPT.md) — Full Ansible reference
- [Hands-on Workshop](./WORKSHOP.md) — Practical lab exercises
- [Production Runbook](./RUNBOOK.md) — Operational procedures
