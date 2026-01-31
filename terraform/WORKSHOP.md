# Terraform & OpenTofu: Hands-On Workshop

Practical, step-by-step exercises to master Infrastructure as Code. Estimated 90-120 minutes.

---

## Learning Objectives

By the end of this workshop, you will be able to:
✅ Write basic Terraform configurations  
✅ Plan and apply infrastructure changes  
✅ Organize code with modules  
✅ Manage state and backends  
✅ Deploy to multiple environments  
✅ Troubleshoot common issues  

---

## Part 1: Setup & First Deployment (20 minutes)

### Task 1.1: Install Terraform

**Objective**: Get Terraform installed and verified

```bash
# Installation
brew install terraform           # macOS with Homebrew
# OR
choco install terraform          # Windows with Chocolatey
# OR
sudo apt-get install terraform   # Ubuntu/Debian

# Verify installation
terraform version

# Expected output:
# Terraform v1.5.0
# on darwin_amd64
```

**Verification**: ✅ `terraform version` displays 1.5.0 or later

---

### Task 1.2: Create Project Directory

**Objective**: Set up project structure

```bash
# Create and enter directory
mkdir terraform-workshop
cd terraform-workshop

# Initialize git
git init
echo 'terraform.tfstate' >> .gitignore
echo 'terraform.tfstate.*' >> .gitignore
echo '.terraform/' >> .gitignore
echo '*.tfplan' >> .gitignore
echo 'terraform.tfvars' >> .gitignore

# Create standard files
touch versions.tf providers.tf main.tf variables.tf outputs.tf

# List structure
ls -la

# Expected output:
# -rw-r--r--  1 user  staff   61 Jan 31 10:00 .gitignore
# -rw-r--r--  1 user  staff    0 Jan 31 10:00 main.tf
# -rw-r--r--  1 user  staff    0 Jan 31 10:00 outputs.tf
# -rw-r--r--  1 user  staff    0 Jan 31 10:00 providers.tf
# -rw-r--r--  1 user  staff    0 Jan 31 10:00 versions.tf
# -rw-r--r--  1 user  staff    0 Jan 31 10:00 variables.tf
```

**Verification**: ✅ Directory contains all 6 files, .gitignore created

---

### Task 1.3: Configure AWS Provider

**Objective**: Set up Terraform to use AWS

```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID="<your_access_key>"
export AWS_SECRET_ACCESS_KEY="<your_secret_key>"
export AWS_DEFAULT_REGION="us-east-1"

# Create versions.tf
cat > versions.tf << 'EOF'
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
EOF

# Create providers.tf
cat > providers.tf << 'EOF'
provider "aws" {
  region = "us-east-1"
  
  default_tags {
    tags = {
      Environment = "workshop"
      ManagedBy   = "Terraform"
    }
  }
}
EOF

# Initialize Terraform
terraform init

# Expected output:
# Initializing the backend...
# Initializing provider plugins...
# Terraform has been successfully initialized!
```

**Verification**: ✅ `.terraform` directory created, `terraform init` succeeds

---

### Task 1.4: Deploy First Resource (S3 Bucket)

**Objective**: Create first AWS resource with Terraform

```bash
# Create main.tf
cat > main.tf << 'EOF'
resource "aws_s3_bucket" "workshop" {
  bucket = "terraform-workshop-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "workshop-bucket"
  }
}

data "aws_caller_identity" "current" {}
EOF

# Validate configuration
terraform validate

# Expected output:
# Success! The configuration is valid.

# Plan deployment
terraform plan -out=tfplan

# Expected output:
# Plan: 1 to add, 0 to change, 0 to destroy.

# Apply deployment
terraform apply tfplan

# Expected output:
# Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

# Verify in AWS
aws s3 ls | grep workshop
```

**Verification**: ✅ S3 bucket created, `terraform state list` shows aws_s3_bucket.workshop

---

## Part 2: Variables & Outputs (20 minutes)

### Task 2.1: Add Input Variables

**Objective**: Make configuration reusable with variables

```bash
# Create variables.tf
cat > variables.tf << 'EOF'
variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_count" {
  type        = number
  description = "Number of EC2 instances"
  default     = 1
  
  validation {
    condition     = var.instance_count > 0 && var.instance_count <= 5
    error_message = "Instance count must be between 1 and 5."
  }
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t2.micro"
}

variable "tags" {
  type        = map(string)
  description = "Common tags for resources"
  default = {
    Team    = "DevOps"
    Project = "Terraform-Workshop"
  }
}
EOF

# Validate
terraform validate

# Expected output:
# Success! The configuration is valid.
```

**Verification**: ✅ `terraform validate` passes, no syntax errors

---

### Task 2.2: Create terraform.tfvars

**Objective**: Provide variable values

```bash
# Create terraform.tfvars
cat > terraform.tfvars << 'EOF'
environment    = "dev"
instance_count = 2
instance_type  = "t2.micro"
tags = {
  Team    = "DevOps"
  Project = "Terraform-Workshop"
  Owner   = "your-name"
}
EOF

# Plan with variables
terraform plan -out=tfplan

# Expected output:
# Plan: X to add, 0 to change, 0 to destroy.
# (count shows 2 instances instead of default 1)
```

**Verification**: ✅ `terraform plan` shows correct variable values

---

### Task 2.3: Add Outputs

**Objective**: Extract and display important values

```bash
# Create outputs.tf
cat > outputs.tf << 'EOF'
output "bucket_name" {
  value       = aws_s3_bucket.workshop.id
  description = "Name of the S3 bucket"
}

output "bucket_arn" {
  value       = aws_s3_bucket.workshop.arn
  description = "ARN of the S3 bucket"
}

output "environment" {
  value       = var.environment
  description = "Deployment environment"
}

output "instance_count" {
  value       = var.instance_count
  description = "Number of instances to deploy"
}
EOF

# Validate
terraform validate

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan

# Get outputs
terraform output

# Expected output:
# bucket_arn = "arn:aws:s3:::terraform-workshop-123456789012"
# bucket_name = "terraform-workshop-123456789012"
# environment = "dev"
# instance_count = 2

# Get specific output
terraform output bucket_name

# Expected output:
# "terraform-workshop-123456789012"
```

**Verification**: ✅ `terraform output` displays all 4 outputs correctly

---

## Part 3: Resources & Dependencies (20 minutes)

### Task 3.1: Create VPC and Subnet

**Objective**: Understand resource dependencies

```bash
# Update main.tf with networking resources
cat >> main.tf << 'EOF'

# VPC
resource "aws_vpc" "workshop" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

# Subnet
resource "aws_subnet" "workshop" {
  vpc_id            = aws_vpc.workshop.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "${var.environment}-subnet"
  }
}

# Security Group
resource "aws_security_group" "workshop" {
  name_prefix = "${var.environment}-sg-"
  vpc_id      = aws_vpc.workshop.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-sg"
  }
}
EOF

# Validate
terraform validate

# Plan to see dependencies
terraform plan -out=tfplan

# Expected output:
# Plan: 3 to add, 0 to change, 0 to destroy.
# (Shows VPC → Subnet → Security Group dependencies)

# Apply
terraform apply tfplan

# Expected output:
# Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

# Verify
terraform state list
```

**Verification**: ✅ `terraform state list` shows aws_vpc, aws_subnet, aws_security_group

---

### Task 3.2: Create EC2 Instances

**Objective**: Use count to create multiple resources

```bash
# Get latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
}

# EC2 instances with count
resource "aws_instance" "workshop" {
  count                = var.instance_count
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = var.instance_type
  subnet_id            = aws_subnet.workshop.id
  vpc_security_group_ids = [aws_security_group.workshop.id]

  tags = {
    Name = "${var.environment}-instance-${count.index + 1}"
  }
}
EOF

# Remove old reference to avoid conflicts (comment out)
cat > main.tf << 'EOF'
# Version from before, but updated main.tf
EOF

# Start fresh - create comprehensive main.tf
cat > main.tf << 'EOF'
data "aws_caller_identity" "current" {}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
}

resource "aws_s3_bucket" "workshop" {
  bucket = "terraform-workshop-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "workshop-bucket"
  }
}

resource "aws_vpc" "workshop" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

resource "aws_subnet" "workshop" {
  vpc_id            = aws_vpc.workshop.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "${var.environment}-subnet"
  }
}

resource "aws_security_group" "workshop" {
  name_prefix = "${var.environment}-sg-"
  vpc_id      = aws_vpc.workshop.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-sg"
  }
}

resource "aws_instance" "workshop" {
  count              = var.instance_count
  ami                = data.aws_ami.ubuntu.id
  instance_type      = var.instance_type
  subnet_id          = aws_subnet.workshop.id
  security_groups    = [aws_security_group.workshop.id]

  tags = {
    Name = "${var.environment}-instance-${count.index + 1}"
  }
}
EOF

# Plan
terraform plan -out=tfplan

# Expected output:
# Plan: X to add, 0 to change, 0 to destroy.

# Apply
terraform apply tfplan

# Verify
aws ec2 describe-instances --region us-east-1 --filters "Name=tag:Environment,Values=workshop" --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name]'
```

**Verification**: ✅ Instances created, `terraform state list` shows aws_instance.workshop[0] and aws_instance.workshop[1]

---

### Task 3.3: Reference Resources

**Objective**: Use outputs from resources

```bash
# Update outputs.tf
cat > outputs.tf << 'EOF'
output "bucket_name" {
  value       = aws_s3_bucket.workshop.id
  description = "Name of the S3 bucket"
}

output "vpc_id" {
  value       = aws_vpc.workshop.id
  description = "VPC ID"
}

output "subnet_id" {
  value       = aws_subnet.workshop.id
  description = "Subnet ID"
}

output "instance_ids" {
  value       = aws_instance.workshop[*].id
  description = "IDs of all instances"
}

output "instance_private_ips" {
  value       = aws_instance.workshop[*].private_ip
  description = "Private IPs of instances"
}

output "security_group_id" {
  value       = aws_security_group.workshop.id
  description = "Security group ID"
}
EOF

# Apply
terraform apply

# Get all outputs
terraform output

# Expected output shows all resource references
```

**Verification**: ✅ Outputs show valid IDs and IPs from created resources

---

## Part 4: Modules & Organization (20 minutes)

### Task 4.1: Create Reusable Module

**Objective**: Extract networking into a module

```bash
# Create module directory
mkdir -p modules/networking

# Create module files
cat > modules/networking/main.tf << 'EOF'
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

resource "aws_subnet" "main" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.subnet_cidr
  availability_zone = var.availability_zone

  tags = {
    Name = "${var.environment}-subnet"
  }
}

resource "aws_security_group" "main" {
  name_prefix = "${var.environment}-sg-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
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
EOF

cat > modules/networking/variables.tf << 'EOF'
variable "vpc_cidr" {
  type = string
}

variable "subnet_cidr" {
  type = string
}

variable "availability_zone" {
  type = string
}

variable "environment" {
  type = string
}
EOF

cat > modules/networking/outputs.tf << 'EOF'
output "vpc_id" {
  value = aws_vpc.main.id
}

output "subnet_id" {
  value = aws_subnet.main.id
}

output "security_group_id" {
  value = aws_security_group.main.id
}
EOF

# Verify module structure
ls -R modules/

# Expected output:
# modules/:
# networking
# modules/networking:
# main.tf        outputs.tf     variables.tf
```

**Verification**: ✅ Module structure complete with 3 files

---

### Task 4.2: Use Module in Root Configuration

**Objective**: Call and use the networking module

```bash
# Update main.tf to use module
cat > main.tf << 'EOF'
data "aws_caller_identity" "current" {}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
}

resource "aws_s3_bucket" "workshop" {
  bucket = "terraform-workshop-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "workshop-bucket"
  }
}

# Use module
module "networking" {
  source = "./modules/networking"

  vpc_cidr          = "10.0.0.0/16"
  subnet_cidr       = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  environment       = var.environment
}

# Use module outputs
resource "aws_instance" "workshop" {
  count              = var.instance_count
  ami                = data.aws_ami.ubuntu.id
  instance_type      = var.instance_type
  subnet_id          = module.networking.subnet_id
  security_groups    = [module.networking.security_group_id]

  tags = {
    Name = "${var.environment}-instance-${count.index + 1}"
  }
}
EOF

# Validate
terraform validate

# Plan (modules are auto-downloaded)
terraform plan -out=tfplan

# Expected output:
# Plan: X to add, Y to change, 0 to destroy.

# Apply
terraform apply tfplan

# Verify
terraform state list | grep module

# Expected output:
# module.networking.aws_security_group.main
# module.networking.aws_subnet.main
# module.networking.aws_vpc.main
```

**Verification**: ✅ Module used successfully, `terraform state list` shows module resources

---

## Part 5: State Management (15 minutes)

### Task 5.1: Configure Remote Backend

**Objective**: Move state to S3 (simulated or real)

```bash
# Create S3 bucket for state (if not exists)
aws s3api create-bucket \
  --bucket terraform-workshop-state-$(date +%s) \
  --region us-east-1

# Enable versioning
BUCKET_NAME=$(aws s3 ls | grep workshop-state | awk '{print $3}' | tail -1)
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-workshop-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Update terraform.tf with backend
cat > terraform.tf << 'EOF'
terraform {
  backend "s3" {
    bucket         = "terraform-workshop-state-YOUR_TIMESTAMP"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-workshop-locks"
  }
}
EOF

# Reinitialize with backend
terraform init

# When prompted, enter "yes" to migrate state

# Verify state moved
terraform state list
aws s3 ls s3://terraform-workshop-state-*/
```

**Verification**: ✅ `terraform state list` works, state file in S3

---

### Task 5.2: Inspect State

**Objective**: Understand state file contents

```bash
# List resources in state
terraform state list

# Show specific resource
terraform state show aws_instance.workshop[0]

# Expected output:
# # aws_instance.workshop[0]:
# resource "aws_instance" "workshop" {
#   ami           = "ami-12345678"
#   instance_type = "t2.micro"
#   ...
# }

# Export state to JSON
terraform state pull > state.json

# View state file size
du -h terraform.tfstate state.json
```

**Verification**: ✅ `terraform state pull` returns valid JSON state file

---

## Part 6: Multi-Environment Setup (15 minutes)

### Task 6.1: Create Environment Directories

**Objective**: Organize for dev/staging/prod

```bash
# Create environment structure
mkdir -p environments/dev environments/staging environments/prod

# Copy base configuration to dev
cp main.tf providers.tf variables.tf outputs.tf versions.tf environments/dev/

# Copy to staging and prod
cp -r environments/dev/* environments/staging/
cp -r environments/dev/* environments/prod/

# Create environment-specific tfvars
cat > environments/dev/terraform.tfvars << 'EOF'
environment    = "dev"
instance_count = 1
instance_type  = "t2.micro"
EOF

cat > environments/staging/terraform.tfvars << 'EOF'
environment    = "staging"
instance_count = 2
instance_type  = "t2.small"
EOF

cat > environments/prod/terraform.tfvars << 'EOF'
environment    = "prod"
instance_count = 3
instance_type  = "t2.medium"
EOF

# Also copy modules
cp -r modules environments/dev/
cp -r modules environments/staging/
cp -r modules environments/prod/

# List structure
tree environments/
```

**Verification**: ✅ 3 environment directories created with separate configurations

---

### Task 6.2: Deploy Staging Environment

**Objective**: Deploy using staging configuration

```bash
# Navigate to staging
cd environments/staging

# Initialize
terraform init -backend-config="key=staging/terraform.tfstate"

# Plan staging deployment
terraform plan -out=tfplan

# Expected output shows t2.small instances instead of t2.micro

# Apply
terraform apply tfplan

# Verify environment variable
terraform output environment

# Expected output:
# "staging"

# Verify instance type in plan
terraform plan | grep instance_type

# Go back to root
cd ../../
```

**Verification**: ✅ Staging deployment separate from dev, uses t2.small instances

---

## Troubleshooting Scenarios

### Scenario 1: State Lock Timeout

```bash
# Simulate: Run apply twice simultaneously

# First terminal
terraform apply &

# Second terminal
terraform apply
# Error: Error acquiring the state lock

# Solution
terraform force-unlock <LOCK_ID>
```

**Verification**: ✅ Can force unlock and proceed

---

### Scenario 2: Resource Drift

```bash
# Simulate drift by manually modifying AWS resource
aws ec2 modify-instance-attribute \
  --instance-id <instance_id> \
  --instance-type '{"Value": "t2.small"}'

# Detect drift
terraform plan

# Expected output:
# aws_instance.workshop[0] will be updated in-place
# ~ instance_type = "t2.small" -> "t2.micro"

# Fix drift
terraform apply
```

**Verification**: ✅ `terraform plan` detects change, apply fixes it

---

## Validation Checklist

- [ ] Terraform version 1.0 or later installed
- [ ] AWS credentials configured
- [ ] `terraform init` runs successfully
- [ ] `terraform validate` passes
- [ ] Can create S3 bucket resource
- [ ] Variables and outputs work
- [ ] VPC and EC2 instances deployed
- [ ] Module structure created and used
- [ ] Remote state backend configured
- [ ] Multi-environment setup complete
- [ ] Can deploy staging environment separately
- [ ] Troubleshooting scenarios completed

---

## Summary

**Completed Tasks**:
✅ Installed Terraform  
✅ Created first resource (S3)  
✅ Used variables and outputs  
✅ Created multiple resources with dependencies  
✅ Built and used reusable modules  
✅ Configured remote state backend  
✅ Set up multi-environment deployment  

**Time Spent**: ~90 minutes (6 parts × 15 minutes)

**Next Steps**:
- Review [CONCEPT.md](CONCEPT.md) for advanced features
- Read [RUNBOOK.md](RUNBOOK.md) for production procedures
- Explore [Terraform Registry](https://registry.terraform.io) for community modules
- Practice with your own infrastructure

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Level**: Beginner to Intermediate
