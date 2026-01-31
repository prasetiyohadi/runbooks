# Terraform & OpenTofu: Quick Reference Guide

Navigate the world of Infrastructure as Code with practical commands, learning paths, and real-world solutions.

---

## Learning Paths

### 🟢 Beginner Path (Weeks 0-2)
Start from zero to productive Terraform user

- **Week 0-1**: Core Concepts
  - What is Infrastructure as Code?
  - Terraform vs OpenTofu
  - Installation and setup
  - First `terraform init`
  - Understanding state files
  - Essential commands overview

- **Week 1-2**: Your First Infrastructure
  - Writing your first resource
  - Using variables
  - Creating outputs
  - Provider configuration
  - Planning and applying
  - Common errors and fixes

**Time Investment**: 8-10 hours  
**Outcome**: Deploy simple infrastructure to AWS/Azure/GCP

---

### 🟡 Intermediate Path (Weeks 2-6)
Build production-ready infrastructure

- **Week 2-3**: Organization & Modules
  - Directory structure best practices
  - Creating reusable modules
  - Module inputs and outputs
  - Using Terraform Registry modules
  - Module composition patterns

- **Week 3-4**: Advanced State Management
  - Remote state backends (S3, Terraform Cloud)
  - State locking
  - Workspaces for environments
  - State file safety
  - Disaster recovery procedures

- **Week 4-6**: Real-World Patterns
  - Multi-environment setup
  - Deployment pipelines
  - Team collaboration
  - Code review workflows
  - Handling sensitive data

**Time Investment**: 20-30 hours  
**Outcome**: Manage multi-environment infrastructure with CI/CD

---

### 🔴 Advanced Path (Week 6+)
Architect enterprise infrastructure

- **Week 6+**: Advanced Features
  - Dynamic resource generation (count, for_each)
  - Data sources and computed values
  - Custom validation rules
  - Terraform testing frameworks
  - Policy as Code (Sentinel, OPA)

- **Advanced Topics**:
  - Multi-cloud architectures
  - Disaster recovery patterns
  - Cost optimization strategies
  - Security & compliance automation
  - Kubernetes integration patterns

**Time Investment**: 40+ hours  
**Outcome**: Enterprise-grade infrastructure platforms

---

## Essential Commands Cheatsheet

### Initialization & Validation

```bash
# Initialize Terraform working directory
terraform init

# Validate configuration syntax
terraform validate

# Format code (modifies files)
terraform fmt -recursive

# Check formatting without modifying
terraform fmt -check -recursive
```

### Planning & Applying

```bash
# Create execution plan
terraform plan

# Apply changes (with confirmation)
terraform apply

# Apply without confirmation
terraform apply -auto-approve

# Plan destruction
terraform plan -destroy

# Apply saved plan
terraform apply tfplan

# Target specific resource
terraform apply -target=aws_instance.web
```

### Inspection & State Management

```bash
# Show current state
terraform show

# List all resources
terraform state list

# Show specific resource
terraform state show aws_instance.web

# Import existing resource
terraform import aws_instance.web i-1234567890abcdef0

# Remove resource from state
terraform state rm aws_instance.web

# Refresh state from actual resources
terraform refresh
```

### Workspaces

```bash
# Create new workspace
terraform workspace new production

# List workspaces
terraform workspace list

# Select workspace
terraform workspace select production

# Delete workspace
terraform workspace delete staging
```

### Output & Debugging

```bash
# Display outputs
terraform output

# Get specific output
terraform output instance_id

# Output as JSON
terraform output -json

# Enable debug mode
TF_LOG=DEBUG terraform apply

# Save logs to file
TF_LOG=DEBUG TF_LOG_PATH=terraform.log terraform apply
```

---

## Common Use Cases with Examples

### 1. Deploy EC2 Instance

```hcl
# variables.tf
variable "instance_type" {
  type    = string
  default = "t2.micro"
}

# main.tf
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # Amazon Linux 2
  instance_type = var.instance_type

  tags = {
    Name = "my-web-server"
  }
}

# outputs.tf
output "instance_id" {
  value = aws_instance.web.id
}
```

### 2. Multi-Environment Setup

```
environments/
├── dev/terraform.tfvars
│   instance_count = 1
│   instance_type = "t2.micro"
├── staging/terraform.tfvars
│   instance_count = 2
│   instance_type = "t2.small"
└── prod/terraform.tfvars
    instance_count = 3
    instance_type = "t2.medium"
```

### 3. Module Usage

```hcl
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
  environment        = var.environment
}

module "database" {
  source = "./modules/database"

  vpc_id  = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}
```

### 4. Dynamic Resources

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

resource "aws_instance" "web" {
  for_each      = toset(var.environments)
  ami           = "ami-12345678"
  instance_type = "t2.micro"

  tags = {
    Environment = each.value
  }
}
```

### 5. Remote State with Locking

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

---

## Frequently Asked Questions

### Q1: How do I handle secrets in Terraform?

**Answer**: Never hardcode secrets. Use these approaches:

```bash
# 1. Environment variables
export TF_VAR_db_password=$(aws secretsmanager get-secret-value --secret-id db-password --query SecretString --output text)

# 2. AWS Secrets Manager
data "aws_secretsmanager_secret_version" "password" {
  secret_id = "my-secret"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.password.secret_string
}

# 3. Mark as sensitive
variable "password" {
  type      = string
  sensitive = true
}
```

---

### Q2: How do I prevent accidental resource deletion?

**Answer**: Use prevention strategies:

```hcl
resource "aws_s3_bucket" "important" {
  bucket = "important-data"
  
  # Prevent destruction
  lifecycle {
    prevent_destroy = true
  }
}

# Also use: terraform plan -destroy to review before destruction
```

---

### Q3: How do I switch from Terraform to OpenTofu?

**Answer**: Direct migration is possible:

```bash
# 1. Your state file works as-is (99% compatible)
# 2. Backup current state
cp terraform.tfstate terraform.tfstate.backup

# 3. Install OpenTofu
brew install opentofu  # macOS
apt install opentofu   # Linux

# 4. Run tofu commands (same as terraform)
tofu init
tofu plan
tofu apply
```

---

### Q4: How do I collaborate with a team on infrastructure?

**Answer**: Use remote state and code review:

```bash
# 1. Set up remote backend (S3 with locking)
# 2. Use VCS (Git) for code review
# 3. Use CI/CD for automated validation

# terraform.tfvars (shared via VCS)
region  = "us-east-1"
vpc_cidr = "10.0.0.0/16"

# User's terraform.tfvars.local (not in VCS)
db_password = "secret"
```

---

### Q5: How do I test Terraform configurations?

**Answer**: Use multiple validation layers:

```bash
# 1. Syntax validation
terraform validate

# 2. Formatting
terraform fmt -recursive

# 3. Plan review
terraform plan -out=tfplan

# 4. Terratest (Go testing framework)
# See WORKSHOP.md for testing exercises
```

---

### Q6: How do I rollback changes?

**Answer**: Multiple rollback strategies:

```bash
# 1. Plan destruction and verify
terraform plan -destroy

# 2. Apply from previous state
terraform state pull > current.json
git show HEAD:terraform.tfstate > previous.json
terraform state push previous.json

# 3. Re-apply previous version from VCS
git checkout HEAD~1 -- *.tf
terraform apply

# Best practice: Use workspaces to avoid rollbacks
```

---

### Q7: How do I import existing resources?

**Answer**: Use `terraform import`:

```bash
# Find resource ID
aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,Tags[0].Value]'

# Add empty resource to code
resource "aws_instance" "imported" {}

# Import existing resource
terraform import aws_instance.imported i-1234567890abcdef0

# Verify import
terraform plan
```

---

### Q8: How do I optimize costs?

**Answer**: Cost management best practices:

```hcl
# 1. Use auto-scaling
resource "aws_autoscaling_group" "web" {
  desired_capacity = 1  # Scale down when not needed
  max_size         = 5
  min_size         = 1
}

# 2. Use spot instances
resource "aws_instance" "spot" {
  instance_type = "t2.micro"
  spot_type     = "spot"  # ~70% cheaper
}

# 3. Right-size resources
variable "environment" {
  type = string
}

locals {
  instance_type = var.environment == "prod" ? "t3.large" : "t2.micro"
}

# 4. Use reserved instances for predictable workloads
```

---

## Production Deployment Checklist

**Pre-Deployment**:
- [ ] Code reviewed by 2+ team members
- [ ] `terraform fmt -check` passes
- [ ] `terraform validate` passes
- [ ] `terraform plan` reviewed and approved
- [ ] Sensitive variables set via environment/vault
- [ ] Backup of current state created
- [ ] Rollback plan documented
- [ ] Change window scheduled

**During Deployment**:
- [ ] Monitor `terraform apply` output for errors
- [ ] Verify resources created correctly
- [ ] Check CloudWatch/monitoring dashboards
- [ ] Verify application connectivity
- [ ] Document any manual steps taken

**Post-Deployment**:
- [ ] Run smoke tests
- [ ] Verify monitoring and alerting
- [ ] Update runbooks if needed
- [ ] Commit tfplan to VCS for audit trail
- [ ] Update documentation
- [ ] Schedule review meeting

---

## Tools & Extensions

| Tool | Purpose | Status |
|------|---------|--------|
| **Terragrunt** | Orchestrate Terraform, manage state | Recommended |
| **Terraform Cloud** | Remote state, runs, VCS integration | Enterprise |
| **Sentinel** | Policy as Code enforcement | Advanced |
| **tfsec** | Security scanning | Recommended |
| **Terratest** | Infrastructure testing (Go) | Recommended |
| **TFLint** | Linting and best practices | Recommended |
| **Atlantis** | Pull request automation | Advanced |
| **terraform-docs** | Generate docs from code | Recommended |

---

## Quick Troubleshooting

| Error | Solution |
|-------|----------|
| `Backend reinitialization required` | Run `terraform init` |
| `Resource already exists` | Use `terraform import` or `terraform state rm` |
| `State lock timeout` | `terraform force-unlock <lock_id>` |
| `Provider signature verification failed` | Verify provider registry credentials |
| `Variable validation failed` | Check variable type and constraints |

---

## Next Steps

- **Read** [CONCEPT.md](CONCEPT.md) for deep technical understanding
- **Hands-On** [WORKSHOP.md](WORKSHOP.md) to practice deployment
- **Operations** [RUNBOOK.md](RUNBOOK.md) for production procedures
- **Business** [BUSINESS.md](BUSINESS.md) for ROI and benefits analysis

---

**Quick Start**:

```bash
# 1. Install
brew install terraform

# 2. Initialize
terraform init

# 3. Create first resource
echo 'resource "aws_instance" "example" { ami = "ami-12345"; instance_type = "t2.micro" }' > main.tf

# 4. Plan
terraform plan

# 5. Apply
terraform apply
```

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Category**: Infrastructure as Code (IaC)
