# Terraform & OpenTofu: Comprehensive Concepts Guide

**Purpose**: Deep technical reference for understanding Infrastructure as Code with Terraform and OpenTofu.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Concepts](#2-core-concepts)
3. [HCL & Configuration](#3-hcl--configuration)
4. [Providers & Resources](#4-providers--resources)
5. [State Management](#5-state-management)
6. [Modules & Organization](#6-modules--organization)
7. [Variables & Outputs](#7-variables--outputs)
8. [Terraform Workflow](#8-terraform-workflow)
9. [Advanced Features](#9-advanced-features)
10. [Best Practices](#10-best-practices)
11. [Terraform vs OpenTofu](#11-terraform-vs-opentofu)
12. [Multi-Cloud & Multi-Environment](#12-multi-cloud--multi-environment)
13. [Security & Compliance](#13-security--compliance)
14. [Troubleshooting](#14-troubleshooting)
15. [Enterprise Patterns](#15-enterprise-patterns)

---

## 1. Introduction

### What is Terraform?

Terraform is an open-source Infrastructure as Code (IaC) tool by HashiCorp that enables you to:

- **Define infrastructure** in declarative configuration files (HCL)
- **Provision resources** across multiple cloud providers
- **Version control** your infrastructure
- **Collaborate** on infrastructure changes
- **Automate** infrastructure deployment and updates
- **Preview changes** before applying them

### What is OpenTofu?

OpenTofu is a community-driven fork of Terraform (post-license change in 2023) offering:

- **100% open-source**: No proprietary license restrictions
- **Community-governed**: Decisions made by community, not single vendor
- **Terraform-compatible**: Mostly compatible with Terraform syntax and state files
- **Independent roadmap**: Features driven by community needs
- **No vendor lock-in**: Use with any cloud provider

### Key Differences at a Glance

| Aspect | Terraform | OpenTofu |
|--------|-----------|----------|
| **License** | MPL 2.0 (proprietary cloud features) | MPL 2.0 (fully open) |
| **Source** | HashiCorp | Linux Foundation |
| **Support** | Commercial (optional) | Community |
| **State file** | Same format | ~99% compatible |
| **Provider ecosystem** | Larger (1000+) | Growing (inherited from TF) |
| **Use when** | Enterprise with HashiCorp support | Cost-conscious or vendor-neutral |

---

## 2. Core Concepts

### 2.1 Infrastructure as Code (IaC)

**Declarative vs Imperative**:

```
Imperative: "Click here, then here, configure this..."
           (Manual, error-prone, hard to replicate)

Declarative: "I want 3 EC2 instances with these settings"
            (Automatic, idempotent, reproducible)
```

**Benefits**:
- Version control infrastructure changes
- Code review for infrastructure changes
- Automated testing and validation
- Easy disaster recovery
- Knowledge preservation (code is documentation)

### 2.2 Terraform Execution Model

```
Write → Plan → Apply → State
  ↓      ↓      ↓       ↓
Code    Review  Execute Track
```

**Write Phase**:
```hcl
resource "aws_instance" "example" {
  ami           = "ami-12345678"
  instance_type = "t2.micro"
}
```

**Plan Phase**:
```
Terraform will perform the following actions:

  # aws_instance.example will be created
  + resource "aws_instance" "example" {
      + ami           = "ami-12345678"
      + instance_type = "t2.micro"
      + ...
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

**Apply Phase**: Executes the changes
**State Phase**: Tracks what was created

### 2.3 Resources & State

**Resource** = Managed object (EC2 instance, database, security group)

**State** = Current actual state of resources

```
Terraform State File (terraform.tfstate)
├── Version: 4
├── Resources:
│   ├── aws_instance.example
│   │   ├── id: i-1234567890abcdef0
│   │   ├── ami: ami-12345678
│   │   ├── instance_type: t2.micro
│   │   └── ... (all resource attributes)
│   └── aws_security_group.example
│       ├── id: sg-12345678
│       └── ... (all resource attributes)
└── Outputs: {...}
```

**State is the source of truth** (not what you see in AWS console)

---

## 3. HCL & Configuration

### 3.1 HCL Syntax

**Blocks** (container for content):

```hcl
block_type "block_label" "block_label2" {
  key = value
}
```

**Common block types**:

```hcl
# Provider configuration
provider "aws" {
  region = "us-east-1"
}

# Resource definition
resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t2.micro"
}

# Input variable
variable "instance_type" {
  type        = string
  default     = "t2.micro"
  description = "EC2 instance type"
}

# Output value
output "instance_id" {
  value       = aws_instance.web.id
  description = "ID of the EC2 instance"
}

# Local variable
locals {
  environment = "production"
  tags = {
    Environment = local.environment
    Project     = "MyApp"
  }
}

# Data source (read-only)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
}
```

### 3.2 Data Types

```hcl
# String
variable "region" {
  type    = string
  default = "us-east-1"
}

# Number
variable "instance_count" {
  type    = number
  default = 3
}

# Boolean
variable "enable_monitoring" {
  type    = bool
  default = true
}

# List
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Map
variable "tags" {
  type = map(string)
  default = {
    Environment = "production"
    Owner       = "devops"
  }
}

# Object (complex)
variable "app_config" {
  type = object({
    name    = string
    version = number
    ports   = list(number)
  })
}

# Any
variable "flexible_input" {
  type = any
}
```

### 3.3 Interpolation & Functions

```hcl
# String interpolation
resource "aws_instance" "example" {
  tags = {
    Name = "server-${var.environment}-${count.index}"
  }
}

# Built-in functions
locals {
  # String functions
  lowercase_env = lower(var.environment)
  uppercase_env = upper(var.environment)
  trimmed       = trimspace(var.input)

  # List functions
  az_list       = concat(var.primary_azs, var.secondary_azs)
  first_az      = element(var.azs, 0)
  az_count      = length(var.azs)
  reversed_azs  = reverse(var.azs)

  # Map functions
  env_vars      = merge(var.default_vars, var.custom_vars)
  has_key       = contains(keys(var.config), "database")

  # Type conversion
  port_numbers  = [for p in var.ports : tonumber(p)]
  port_strings  = [for p in var.ports : tostring(p)]
}

# Conditional
resource "aws_instance" "example" {
  instance_type = var.environment == "production" ? "t3.large" : "t2.micro"
}

# Dynamic blocks
resource "aws_security_group" "example" {
  dynamic "ingress" {
    for_each = var.allowed_ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

---

## 4. Providers & Resources

### 4.1 Provider Configuration

```hcl
# AWS provider
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "production"
      ManagedBy   = "Terraform"
      Project     = "MyApp"
    }
  }
}

# Multiple providers (multi-region)
provider "aws" {
  alias  = "us-west"
  region = "us-west-2"
}

# Using multiple provider
resource "aws_instance" "us_west" {
  provider      = aws.us-west
  ami           = "ami-12345678"
  instance_type = "t2.micro"
}

# Azure provider
provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
}

# Google Cloud provider
provider "google" {
  project = var.gcp_project_id
  region  = "us-central1"
}

# Kubernetes provider
provider "kubernetes" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}
```

### 4.2 Common Resource Types

```hcl
# Compute
resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t2.micro"
  subnet_id              = aws_subnet.private.id
  associate_public_ip    = false
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  user_data              = base64encode(file("${path.module}/scripts/init.sh"))

  tags = {
    Name = "web-server"
  }
}

# Networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "private-subnet"
  }
}

# Storage
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "data-storage"
  }
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Database
resource "aws_db_instance" "postgres" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "13.7"
  instance_class       = "db.t3.micro"
  db_name              = "mydb"
  username             = "admin"
  password             = random_password.db.result
  publicly_accessible  = false
  skip_final_snapshot  = false
  final_snapshot_identifier = "mydb-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
}

# Security
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web server security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### 4.3 Resource Dependencies

```hcl
# Implicit dependency (Terraform infers)
resource "aws_instance" "web" {
  subnet_id = aws_subnet.private.id  # Dependency inferred
}

# Explicit dependency
resource "aws_instance" "web" {
  depends_on = [aws_internet_gateway.main]
}

# Reference output
resource "aws_security_group_rule" "allow_web" {
  security_group_id = aws_security_group.web.id
  from_port         = 80
  to_port           = 80
  type              = "ingress"
  cidr_blocks       = ["0.0.0.0/0"]
}
```

---

## 5. State Management

### 5.1 State File Structure

```json
{
  "version": 4,
  "terraform_version": "1.5.0",
  "serial": 42,
  "lineage": "abc123def456",
  "outputs": {
    "instance_id": {
      "value": "i-1234567890abcdef0",
      "type": "string"
    }
  },
  "resources": [
    {
      "mode": "managed",
      "type": "aws_instance",
      "name": "example",
      "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]",
      "instances": [
        {
          "schema_version": 1,
          "attributes": {
            "id": "i-1234567890abcdef0",
            "ami": "ami-12345678",
            "instance_type": "t2.micro",
            "tags": {
              "Name": "example"
            }
          }
        }
      ]
    }
  ]
}
```

**Why state matters**:
- Maps resource names in code to real resources
- Tracks resource attributes
- Enables change detection (plan)
- Single source of truth

### 5.2 Remote State

**Local state** (development only):
```hcl
# Default: terraform.tfstate in current directory
# Risk: Easy to lose, hard to share, not safe for teams
```

**Remote state** (production):
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

**State backends**:
- S3 (AWS) - with DynamoDB for locking
- Azure Blob Storage (Azure)
- Google Cloud Storage (GCP)
- Terraform Cloud (HashiCorp SaaS)
- Consul
- Postgres
- Kubernetes Secrets

### 5.3 State Locking & Isolation

**Locking** (prevents concurrent modifications):

```
User A: terraform apply (acquires lock)
         ↓ modifying resources
User B: terraform plan (waits for lock)
         ↓ locked...
User A: terraform apply (completes, releases lock)
         ↓
User B: terraform plan (acquires lock, proceeds)
```

**Workspaces** (isolate state by environment):

```bash
# Create workspace
terraform workspace new production

# List workspaces
terraform workspace list

# Select workspace
terraform workspace select production

# Terraform stores state in: terraform.tfstate.d/production/terraform.tfstate
```

---

## 6. Modules & Organization

### 6.1 Module Structure

```
my-terraform/
├── main.tf              # Root module
├── variables.tf         # Input variables
├── outputs.tf          # Output values
├── terraform.tfvars    # Variable values
└── modules/
    ├── networking/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── compute/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── database/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### 6.2 Module Usage

```hcl
# Call module
module "vpc" {
  source = "./modules/networking"

  vpc_cidr              = "10.0.0.0/16"
  availability_zones    = ["us-east-1a", "us-east-1b"]
  enable_nat_gateway    = true
  environment           = var.environment
}

# Use module outputs
resource "aws_instance" "web" {
  subnet_id = module.vpc.private_subnet_id
}

# External module source
module "eks" {
  source = "git::https://github.com/terraform-aws-modules/terraform-aws-eks.git?ref=v19.0.0"

  cluster_name    = "my-cluster"
  cluster_version = "1.27"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
}

# Terraform Registry module
module "security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 4.0"

  name_prefix = "web_"
  vpc_id      = module.vpc.vpc_id

  ingress_rules       = ["https-443-tcp", "http-80-tcp"]
  ingress_cidr_blocks = ["0.0.0.0/0"]
}
```

### 6.3 Module Best Practices

```hcl
# 1. Clear inputs/outputs
variable "instance_count" {
  type        = number
  description = "Number of instances to create"
  validation {
    condition     = var.instance_count > 0 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}

# 2. Sensible defaults
variable "instance_type" {
  type    = string
  default = "t3.micro"
}

# 3. Internal resources prefixed
resource "aws_security_group" "main" {
  name_prefix = "${var.environment}-sg-"
}

# 4. Output important values
output "instance_ids" {
  value       = aws_instance.main[*].id
  description = "IDs of created instances"
}

# 5. Use locals for internal logic
locals {
  environment_suffix = var.environment == "prod" ? "-prod" : "-${var.environment}"
  resource_prefix    = "${var.project_name}${local.environment_suffix}"
}
```

---

## 7. Variables & Outputs

### 7.1 Input Variables

```hcl
variable "environment" {
  type        = string
  description = "Environment name"
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "instance_count" {
  type        = number
  description = "Number of instances"
  sensitive   = false  # Can show in logs
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable CloudWatch monitoring"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Common tags for all resources"
  default = {
    ManagedBy = "Terraform"
  }
}
```

### 7.2 Variable Precedence

```
1. Environment variables (TF_VAR_name)
2. terraform.tfvars file
3. *.auto.tfvars files
4. -var flag
5. Variable defaults
```

Example:

```bash
# 1. Environment variable
export TF_VAR_environment="production"

# 2. terraform.tfvars
echo 'instance_count = 5' >> terraform.tfvars

# 3. Auto-load variables
ls *.auto.tfvars

# 4. Command-line flag
terraform apply -var="environment=staging"
```

### 7.3 Outputs

```hcl
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID of the VPC"
  sensitive   = false
}

output "instance_ips" {
  value       = aws_instance.web[*].private_ip
  description = "Private IPs of web instances"
}

output "database_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "Database connection endpoint"
  sensitive   = true  # Won't display in console
}
```

**Accessing outputs**:

```bash
# Display specific output
terraform output vpc_id

# Get all outputs as JSON
terraform output -json

# Extract to file
terraform output -json > outputs.json
```

---

## 8. Terraform Workflow

### 8.1 Standard Workflow

```
1. Write code
2. terraform init   (initialize backend, download providers)
3. terraform plan   (preview changes)
4. Review plan
5. terraform apply  (execute changes)
6. Verify output
```

### 8.2 Commands Reference

```bash
# Initialization
terraform init                    # Initialize backend
terraform init -upgrade           # Upgrade providers
terraform init -migrate-state     # Migrate state backend

# Validation
terraform validate                # Check syntax
terraform fmt -check              # Check formatting
terraform validate -json          # Machine-readable output

# Planning
terraform plan                    # Create plan
terraform plan -out=tfplan        # Save plan to file
terraform plan -destroy           # Plan destruction

# Application
terraform apply                   # Apply current plan
terraform apply tfplan            # Apply saved plan
terraform apply -auto-approve     # Skip interactive approval
terraform apply -var="key=value"  # Override variables

# Inspection
terraform show                    # Show current state
terraform show tfplan             # Show plan details
terraform state list              # List resources in state
terraform state show aws_instance.web  # Show resource details
terraform output                  # Show outputs

# Modification
terraform state rm <resource>     # Remove from state
terraform state mv <src> <dst>    # Move resource in state
terraform refresh                 # Refresh state from real resources

# Cleanup
terraform destroy                 # Destroy all resources
terraform destroy -target=<resource>  # Destroy specific resource
```

### 8.3 CI/CD Integration

```yaml
# GitHub Actions example
name: Terraform
on: [push, pull_request]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0
      
      - run: terraform init
      
      - run: terraform fmt -check
      
      - run: terraform validate
      
      - run: terraform plan -out=tfplan
      
      - name: Upload plan
        uses: actions/upload-artifact@v3
        with:
          name: tfplan
          path: tfplan
      
      - run: terraform apply tfplan
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

---

## 9. Advanced Features

### 9.1 For Loops & Splat

```hcl
# count
resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = var.ami_id
  instance_type = "t2.micro"

  tags = {
    Name = "web-${count.index + 1}"
  }
}

# for_each
resource "aws_instance" "web" {
  for_each      = toset(var.instance_names)
  ami           = var.ami_id
  instance_type = "t2.micro"

  tags = {
    Name = each.value
  }
}

# Reference count resources
output "instance_ids" {
  value = aws_instance.web[*].id  # Splat expression
}

# Reference for_each resources
output "instance_ips" {
  value = [for instance in aws_instance.web : instance.private_ip]
}
```

### 9.2 Provisioners (Last Resort)

```hcl
# remote-exec (run commands on instance)
resource "aws_instance" "example" {
  ami           = "ami-12345678"
  instance_type = "t2.micro"

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx"
    ]

    connection {
      type        = "ssh"
      user        = "ec2-user"
      private_key = file("~/.ssh/id_rsa")
      host        = self.public_ip
    }
  }
}

# local-exec (run on local machine)
provisioner "local-exec" {
  command = "echo ${aws_instance.example.public_ip} >> inventory.txt"
}

# file (copy files)
provisioner "file" {
  source      = "app/config.conf"
  destination = "/tmp/config.conf"

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file("~/.ssh/id_rsa")
    host        = self.public_ip
  }
}
```

### 9.3 Data Sources

```hcl
# Query AWS for data
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/*"]
  }
}

# Use data source
resource "aws_instance" "web" {
  ami = data.aws_ami.ubuntu.id
}

# Query Kubernetes
data "kubernetes_service" "example" {
  metadata {
    name      = "my-service"
    namespace = "default"
  }
}

output "service_endpoint" {
  value = data.kubernetes_service.example.status[0].load_balancer[0].ingress[0].hostname
}
```

---

## 10. Best Practices

### 10.1 Code Organization

```
project/
├── README.md
├── versions.tf          # Provider versions
├── providers.tf         # Provider config
├── main.tf             # Primary resources
├── variables.tf        # Input variables
├── outputs.tf          # Outputs
├── locals.tf           # Local values
├── terraform.tfvars    # Variable values (not in VCS)
├── terraform.tfvars.example  # Example (in VCS)
├── modules/
│   ├── networking/
│   ├── compute/
│   └── database/
└── environments/
    ├── dev/
    ├── staging/
    └── prod/
```

### 10.2 Naming Conventions

```hcl
# Descriptive names
resource "aws_security_group" "web_server" {
  name_prefix = "web-sg-"
}

# Consistent prefixes
locals {
  resource_prefix = "${var.project}-${var.environment}"
}

resource "aws_instance" "web" {
  tags = {
    Name = "${local.resource_prefix}-web-01"
  }
}

# Meaningful variable names
variable "web_server_instance_type" {
  type = string
}

# Clear outputs
output "web_server_ids" {
  value = aws_instance.web[*].id
}
```

### 10.3 Security

```hcl
# 1. Never hardcode secrets
variable "db_password" {
  type      = string
  sensitive = true  # Won't show in logs
}

# Use AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "rds/master-password"
}

# 2. Enable state encryption
terraform {
  backend "s3" {
    bucket            = "terraform-state"
    encrypt           = true
    dynamodb_table    = "terraform-locks"
  }
}

# 3. Use IAM roles (not keys)
provider "aws" {
  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/terraform"
  }
}

# 4. Sensitive outputs
output "db_password" {
  value     = aws_db_instance.main.password
  sensitive = true
}
```

---

## 11. Terraform vs OpenTofu

### Feature Comparison

| Feature | Terraform | OpenTofu |
|---------|-----------|----------|
| **HCL syntax** | ✅ | ✅ |
| **State files** | ✅ | ✅ (99% compatible) |
| **Modules** | ✅ | ✅ |
| **Providers** | 1000+ | Growing |
| **Community-driven** | No (HashiCorp) | Yes (LF) |
| **Vendor lock-in** | Possible | Lower |
| **Enterprise support** | Commercial | Community |
| **License** | MPL 2.0 | MPL 2.0 |

### Migration Path

```
Terraform 1.6 → OpenTofu 1.6
    ↓ Compatible
State files work
    ↓ Same format
Modules compatible
    ↓ ~99% compatible
Most resources work
```

---

## 12. Multi-Cloud & Multi-Environment

### 12.1 Multi-Cloud Example

```hcl
# AWS
module "aws_infrastructure" {
  source = "./modules/compute"
  
  provider = aws
  region   = "us-east-1"
}

# Azure
module "azure_infrastructure" {
  source = "./modules/compute"
  
  provider = azurerm
  location = "eastus"
}

# GCP
module "gcp_infrastructure" {
  source = "./modules/compute"
  
  provider = google
  zone     = "us-central1-a"
}
```

### 12.2 Environment Isolation

```
environments/
├── dev/
│   ├── main.tf
│   ├── terraform.tfvars
│   └── .terraform/
├── staging/
│   ├── main.tf
│   ├── terraform.tfvars
│   └── .terraform/
└── prod/
    ├── main.tf
    ├── terraform.tfvars
    └── .terraform/
```

---

## 13. Security & Compliance

### 13.1 Compliance as Code

```hcl
# S3 bucket with compliance requirements
resource "aws_s3_bucket" "compliance" {
  bucket = "compliance-bucket"
}

# Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "compliance" {
  bucket = aws_s3_bucket.compliance.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning
resource "aws_s3_bucket_versioning" "compliance" {
  bucket = aws_s3_bucket.compliance.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "compliance" {
  bucket                  = aws_s3_bucket.compliance.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

---

## 14. Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **State lock timeout** | Previous operation didn't complete | Force unlock: `terraform force-unlock <lock_id>` |
| **Resource already exists** | Manual creation outside Terraform | Import: `terraform import aws_instance.web i-12345` |
| **Plan shows destroy/recreate** | Change requires new resource | Use `terraform taint` to mark for recreation |
| **Backend errors** | Wrong credentials/bucket | Check provider credentials and backend config |

---

## 15. Enterprise Patterns

### Standardized Module Structure

```hcl
# Root module calls child modules
module "platform" {
  source = "./modules/platform"
  
  # Pass through inputs
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  environment           = var.environment
  
  # Outputs used by other modules
}

module "applications" {
  source = "./modules/applications"
  
  depends_on = [module.platform]
  
  # Use outputs from platform module
  vpc_id             = module.platform.vpc_id
  private_subnet_ids = module.platform.private_subnet_ids
  environment        = var.environment
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Contact**: Infrastructure & DevOps Team
