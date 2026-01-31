# CI/CD: Hands-On Workshop

Practical, step-by-step exercises to master continuous integration and deployment. Estimated 120-150 minutes.

---

## Learning Objectives

By the end of this workshop, you will be able to:
✅ Create and configure CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)  
✅ Implement automated testing and code quality checks  
✅ Deploy applications using multiple strategies (blue-green, canary)  
✅ Manage secrets and secure credentials  
✅ Monitor pipeline performance and health  
✅ Troubleshoot pipeline failures  
✅ Implement rollback procedures  
✅ Compare CI/CD platforms  

---

## Part 1: GitHub Actions Setup (20 minutes)

### Task 1.1: Create Basic Workflow

**Objective**: Set up first CI/CD pipeline with GitHub Actions

```bash
# Step 1: Clone repository
git clone https://github.com/your-org/sample-app
cd sample-app

# Step 2: Create workflow directory
mkdir -p .github/workflows

# Step 3: Create workflow file
cat > .github/workflows/ci.yml << 'EOF'
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run lint
        run: npm run lint
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Build
        run: npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

# Step 4: Commit and push
git add .github/workflows/ci.yml
git commit -m "Add GitHub Actions CI pipeline"
git push origin main

# Expected output: Workflow triggered automatically
# View results: https://github.com/your-org/sample-app/actions
```

**Verification**: ✅ Workflow appears in Actions tab and runs successfully

---

### Task 1.2: Add Docker Build

**Objective**: Automate Docker image building and pushing

```bash
# Step 1: Create GitHub token
# Go to: Settings → Developer settings → Personal access tokens → Tokens (classic)
# Grant: repo, write:packages

# Step 2: Create Docker build workflow
cat > .github/workflows/docker.yml << 'EOF'
name: Build and Push Docker Image

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/sample-app:latest
            ${{ secrets.DOCKER_USERNAME }}/sample-app:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
EOF

# Step 3: Add secrets to repository
# Go to: Settings → Secrets and variables → Actions → New repository secret
# Add: DOCKER_USERNAME and DOCKER_PASSWORD

git add .github/workflows/docker.yml
git commit -m "Add Docker build workflow"
git push

# Expected output: Docker images pushed to Docker Hub
```

**Verification**: ✅ Docker images built and pushed successfully

---

## Part 2: GitLab CI Setup (20 minutes)

### Task 2.1: Create GitLab Pipeline

**Objective**: Configure CI/CD pipeline in GitLab

```bash
# Step 1: Create .gitlab-ci.yml
cat > .gitlab-ci.yml << 'EOF'
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  NODE_VERSION: "18"

build:
  stage: build
  image: node:18
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day

test:
  stage: test
  image: node:18
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm test -- --coverage
    - npm run lint
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

deploy_staging:
  stage: deploy
  environment:
    name: staging
    url: https://staging.example.com
  script:
    - echo "Deploying to staging..."
    - ./deploy.sh staging
  only:
    - develop

deploy_production:
  stage: deploy
  environment:
    name: production
    url: https://example.com
  script:
    - echo "Deploying to production..."
    - ./deploy.sh production
  only:
    - main
  when: manual
EOF

# Step 2: Commit pipeline
git add .gitlab-ci.yml
git commit -m "Add GitLab CI pipeline"
git push

# Expected output: Pipeline runs automatically
```

**Verification**: ✅ Pipeline executes all stages successfully

---

### Task 2.2: Container Registry

**Objective**: Build and push images to GitLab Container Registry

```bash
# Step 1: Create registry integration
cat >> .gitlab-ci.yml << 'EOF'

build_image:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main
EOF

git add .gitlab-ci.yml
git commit -m "Add container registry build"
git push

# Expected output: Images pushed to GitLab Container Registry
# View: Project → Deployments → Container Registry
```

**Verification**: ✅ Container images appear in registry

---

## Part 3: Jenkins Setup (25 minutes)

### Task 3.1: Create Jenkinsfile

**Objective**: Set up Jenkins pipeline using Jenkinsfile

```bash
# Step 1: Create Jenkinsfile
cat > Jenkinsfile << 'EOF'
pipeline {
    agent any
    
    environment {
        NODE_ENV = 'production'
        CI = 'true'
        BUILD_ID = "${BUILD_NUMBER}"
    }
    
    options {
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm test -- --coverage'
                junit 'test-results/**/*.xml'
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
                archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
            }
        }
        
        stage('Deploy Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh './deploy.sh staging'
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
                sh './deploy.sh production'
            }
        }
    }
    
    post {
        always {
            junit 'test-results/**/*.xml'
            publishHTML([
                reportDir: 'coverage',
                reportFiles: 'index.html',
                reportName: 'Coverage Report'
            ])
        }
        failure {
            mail to: 'team@example.com',
                 subject: "Build Failed: ${env.JOB_NAME}",
                 body: "Build failed: ${env.BUILD_URL}"
        }
        success {
            echo "Build successful!"
        }
    }
}
EOF

# Step 2: Configure Jenkins job
# - Go to Jenkins UI (http://jenkins:8080)
# - Create new job → Pipeline
# - Configuration → Pipeline → Definition: Pipeline script from SCM
# - SCM: Git → Repository URL: (your repo)
# - Script Path: Jenkinsfile

git add Jenkinsfile
git commit -m "Add Jenkinsfile"
git push

# Expected output: Jenkins job runs automatically on push
```

**Verification**: ✅ Jenkinsfile executes all pipeline stages

---

### Task 3.2: Configure Jenkins Agents

**Objective**: Set up distributed builds with Jenkins agents

```bash
# Step 1: Configure agent labels
# Jenkins UI → Manage Jenkins → Manage Nodes and Clouds
# Create new agent: agent-docker
# Remote root directory: /var/jenkins_agents/agent-docker

# Step 2: Update Jenkinsfile to use agents
cat > Jenkinsfile << 'EOF'
pipeline {
    agent {
        node {
            label 'agent-docker'
            customWorkspace '/var/jenkins_agents/workspace'
        }
    }
    
    stages {
        stage('Build') {
            agent {
                docker {
                    image 'node:18'
                    label 'agent-docker'
                }
            }
            steps {
                sh 'npm ci && npm run build'
            }
        }
    }
}
EOF

git add Jenkinsfile
git commit -m "Add agent configuration"
git push
```

**Verification**: ✅ Builds run on specified agent

---

## Part 4: Deployment Strategies (25 minutes)

### Task 4.1: Blue-Green Deployment

**Objective**: Implement zero-downtime deployments

```bash
# Step 1: Create deployment script
cat > deploy-blue-green.sh << 'EOF'
#!/bin/bash
set -e

CURRENT=$(curl -s https://app.example.com/version | jq -r '.environment')

if [ "$CURRENT" = "blue" ]; then
    STANDBY="green"
    PORT=8002
else
    STANDBY="blue"
    PORT=8001
fi

echo "Deploying to $STANDBY environment..."

# Deploy
docker pull $IMAGE:$BUILD_ID
docker stop app-$STANDBY || true
docker run -d \
  --name app-$STANDBY \
  -p $PORT:3000 \
  $IMAGE:$BUILD_ID

# Health check
sleep 10
for i in {1..30}; do
    if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
        echo "Health check passed"
        break
    fi
    sleep 2
done

# Switch traffic
sudo /opt/switch-traffic.sh $PORT

echo "Deployment complete"
EOF

chmod +x deploy-blue-green.sh

# Step 2: Add to pipeline
git add deploy-blue-green.sh
git commit -m "Add blue-green deployment"
git push
```

**Verification**: ✅ Deployments with zero downtime

---

### Task 4.2: Canary Deployment

**Objective**: Test changes on subset of users first

```bash
# Step 1: Create canary deployment
cat > deploy-canary.sh << 'EOF'
#!/bin/bash

kubectl set image deployment/app-canary app=$IMAGE:$BUILD_ID --record
kubectl wait --for=condition=ready pod -l app=app-canary --timeout=300s

# Route 10% traffic to canary
cat | kubectl apply -f - << YAML
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app
spec:
  hosts:
  - app
  http:
  - route:
    - destination:
        host: app-stable
      weight: 90
    - destination:
        host: app-canary
      weight: 10
YAML

echo "Canary deployed with 10% traffic"

# Monitor
sleep 120
ERROR_RATE=$(kubectl logs -l app=app-canary --tail=1000 | grep "error" | wc -l)

if [ $ERROR_RATE -gt 100 ]; then
    kubectl rollout undo deployment/app-canary
    exit 1
fi

# Promote
kubectl set image deployment/app app=$IMAGE:$BUILD_ID --record
kubectl wait --for=condition=ready pod -l app=app --timeout=300s

echo "Canary promoted to production"
EOF

chmod +x deploy-canary.sh
git add deploy-canary.sh
git commit -m "Add canary deployment"
git push
```

**Verification**: ✅ Canary deployment with traffic gradation

---

## Part 5: Testing & Quality (20 minutes)

### Task 5.1: Add Test Coverage

**Objective**: Implement comprehensive testing

```bash
# Step 1: Create test configuration
cat > jest.config.js << 'EOF'
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
EOF

# Step 2: Run tests locally
npm test -- --coverage

# Step 3: Generate SonarQube report
npm test -- --coverage --reporters=default --reporters=jest-junit

# Step 4: Commit
git add jest.config.js
git commit -m "Add test coverage configuration"
git push
```

**Verification**: ✅ Tests pass with 80%+ coverage

---

### Task 5.2: Code Quality Checks

**Objective**: Enforce code quality standards

```bash
# Step 1: Setup linting
npm install --save-dev eslint prettier

# Step 2: Add to CI pipeline
cat >> .github/workflows/ci.yml << 'EOF'
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: SonarQube Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      
      - name: Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'sample-app'
          path: '.'
          format: 'JSON'
EOF

git add .github/workflows/ci.yml
git commit -m "Add code quality checks"
git push
```

**Verification**: ✅ Quality gates passing

---

## Part 6: Secrets & Security (20 minutes)

### Task 6.1: Manage Secrets

**Objective**: Securely store and use sensitive data

```bash
# Step 1: Add secrets to GitHub
# Go to: Settings → Secrets and variables → Actions
# Add: DB_PASSWORD, API_KEY, JWT_SECRET

# Step 2: Use secrets in workflow
cat > .github/workflows/deploy.yml << 'EOF'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy with secrets
        env:
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          API_KEY: ${{ secrets.API_KEY }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
        run: |
          echo "DATABASE_PASSWORD=$DB_PASSWORD" > .env
          echo "API_KEY=$API_KEY" >> .env
          ./deploy.sh
      
      - name: Cleanup
        run: rm -f .env
EOF

git add .github/workflows/deploy.yml
git commit -m "Add secure deployment"
git push

# Expected: Secrets masked in logs
```

**Verification**: ✅ Secrets not exposed in logs

---

### Task 6.2: SAST Scanning

**Objective**: Detect security vulnerabilities

```bash
# Step 1: Add dependency scanning
cat >> .github/workflows/ci.yml << 'EOF'
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
EOF

git add .github/workflows/ci.yml
git commit -m "Add security scanning"
git push

# Expected: Security vulnerabilities detected and reported
```

**Verification**: ✅ Security scan completes without critical issues

---

## Validation Checklist

- [ ] GitHub Actions pipeline created and running
- [ ] Docker images built and pushed
- [ ] GitLab CI pipeline configured
- [ ] Container registry images verified
- [ ] Jenkins Jenkinsfile created
- [ ] Jenkins pipeline executing stages
- [ ] Jenkins agents configured
- [ ] Blue-green deployment tested
- [ ] Canary deployment working
- [ ] Test coverage > 80%
- [ ] Code quality checks passing
- [ ] Secrets configured securely
- [ ] Security scanning enabled
- [ ] All pipelines successful

---

## Summary

**Completed Tasks**:
✅ Created CI pipelines (GitHub Actions, GitLab CI, Jenkins)  
✅ Automated Docker image builds  
✅ Implemented multiple deployment strategies  
✅ Added comprehensive testing  
✅ Configured security scanning  
✅ Managed secrets securely  
✅ Set up monitoring and alerts  

**Time Spent**: ~120 minutes (6 parts × 20 minutes)

**Platform Comparison**:
- **GitHub Actions**: Best for GitHub-native projects, simplest setup
- **GitLab CI**: Best for complete DevOps platform, strong container support
- **Jenkins**: Best for complex pipelines, highest flexibility

**Next Steps**:
- Review [CONCEPT.md](CONCEPT.md) for advanced patterns
- Read [RUNBOOK.md](RUNBOOK.md) for production procedures
- Explore [BUSINESS.md](BUSINESS.md) for ROI analysis
- Implement additional stages (security, performance testing)
- Set up multi-environment deployments

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Level**: Beginner to Intermediate  
**Estimated Duration**: 120-150 minutes
