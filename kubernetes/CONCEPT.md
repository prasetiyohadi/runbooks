# Kubernetes: Architecture, Deployment & Operations

## Table of Contents

### Part 1: Core Concepts (Beginner)
- [What is Kubernetes?](#what-is-kubernetes)
- [Kubernetes Architecture](#kubernetes-architecture)
- [Core Concepts](#core-kubernetes-concepts)
- [Services & Service Discovery](#services-and-service-discovery)
- [Ingress & External Access](#ingress-external-access)
- [ConfigMaps](#configmaps-and-configuration)
- [Secrets](#secrets-sensitive-data-management)
- [Scaling & Autoscaling](#scaling-and-autoscaling)
- [Deployment Strategies](#deployment-strategies)
- [Namespaces](#namespaces-isolation-and-multi-tenancy)
- [Best Practices](#best-practices-summary)
- [Common kubectl Commands](#common-kubectl-commands)

### Part 2: Foundation Services (Infrastructure Engineers)
- [Ingress Controllers](#ingress-controllers)
- [Certificate Management](#certificate-management-with-cert-manager)
- [External Secrets](#external-secrets-management)
- [External DNS](#external-dns)
- [Logging Architecture](#logging-architecture)

---

## Overview

This document provides a comprehensive guide to Kubernetes fundamentals for engineers, covering container orchestration, application deployment, service discovery, configuration management, and scaling strategies.

**For infrastructure engineers**: See [Part 2: Foundation Services](#part-2-foundation-services-infrastructure-engineers) for cluster setup topics.

**Core Topics**:
- Kubernetes architecture and components
- Container packaging and pod management
- Service discovery and ingress networking
- Configuration and secrets management
- Application upgrades and scaling

---

# PART 1: CORE CONCEPTS (BEGINNER)

## 1. What is Kubernetes?

**Definition**: Kubernetes is an open-source container orchestration platform that automates containerized application deployment, scaling, and management.

### Key Capabilities

| Capability | Purpose | Benefit |
|---|---|---|
| **Deployment** | Package apps in containers | Consistency across environments |
| **Scheduling** | Place pods on appropriate nodes | Resource optimization |
| **Auto-healing** | Restart failed pods | High availability |
| **Self-healing** | Reschedule pods from failed nodes | Fault tolerance |
| **Load balancing** | Distribute traffic | Scalability |
| **Rolling updates** | Zero-downtime deployments | Continuous delivery |
| **Storage orchestration** | Mount persistent volumes | Stateful applications |

### Why Kubernetes?

**Manual container management:**
```
❌ Manual restarts needed
❌ Manual load balancing
❌ Manual rolling updates
❌ Manual scaling
❌ Manual failover
```

**With Kubernetes:**
```
✅ Auto-healing (restart failed pods)
✅ Auto load balancing
✅ Zero-downtime upgrades
✅ Automatic scaling
✅ Self-failover
```

---

## 2. Kubernetes Architecture

### Control Plane Components

The control plane makes decisions about the cluster and responds to cluster events.

| Component | Role | Responsibility |
|-----------|------|---|
| **API Server** | Central hub | Processes REST API requests, validates objects |
| **etcd** | Database | Stores all cluster data persistently |
| **Scheduler** | Placement | Assigns pods to nodes based on constraints |
| **Controller Manager** | Automation | Runs controller processes (deployment, replicaset, etc.) |
| **Cloud Controller Manager** | Cloud integration | Manages cloud provider resources |

**HA Deployment**: Replicated across 3-5 master nodes for high availability.

### Worker Node Components

Worker nodes run containerized applications.

| Component | Role | Responsibility |
|-----------|------|---|
| **kubelet** | Agent | Ensures containers run in pods, reports status |
| **Container Runtime** | Execution | Pulls images, runs containers (Docker, containerd) |
| **kube-proxy** | Networking | Maintains network rules, load balancing |

---

## 3. Core Kubernetes Concepts

### 3.1 Pods

**Definition**: Smallest deployable unit in Kubernetes, containing one or more containers that share network and storage.

**Single-Container Pod** (typical):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
```

**Multi-Container Pod** (init containers, sidecars):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: complex-pod
spec:
  # Init container (runs once at startup)
  initContainers:
  - name: init-db
    image: busybox:1.28
    command: ['sh', '-c', 'until nslookup db; do echo waiting; sleep 2; done']
  
  # Main container
  containers:
  - name: app
    image: app:v1
    ports:
    - containerPort: 8080
  
  # Sidecar container (log collector)
  - name: logging
    image: fluentd:v1.14
    volumeMounts:
    - name: app-logs
      mountPath: /logs
  
  volumes:
  - name: app-logs
    emptyDir: {}
```

**Pod Lifecycle**: `Pending → Running → Succeeded/Failed`

### 3.2 ReplicaSets

**Definition**: Maintains a stable set of replica pods running at any time.

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: nginx-rs
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
```

**What it does**:
- ✅ Maintains 3 running pods
- ✅ Restarts failed pods
- ✅ Replaces pods on failed nodes
- ❌ Cannot do rolling updates (use Deployments instead)

### 3.3 Deployments

**Definition**: Manages ReplicaSets and provides declarative updates for Pods.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Extra pod during update
      maxUnavailable: 0  # Never take down pods
  
  selector:
    matchLabels:
      app: nginx
  
  template:
    metadata:
      labels:
        app: nginx
        version: v1.21
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Rolling Update Flow**:
```
1. Update image: kubectl set image deployment/nginx nginx=nginx:1.22
2. New ReplicaSet created with v1.22
3. Pods gradually replaced (old removed, new added)
4. Rollback available if needed: kubectl rollout undo deployment/nginx
```

### 3.4 Labels and Selectors

**Definition**: Key-value pairs for identifying and grouping objects.

```yaml
metadata:
  labels:
    app: my-app
    version: v1.0
    tier: frontend
    env: production
    owner: platform-team
```

**Label Selectors**:
```bash
kubectl get pods -l app=my-app
kubectl get pods -l env=production,version=v1.0
kubectl get pods -l 'env in (prod,staging)'
```

**Recommended Labels**:
```yaml
labels:
  app.kubernetes.io/name: my-app
  app.kubernetes.io/instance: my-app-prod
  app.kubernetes.io/version: "1.0"
  app.kubernetes.io/component: database
  app.kubernetes.io/part-of: platform
  app.kubernetes.io/managed-by: helm
```

---

## 4. Services and Service Discovery

**Definition**: Abstract way to expose pods running on a set of Pods as a network service.

### Service Types

**ClusterIP** (default, internal only):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: ClusterIP
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 8080
```

**NodePort** (expose on node IP):
```yaml
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080  # 30000-32767
```

**LoadBalancer** (cloud provider LB):
```yaml
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 8080
```

**ExternalName** (CNAME to external service):
```yaml
spec:
  type: ExternalName
  externalName: rds.amazonaws.com
  ports:
  - port: 5432
```

### Service Discovery

```
Pod A → query DNS "nginx-service" → 10.0.0.5 (ClusterIP)
     → send request to 10.0.0.5:80
     → kube-proxy intercepts → load-balances to Pod B
     → Pod B responds through Service
```

---

## 5. Ingress: External Access

**Definition**: Manages external HTTP/HTTPS access to services.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
  
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 3000
  
  tls:
  - hosts:
    - api.example.com
    - app.example.com
    secretName: tls-certificate
```

**Request Flow**:
```
External Client
    ├─ api.example.com/api
    │  → Ingress Controller
    │  → API Service
    │  → API Pods
    │
    └─ app.example.com/
       → Ingress Controller
       → App Service
       → App Pods
```

---

## 6. ConfigMaps and Configuration

**Definition**: Store non-sensitive configuration data as key-value pairs.

**YAML ConfigMap**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.env: production
  log.level: info
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://backend;
      }
    }
  config.json: |
    {
      "database": {
        "host": "postgres",
        "port": 5432
      }
    }
```

**Using in Deployment** (as env vars):
```yaml
containers:
- name: app
  image: app:v1.0
  env:
  - name: DB_HOST
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: DB_HOST
  envFrom:
  - configMapRef:
      name: app-config
```

**Using as Volume**:
```yaml
containers:
- name: app
  volumeMounts:
  - name: config
    mountPath: /etc/config
volumes:
- name: config
  configMap:
    name: app-config
```

---

## 7. Secrets: Sensitive Data Management

**Definition**: Store sensitive data (passwords, tokens, API keys) with base64 encoding.

⚠️ **Warning**: Base64 encoded, NOT encrypted by default. Enable encryption at rest in etcd.

**Creating Secrets**:
```bash
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=secure-password-123
```

**YAML Secret**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  username: YWRtaW4=  # base64(admin)
  password: c2VjdXJlLXBhc3N3b3JkLTEyMw==
```

**Using in Deployment**:
```yaml
containers:
- name: app
  env:
  - name: DB_USERNAME
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: username
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: password
```

**Best Practices**:
- ✅ Use secret management system (Vault, AWS Secrets Manager)
- ✅ Enable encryption at rest
- ✅ Limit RBAC access to secrets
- ✅ Rotate secrets regularly
- ❌ DO NOT store secrets in version control
- ❌ DO NOT output secrets in logs

---

## 8. Scaling and Autoscaling

### Manual Scaling

```bash
kubectl scale deployment nginx-deploy --replicas=5
```

### Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deploy
  
  minReplicas: 2
  maxReplicas: 10
  
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale up when CPU > 70%
  
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**How it works**:
```
1. Metrics collector samples CPU/memory every 30s
2. HPA controller queries metrics
3. Calculates: desired = current * (metric / target)
4. Updates deployment replicas

Example: Current 3 pods, CPU 85%, target 70%
         Desired = 3 * (85/70) = 3.64 ≈ 4 pods
```

---

## 9. Deployment Strategies

### Rolling Update (Default)

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

**Progression**: Pods gradually replaced from v1.21 to v1.22.

**Advantages**: ✅ Zero downtime, ✅ Easy rollback, ✅ Gradual traffic shift

### Blue-Green Deployment

Two complete environments (Blue=old, Green=new), switch traffic instantly.

```yaml
# Blue (v1.21) - currently serving traffic
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-blue
spec:
  # ... config for v1.21

---

# Green (v1.22) - ready but not serving
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-green
spec:
  # ... config for v1.22

---

# Service routes to Blue initially
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
    version: blue  # Change to 'green' to switch traffic
```

**Advantages**: ✅ Instant rollback, ✅ Full testing before switch | **Disadvantage**: ❌ Double resource usage

### Canary Deployment

Route small percentage of traffic to new version.

```yaml
# Only 1 pod with new version (v1.22)
# Other 3 pods still running old version (v1.21)
# Service matches both → 1/4 = 25% traffic to canary
```

**Progression**: 25% → 50% → 75% → 100% traffic to new version over time.

---

## 10. Namespaces: Isolation and Multi-Tenancy

**Definition**: Virtual clusters within Kubernetes for resource isolation.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
```

**Using Namespaces**:
```bash
kubectl apply -f deployment.yaml -n production
kubectl get pods -n production
kubectl get namespaces
```

**Network Policy** (isolation):
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: production
spec:
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: production
```

---

## 11. Best Practices Summary

### Resource Management

```yaml
resources:
  requests:
    cpu: "100m"        # Minimum reserved
    memory: "128Mi"
  limits:
    cpu: "500m"        # Maximum allowed
    memory: "512Mi"
```

### Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Labels

```yaml
labels:
  app.kubernetes.io/name: my-app
  app.kubernetes.io/instance: my-app-prod
  app.kubernetes.io/version: "1.0"
  app.kubernetes.io/component: api
  team: platform
  env: production
```

---

## 12. Common kubectl Commands

```bash
# Deployments
kubectl create deployment nginx --image=nginx:1.21
kubectl apply -f deployment.yaml
kubectl get deployments
kubectl describe deployment nginx
kubectl edit deployment nginx
kubectl delete deployment nginx

# Pods
kubectl get pods -n default
kubectl get pods --all-namespaces
kubectl logs pod-name
kubectl exec -it pod-name -- /bin/bash
kubectl port-forward pod-name 8080:80

# Services
kubectl get services
kubectl create service clusterip nginx-svc --tcp=80:8080
kubectl expose deployment nginx --type=ClusterIP --port=80

# Scaling
kubectl scale deployment nginx --replicas=5
kubectl autoscale deployment nginx --min=2 --max=10 --cpu-percent=70

# Updates & Rollouts
kubectl set image deployment/nginx nginx=nginx:1.22
kubectl rollout status deployment/nginx
kubectl rollout history deployment/nginx
kubectl rollout undo deployment/nginx
kubectl rollout undo deployment/nginx --to-revision=2

# Configuration
kubectl create configmap app-config --from-literal=KEY=VALUE
kubectl create secret generic db-creds --from-literal=password=secret
kubectl get configmaps
kubectl get secrets

# Debugging
kubectl top nodes
kubectl top pods
kubectl describe node node-name
kubectl get events
```

---

## Key Takeaways

1. **Pods** are the smallest deployable unit
2. **Deployments** manage pods with rolling updates
3. **Services** expose pods for internal/external access
4. **Ingress** routes HTTP/HTTPS to services
5. **ConfigMaps** store non-sensitive configuration
6. **Secrets** store sensitive data (enable encryption at rest!)
7. **Namespaces** provide isolation
8. **HPA** automatically scales based on metrics
9. **Probes** ensure pod health (liveness, readiness)
10. **Labels** are crucial for organization

---

# PART 2: FOUNDATION SERVICES (INFRASTRUCTURE ENGINEERS)

## Ingress Controllers

> [!NOTE]
> This section covers cluster setup for foundation services. Prerequisites: Complete Part 1 first.

### Controller Types

**Cloud-Agnostic Ingress Controllers** (proxies inside Kubernetes):

| Controller | Proxy | Use Case |
|-----------|-------|----------|
| ingress-nginx | nginx | Most popular, many features |
| kong | kong | API gateway features |
| istio ingress | envoy | Service mesh integration |
| haproxy ingress | haproxy | Enterprise proxy |

**Benefits**:
- ✅ Simpler management (all in Kubernetes)
- ✅ Logs in Kubernetes (unified logging)
- ✅ Multiple replicas for high availability
- ❌ More hops in traffic path (slight latency)

**Cloud-Native Ingress Controllers** (cloud load balancer outside Kubernetes):

| Cloud | Controller | LB Type |
|-------|-----------|---------|
| GCP | ingress-gce | Google Cloud Load Balancer |
| AWS | aws-load-balancer-controller | AWS Application Load Balancer |
| Azure | application-gateway-kubernetes-ingress | Azure Application Gateway |

**Benefits**:
- ✅ Less hops (lower latency)
- ✅ Cloud LB handles scaling
- ✅ Native cloud integration
- ❌ More expensive
- ❌ More hops to configure

### Cloud-Agnostic Architecture

```
External Client
    ↓
Cloud TCP Load Balancer (port 80/443)
    ↓
Node Port (e.g., 32365) — NodePort Service
    ↓
Ingress-nginx Pod
    ↓
Service (ClusterIP)
    ↓
Application Pods
```

**Service Configuration**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-public-controller
  namespace: foundation
spec:
  type: LoadBalancer
  externalTrafficPolicy: local  # Optional: pass traffic to local node
  ports:
  - name: http
    port: 80
    targetPort: 80
    nodePort: 32365
  - name: https
    port: 443
    targetPort: 443
    nodePort: 31380
  selector:
    app.kubernetes.io/name: nginx-public
    app.kubernetes.io/instance: foundation
```

### Cloud-Native Architecture

```
External Client
    ↓
Cloud HTTP(S) Load Balancer (auto-provisioned by controller)
    ↓
Service (ClusterIP)
    ↓
Application Pods
```

### Why Migrate from Cloud-Native to Cloud-Agnostic?

**Reason**: Cloud-native controllers may not support traffic restrictions (e.g., limiting source IPs to only Imperva WAF).

**Migration**: GCLB (Google Cloud Load Balancer) → KLB (Kubernetes Load Balancer with ingress-nginx)

---

## Certificate Management with Cert-Manager

### TLS Basics

**What is TLS?**

1. **Encryption**: Traffic encrypted so only client/server can read it
2. **Authentication**: Verify you're accessing the real (not fake) website
3. **TLS Certificate**: RSA key pair + signature proving legitimacy

### Certificate Issuance

**Two Approaches**:

| Commercial CA | ACME Provider |
|---------------|---------------|
| DigiCert, GlobalSign, Namecheap | Let's Encrypt, ZeroSSL, Buypass |
| $100-300 per year | Free |
| Manual or limited automation | Fully automated |
| 1-3 years validity | 90 days (auto-renewal) |
| OV/EV verification available | DV (domain verification) only |

**ACME Providers Used in Enterprise**:
- Let's Encrypt (primary)
- GCP Public CA (secondary)
- ZeroSSL (alternative)

### ACME Challenge Types

**HTTP-01** (simple, limited):
```
1. ACME client requests cert via HTTP-01
2. Client creates file at http://<domain>/.well-known/acme-challenge/<TOKEN>
3. ACME provider validates file
4. ACME provider issues certificate

Pros: Simple, no DNS access needed
Cons: Doesn't work for wildcards, requires public web server
```

**DNS-01** (recommended):
```
1. ACME client requests cert via DNS-01
2. Client creates TXT record at _acme-challenge.<domain>
3. ACME provider queries DNS to validate
4. ACME provider issues certificate (supports wildcards)

Pros: Supports wildcards, works with private servers
Cons: Need DNS API access (mitigated with workload identity)
```

### Cert-Manager Workflow

```yaml
# Define which CA to use
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - dns01:
        cloudDNS:
          project: my-gcp-project

---

# Request certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-cert
spec:
  secretName: api-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
  - "*.api.example.com"
```

**Automatic renewal**: Cert-manager watches certificates and auto-renews before expiration.

### Checking HTTPS Certificates

```bash
# Using nmap
nmap -p 443 --script ssl-cert api.example.com

# Using openssl
openssl s_client -servername api.example.com -connect api.example.com:443 </dev/null 2>/dev/null | openssl x509 -text

# Using curl
curl -v https://api.example.com 2>&1 | grep "subject\|issuer\|valid"
```

**What to verify**:
- ✅ Certificate hostname matches requested domain (SAN)
- ✅ Certificate not expired
- ✅ Certificate signed by trusted CA

---

## External Secrets Management

**Definition**: Store secrets outside Kubernetes (e.g., HashiCorp Vault) and sync them into Kubernetes.

### Vault + Kubernetes Authentication

**Setup**:

1. Define Vault role
```hcl
resource "vault_kubernetes_auth_backend_role" "external_secrets" {
  backend                       = "kubernetes"
  role_name                     = "service-external-secrets"
  bound_service_account_names   = ["external-secrets"]
  bound_service_account_namespaces = ["service-foobar"]
  token_ttl                     = 3600
  token_policies                = ["default", "admin"]
}
```

2. Create Kubernetes service account
```bash
kubectl -n service-foobar create serviceaccount external-secrets
```

3. External-secrets controller authenticates
```
Service Account Token → Vault API
↓
Vault validates token via Kubernetes Token Reviewer
↓
Checks: SA name, SA namespace match Vault role
↓
Issues token if valid
```

### External Secrets Configuration

**SecretStore** (per namespace):
```yaml
apiVersion: external-secrets.io/v1alpha1
kind: SecretStore
metadata:
  name: vault-kubernetes-provider
  namespace: service-foobar
spec:
  provider:
    vault:
      server: https://vault.company-internal.com:8200
      path: kubernetes
      version: v2
      auth:
        kubernetes:
          mountPath: kubernetes
          role: service-foobar-external-secrets
          serviceAccountRef:
            name: external-secrets
```

**ExternalSecret** (request specific secret):
```yaml
apiVersion: external-secrets.io/v1alpha1
kind: ExternalSecret
metadata:
  name: datadog-secrets
  namespace: foundation
spec:
  dataFrom:
  - key: foundation/datadog  # Path in Vault
  secretStoreRef:
    kind: SecretStore
    name: vault-kubernetes-provider
  target:
    name: datadog-secrets    # K8s secret name
    template:
      type: Opaque
```

**Result**: External-secrets controller syncs Vault secret → Kubernetes secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: datadog-secrets
  namespace: foundation
type: Opaque
data:
  api-key: <REDACTED>
  app-key: <REDACTED>
  token: <REDACTED>
```

**Advantages**:
- ✅ Secrets never in Git
- ✅ Centralized secret management
- ✅ Automatic rotation
- ✅ Audit logging in Vault

---

## External DNS

**Definition**: Automatically create DNS records for Kubernetes services and ingresses.

**Without External DNS**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
spec:
  rules:
  - host: api.example.com
    # ❌ DNS record must be manually created in DNS provider
```

**With External DNS**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
spec:
  rules:
  - host: api.example.com
    # ✅ External DNS automatically creates DNS A record
    # pointing to Ingress IP
```

**How it works**:
```
1. User creates Ingress with hostname: api.example.com
2. External DNS controller watches for new Ingresses
3. Detects hostname: api.example.com
4. Queries Ingress IP (e.g., 10.224.0.104)
5. Creates DNS A record: api.example.com → 10.224.0.104
6. DNS propagates globally
7. Users can now access https://api.example.com
```

**No configuration needed** in Ingress manifest – External DNS detects automatically.

---

## Logging Architecture

### How Container Logs Flow

```
Application
    ↓ writes to stdout/stderr
Kubelet (node agent)
    ↓ captures logs
/var/log/pods/<namespace>_<pod>_<id>/<container>/
    ↓ read by filebeat/fluentd DaemonSet
Elasticsearch/OpenSearch
    ↓ indexed for search
OpenSearch Dashboard (Kibana)
    ↓ visualized by operators
```

### Filebeat/Fluentd DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: logging
spec:
  selector:
    matchLabels:
      beat.k8s.elastic.co/name: filebeat
  template:
    metadata:
      labels:
        beat.k8s.elastic.co/name: filebeat
    spec:
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:7.16.3
        volumeMounts:
        - name: varlogpods
          mountPath: /var/log/pods  # Read pod logs from node
      volumes:
      - name: varlogpods
        hostPath:
          path: /var/log/pods
```

**Key points**:
- ✅ Runs on every node (DaemonSet)
- ✅ Mounts node's `/var/log/pods` directory
- ✅ Reads logs from all containers on that node
- ✅ Ships logs to Elasticsearch/OpenSearch
- ✅ Logs searchable in OpenSearch Dashboard

### Best Practices

1. **Structured Logging** (JSON format)
```
❌ Bad: "Error occurred while processing"
✅ Good: {"level":"error", "msg":"processing failed", "request_id":"123"}
```

2. **Use Environment Variables**
```yaml
env:
- name: LOG_LEVEL
  value: "info"
- name: LOG_FORMAT
  value: "json"
```

3. **Don't Log Secrets**
```
❌ Bad: "Connecting to DB with password: secret123"
✅ Good: "Connecting to DB"
```

---

## Related Documentation

- **[WORKSHOP.md](WORKSHOP.md)**: Hands-on labs and practical exercises
- **[README.md](README.md)**: Quick reference, learning paths, FAQs
- **[RUNBOOK.md](RUNBOOK.md)**: Step-by-step operational procedures

## Key Takeaways

1. **Choose Ingress type based on needs**: Cloud-agnostic for control, cloud-native for simplicity
2. **Automate certificates with Cert-Manager**: Use ACME providers (Let's Encrypt)
3. **Store secrets outside Kubernetes**: Use Vault with External Secrets
4. **Automate DNS with External DNS**: No manual DNS record creation
5. **Centralize logging**: All container logs to OpenSearch for searchability
6. **Use Workload Identity**: Avoid storing API credentials in Kubernetes

---

**Last Updated**: January 2026
