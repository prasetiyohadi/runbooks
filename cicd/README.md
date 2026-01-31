# CI/CD: Quick Reference & Learning Paths

Essential commands, learning paths, and quick reference for CI/CD setup and management.

---

## Learning Paths

### 🟢 Beginner Path (Weeks 0-2, 8-10 hours)

**Week 0: Foundations**
- Understand CI/CD basics (1-2 hours)
  - Read: [CONCEPT.md](CONCEPT.md) sections 1-2
  - Watch: "CI/CD Explained" videos
  - Goal: Understand pipeline stages

- Choose a platform (1 hour)
  - GitHub Actions (easiest for GitHub repos)
  - GitLab CI (if using GitLab)
  - Jenkins (if self-hosted needed)
  - Azure Pipelines (if Azure/Microsoft stack)

**Week 1: First Pipeline**
- Set up basic GitHub Actions workflow (2-3 hours)
  - Create `.github/workflows/ci.yml`
  - Build + Test steps
  - Run first successful build
  - Celebrate! 🎉

- Hands-on workshop (3-4 hours)
  - Complete [WORKSHOP.md](WORKSHOP.md) Part 1-2
  - Create basic pipeline
  - Add simple tests

**Expected Outcome**: Working CI/CD pipeline, basic understanding

---

### 🟡 Intermediate Path (Weeks 2-6, 20-30 hours)

**Week 2-3: Expand Pipeline**
- Add more stages (5 hours)
  - Testing (unit, integration)
  - Artifact storage
  - Staging deployment
  - Monitoring

- Security scanning (3-4 hours)
  - SAST integration
  - Dependency scanning
  - Secrets management
  - Read: CONCEPT.md section 7

**Week 4-5: Production Deployment**
- Deployment strategies (4-5 hours)
  - Blue-green setup
  - Canary deployment
  - Rolling updates
  - Hands-on: WORKSHOP.md Part 4

- Infrastructure as Code (4 hours)
  - Terraform for infrastructure
  - Helm for Kubernetes
  - GitOps principles

**Week 6: Optimization & Monitoring**
- Performance tuning (3 hours)
  - Caching strategies
  - Parallel execution
  - Build optimization

- Observability setup (3-4 hours)
  - Metrics collection
  - Log aggregation
  - Alert configuration
  - Hands-on: WORKSHOP.md Part 6

**Expected Outcome**: Production-ready pipeline, secure and observable

---

### 🔴 Advanced Path (Week 6+, 40+ hours)

**Microservices at Scale**
- Multi-service orchestration (8-10 hours)
- Service-to-service deployment (5 hours)
- Distributed tracing (4 hours)
- Contract testing (4 hours)

**Enterprise Patterns**
- High-frequency releases (100+/day) (6 hours)
- Multi-cloud CI/CD (8 hours)
- Disaster recovery procedures (4 hours)
- Compliance automation (HIPAA, PCI-DSS, SOC2) (6 hours)

**Advanced Optimization**
- AIOps integration (6 hours)
- Cost optimization at scale (4 hours)
- Self-healing infrastructure (5 hours)
- Predictive deployments (4 hours)

**Expected Outcome**: Enterprise-grade CI/CD platform, cost-optimized, fully automated

---

## Essential Commands

### GitHub Actions

```bash
# View workflow runs
gh run list --repo myorg/myrepo
gh run view <run-id> --repo myorg/myrepo

# Trigger workflow manually
gh workflow run <workflow-name>.yml --repo myorg/myrepo

# Check workflow status
gh workflow view <workflow-name> --repo myorg/myrepo

# View logs
gh run view <run-id> --log --repo myorg/myrepo
```

### GitLab CI

```bash
# View pipeline status
gitlab project pipeline list --project-id <id>

# Trigger pipeline
gitlab project pipeline create --project-id <id>

# View pipeline logs
gitlab project pipeline show --id <id> --project-id <project-id>

# Approve deployment
gitlab project deployment approve --id <id> --project-id <project-id>
```

### Jenkins

```bash
# Trigger build
curl -X POST http://jenkins:8080/job/my-job/build \
  --user admin:token \
  -d 'BRANCH=main'

# Get build status
curl http://jenkins:8080/job/my-job/lastBuild/api/json

# View build logs
curl http://jenkins:8080/job/my-job/lastBuild/consoleText

# Manage nodes
curl http://jenkins:8080/computer/api/json
```

### Azure Pipelines

```bash
# List pipelines
az pipelines list --project <project>

# Run pipeline
az pipelines run --name <pipeline> --project <project>

# View run status
az pipelines runs list --project <project>

# View logs
az pipelines runs logs --id <run-id> --project <project>
```

### Docker Commands

```bash
# Build image
docker build -t myapp:1.0 .

# Tag for registry
docker tag myapp:1.0 registry.example.com/myapp:1.0

# Push to registry
docker push registry.example.com/myapp:1.0

# Run container
docker run -p 8080:8080 myapp:1.0

# View logs
docker logs <container-id>

# Execute command in container
docker exec <container-id> sh
```

---

## Tool Comparison Tables

### Build Tools

| Tool | Language | Speed | Scalability | Cost |
|------|----------|-------|-------------|------|
| Maven | Java | Moderate | Good | Free |
| Gradle | Kotlin/Java | Fast | Excellent | Free |
| npm/yarn | JavaScript | Fast | Good | Free |
| pip/poetry | Python | Moderate | Good | Free |
| Go build | Go | Very Fast | Excellent | Free |
| Cargo | Rust | Moderate | Excellent | Free |

### Test Frameworks

| Framework | Language | Type | Popularity |
|-----------|----------|------|------------|
| JUnit | Java | Unit | ⭐⭐⭐⭐⭐ |
| pytest | Python | Unit/Integration | ⭐⭐⭐⭐⭐ |
| Mocha | JavaScript | Unit/Integration | ⭐⭐⭐⭐⭐ |
| NUnit | C# | Unit | ⭐⭐⭐⭐ |
| Cypress | JavaScript | E2E | ⭐⭐⭐⭐⭐ |
| Selenium | Multi | E2E | ⭐⭐⭐⭐⭐ |

### Deployment Tools

| Tool | Platforms | Learning Curve | Enterprise Ready |
|------|-----------|-----------------|-----------------|
| Kubernetes | Multi-cloud | Steep | ⭐⭐⭐⭐⭐ |
| Docker Compose | Local/single host | Easy | ⭐⭐ |
| Terraform | Multi-cloud | Moderate | ⭐⭐⭐⭐⭐ |
| Helm | Kubernetes | Moderate | ⭐⭐⭐⭐⭐ |
| Ansible | Multi-cloud | Easy | ⭐⭐⭐⭐ |

---

## FAQ (Frequently Asked Questions)

**Q1: How do I choose between GitHub Actions and Jenkins?**

A: GitHub Actions if:
- Repository already on GitHub
- Cloud hosting acceptable
- Minimal setup desired
- Small to medium projects

Jenkins if:
- Self-hosted required (security/compliance)
- Complex legacy systems
- Heavy customization needed
- Large enterprise

---

**Q2: What's the minimum test coverage for production?**

A: Guidelines:
- Low-risk changes: 60%+ coverage
- Business-critical: 80%+ coverage
- High-security: 90%+ coverage

Focus on:
- Critical paths (higher priority)
- Error cases (lower priority)
- Integration points (high priority)

---

**Q3: How do we handle secrets in CI/CD?**

A: Never:
- ❌ Commit to Git
- ❌ Store in config files
- ❌ Log to console
- ❌ Share via email

Always:
- ✅ Use Vault, AWS Secrets Manager, Azure Key Vault
- ✅ Inject at runtime via environment variables
- ✅ Use service accounts + IAM
- ✅ Rotate automatically (90 days)

---

**Q4: How do we rollback a bad deployment?**

A: Strategies:
1. **Automated Rollback**: Health checks detect failures, immediately revert to previous version
2. **Blue-Green Rollback**: Switch traffic back to Blue environment (instant)
3. **Canary Rollback**: Stop canary deployment, revert to stable version
4. **Database Rollback**: Run reverse migrations (forward compatibility needed)

---

**Q5: What's the recommended deployment frequency?**

A: By maturity:
- **Level 1** (Manual): Quarterly (4x/year)
- **Level 2** (Build Automated): Monthly (12x/year)
- **Level 3** (Partial CD): Weekly (52x/year)
- **Level 4** (Full CD): Daily (365x/year)
- **Level 5** (Elite): Multiple times daily (1000+/year)

Industry benchmark: 4-10x/month (enterprise), daily+ (tech leaders)

---

**Q6: How do we prevent security vulnerabilities in CI/CD?**

A: Defense-in-depth:
1. SAST scanning (code analysis)
2. Dependency scanning (CVE checks)
3. DAST scanning (runtime testing)
4. Container scanning (image vulnerabilities)
5. Secrets scanning (prevent accidental commits)
6. Manual security review (high-risk changes)

---

**Q7: How do we monitor CI/CD pipeline performance?**

A: Key metrics:
- Build time (target: < 10 min)
- Test coverage (target: > 80%)
- Deployment frequency (target: daily+)
- Mean time to recovery (target: < 1 hour)
- Change failure rate (target: < 5%)

Dashboard tools: Grafana, DataDog, Prometheus

---

**Q8: How do we handle database migrations in CD?**

A: Best practices:
1. **Backwards compatible migrations**: New code works with old schema
2. **Expand-contract pattern**: Add columns, migrate data, remove old columns
3. **Feature flags**: Control new feature rollout
4. **Automated rollback**: Script to undo migrations if needed
5. **Test migrations**: Test on production-like data before deploying

---

## Production Deployment Checklist

### Pre-Deployment (24 hours before)

- [ ] Code review completed and approved (2+ reviewers)
- [ ] All automated tests passing (100%)
- [ ] Security scanning completed (SAST, dependency, container)
- [ ] Performance tests baseline established
- [ ] Rollback plan documented and tested
- [ ] Communication plan sent to stakeholders
- [ ] On-call engineer assigned
- [ ] Monitoring dashboards prepared

### During Deployment

- [ ] Start deployment during low-traffic window
- [ ] Monitor real-time metrics (errors, latency, traffic)
- [ ] Have rollback command ready
- [ ] Team on standby (Slack, VoIP)
- [ ] Update status in communication channel

### Post-Deployment (2-4 hours)

- [ ] All health checks passing
- [ ] Error rate normal (< 0.1%)
- [ ] Latency acceptable (P99 < 200ms)
- [ ] Database connections stable
- [ ] Monitoring alerts cleared
- [ ] Document any issues encountered
- [ ] Celebrate successful deployment 🎉

### Follow-Up (24 hours post)

- [ ] Metrics review (no degradation)
- [ ] Error logs review
- [ ] User feedback collected
- [ ] Post-mortem if any issues
- [ ] Update documentation

---

## Essential Tools & Maturity

### Maturity Level: Beginner

Essential tools:
- Source control: Git (GitHub, GitLab)
- CI: GitHub Actions, GitLab CI
- Testing: pytest, Jest, JUnit
- Container: Docker
- Deployment: Manual or basic scripting

Time to first pipeline: 1-2 days

---

### Maturity Level: Intermediate

Add to basic:
- Kubernetes orchestration
- Infrastructure as Code (Terraform)
- Security scanning (SonarQube, Snyk)
- Artifact registry (Docker Hub, ECR, GCR, ACR)
- Monitoring (Prometheus, ELK)

Time to production-ready: 2-4 weeks

---

### Maturity Level: Advanced

Full stack:
- Service mesh (Istio)
- GitOps (ArgoCD, Flux)
- Policy as Code (OPA, Kyverno)
- Secrets management (Vault)
- Cost monitoring (Kubecost, CloudHealth)
- Advanced observability (Distributed tracing, APM)

Time to enterprise-ready: 2-3 months

---

## Next Steps

1. **Read CONCEPT.md** (sections 1-5) - Understand fundamentals
2. **Complete WORKSHOP.md** Part 1 - Build first pipeline
3. **Set up your platform** - GitHub Actions, GitLab CI, or Jenkins
4. **Read RUNBOOK.md** - Production procedures
5. **Implement security** - CONCEPT.md section 7
6. **Deploy to production** - WORKSHOP.md Part 4
7. **Monitor & optimize** - CONCEPT.md section 8-9

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Level**: Beginner to Intermediate
