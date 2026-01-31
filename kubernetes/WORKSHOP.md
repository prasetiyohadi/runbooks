# Kubernetes Workshop: Hands-On Practical Assessment

## Overview

This workshop provides hands-on exercises covering Kubernetes deployment, service discovery, configuration, security, and scaling. Estimated time: 120 minutes.

**Outcomes**: After completing this workshop, you will be able to:
- ✅ Deploy applications using Deployments and ReplicaSets
- ✅ Expose applications with Services and Ingress
- ✅ Configure applications with ConfigMaps and Secrets
- ✅ Scale applications manually and with HPA
- ✅ Update applications with zero downtime
- ✅ Troubleshoot common Kubernetes issues

---

## Part 1: Prerequisites & Environment Setup (15 min)

### Task 1.1: Install Required Tools

```bash
# Check kubectl installation
kubectl version --client
# Expected: Client Version: v1.25+ (or higher)

# Check Docker installation
docker --version
# Expected: Docker version 20.10+

# Check minikube or k3d
minikube version
# OR
k3d version
```

### Task 1.2: Create Local Kubernetes Cluster

**Option A: Minikube** (recommended for learning)

```bash
# Start minikube
minikube start --driver=docker

# Enable ingress addon
minikube addons enable ingress

# Verify cluster
kubectl cluster-info
kubectl get nodes
# Expected: minikube node in Ready state
```

**Option B: k3d** (faster alternative)

```bash
# Create cluster with ingress port exposed
k3d cluster create k3s-cluster \
  --servers 1 \
  --agents 2 \
  --port 80:80@loadbalancer \
  --port 443:443@loadbalancer

# Verify cluster
kubectl cluster-info
kubectl get nodes
# Expected: k3d-k3s-cluster-server-0, k3d-k3s-cluster-agent-0, etc.
```

### Task 1.3: Verify Cluster Status

```bash
# Check node status
kubectl get nodes -o wide
# Expected output:
# NAME             STATUS   ROLES                  AGE
# minikube         Ready    control-plane,master   2m

# Check default namespace
kubectl get namespaces
# Expected: default, kube-system, kube-node-lease, kube-public

# Check if ingress controller is running
kubectl get pods -n ingress-nginx
# Expected: ingress-nginx-controller pod in Running state
```

---

## Part 2: Packaging & Deploying Applications (30 min)

### Task 2.1: Create Deployment YAML

Create `deployment.yaml` with the following content:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echoserver-deploy
  namespace: default
  labels:
    app: echoserver
    version: v1
    owner: your-team

spec:
  replicas: 2
  
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  
  selector:
    matchLabels:
      app: echoserver
  
  template:
    metadata:
      labels:
        app: echoserver
        instance: echoserver-prod
        service: http
        tribe: platform
        squad: backend
      annotations:
        description: "Echo server for testing HTTP requests"
    
    spec:
      containers:
      - name: echoserver
        image: docker.io/ealen/echo-server:0.7.0
        imagePullPolicy: IfNotPresent
        
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        
        env:
        - name: PORT
          value: "8080"
        
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
        
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

### Task 2.2: Apply Deployment

```bash
# Apply deployment to cluster
kubectl apply -f deployment.yaml

# Verify deployment created
kubectl get deployments
# Expected output:
# NAME                     READY   UP-TO-DATE   AVAILABLE   AGE
# echoserver-deploy        2/2     2            2           5s

# Check replica set created
kubectl get replicasets
# Expected: echoserver-deploy-<hash> with 2 replicas

# Check pods running
kubectl get pods -l app=echoserver
# Expected output:
# NAME                                      READY   STATUS    RESTARTS   AGE
# echoserver-deploy-abc123def456-abcde      1/1     Running   0          5s
# echoserver-deploy-abc123def456-fghij      1/1     Running   0          5s

# View pod details
kubectl describe pod <pod-name>
# Expected: Image: docker.io/ealen/echo-server:0.7.0, Running state
```

### Task 2.3: Test Pod Access

```bash
# Get pod name
POD_NAME=$(kubectl get pods -l app=echoserver -o jsonpath='{.items[0].metadata.name}')

# Exec into pod
kubectl exec -it $POD_NAME -- /bin/sh

# Inside pod, check service running
ps aux | grep echo-server
# Expected: echo-server process running

# Exit pod
exit
```

### Task 2.4: Commit & Review

```bash
# Create GitLab/GitHub repository
git init
git add deployment.yaml
git commit -m "feat: add echoserver deployment with 2 replicas

- Deploy docker.io/ealen/echo-server:0.7.0
- Configure health checks (liveness and readiness)
- Set resource requests/limits
- Add recommended labels (app, instance, service, tribe, squad)
- Rolling update strategy with zero downtime"

git push origin main
```

---

## Part 3: Service Discovery & Ingress (30 min)

### Task 3.1: Create ClusterIP Service

Create `service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: echoserver-service
  namespace: default
  labels:
    app: echoserver

spec:
  type: ClusterIP
  selector:
    app: echoserver
  
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
```

### Task 3.2: Apply Service

```bash
# Apply service
kubectl apply -f service.yaml

# Verify service created
kubectl get services
# Expected output:
# NAME                  TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
# echoserver-service    ClusterIP   10.96.12.34     <none>        80/TCP

# Get service details
kubectl describe service echoserver-service
# Expected: Endpoints showing pod IPs, port 80->8080

# Test service via port-forward
kubectl port-forward svc/echoserver-service 8080:80

# In another terminal, test service
curl -s http://localhost:8080 | jq .
# Expected: Echo server response with request details
```

### Task 3.3: Create Ingress

Create `ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: echoserver-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /

spec:
  ingressClassName: nginx
  
  rules:
  - host: echoserver.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: echoserver-service
            port:
              number: 80
```

### Task 3.4: Apply Ingress

```bash
# Apply ingress
kubectl apply -f ingress.yaml

# Verify ingress created
kubectl get ingress
# Expected output:
# NAME                 CLASS   HOSTS                ADDRESS   PORTS   AGE
# echoserver-ingress   nginx   echoserver.local     localhost 80      5s

# Get ingress details
kubectl describe ingress echoserver-ingress
# Expected: Rules showing echoserver.local -> echoserver-service:80

# Wait for ingress controller to assign IP (30 seconds)
kubectl get ingress -w
```

### Task 3.5: Test Ingress

```bash
# Get ingress IP/host
INGRESS_IP=$(kubectl get ingress echoserver-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# For minikube, get minikube IP
MINIKUBE_IP=$(minikube ip)

# Add to /etc/hosts (requires sudo)
sudo bash -c "echo '$MINIKUBE_IP echoserver.local' >> /etc/hosts"

# Test ingress access
curl -H "Host: echoserver.local" http://localhost/
# Expected: Echo server response

# Or directly (if ingress has IP)
curl http://echoserver.local/
# Expected: Echo server response showing request info
```

### Task 3.6: Verify Service Discovery

```bash
# Deploy busybox pod for testing
kubectl run busybox --image=busybox:1.28 --restart=Never -- sleep 3600

# Get shell on busybox
kubectl exec -it busybox -- /bin/sh

# Inside busybox pod:
# Test internal service DNS
wget -O- http://echoserver-service/
# Expected: Connection successful

# Test with full DNS name
wget -O- http://echoserver-service.default.svc.cluster.local/
# Expected: Same response

exit
```

### Task 3.7: Commit Service & Ingress

```bash
git add service.yaml ingress.yaml
git commit -m "feat: add service and ingress for echoserver

- ClusterIP service for internal discovery
- Ingress controller for external HTTP access
- Health checks via service endpoints"

git push origin main
```

---

## Part 4: Configuration Management (20 min)

### Task 4.1: Create ConfigMap

Create `configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: echoserver-config
  namespace: default

data:
  # Simple key-value pairs
  LOG_LEVEL: info
  ENVIRONMENT: production
  DEBUG_MODE: "false"
  
  # Configuration file
  app.config: |
    server:
      port: 8080
      timeout: 30s
      max_connections: 100
    
    logging:
      level: info
      format: json
```

### Task 4.2: Apply ConfigMap

```bash
# Apply configmap
kubectl apply -f configmap.yaml

# Verify configmap created
kubectl get configmaps
# Expected: echoserver-config listed

# View configmap contents
kubectl describe configmap echoserver-config
# Expected: Data section showing all keys and values

# Get configmap as JSON
kubectl get configmap echoserver-config -o json
```

### Task 4.3: Update Deployment to Use ConfigMap

Update `deployment.yaml` to include ConfigMap:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echoserver-deploy
  namespace: default
  labels:
    app: echoserver
    version: v1

spec:
  replicas: 2
  
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  
  selector:
    matchLabels:
      app: echoserver
  
  template:
    metadata:
      labels:
        app: echoserver
        instance: echoserver-prod
        service: http
        tribe: platform
        squad: backend
      annotations:
        config.version: "v1"

    spec:
      containers:
      - name: echoserver
        image: docker.io/ealen/echo-server:0.7.0
        imagePullPolicy: IfNotPresent
        
        ports:
        - containerPort: 8080
          name: http
        
        # Add ConfigMap as environment variables
        envFrom:
        - configMapRef:
            name: echoserver-config
        
        # Add ConfigMap as volume
        volumeMounts:
        - name: config-volume
          mountPath: /etc/config
          readOnly: true
        
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
        
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      
      volumes:
      - name: config-volume
        configMap:
          name: echoserver-config
```

### Task 4.4: Apply Updated Deployment

```bash
# Apply updated deployment
kubectl apply -f deployment.yaml

# Watch rollout
kubectl rollout status deployment/echoserver-deploy
# Expected: deployment "echoserver-deploy" successfully rolled out

# Verify pods restarted (check AGE)
kubectl get pods -l app=echoserver
# Expected: Newer AGE than before

# Verify ConfigMap mounted in pod
POD_NAME=$(kubectl get pods -l app=echoserver -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD_NAME -- env | grep LOG_LEVEL
# Expected: LOG_LEVEL=info

# Check mounted config file
kubectl exec -it $POD_NAME -- cat /etc/config/app.config
# Expected: File contents displayed
```

### Task 4.5: Update ConfigMap (Observe Rolling Update)

```bash
# Update configmap
kubectl patch configmap echoserver-config -p '{"data":{"LOG_LEVEL":"debug"}}'

# Note: Deployment does NOT automatically restart pods
# To trigger restart, update deployment annotation:
kubectl patch deployment echoserver-deploy -p '{"spec":{"template":{"metadata":{"annotations":{"config.update":"2024-01-28"}}}}}'

# Watch pods restart
kubectl get pods -w

# Verify new config value
POD_NAME=$(kubectl get pods -l app=echoserver -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD_NAME -- env | grep LOG_LEVEL
# Expected: LOG_LEVEL=debug
```

### Task 4.6: Commit ConfigMap Changes

```bash
git add configmap.yaml deployment.yaml
git commit -m "feat: add configmap and mount in deployment

- Create ConfigMap with app configuration
- Mount ConfigMap as environment variables
- Mount ConfigMap as volume at /etc/config
- Update deployment to reference ConfigMap"

git push origin main
```

---

## Part 5: Secrets & Security (20 min)

### Task 5.1: Create Secret

Create `secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: echoserver-secrets
  namespace: default
type: Opaque

data:
  # base64 encoded values
  # echo -n "admin" | base64 → YWRtaW4=
  # echo -n "my-secret-password" | base64 → bXktc2VjcmV0LXBhc3N3b3Jk
  
  db_username: YWRtaW4=
  db_password: bXktc2VjcmV0LXBhc3N3b3Jk
  api_key: c2VjcmV0LWFwaS1rZXktMTIzNDU2
```

### Task 5.2: Apply Secret

```bash
# Apply secret
kubectl apply -f secret.yaml

# Verify secret created
kubectl get secrets
# Expected: echoserver-secrets listed

# View secret (base64 encoded)
kubectl describe secret echoserver-secrets
# Expected: Data section showing keys (values hidden)

# Decode secret (don't do this in production!)
kubectl get secret echoserver-secrets -o jsonpath='{.data.db_password}' | base64 -d
# Expected: my-secret-password
```

### Task 5.3: Update Deployment to Use Secret

Update `deployment.yaml` to include Secret:

```yaml
spec:
  template:
    spec:
      containers:
      - name: echoserver
        image: docker.io/ealen/echo-server:0.7.0
        
        ports:
        - containerPort: 8080
        
        # ConfigMap env vars
        envFrom:
        - configMapRef:
            name: echoserver-config
        
        # Secret env vars
        env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: echoserver-secrets
              key: db_username
        
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: echoserver-secrets
              key: db_password
        
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: echoserver-secrets
              key: api_key
        
        # Secret as volume mount
        volumeMounts:
        - name: secret-volume
          mountPath: /etc/secrets
          readOnly: true
        
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
        
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      
      volumes:
      - name: config-volume
        configMap:
          name: echoserver-config
      
      - name: secret-volume
        secret:
          secretName: echoserver-secrets
```

### Task 5.4: Apply Updated Deployment with Secrets

```bash
# Apply deployment with secrets
kubectl apply -f deployment.yaml

# Watch rollout
kubectl rollout status deployment/echoserver-deploy

# Verify secret is accessible (DON'T log secrets in production!)
POD_NAME=$(kubectl get pods -l app=echoserver -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD_NAME -- env | grep DB_
# Expected: DB_USERNAME=admin, DB_PASSWORD=my-secret-password (don't do this in prod!)

# Check secret volume
kubectl exec -it $POD_NAME -- ls -la /etc/secrets/
# Expected: db_password, db_username, api_key files

# Best practice: Never log secrets
kubectl logs $POD_NAME | grep -i password
# Expected: (nothing, secrets not in logs)
```

### Task 5.5: Best Practices

```yaml
⚠️ DO NOT:
- Log secrets to stdout/stderr
- Store secrets in YAML in git
- Use plaintext secrets
- Give unnecessary secret access

✅ DO:
- Use secret management systems (Vault, AWS Secrets Manager)
- Encrypt secrets at rest in etcd
- Limit RBAC access to secrets
- Rotate secrets regularly
- Mount secrets as files, not env vars (when possible)
```

### Task 5.6: Commit Secrets Changes

```bash
# Add to .gitignore (never commit real secrets!)
echo "secret.yaml" >> .gitignore

git add deployment.yaml .gitignore
git commit -m "feat: add secrets for database credentials and API keys

- Create Secret with db_username, db_password, api_key
- Mount Secret as environment variables in pods
- Mount Secret as volume at /etc/secrets
- Add best practices for secret management

Note: secret.yaml not committed to git (sensitive data)"

git push origin main
```

---

## Part 6: Scaling & Upgrades (25 min)

### Task 6.1: Manual Horizontal Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment echoserver-deploy --replicas=5

# Watch pods scale up
kubectl get pods -l app=echoserver -w
# Expected: 5 pods running after 30-60 seconds

# Verify 5 replicas
kubectl get deployment echoserver-deploy
# Expected: READY: 5/5

# Scale down to 2
kubectl scale deployment echoserver-deploy --replicas=2

# Watch pods scale down
kubectl get pods -l app=echoserver
# Expected: 2 pods running
```

### Task 6.2: Create Horizontal Pod Autoscaler (HPA)

Create `hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: echoserver-hpa
  namespace: default

spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: echoserver-deploy
  
  minReplicas: 2
  maxReplicas: 10
  
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Task 6.3: Apply HPA

```bash
# Apply HPA
kubectl apply -f hpa.yaml

# Verify HPA created
kubectl get hpa
# Expected: echoserver-hpa listed

# Watch HPA status
kubectl get hpa -w
# Expected: Metrics showing current vs target utilization

# Check HPA details
kubectl describe hpa echoserver-hpa
# Expected: Conditions and scaling events
```

### Task 6.4: Application Upgrade (Rolling Update)

```bash
# Update image to new version
kubectl set image deployment/echoserver-deploy \
  echoserver=docker.io/ealen/echo-server:0.8.0

# Watch rolling update
kubectl rollout status deployment/echoserver-deploy -w
# Expected: "deployment "echoserver-deploy" successfully rolled out"

# Check rollout history
kubectl rollout history deployment/echoserver-deploy
# Expected: 2 revisions (v1 and v2)

# View details of each revision
kubectl rollout history deployment/echoserver-deploy --revision=1
kubectl rollout history deployment/echoserver-deploy --revision=2
```

### Task 6.5: Rollback if Issues

```bash
# If new version has issues, rollback instantly
kubectl rollout undo deployment/echoserver-deploy

# Watch rollback
kubectl rollout status deployment/echoserver-deploy -w
# Expected: Rolls back to v0.7.0

# Verify previous version running
kubectl get deployment echoserver-deploy -o jsonpath='{.spec.template.spec.containers[0].image}'
# Expected: docker.io/ealen/echo-server:0.7.0

# Rollback to specific revision
kubectl rollout undo deployment/echoserver-deploy --to-revision=1
```

### Task 6.6: Commit Scaling & Upgrade Changes

```bash
git add hpa.yaml
git commit -m "feat: add horizontal pod autoscaler

- Scale between 2-10 replicas
- Scale based on CPU (70%) and memory (80%)
- Gradual scale-up (100% increase, 15s period)
- Conservative scale-down (50% decrease, 60s period)"

git push origin main
```

---

## Part 7: Validation & Cleanup (10 min)

### Task 7.1: Validation Checklist

- [ ] Deployment created with 2+ replicas
- [ ] Deployment shows READY status
- [ ] Pods running with liveness/readiness probes
- [ ] Service created and discovered internally
- [ ] Ingress created and accessible externally
- [ ] ConfigMap mounted as env vars and volume
- [ ] Secret mounted as env vars and volume
- [ ] Pods scaled to 5 replicas
- [ ] HPA created and monitoring metrics
- [ ] Rolling update performed successfully
- [ ] Rollback tested and works
- [ ] All YAML files committed to git

### Task 7.2: Final Verification

```bash
# Summary of all resources
kubectl get deployments,services,ingress,configmaps,secrets,hpa

# Pod status and resource usage
kubectl top pods -l app=echoserver

# Recent events
kubectl get events --sort-by='.lastTimestamp' | tail -20

# Cleanup test resources
kubectl delete pod busybox
```

### Task 7.3: Documentation

Update README.md in your repository:

```markdown
# Echoserver Kubernetes Deployment

## Overview
Deployment of echo-server application with production-grade Kubernetes configuration.

## Architecture
- 2-10 replicas (HPA scaling)
- ClusterIP service for internal discovery
- Nginx ingress for external access
- ConfigMap for non-sensitive configuration
- Secret for sensitive credentials

## Quick Start
```bash
# Apply all resources
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Test access
kubectl port-forward svc/echoserver-service 8080:80
curl http://localhost:8080
```

## Monitoring
```bash
# Check pod status
kubectl get pods -l app=echoserver

# View logs
kubectl logs deployment/echoserver-deploy

# Monitor HPA
kubectl get hpa -w
```

## Troubleshooting
```bash
# Check events
kubectl describe deployment echoserver-deploy

# Check resource usage
kubectl top pods

# Debug pod
kubectl exec -it <pod-name> -- /bin/sh
```
```

### Task 7.4: Cleanup (Optional)

```bash
# Delete all resources
kubectl delete deployment echoserver-deploy
kubectl delete service echoserver-service
kubectl delete ingress echoserver-ingress
kubectl delete configmap echoserver-config
kubectl delete secret echoserver-secrets
kubectl delete hpa echoserver-hpa

# Stop cluster
minikube stop
# OR
k3d cluster delete k3s-cluster
```

---

## Key Learnings

### Kubernetes Objects Hierarchy
```
Deployment
  ↓
ReplicaSet (automatically created)
  ↓
Pods (automatically created)
  ↓
Containers (from image)
```

### Service Discovery
```
Pod A → Service DNS name (echoserver-service)
         ↓
       Service (ClusterIP 10.0.0.5)
         ↓
       Load balance to available pods
         ↓
Pod B, Pod C, Pod D
```

### Rolling Update Process
```
kubectl set image deployment/app app=image:v2
↓
Creates new ReplicaSet with v2
↓
Gradually terminates old pods
Gradually starts new pods
↓
Old ReplicaSet: 0 replicas
New ReplicaSet: 3 replicas
↓
Rollback available: kubectl rollout undo
```

---

## Common Issues & Solutions

### Issue: Pod stuck in Pending
```bash
# Check node resources
kubectl describe nodes

# Check pod events
kubectl describe pod <pod-name>

# Solution: May need more nodes or reduce resource requests
kubectl scale deployment <name> --replicas=1
```

### Issue: Service can't reach pods
```bash
# Check service selectors match pod labels
kubectl get pods --show-labels
kubectl get service -o jsonpath='{.spec.selector}'

# Check endpoints
kubectl get endpoints <service-name>
# Expected: At least one IP listed
```

### Issue: Ingress not accessible
```bash
# Check ingress controller running
kubectl get pods -n ingress-nginx

# Check ingress status
kubectl get ingress
# Expected: IP or hostname in ADDRESS column

# Check DNS resolution
kubectl run -it debug --image=busybox --restart=Never -- nslookup echoserver.local
```

---

**Last Updated**: January 2026

**Next Steps**: After completing this workshop, explore advanced topics:
- StatefulSets for databases
- DaemonSets for monitoring agents
- Jobs and CronJobs for batch processing
- Network policies for security
- RBAC for access control
- Helm for package management
