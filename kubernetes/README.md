# Kubernetes: Container Orchestration & Operations

Welcome to the Kubernetes section of the runbooks. This guide covers Kubernetes architecture, deployment strategies, service discovery, configuration management, and scaling best practices.

---

## 🚀 Quick Start

### Choose Your Learning Path

- **5-minute overview**: [What is Kubernetes?](./CONCEPT.md#1-what-is-kubernetes)
- **30-minute deep dive**: Sections 1-5 in [CONCEPT.md](./CONCEPT.md)
- **90-minute hands-on lab**: [WORKSHOP.md](./WORKSHOP.md) with local cluster

---

## 📚 Learning Paths

### **Beginner**: Kubernetes Fundamentals (45 min)

1. **[CONCEPT.md § 1](./CONCEPT.md#1-what-is-kubernetes)** — Why Kubernetes matters
2. **[CONCEPT.md § 2](./CONCEPT.md#2-kubernetes-architecture)** — Architecture overview (master, nodes)
3. **[CONCEPT.md § 3.1-3.3](./CONCEPT.md#3-core-kubernetes-concepts)** — Pods, ReplicaSets, Deployments
4. **[CONCEPT.md § 4](./CONCEPT.md#4-services-and-service-discovery)** — Services and discovery
5. **[CONCEPT.md § 5](./CONCEPT.md#5-ingress-external-access)** — Ingress for external access

### **Intermediate**: Operations & Configuration (75 min)

1. **[CONCEPT.md § 6](./CONCEPT.md#6-configmaps-and-configuration)** — ConfigMaps for configuration
2. **[CONCEPT.md § 7](./CONCEPT.md#7-secrets-sensitive-data-management)** — Secrets for sensitive data
3. **[CONCEPT.md § 8](./CONCEPT.md#8-scaling-and-autoscaling)** — Manual and automatic scaling (HPA)
4. **[CONCEPT.md § 9](./CONCEPT.md#9-deployment-strategies)** — Rolling, blue-green, canary updates
5. **[CONCEPT.md § 10](./CONCEPT.md#10-namespaces-isolation-and-multi-tenancy)** — Namespaces and isolation

### **Advanced**: Hands-On Lab (120 min)

**[WORKSHOP.md](./WORKSHOP.md)** — Complete practical assessment covering:
- Cluster setup (minikube or k3d)
- Deployment creation and management
- Service discovery and ingress
- ConfigMap and Secret configuration
- HPA autoscaling
- Rolling updates and rollbacks

---

## 🎯 Quick Reference

### Core Kubernetes Objects

| Object | Purpose | Typical Use |
|---|---|---|
| **Pod** | Smallest unit (1+ containers) | Never created alone |
| **Deployment** | Manages pods, enables updates | Most common for apps |
| **ReplicaSet** | Maintains replica count | Created by Deployment |
| **Service** | Exposes pods (internal/external) | Service discovery, load balancing |
| **Ingress** | HTTP/HTTPS routing | External access, host-based routing |
| **ConfigMap** | Non-sensitive config | App configuration, feature flags |
| **Secret** | Sensitive data (base64) | Passwords, API keys, tokens |
| **Namespace** | Virtual cluster | Multi-tenancy, isolation |
| **HPA** | Auto-scaling | Automatic pod scaling on metrics |

### Deployment Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| **Running** | Pod executing normally | ✅ Healthy |
| **Pending** | Waiting for resources | ⏳ Wait or add capacity |
| **CrashLoopBackOff** | Container keeps crashing | 🔧 Check logs, fix code |
| **ImagePullBackOff** | Can't pull container image | 🔧 Check image name, registry access |
| **Terminating** | Pod being shut down | ⏳ Wait or force delete |
| **Failed** | Pod exited with error | 🔧 Check logs for error |

### Service Types

| Type | Access | Use Case |
|------|--------|----------|
| **ClusterIP** | Internal only | Default, microservices |
| **NodePort** | Node IP + port | Dev/testing, on-prem |
| **LoadBalancer** | Cloud LB IP | Production, cloud |
| **ExternalName** | CNAME redirect | External services, databases |

### kubectl Common Commands

```bash
# Deploy
kubectl apply -f deployment.yaml              # Apply manifest
kubectl create deployment app --image=app:v1  # Quick deployment

# Query
kubectl get deployments,pods,services         # List resources
kubectl get pods -l app=myapp                 # Filter by label
kubectl describe pod <pod-name>               # Detailed info

# Debug
kubectl logs deployment/myapp                 # Application logs
kubectl exec -it pod-name -- /bin/bash        # Shell into pod
kubectl port-forward svc/myapp 8080:80        # Port forward

# Scale
kubectl scale deployment myapp --replicas=5   # Manual scale
kubectl autoscale deployment myapp --min=2 --max=10 --cpu-percent=70  # HPA

# Update
kubectl set image deployment/app app=app:v2   # Update image
kubectl rollout status deployment/app         # Monitor rollout
kubectl rollout undo deployment/app           # Rollback

# Configuration
kubectl create configmap config --from-literal=KEY=VALUE
kubectl create secret generic creds --from-literal=password=secret
```

### Recommended Labels

```yaml
metadata:
  labels:
    app.kubernetes.io/name: myapp           # Application name
    app.kubernetes.io/instance: myapp-prod  # Unique instance name
    app.kubernetes.io/version: "1.0"        # Semantic version
    app.kubernetes.io/component: api        # Component: api, database, cache
    app.kubernetes.io/part-of: platform     # Larger system
```

### Pod Lifecycle & Health Checks

```yaml
# Startup Probe: Is app ready to serve requests?
startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30      # 30 * 10s = 300s max startup time
  periodSeconds: 10

# Liveness Probe: Is container still alive?
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30   # Wait 30s before first check
  periodSeconds: 10         # Check every 10s
  timeoutSeconds: 5         # Timeout after 5s
  failureThreshold: 3       # Restart after 3 failures

# Readiness Probe: Can container receive traffic?
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5    # Check after 5s
  periodSeconds: 5          # Check every 5s
```

---

## 📖 File Guide

### CONCEPT.md (~1,600 lines, 12 Sections)

**Comprehensive Kubernetes theory** covering:
- [§1] What is Kubernetes (capabilities, why it matters)
- [§2] Architecture (master, worker nodes, components)
- [§3] Core concepts (Pods, ReplicaSets, Deployments, Labels)
- [§4] Services (ClusterIP, NodePort, LoadBalancer, ExternalName)
- [§5] Ingress (routing, SSL/TLS, host-based routing)
- [§6] ConfigMaps (key-value config, volume mounts)
- [§7] Secrets (passwords, API keys, best practices)
- [§8] Scaling (HPA, metrics, behavior policies)
- [§9] Deployment strategies (rolling, blue-green, canary)
- [§10] Namespaces (isolation, network policies)
- [§11] Best practices (resources, health checks, labels)
- [§12] kubectl commands (common operations)

**Diagrams included**:
- Kubernetes architecture (master/nodes)
- Pod lifecycle
- Deployment flow
- Service networking
- Storage architecture

### WORKSHOP.md (~850 lines, 7 Parts)

**Practical hands-on lab** (120 min total):
- Part 1: Prerequisites & environment setup (15 min)
- Part 2: Deployment creation (30 min)
- Part 3: Service discovery & Ingress (30 min)
- Part 4: ConfigMap configuration (20 min)
- Part 5: Secrets management (20 min)
- Part 6: Scaling & upgrades (25 min)
- Part 7: Validation & cleanup (10 min)

**Key features**:
- Complete YAML examples
- Step-by-step instructions
- Expected outputs for validation
- Troubleshooting for common issues
- Best practices included

### README.md (This file)

Navigation hub with learning paths, quick reference, and FAQ.

---

## 🔍 Common Questions

### Q: What's the difference between Pod and Deployment?

**Pod**: Smallest unit, contains 1+ containers (like Docker container)
- Created directly: rarely used in production
- Ephemeral (deleted when node fails, not rescheduled)
- Good for: testing, init containers

**Deployment**: Manages Pods (like Docker Compose for single machine)
- Creates ReplicaSet, which creates Pods
- Persistent (respawns failed pods)
- Rolling updates, health checks, auto-scaling
- Good for: production workloads

```
Deployment
    ↓
  ReplicaSet (manages pod count)
    ↓
  Pods (actual containers)
    ↓
  Containers (app running)
```

---

### Q: How do Services discover Pods?

**Answer**: Labels + Selectors

```yaml
# Service selector
selector:
  app: myapp        # Match pods with label app=myapp

# Pod labels
labels:
  app: myapp        # This pod is selected by service
  version: v1

# Result:
# Service gets ClusterIP: 10.0.0.5
# All requests to 10.0.0.5:80 go to pods with label app=myapp
```

---

### Q: What's the difference between ConfigMap and Secret?

| Aspect | ConfigMap | Secret |
|--------|-----------|--------|
| **Data Type** | Non-sensitive config | Sensitive credentials |
| **Encoding** | Plain text | Base64 (not encrypted by default) |
| **Size Limit** | 1 MB | 1 MB |
| **Visibility** | Anyone can read | RBAC restricted |
| **Use Cases** | App settings, feature flags | Passwords, API keys, tokens |
| **Encryption** | No | Optional (at-rest encryption) |

```bash
# ConfigMap: Safe to commit to git
kubectl create configmap app-settings --from-literal=DEBUG=true

# Secret: Never commit to git
kubectl create secret generic db-creds --from-literal=password=secret
echo "secret.yaml" >> .gitignore
```

---

### Q: How do I update an application without downtime?

**Answer**: Deployment rolling update

```bash
# Update image version
kubectl set image deployment/myapp myapp=myapp:v2

# Kubernetes automatically:
# 1. Creates new ReplicaSet with v2
# 2. Starts new pods (v2)
# 3. Terminates old pods (v1)
# 4. Maintains constant pod count
# → Zero downtime!

# Monitor progress
kubectl rollout status deployment/myapp

# If issue, rollback instantly
kubectl rollout undo deployment/myapp
```

---

### Q: How does HPA (Horizontal Pod Autoscaler) work?

```
1. Metrics collector gathers CPU/memory every 30 seconds
2. HPA controller calculates:
   desired_replicas = current_replicas × (actual_metric / target_metric)

Example:
  Current: 3 pods
  CPU usage: 90%
  Target: 70%
  
  Desired = 3 × (90 / 70) = 3.86 ≈ 4 pods
  
  Action: Scale from 3 to 4 pods

3. Deployment creates 1 new pod

4. Traffic decreases, metrics drop below 70%

5. HPA scales down (conservatively): 4 → 3 pods
```

---

### Q: Can I run databases in Kubernetes?

**Answer**: Yes, but use StatefulSet instead of Deployment

```yaml
# Deployment: Good for stateless apps
# - No persistent storage
# - Pods can be replaced

# StatefulSet: Good for stateful apps (databases)
# - Persistent volumes
# - Stable pod names (mysql-0, mysql-1, mysql-2)
# - Ordered scaling (start mysql-0 first)

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  replicas: 3
  serviceName: mysql
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

---

### Q: How do I restrict what pods can access?

**Answer**: Network policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: production

spec:
  podSelector: {}  # Applies to all pods
  
  policyTypes:
  - Ingress
  
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: production
    # Only pods in production namespace can access
```

---

## 📋 Next Steps

### Immediate (Today)
- [ ] Complete [WORKSHOP.md](./WORKSHOP.md) practical lab
- [ ] Deploy application to local cluster
- [ ] Test rolling update and rollback

### This Week
- [ ] Set up minikube or k3d locally
- [ ] Deploy your own application
- [ ] Configure ConfigMaps and Secrets
- [ ] Test HPA autoscaling

### This Month
- [ ] Deploy to production cluster (dev/staging first)
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure ingress controller
- [ ] Implement network policies

### This Quarter
- [ ] Set up CI/CD pipeline (GitLab CI, GitHub Actions)
- [ ] Implement RBAC and security policies
- [ ] Create Helm charts for app packaging
- [ ] Set up multi-cluster setup (if needed)

---

## 🛠️ Tools & Resources

### Local Development
- **Minikube**: Single-node Kubernetes on your machine
- **k3d**: Fast multi-node Kubernetes in Docker
- **kind**: Kubernetes in Docker (great for testing)
- **Docker Desktop**: Includes Kubernetes (1 node)

### Cluster Management
- **kubectl**: Command-line tool (essential)
- **Helm**: Kubernetes package manager
- **Kustomize**: Template customization
- **kubectl-plugins**: Tools to extend kubectl

### Monitoring & Logging
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **ELK Stack**: Elasticsearch, Logstash, Kibana (logging)
- **Jaeger**: Distributed tracing

### Security & RBAC
- **Falco**: Runtime security monitoring
- **Trivy**: Vulnerability scanning
- **Kyverno**: Kubernetes policy engine
- **OPA/Gatekeeper**: Policy as code

### Official Resources
- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Kubernetes API Reference](https://kubernetes.io/docs/reference/kubernetes-api/)
- [CNCF Kubernetes Training](https://www.cncf.io/training/)
- [Kubernetes The Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way)

---

## ✅ Do's and ❌ Don'ts

### ✅ DO:

- ✅ Always set resource requests/limits
- ✅ Use health checks (liveness + readiness)
- ✅ Set container restart policies
- ✅ Use namespaces for isolation
- ✅ Apply RBAC for access control
- ✅ Monitor pod metrics
- ✅ Use Deployments (not Pods)
- ✅ Version your container images

### ❌ DON'T:

- ❌ Run containers as root
- ❌ Use latest image tag
- ❌ Store secrets in ConfigMaps
- ❌ Create Pods directly
- ❌ Disable security policies
- ❌ Run untrusted images
- ❌ Ignore pod evictions
- ❌ Store state in containers

---

## 🔑 Key Principles

1. **Declarative > Imperative**: Use YAML manifests, not kubectl commands
2. **Labels > Naming**: Use labels for organization, not pod names
3. **Services > IPs**: Use DNS names, not pod IPs
4. **Replicate > Single**: Always run multiple replicas for HA
5. **Resources > Limits**: Always set requests and limits
6. **Namespaces > Clusters**: Use namespaces for isolation before multi-cluster
7. **ReadinessProbe > Startup Time**: Ensure ready before routing traffic

---

## 📊 Architecture Patterns

### Pattern 1: Microservices with Service Mesh

```
┌──────────────┐     ┌──────────────┐
│  API Gateway │────→│ API Service  │
│  (Ingress)   │     └──────────────┘
└──────────────┘
       │
       ├──→ ┌──────────────┐
       │    │ Order Service│
       │    └──────────────┘
       │
       └──→ ┌──────────────┐
            │ Payment Svc  │
            └──────────────┘

Service Mesh handles:
- Inter-service routing
- Retry logic
- Rate limiting
- Security policies
```

### Pattern 2: Multi-Environment Namespaces

```
Kubernetes Cluster
├── dev namespace (non-prod code)
├── staging namespace (pre-prod testing)
├── prod namespace (production apps)
└── monitoring namespace (observability tools)

Network Policies: Namespace isolation
RBAC: Different permissions per namespace
```

---

## 🆘 Troubleshooting Quick Links

- [Pod won't start](./CONCEPT.md#3-core-kubernetes-concepts)
- [Service discovery issues](./CONCEPT.md#4-services-and-service-discovery)
- [Ingress not working](./CONCEPT.md#5-ingress-external-access)
- [Scaling issues](./CONCEPT.md#8-scaling-and-autoscaling)
- [Update failures](./CONCEPT.md#9-deployment-strategies)

---

**Last Updated**: January 2026

Questions or feedback? Check [CONTRIBUTING.md](../CONTRIBUTING.md) for how to contribute.
