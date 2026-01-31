# Terraform & OpenTofu: Operational Runbook

Production-ready procedures for deploying, maintaining, and troubleshooting Terraform-managed infrastructure.

---

## Table of Contents

1. [Installation & Setup](#1-installation--setup)
2. [Initial Configuration](#2-initial-configuration)
3. [Standard Deployment](#3-standard-deployment)
4. [State Management](#4-state-management)
5. [Workspace Management](#5-workspace-management)
6. [Provider Configuration](#6-provider-configuration)
7. [Module Management](#7-module-management)
8. [Upgrading Terraform](#8-upgrading-terraform)
9. [Disaster Recovery](#9-disaster-recovery)
10. [Troubleshooting](#10-troubleshooting)
11. [Performance Tuning](#11-performance-tuning)
12. [Security Hardening](#12-security-hardening)

---

## 1. Installation & Setup

### Prerequisites

```bash
# Check system requirements
uname -m                    # x86_64 or arm64
uname -s                    # Linux, Darwin (macOS), or Windows

# Verify installed tools
which git
which aws  # or azure, gcloud
```

### Linux Installation

```bash
# Ubuntu/Debian
wget https://apt.releases.hashicorp.com/gpg
apt-key add gpg
apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
apt-get update
apt-get install terraform

# Verify installation
terraform version
```

### macOS Installation

```bash
# Using Homebrew
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Using native binary
curl -fsSL https://apt.releases.hashicorp.com/terraform_1.5.0_darwin_amd64.zip -o terraform.zip
unzip terraform.zip
sudo mv terraform /usr/local/bin/

# Verify
terraform version
```

### Windows Installation

```powershell
# Using Chocolatey
choco install terraform

# Or download from releases
Invoke-WebRequest -Uri "https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_windows_amd64.zip" -OutFile "terraform.zip"
Expand-Archive terraform.zip -DestinationPath $env:ProgramFiles\Terraform\

# Add to PATH
$env:Path += ";$env:ProgramFiles\Terraform"
```

### Provider Authentication

#### AWS

```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID="<access_key>"
export AWS_SECRET_ACCESS_KEY="<secret_key>"
export AWS_DEFAULT_REGION="us-east-1"

# Option 2: AWS credentials file (~/.aws/credentials)
[default]
aws_access_key_id = <access_key>
aws_secret_access_key = <secret_key>

# Option 3: IAM role (recommended for production)
provider "aws" {
  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/terraform"
  }
}

# Verify connection
aws sts get-caller-identity
terraform init
```

#### Azure

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription="<subscription_id>"

# Verify
az account show
```

#### GCP

```bash
# Authenticate
gcloud auth application-default login

# Set project
gcloud config set project <project_id>

# Verify
gcloud config list
```

---

## 2. Initial Configuration

### Project Structure Setup

```bash
# Create project directory
mkdir terraform-project
cd terraform-project

# Create standard structure
mkdir modules
mkdir environments/{dev,staging,prod}
touch versions.tf providers.tf main.tf variables.tf outputs.tf terraform.tfvars.example

# Initialize git
git init
echo 'terraform.tfstate' >> .gitignore
echo 'terraform.tfvars' >> .gitignore
echo '.terraform/' >> .gitignore
echo '*.tfplan' >> .gitignore
echo '*.tfstate.*' >> .gitignore

git add .
git commit -m "Initial Terraform project structure"
```

### Provider Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# providers.tf
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

# variables.tf
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  type = string
}
```

---

## 3. Standard Deployment

### Deployment Workflow

```bash
# Step 1: Initialize
terraform init

# Expected output:
# Initializing the backend...
# Initializing provider plugins...
# Terraform has been successfully initialized!

# Step 2: Validate configuration
terraform validate

# Expected output:
# Success! The configuration is valid.

# Step 3: Format check
terraform fmt -check -recursive

# Expected output:
# (no output = all files properly formatted)

# Step 4: Create plan
terraform plan -out=tfplan

# Expected output:
# Plan: X to add, Y to change, Z to destroy.

# Step 5: Review plan
cat tfplan  # Binary format, use terraform show tfplan for readable output
terraform show tfplan

# Step 6: Apply (production requires approval)
terraform apply tfplan

# Expected output:
# Apply complete! Resources: X added, Y changed, Z destroyed.

# Step 7: Verify
terraform output
aws ec2 describe-instances --region us-east-1
```

### Multi-Environment Deployment

```bash
# Development environment
cd environments/dev
terraform init -backend-config="key=dev/terraform.tfstate"
terraform plan -var-file="terraform.tfvars"
terraform apply

# Staging environment
cd ../staging
terraform init -backend-config="key=staging/terraform.tfstate"
terraform plan -var-file="terraform.tfvars"
terraform apply

# Production environment (with approval)
cd ../prod
terraform init -backend-config="key=prod/terraform.tfstate"
terraform plan -var-file="terraform.tfvars" -out=prod.tfplan
# Manual review and approval
terraform apply prod.tfplan
```

### Targeted Deployment

```bash
# Deploy specific resource
terraform plan -target=aws_instance.web
terraform apply -target=aws_instance.web

# Deploy specific module
terraform plan -target=module.vpc
terraform apply -target=module.vpc

# Deploy multiple resources
terraform plan -target=aws_instance.web -target=aws_security_group.web
```

---

## 4. State Management

### Remote State Setup (S3 + DynamoDB)

```bash
# Create S3 bucket for state
aws s3api create-bucket --bucket terraform-state-$(date +%s) --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket terraform-state-123456 \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket terraform-state-123456 \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket terraform-state-123456 \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Configure Remote Backend

```hcl
# terraform.tf
terraform {
  backend "s3" {
    bucket         = "terraform-state-123456"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### Migrate to Remote Backend

```bash
# Current state: Local file (terraform.tfstate)
ls -la terraform.tfstate

# Initialize with remote backend
terraform init

# Confirm migration
# When prompted, enter "yes" to migrate state
terraform.tfstate -> terraform state pulled and stored in S3

# Verify
terraform state list
aws s3 ls s3://terraform-state-123456/prod/
```

### State Inspection

```bash
# List resources in state
terraform state list
# Output:
# aws_instance.web[0]
# aws_instance.web[1]
# aws_security_group.web

# Show specific resource
terraform state show aws_instance.web[0]
# Output:
# # aws_instance.web[0]:
# resource "aws_instance" "web" {
#   ami           = "ami-12345678"
#   instance_type = "t2.micro"
#   ...
# }

# Extract state to JSON
terraform state pull > state.json
cat state.json | jq '.resources[] | select(.type=="aws_instance")'
```

### State Backup

```bash
# Manual backup
terraform state pull > terraform.tfstate.backup

# Automated daily backup
#!/bin/bash
BACKUP_DIR="/backups/terraform"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y-%m-%d-%H%M%S)
terraform state pull > $BACKUP_DIR/terraform.tfstate.$DATE
# Compress older than 30 days
find $BACKUP_DIR -type f -mtime +30 -exec gzip {} \;
```

---

## 5. Workspace Management

### Workspace Operations

```bash
# List workspaces
terraform workspace list
# Output:
#   default
# * staging
#   production

# Create workspace
terraform workspace new production
# Created and switched to workspace "production"!

# Switch workspace
terraform workspace select staging

# Show current workspace
terraform workspace show

# Delete workspace (must be default or unused)
terraform workspace delete staging
# Deleted workspace "staging"!
```

### Environment Isolation with Workspaces

```bash
# terraform.tfvars
instance_count = 1
instance_type  = "t2.micro"

# main.tf
resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = "ami-12345678"
  instance_type = var.instance_type

  tags = {
    Name        = "web-${terraform.workspace}-${count.index}"
    Environment = terraform.workspace
  }
}

# Deployment workflow
terraform workspace select dev
terraform apply  # Creates 1 t2.micro in dev workspace

terraform workspace select prod
terraform apply  # Creates 3 t3.large in prod workspace (if tfvars changed)
```

---

## 6. Provider Configuration

### Multi-Provider Setup

```hcl
# providers.tf

# AWS provider (default)
provider "aws" {
  region = "us-east-1"
}

# AWS provider (different region)
provider "aws" {
  alias  = "us-west"
  region = "us-west-2"
}

# Azure provider
provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
}

# GCP provider
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

### Provider Upgrade

```bash
# Check available versions
terraform init -upgrade

# Specify provider version
terraform init -upgrade -var 'provider_version=5.0'

# Verify
terraform version

# Plan and apply
terraform plan
terraform apply
```

---

## 7. Module Management

### Module Structure Creation

```bash
# Create module directory
mkdir -p modules/vpc
cd modules/vpc

# Create module files
touch main.tf variables.tf outputs.tf README.md

# Example module structure
cat > main.tf << 'EOF'
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true

  tags = {
    Name = var.name
  }
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = var.azs[count.index]

  tags = {
    Name = "${var.name}-private-${count.index}"
  }
}
EOF

cat > variables.tf << 'EOF'
variable "name" {
  type = string
}

variable "cidr_block" {
  type = string
}

variable "private_subnets" {
  type = list(string)
}

variable "azs" {
  type = list(string)
}
EOF

cat > outputs.tf << 'EOF'
output "vpc_id" {
  value = aws_vpc.main.id
}

output "subnet_ids" {
  value = aws_subnet.private[*].id
}
EOF
```

### Module Usage

```hcl
# main.tf

module "vpc" {
  source = "./modules/vpc"

  name            = "production-vpc"
  cidr_block      = "10.0.0.0/16"
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  azs            = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_instance" "web" {
  subnet_id = module.vpc.subnet_ids[0]
  # ... other configuration
}
```

### Remote Module Usage

```hcl
# From Terraform Registry
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "my-cluster"
  cluster_version = "1.27"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.subnet_ids
}

# From Git repository
module "monitoring" {
  source = "git::https://github.com/example/terraform-monitoring.git//modules/prometheus?ref=v1.0"

  prometheus_enabled = true
}
```

---

## 8. Upgrading Terraform

### Version Compatibility Check

```bash
# Check current version
terraform version
# Terraform v1.5.0

# Check required version in code
grep -r "required_version" .
# terraform {
#   required_version = ">= 1.0"
# }

# Check provider versions
grep -r "required_providers" .
```

### Upgrade Procedure

```bash
# Step 1: Backup state
terraform state pull > terraform.tfstate.backup

# Step 2: Check compatibility
# Visit: https://www.terraform.io/upgrade-guides

# Step 3: Update versions.tf
cat > versions.tf << 'EOF'
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
EOF

# Step 4: Reinitialize
terraform init -upgrade

# Step 5: Validate
terraform validate

# Step 6: Plan (verify no changes)
terraform plan
# Expected: Plan: 0 to add, 0 to change, 0 to destroy.

# Step 7: Document upgrade
git add versions.tf
git commit -m "Upgrade Terraform to 1.5.0, AWS provider to 5.0"
```

---

## 9. Disaster Recovery

### State File Recovery

```bash
# Scenario: State file corrupted or lost

# Step 1: Verify backup exists
ls -la terraform.tfstate.backup

# Step 2: Restore from backup
cp terraform.tfstate.backup terraform.tfstate

# Step 3: Verify state
terraform state list

# Step 4: If remote backend corrupted
# Pull from S3
aws s3 cp s3://terraform-state-123456/prod/terraform.tfstate terraform.tfstate.recovered

# Step 5: Validate restored state
terraform validate
terraform plan  # Should show: Plan: 0 to add, 0 to change, 0 to destroy.
```

### Resource Recovery

```bash
# Scenario: Resource accidentally destroyed by Terraform

# Step 1: Check state list
terraform state list

# Step 2: Verify resource not in state
terraform state show aws_instance.web
# Error: No instance found

# Step 3: Recreate resource manually (if needed immediately)
aws ec2 run-instances --image-id ami-12345 --instance-type t2.micro

# Step 4: Import resource back to state
terraform import aws_instance.web i-1234567890abcdef0

# Step 5: Update resource configuration in code
resource "aws_instance" "web" {
  ami           = "ami-12345"
  instance_type = "t2.micro"
}

# Step 6: Verify import
terraform state show aws_instance.web
terraform plan  # Should show: Plan: 0 to add, 0 to change, 0 to destroy.
```

### Rollback Procedure

```bash
# Scenario: Applied configuration caused issues

# Step 1: Check git history
git log --oneline

# Step 2: Review problematic commit
git show <commit_hash>

# Step 3: Revert code changes
git revert <commit_hash>

# Step 4: Plan rollback
terraform plan -destroy -out=rollback.tfplan

# Step 5: Apply destruction (if complete rollback needed)
terraform apply rollback.tfplan

# Alternative: Restore from previous terraform.tfstate
git checkout HEAD~1 -- terraform.tfstate
terraform apply  # Will recreate or modify to match old state
```

---

## 10. Troubleshooting

### State Lock Issues

```bash
# Error: Error acquiring the state lock
# Cause: Another user has lock (or lock abandoned)

# Check lock in DynamoDB
aws dynamodb scan \
  --table-name terraform-locks \
  --region us-east-1

# Force unlock (dangerous - use only if certain)
terraform force-unlock <lock_id>

# Example:
terraform force-unlock e7a56551-a2c0-42e8-9358-2354211f1234
```

### Provider Authentication Errors

```bash
# Error: error configuring AWS Provider: ValidationError: 1 validation error(s) found

# Solution: Verify credentials
aws sts get-caller-identity
# If fails: Configure AWS credentials

# Check environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY

# Or use AWS CLI to configure
aws configure
# Enter: Access Key ID, Secret Access Key, Region
```

### Resource Already Exists

```bash
# Error: Error: resource already exists in AWS

# Scenario: Resource created manually, now trying via Terraform

# Solution 1: Import resource
terraform import aws_instance.web i-1234567890abcdef0

# Solution 2: Remove from Terraform state
terraform state rm aws_instance.web
# Then create manually and re-import

# Solution 3: Check for naming conflicts
terraform plan -json | grep "violation"
```

### Backend Configuration Issues

```bash
# Error: Failed to get existing workspaces
# Cause: Backend not properly configured

# Solution 1: Reinitialize
rm -rf .terraform .terraform.lock.hcl
terraform init

# Solution 2: Check backend config
cat terraform.tf | grep -A 10 "backend"

# Solution 3: Verify S3 bucket exists
aws s3 ls s3://terraform-state-123456/

# Solution 4: Check IAM permissions
aws iam get-user
# Verify user has: s3:GetObject, s3:PutObject, dynamodb:DescribeTable
```

### Module Errors

```bash
# Error: Error downloading module
# Cause: Git repository not accessible or wrong ref

# Verify Git access
git ls-remote https://github.com/example/terraform-module.git

# Check module version
cat .terraform/modules/modules.json | jq '.modules[] | {key, source}'

# Force redownload
rm -rf .terraform/modules
terraform init -upgrade
```

---

## 11. Performance Tuning

### Parallel Operations

```bash
# Default: 10 parallel operations
terraform apply

# Increase parallelism
terraform apply -parallelism=20

# Useful for large deployments with 100+ resources
```

### State Locking Optimization

```hcl
# Disable state locking (use only for read-only operations)
terraform init -backend-config="skip_credentials_validation=true"

# Increase DynamoDB throughput for faster locking
aws dynamodb update-table \
  --table-name terraform-locks \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10
```

### Provider Performance

```bash
# Enable debug logging for performance analysis
TF_LOG=DEBUG terraform plan 2>&1 | tee terraform.log

# Analyze slow operations
grep "Duration:" terraform.log | sort -t= -k2 -rn | head -20
```

---

## 12. Security Hardening

### Sensitive Data Protection

```hcl
# Mark passwords and keys as sensitive
variable "db_password" {
  type      = string
  sensitive = true
}

output "db_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

# Won't display in console output
```

### State File Encryption

```bash
# S3 server-side encryption
aws s3api put-bucket-encryption \
  --bucket terraform-state-123456 \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:us-east-1:123456789012:key/12345678"
      }
    }]
  }'

# Enable versioning for recovery
aws s3api put-bucket-versioning \
  --bucket terraform-state-123456 \
  --versioning-configuration Status=Enabled
```

### Access Control

```bash
# Restrict who can modify Terraform state
aws s3api put-bucket-policy --bucket terraform-state-123456 \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/terraform"
      },
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::terraform-state-123456/*"
    }]
  }'
```

---

## Quick Reference: Common Commands

| Task | Command |
|------|---------|
| Initialize | `terraform init` |
| Validate | `terraform validate` |
| Format | `terraform fmt -recursive` |
| Plan | `terraform plan -out=tfplan` |
| Apply | `terraform apply tfplan` |
| Destroy | `terraform destroy` |
| Import | `terraform import aws_instance.web i-12345` |
| Output | `terraform output` |
| State | `terraform state list` |
| Refresh | `terraform refresh` |
| Workspace | `terraform workspace select prod` |
| Lock info | `terraform state lock-info` |

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Contact**: Infrastructure & DevOps Team
