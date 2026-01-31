# CI/CD: Production Operational Runbook

Production-ready procedures for setting up, maintaining, and troubleshooting CI/CD pipelines.

---

## Table of Contents

1. [GitHub Actions Setup](#1-github-actions-setup)
2. [GitLab CI Setup](#2-gitlab-ci-setup)
3. [Jenkins Setup](#3-jenkins-setup)
4. [Azure Pipelines Setup](#4-azure-pipelines-setup)
5. [GCP Cloud Build Setup](#5-gcp-cloud-build-setup)
6. [Docker Build Optimization](#6-docker-build-optimization)
7. [Deployment Strategies](#7-deployment-strategies)
8. [Security Hardening](#8-security-hardening)
9. [Monitoring & Alerting](#9-monitoring--alerting)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. GitHub Actions Setup

### Basic Workflow

```bash
# Step 1: Create workflow directory
mkdir -p .github/workflows

# Step 2: Create workflow file
cat > .github/workflows/ci.yml << 'EOF'
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run linting
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
    
    - name: Run tests
      run: |
        pytest --cov=. --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage.xml

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: |
        echo "Deploying to production..."
        # Add deployment steps
EOF

# Step 3: Push to repository
git add .github/workflows/ci.yml
git commit -m "Add CI/CD pipeline"
git push

# Verification: Check Actions tab in GitHub
```

### Matrix Builds (Multi-Python Versions)

```yaml
name: Multi-Version Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.8', '3.9', '3.10', '3.11']
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    - run: pip install -r requirements.txt
    - run: pytest
```

---

## 2. GitLab CI Setup

### Basic Pipeline

```bash
# Step 1: Create .gitlab-ci.yml in repository root
cat > .gitlab-ci.yml << 'EOF'
image: python:3.11

stages:
  - build
  - test
  - deploy

build:
  stage: build
  script:
    - pip install -r requirements.txt
    - python setup.py build
  artifacts:
    paths:
      - build/
    expire_in: 1 hour

test:
  stage: test
  script:
    - pip install -r requirements.txt
    - pip install pytest pytest-cov
    - pytest --cov=. --cov-report=term
  coverage: '/TOTAL.*\s+(\d+%)$/'

deploy_staging:
  stage: deploy
  script:
    - echo "Deploying to staging..."
  environment:
    name: staging
  only:
    - develop

deploy_production:
  stage: deploy
  script:
    - echo "Deploying to production..."
  environment:
    name: production
  only:
    - main
  when: manual
EOF

# Step 2: Push to GitLab
git add .gitlab-ci.yml
git commit -m "Add GitLab CI pipeline"
git push

# Verification: Check CI/CD > Pipelines in GitLab UI
```

### GitLab Runner Setup

```bash
# Step 1: Install GitLab Runner (Ubuntu)
curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | sudo bash
sudo apt-get install gitlab-runner

# Step 2: Register runner
sudo gitlab-runner register \
  --url https://gitlab.example.com/ \
  --registration-token $REGISTRATION_TOKEN \
  --executor docker \
  --docker-image alpine:latest \
  --description "Docker runner"

# Step 3: Start runner
sudo gitlab-runner start

# Verification
sudo gitlab-runner verify
```

---

## 3. Jenkins Setup

### Pipeline Job Creation

```bash
# Step 1: Create Jenkinsfile in repository
cat > Jenkinsfile << 'EOF'
pipeline {
    agent any
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build') {
            steps {
                sh './gradlew build'
            }
        }
        
        stage('Test') {
            steps {
                sh './gradlew test'
            }
        }
        
        stage('Security Scan') {
            steps {
                sh './gradlew sonarqube'
            }
        }
        
        stage('Deploy Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh 'echo "Deploying to staging..."'
            }
        }
        
        stage('Deploy Production') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
                ok "Deploy"
            }
            steps {
                sh 'echo "Deploying to production..."'
            }
        }
    }
    
    post {
        always {
            junit 'build/test-results/*.xml'
            publishHTML target: [
                reportDir: 'build/reports/coverage',
                reportFiles: 'index.html',
                reportName: 'Code Coverage'
            ]
        }
        failure {
            emailext (
                subject: "Build FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Build failed: ${env.BUILD_URL}",
                to: 'team@example.com'
            )
        }
    }
}
EOF

# Step 2: Create Jenkins job
# Go to Jenkins UI → New Item → Pipeline
# Configure: Definition → Pipeline script from SCM
# SCM: Git, repository URL, branch: */main

# Step 3: Trigger first build
# Click "Build Now" button in Jenkins UI

# Verification: Check console output
```

### Jenkins Agent Setup

```bash
# Step 1: Start Jenkins master
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:latest

# Step 2: Set up SSH agent
# Jenkins UI → Manage Jenkins → Nodes and Clouds → New Node
# Name: "docker-agent"
# Type: "Permanent Agent"
# Remote root directory: /home/jenkins

# Step 3: Connect agent
# SSH into agent machine and run:
java -jar agent.jar -jnlpUrl http://jenkins:8080/computer/docker-agent/slave-agent.jnlp
```

---

## 4. Azure Pipelines Setup

### Basic Pipeline YAML

```bash
# Step 1: Create azure-pipelines.yml
cat > azure-pipelines.yml << 'EOF'
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  buildConfiguration: 'Release'

stages:
- stage: Build
  jobs:
  - job: BuildJob
    steps:
    - task: UsePythonVersion@0
      inputs:
        versionSpec: '3.11'
    
    - script: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
      displayName: 'Install dependencies'
    
    - script: |
        pytest --cov=. --cov-report=xml
      displayName: 'Run tests'
    
    - task: PublishCodeCoverageResults@1
      inputs:
        codeCoverageTool: Cobertura
        summaryFileLocation: '$(System.DefaultWorkingDirectory)/**/coverage.xml'

- stage: DeployStaging
  dependsOn: Build
  condition: eq(variables['Build.SourceBranch'], 'refs/heads/develop')
  jobs:
  - deployment: DeployStaging
    environment: 'Staging'
    strategy:
      runOnce:
        deploy:
          steps:
          - download: current
            artifact: drop
          - script: echo 'Deploying to staging...'

- stage: DeployProduction
  dependsOn: Build
  condition: eq(variables['Build.SourceBranch'], 'refs/heads/main')
  jobs:
  - deployment: DeployProduction
    environment: 'Production'
    strategy:
      runOnce:
        deploy:
          steps:
          - download: current
            artifact: drop
          - script: echo 'Deploying to production...'
EOF

# Step 2: Create pipeline in Azure DevOps
# Azure DevOps → Pipelines → Create Pipeline
# Select: GitHub, repository, branch
# Configure YAML file path

# Step 3: Run pipeline
git push origin main

# Verification: Check Pipelines → Recent runs
```

---

## 5. GCP Cloud Build Setup

### Cloud Build Configuration

```bash
# Step 1: Create cloudbuild.yaml
cat > cloudbuild.yaml << 'EOF'
steps:
  # Build step
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/myapp:$SHORT_SHA', '.']
  
  # Push to registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/myapp:$SHORT_SHA']
  
  # Run tests
  - name: 'gcr.io/cloud-builders/docker'
    args: ['run', 'gcr.io/$PROJECT_ID/myapp:$SHORT_SHA', 'pytest']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - run
      - --filename=k8s/
      - --image=gcr.io/$PROJECT_ID/myapp:$SHORT_SHA
      - --location=us-central1
      - --cluster=my-cluster

images:
  - 'gcr.io/$PROJECT_ID/myapp:$SHORT_SHA'
  - 'gcr.io/$PROJECT_ID/myapp:latest'

options:
  machineType: 'N1_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

timeout: 1800s
EOF

# Step 2: Set up trigger
gcloud builds connect --repository-name=my-repo \
  --repository-owner=myorg \
  --branch-pattern="^main$"

# Step 3: Verify trigger
gcloud builds triggers list

# Verification: Trigger build
git push origin main
# Check Cloud Build console for build progress
```

---

## 6. Docker Build Optimization

### Multi-Stage Dockerfile

```dockerfile
# Stage 1: Build
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o app

# Stage 2: Runtime
FROM alpine:3.18

RUN apk add --no-cache ca-certificates
COPY --from=builder /app/app .

EXPOSE 8080
CMD ["./app"]
```

### Build Caching Strategy

```bash
# Use --cache-from to leverage existing images
docker build \
  --cache-from gcr.io/myproject/myapp:latest \
  --tag gcr.io/myproject/myapp:v1.0 \
  .

# Build with BuildKit (enable caching)
DOCKER_BUILDKIT=1 docker build \
  --cache-from type=local,src=/tmp/buildcache \
  --cache-to type=local,dest=/tmp/buildcache \
  -t gcr.io/myproject/myapp:v1.0 \
  .
```

---

## 7. Deployment Strategies

### Blue-Green Deployment

```bash
#!/bin/bash
# Deploy to green environment

# Step 1: Deploy new version to green
kubectl set image deployment/myapp-green \
  myapp=myapp:v2.0 \
  --record

# Step 2: Wait for rollout
kubectl rollout status deployment/myapp-green

# Step 3: Health checks on green
for i in {1..10}; do
  STATUS=$(kubectl exec -it deployment/myapp-green -- curl -s http://localhost:8080/health)
  if [ "$STATUS" == "OK" ]; then
    echo "Green deployment healthy"
    break
  fi
  sleep 10
done

# Step 4: Switch traffic to green
kubectl patch service myapp \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Step 5: Blue becomes new baseline
kubectl set image deployment/myapp-blue \
  myapp=myapp:v2.0 \
  --record

# Verify: All traffic on green
kubectl get svc myapp -o yaml | grep version
```

### Canary Deployment

```bash
#!/bin/bash
# Gradual rollout: 5% → 25% → 50% → 100%

CANARY_VERSION="v2.0"
STABLE_VERSION="v1.0"

# Step 1: Deploy canary (5% traffic)
kubectl set image deployment/myapp-canary \
  myapp=myapp:$CANARY_VERSION \
  --record

# Wait and monitor metrics
sleep 60
ERROR_RATE=$(kubectl logs deployment/myapp-canary | grep ERROR | wc -l)

if [ "$ERROR_RATE" -gt 10 ]; then
  echo "Canary failed, rolling back"
  kubectl rollout undo deployment/myapp-canary
  exit 1
fi

# Step 2: Increase to 25%
kubectl scale deployment myapp-canary --replicas 3

# Step 3: Increase to 50%
kubectl scale deployment myapp-canary --replicas 6

# Step 4: Roll out fully
kubectl set image deployment/myapp \
  myapp=myapp:$CANARY_VERSION \
  --record

kubectl rollout status deployment/myapp
```

---

## 8. Security Hardening

### Secrets Management (GitHub Actions)

```bash
# Step 1: Add secret in GitHub UI
# Settings → Secrets and variables → Actions → New repository secret
# Name: DATABASE_PASSWORD
# Value: <password>

# Step 2: Use in workflow
cat > .github/workflows/deploy.yml << 'EOF'
- name: Deploy
  env:
    DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
  run: |
    ./deploy.sh
EOF

# Verify: Secrets are masked in logs
```

### SAST Integration (SonarQube)

```bash
# Step 1: Add SonarQube to GitHub Actions
cat > .github/workflows/sonar.yml << 'EOF'
name: SonarQube Scan

on: [push, pull_request]

jobs:
  sonarqube:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0
    
    - uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
EOF

# Step 2: Create sonar-project.properties
cat > sonar-project.properties << 'EOF'
sonar.projectKey=myorg_myproject
sonar.organization=myorg
sonar.sources=src
sonar.exclusions=**/*_test.go,**/vendor/**
sonar.coverage.exclusions=**/*_test.go
EOF

# Verification: Check SonarCloud for issues
```

### Container Scanning

```bash
# Step 1: Scan image with Trivy
trivy image --severity HIGH,CRITICAL \
  gcr.io/myproject/myapp:latest

# Step 2: Fail build if vulnerabilities found
trivy image --severity CRITICAL \
  --exit-code 1 \
  gcr.io/myproject/myapp:latest
```

---

## 9. Monitoring & Alerting

### Pipeline Metrics Dashboard (Prometheus)

```bash
# Step 1: Add Prometheus metrics to pipeline
# Expose metrics on http://localhost:9090/metrics

# Step 2: Configure Prometheus scrape config
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ci-cd'
    static_configs:
      - targets: ['localhost:9090']
EOF

# Step 3: Create Grafana dashboard
# Visualize: Build time, test coverage, deployment frequency
```

### Alert Configuration

```yaml
# Example Prometheus alert rules
groups:
- name: ci-cd-alerts
  rules:
  - alert: BuildTimeTooLong
    expr: job_build_duration_seconds > 900
    for: 5m
    annotations:
      summary: "Build taking too long"
      description: "Build {{ $labels.job }} took {{ $value }}s"
  
  - alert: HighFailureRate
    expr: increase(job_failed_total[5m]) > 5
    for: 5m
    annotations:
      summary: "High build failure rate"
```

---

## 10. Troubleshooting

### Build Hangs or Timeout

```bash
# Issue: Build never completes
# Solutions:

# 1. Check runner availability
gh run list --repo myorg/myrepo | head -20

# 2. Increase timeout
# In workflow: timeout-minutes: 60 (default 360)

# 3. Check for deadlocks
# Look at build logs for waiting processes

# 4. Increase runner resources
# In Actions settings or self-hosted runner config

# 5. Parallel execution
# Split tests: pytest --dist loadscope -n auto
```

### Deployment Failures

```bash
# Issue: Deployment fails
# Debug steps:

# 1. Check deployment status
kubectl get deployments
kubectl describe deployment myapp

# 2. Check pod events
kubectl get events --sort-by='.lastTimestamp'

# 3. Check pod logs
kubectl logs deployment/myapp --tail=50

# 4. Test health endpoint
kubectl port-forward svc/myapp 8080:8080
curl http://localhost:8080/health

# 5. Rollback if necessary
kubectl rollout undo deployment/myapp
```

### Intermittent Failures

```bash
# Issue: Tests pass locally, fail in CI
# Common causes & solutions:

# 1. Race conditions
# Solution: Increase test timeouts, use proper synchronization

# 2. External dependencies (databases, APIs)
# Solution: Mock external services, use test fixtures

# 3. Resource constraints in CI
# Solution: Use smaller test suite, parallel execution, spot instances

# 4. Non-deterministic tests
# Solution: Fix flaky tests, use seed for reproducibility

# Running locally to reproduce:
pytest --tb=short --verbose my-flaky-test.py
```

### Secret Management Issues

```bash
# Issue: Secrets not available in runner
# Troubleshooting:

# 1. Verify secret exists
gh secret list --repo myorg/myrepo

# 2. Check variable scope (repo vs org)
# Repository secrets override organization secrets

# 3. Verify workflow can access secret
# Note: Secrets are masked in logs

# 4. Use context properly in workflow
# Correct: ${{ secrets.MY_SECRET }}
# Wrong: env.MY_SECRET (won't be set from secrets)

# 5. Check runner has access
# For self-hosted runners, verify environment variables
```

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Contact**: CI/CD Platform Team
