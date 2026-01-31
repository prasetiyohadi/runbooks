# Kubernetes Operations & Infrastructure Runbook

## 1. Overview

This runbook covers production operational procedures for managing Kubernetes clusters and infrastructure components, including cluster setup, ingress controller deployment, certificate management, secrets management, logging, and troubleshooting.

**Scope**: Multi-cloud Kubernetes (GKE, AKS), ingress controllers, cert-manager, external-secrets, logging stack
**Target Audience**: Infra engineers, platform engineers, SREs, cluster administrators
**Prerequisite**: CONCEPT.md (architecture, core concepts)

---

## 2. Kubernetes Cluster Setup & Initialization

### 2.1 GKE Cluster Creation

**Production Cluster Standards**:
- High availability control plane (across multiple zones)
- Multiple node pools for workload isolation
- Network policy enabled
- Private cluster with authorized networks
- Workload Identity enabled (for secure pod authentication)

```bash
# Create GKE cluster (production-grade)
gcloud container clusters create prod-cluster \
  --zone=us-central1 \
  --num-nodes=3 \
  --machine-type=n2-standard-4 \
  --enable-ip-alias \
  --network=prod-network \
  --subnetwork=prod-subnet \
  --enable-private-nodes \
  --enable-private-endpoint \
  --master-ipv4-cidr=172.16.0.0/28 \
  --enable-workload-identity \
  --addons=HttpLoadBalancing,HorizontalPodAutoscaling \
  --workload-pool=<PROJECT_ID>.svc.id.goog \
  --enable-network-policy \
  --enable-vertical-pod-autoscaling \
  --enable-stackdriver-kubernetes \
  --project=<PROJECT_ID>

# Create additional node pools
gcloud container node-pools create app-pool \
  --cluster=prod-cluster \
  --zone=us-central1 \
  --machine-type=n2-standard-8 \
  --num-nodes=5 \
  --node-labels=workload=app \
  --project=<PROJECT_ID>

gcloud container node-pools create batch-pool \
  --cluster=prod-cluster \
  --zone=us-central1 \
  --machine-type=n2-highmem-16 \
  --num-nodes=2 \
  --preemptible \
  --node-labels=workload=batch \
  --project=<PROJECT_ID>

# Get cluster credentials
gcloud container clusters get-credentials prod-cluster \
  --zone=us-central1 \
  --project=<PROJECT_ID>

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

### 2.2 AKS Cluster Creation

**Production Cluster Standards**:
- Multi-zone availability
- Multiple node pools
- Pod security policy enforced
- Azure CNI networking
- Managed identities enabled

```bash
# Create resource group
az group create \
  --name prod-k8s-rg \
  --location eastus

# Create AKS cluster
az aks create \
  --resource-group prod-k8s-rg \
  --name prod-cluster \
  --node-count 3 \
  --vm-set-type VirtualMachineScaleSets \
  --load-balancer-sku standard \
  --enable-managed-identity \
  --network-plugin azure \
  --vnet-subnet-id /subscriptions/<SUB>/resourceGroups/<RG>/providers/Microsoft.Network/virtualNetworks/<VNET>/subnets/<SUBNET> \
  --docker-bridge-address 172.17.0.1/16 \
  --service-cidr 10.0.0.0/16 \
  --dns-service-ip 10.0.0.10 \
  --enable-pod-security-policy \
  --enable-workload-identity-oidc

# Create additional node pool
az aks nodepool add \
  --resource-group prod-k8s-rg \
  --cluster-name prod-cluster \
  --name batch-pool \
  --node-count 2 \
  --vm-set-type VirtualMachineScaleSets \
  --node-vm-size Standard_D16s_v3 \
  --priority Spot

# Get cluster credentials
az aks get-credentials \
  --resource-group prod-k8s-rg \
  --name prod-cluster

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

### 2.3 Post-Cluster Setup

```bash
# Create core namespaces
kubectl create namespace foundation
kubectl create namespace logging
kubectl create namespace ingress-nginx
kubectl create namespace cert-manager
kubectl create namespace external-secrets

# Label namespaces
kubectl label namespace foundation istio-injection=enabled
kubectl label namespace logging monitoring=enabled

# Create RBAC for cluster admins
kubectl create clusterrolebinding cluster-admin-binding \
  --clusterrole=cluster-admin \
  --user=<ADMIN_EMAIL>

# Enable metrics-server (for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## 3. Ingress Controller Deployment

### 3.1 Cloud-Agnostic (ingress-nginx) Setup

**When to use**: Multi-cloud requirement, maximum flexibility, custom routing logic

```bash
# Add helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install ingress-nginx (public controller)
helm install nginx-public ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.service.type=LoadBalancer \
  --set controller.service.externalTrafficPolicy=Local \
  --set controller.resources.requests.cpu=250m \
  --set controller.resources.requests.memory=512Mi \
  --set controller.resources.limits.cpu=1000m \
  --set controller.resources.limits.memory=1Gi \
  --set controller.ingressClass=nginx-public \
  --set controller.podSecurityPolicy.enabled=true

# Install ingress-nginx (internal controller)
helm install nginx-internal ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.service.type=ClusterIP \
  --set controller.service.loadBalancerSourceRanges="10.0.0.0/8\,172.16.0.0/12\,192.168.0.0/16" \
  --set controller.resources.requests.cpu=250m \
  --set controller.resources.requests.memory=512Mi \
  --set controller.ingressClass=nginx-internal

# Verify deployment
kubectl get deployment -n ingress-nginx
kubectl get svc -n ingress-nginx

# Expected output (LoadBalancer service with external IP):
# nginx-public-ingress-nginx-controller    LoadBalancer   10.0.1.5     34.127.xxx.xxx   80:30450/TCP,443:30976/TCP
```

### 3.2 Cloud-Native (GCP GKE Ingress) Setup

**When to use**: GCP-only, automatic provisioning, Global HTTP(S) Load Balancer

```bash
# Enable GKE ingress controller (default in GKE)
gcloud container clusters update prod-cluster \
  --enable-http-load-balancing \
  --zone=us-central1

# Create backend service (required for cloud ingress)
kubectl create service backend-config default

# Configure health check
cat > backend-config.yaml << EOF
apiVersion: compute.cnpg.io/v1
kind: BackendConfig
metadata:
  name: default
spec:
  healthChecks:
  - port: 8080
    type: HTTP
    requestPath: /health
EOF

kubectl apply -f backend-config.yaml

# Create GKE ingress resource
cat > gke-ingress.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prod-ingress-gke
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "prod-global-ip"
    networking.gke.io/managed-certificates: "prod-cert"
    kubernetes.io/ingress.allow-http: "true"
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
EOF

kubectl apply -f gke-ingress.yaml
```

### 3.3 Azure Application Gateway Setup

```bash
# Install Application Gateway Ingress Controller (AGIC)
helm repo add application-gateway-kubernetes-ingress https://appgwicionn.blob.core.windows.net/helm/
helm repo update

helm install agic application-gateway-kubernetes-ingress/ingress-azure \
  --namespace ingress-azure \
  --set appgw.subscriptionId=<SUBSCRIPTION_ID> \
  --set appgw.resourceGroup=<RESOURCE_GROUP> \
  --set appgw.name=prod-appgw \
  --set armAuth.type=aadPodIdentity \
  --set armAuth.identityResourceID=/subscriptions/<SUB>/resourcegroups/<RG>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/agic-identity \
  --set armAuth.identityClientID=<CLIENT_ID>

# Create Ingress resource for AGIC
cat > agic-ingress.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prod-ingress-agic
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
EOF

kubectl apply -f agic-ingress.yaml
```

---

## 4. Certificate Management (cert-manager)

### 4.1 cert-manager Installation

```bash
# Add Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Create namespace
kubectl create namespace cert-manager

# Install CRDs
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.crds.yaml

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --set installCRDs=false \
  --set global.leaderElection.namespace=cert-manager \
  --set serviceAccount.create=true

# Verify installation
kubectl get pods -n cert-manager
kubectl get crd | grep cert
```

### 4.2 Let's Encrypt ACME Issuer (DNS-01)

**GCP Setup with Cloud DNS**:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    
    # Account key stored in secret
    privateKeySecretRef:
      name: letsencrypt-prod
    
    # DNS-01 challenge using Cloud DNS
    solvers:
    - dns01:
        cloudDNS:
          project: <PROJECT_ID>
          serviceSecretRef:
            name: clouddns-dns01-solver-sa
            key: key.json
```

**Azure Setup with Azure DNS**:

```yaml
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
        azureDNS:
          subscriptionID: <SUBSCRIPTION_ID>
          tenantID: <TENANT_ID>
          resourceGroupName: <RESOURCE_GROUP>
          hostedZoneName: example.com
          
          # Using managed identity (preferred)
          managedIdentity:
            clientID: <CLIENT_ID>
```

**Apply issuer**:

```bash
kubectl apply -f letsencrypt-issuer.yaml

# Verify issuer
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-prod
```

### 4.3 Certificate Creation via Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx-public
  
  tls:
  - hosts:
    - api.example.com
    - app.example.com
    secretName: api-tls-cert  # Cert stored in this secret
  
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
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
```

**Monitor certificate creation**:

```bash
# Watch certificate status
kubectl get certificate -A -w

# Check certificate details
kubectl describe certificate api-tls-cert -n default

# Check ACME challenges
kubectl get challenges -A

# Debug challenge
kubectl describe challenge api-tls-cert-xxxx -n default
```

### 4.4 Certificate Renewal & Monitoring

```bash
# Check certificate expiry
kubectl get secret api-tls-cert -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout | grep -A 2 "Not After"

# Manual certificate renewal
kubectl annotate certificate api-tls-cert cert-manager.io/issue-temporary-certificate="true" --overwrite

# Monitor cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager -f
kubectl logs -n cert-manager deployment/cert-manager-webhook -f
```

---

## 5. Secrets Management (external-secrets)

### 5.1 External Secrets Installation

```bash
# Add Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install external-secrets
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace \
  --set installCRDs=true

# Verify installation
kubectl get pods -n external-secrets-system
kubectl get crd | grep external-secrets
```

### 5.2 Vault Integration (Kubernetes Auth)

**Setup Vault Role**:

```hcl
# In Vault (Terraform or API)
resource "vault_kubernetes_auth_backend_role" "external_secrets" {
  backend                          = vault_auth_backend.kubernetes.path
  role_name                        = "external-secrets-reader"
  bound_service_account_names      = ["external-secrets"]
  bound_service_account_namespaces = ["service-namespace"]
  token_ttl                        = 3600
  token_policies                   = ["external-secrets-policy"]
}
```

**Create Kubernetes Service Account**:

```bash
# In each namespace using external secrets
kubectl create serviceaccount external-secrets -n service-namespace

# Grant token reviewer permission (cluster-wide, once)
kubectl create clusterrolebinding vault-token-reviewer \
  --clusterrole=system:auth-delegator \
  --serviceaccount=service-namespace:external-secrets
```

**Create SecretStore**:

```yaml
apiVersion: external-secrets.io/v1alpha1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: service-namespace
spec:
  provider:
    vault:
      server: https://vault.example.com:8200
      path: kubernetes
      
      auth:
        kubernetes:
          mountPath: kubernetes
          role: external-secrets-reader
          serviceAccountRef:
            name: external-secrets
```

**Create ExternalSecret**:

```yaml
apiVersion: external-secrets.io/v1alpha1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: service-namespace
spec:
  refreshInterval: 1h
  
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  
  target:
    name: app-secrets
    creationPolicy: Owner
    template:
      type: Opaque
      data:
        username: "{{ .vault_username }}"
        password: "{{ .vault_password }}"
  
  data:
  - secretKey: vault_username
    remoteRef:
      key: secret/data/app/credentials
      property: username
  
  - secretKey: vault_password
    remoteRef:
      key: secret/data/app/credentials
      property: password
```

**Deploy secrets**:

```bash
kubectl apply -f secret-store.yaml
kubectl apply -f external-secret.yaml

# Monitor secret sync
kubectl get externalsecret -n service-namespace -w
kubectl describe externalsecret app-secrets -n service-namespace
kubectl logs -n external-secrets-system deployment/external-secrets -f
```

### 5.3 Azure KeyVault Integration

```yaml
apiVersion: external-secrets.io/v1alpha1
kind: SecretStore
metadata:
  name: azure-keyvault-backend
  namespace: service-namespace
spec:
  provider:
    azurekv:
      vaultURL: https://vault-name.vault.azure.net
      auth:
        workloadIdentity:
          serviceAccountRef:
            name: external-secrets
```

---

## 6. Logging Architecture Setup

### 6.1 Filebeat Daemonset Deployment

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: logging
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: log
      enabled: true
      paths:
        - /var/log/pods/*/*/*.log
      
      # Parse container logs
      processors:
        - add_kubernetes_metadata:
            in_cluster: true
        - add_docker_metadata:
    
    output.elasticsearch:
      hosts: ["elasticsearch.logging:9200"]
      index: "logs-%{+yyyy.MM.dd}"

---

apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: logging
spec:
  selector:
    matchLabels:
      app: filebeat
  
  template:
    metadata:
      labels:
        app: filebeat
    
    spec:
      serviceAccountName: filebeat
      hostNetwork: true
      
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:8.0.0
        
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
        
        - name: varlogpods
          mountPath: /var/log/pods
          readOnly: true
        
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      
      volumes:
      - name: config
        configMap:
          name: filebeat-config
      
      - name: varlogpods
        hostPath:
          path: /var/log/pods
      
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      
      terminationGracePeriodSeconds: 30
```

**Deploy filebeat**:

```bash
# Create RBAC for filebeat
kubectl create serviceaccount filebeat -n logging
kubectl create clusterrolebinding filebeat \
  --clusterrole=view \
  --serviceaccount=logging:filebeat

# Create configmap and daemonset
kubectl apply -f filebeat-config.yaml
kubectl apply -f filebeat-daemonset.yaml

# Verify pods running on all nodes
kubectl get pods -n logging -o wide | grep filebeat

# Check logs
kubectl logs -n logging -l app=filebeat --tail=50
```

### 6.2 Elasticsearch Stack Setup

```bash
# Add Helm repository
helm repo add elastic https://helm.elastic.co
helm repo update

# Install Elasticsearch
helm install elasticsearch elastic/elasticsearch \
  --namespace logging \
  --set replicas=3 \
  --set resources.requests.memory="2Gi" \
  --set resources.requests.cpu="500m"

# Install Kibana
helm install kibana elastic/kibana \
  --namespace logging \
  --set elasticsearchHosts=http://elasticsearch:9200 \
  --set service.type=LoadBalancer

# Verify stack
kubectl get pods -n logging
kubectl get svc -n logging
```

---

## 7. Workload Identity & Pod Authentication

### 7.1 GCP Workload Identity Setup

```bash
# Create service account
kubectl create serviceaccount app-sa -n app-namespace

# Create GCP service account
gcloud iam service-accounts create app-ksa \
  --display-name="Kubernetes Service Account for App"

# Bind workload identity
gcloud iam service-accounts add-iam-policy-binding app-ksa@<PROJECT_ID>.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:<PROJECT_ID>.svc.id.goog[app-namespace/app-sa]"

# Annotate Kubernetes service account
kubectl annotate serviceaccount app-sa \
  -n app-namespace \
  iam.gke.io/gcp-service-account=app-ksa@<PROJECT_ID>.iam.gserviceaccount.com
```

### 7.2 Azure Workload Identity Setup

```bash
# Create Azure identity
az identity create \
  --resource-group <RG> \
  --name app-identity

# Create federated credential
az identity federated-credential create \
  --name kubernetes-federated \
  --identity-name app-identity \
  --resource-group <RG> \
  --issuer https://<OIDC_URL> \
  --subject system:serviceaccount:app-namespace:app-sa

# Create Kubernetes service account and annotate
kubectl create serviceaccount app-sa -n app-namespace

kubectl annotate serviceaccount app-sa \
  -n app-namespace \
  azure.workload.identity/client-id=<CLIENT_ID>
```

---

## 8. Pod Security & RBAC

### 8.1 Pod Security Policies

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  
  requiredDropCapabilities:
  - ALL
  
  allowedCapabilities: []
  
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
  
  hostNetwork: false
  hostIPC: false
  hostPID: false
  
  runAsUser:
    rule: 'MustRunAsNonRoot'
  
  seLinux:
    rule: 'MustRunAs'
    seLinuxOptions:
      level: "s0:c123,c456"
  
  fsGroup:
    rule: 'MustRunAs'
    ranges:
      - min: 1
        max: 65535
  
  readOnlyRootFilesystem: false
```

### 8.2 Network Policies

**Deny All Ingress** (default deny):

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

**Allow Specific Traffic**:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  
  policyTypes:
  - Ingress
  
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: production
      podSelector:
        matchLabels:
          app: frontend
    
    ports:
    - protocol: TCP
      port: 8080
```

---

## 9. Deployment & Scaling Operations

### 9.1 Deployment Rollout

```bash
# Create deployment
kubectl apply -f deployment.yaml

# Check rollout status
kubectl rollout status deployment/app-deploy

# View rollout history
kubectl rollout history deployment/app-deploy

# Update image (rolling update)
kubectl set image deployment/app-deploy app=app:v2.0 --record

# Monitor update
kubectl get pods -w

# Rollback if needed
kubectl rollout undo deployment/app-deploy
kubectl rollout undo deployment/app-deploy --to-revision=2
```

### 9.2 Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app-deploy
  
  minReplicas: 2
  maxReplicas: 20
  
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
```

**Deploy and monitor**:

```bash
kubectl apply -f hpa.yaml

# Monitor HPA
kubectl get hpa -w
kubectl describe hpa app-hpa

# View metrics
kubectl top pods
kubectl top nodes
```

---

## 10. Troubleshooting & Debugging

### 10.1 Pod Diagnostics

```bash
# Check pod status
kubectl describe pod <POD_NAME> -n <NAMESPACE>

# View pod logs
kubectl logs <POD_NAME> -n <NAMESPACE>
kubectl logs <POD_NAME> -n <NAMESPACE> --previous  # Crashed container

# Stream logs (follow)
kubectl logs <POD_NAME> -n <NAMESPACE> -f

# Execute command in pod
kubectl exec -it <POD_NAME> -n <NAMESPACE> -- /bin/bash
kubectl exec -it <POD_NAME> -n <NAMESPACE> -- curl http://localhost:8080/health

# Port forward for local debugging
kubectl port-forward pod/<POD_NAME> 8080:8080 -n <NAMESPACE>
# Then: curl localhost:8080
```

### 10.2 Deployment Issues

```bash
# Check deployment status
kubectl rollout status deployment/<DEPLOY_NAME> -n <NAMESPACE>

# View deployment events
kubectl describe deployment <DEPLOY_NAME> -n <NAMESPACE>

# Check if replicas match desired
kubectl get deployment <DEPLOY_NAME> -n <NAMESPACE> -o wide

# Troubleshoot failed deployment
kubectl rollout history deployment/<DEPLOY_NAME>
kubectl rollout undo deployment/<DEPLOY_NAME>

# View recent events
kubectl get events -n <NAMESPACE> --sort-by='.lastTimestamp'
```

### 10.3 Network Connectivity

```bash
# Test DNS resolution
kubectl exec -it <POD> -n <NS> -- nslookup kubernetes.default
kubectl exec -it <POD> -n <NS> -- nslookup <SERVICE_NAME>

# Test connectivity to service
kubectl exec -it <POD> -n <NS> -- nc -zv <SERVICE_NAME> <PORT>

# Check service endpoints
kubectl get endpoints <SERVICE_NAME> -n <NAMESPACE>

# View network policies
kubectl get networkpolicy -n <NAMESPACE>
kubectl describe networkpolicy <NP_NAME> -n <NAMESPACE>
```

### 10.4 Resource Issues

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n <NAMESPACE>
kubectl top pods --all-namespaces

# Check resource quotas
kubectl get resourcequota -n <NAMESPACE>
kubectl describe resourcequota <QUOTA_NAME> -n <NAMESPACE>

# Check for resource requests/limits
kubectl describe node <NODE_NAME>
```

---

## 11. Monitoring & Observability

### 11.1 Metrics Collection (Prometheus)

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

### 11.2 Key Metrics to Monitor

```bash
# Cluster health
kubectl get --raw /metrics | grep kube_node_status_condition

# Pod metrics
kubectl get --raw /metrics | grep kube_pod_container_status_restarts_total

# Node capacity
kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, cpu: .status.allocatable.cpu, memory: .status.allocatable.memory}'

# Persistent volume usage
kubectl get pvc -A
```

---

## 12. Backup & Disaster Recovery

### 12.1 Velero Backup Setup

```bash
# Install Velero
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm repo update

helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.backupStorageLocation.bucket=<BUCKET> \
  --set configuration.backupStorageLocation.provider=aws \
  --set configuration.schedules.daily.schedule="0 2 * * *" \
  --set configuration.schedules.daily.template.ttl="720h"

# Create backup
kubectl exec -n velero deployment/velero -- velero backup create manual-backup --wait

# Restore from backup
kubectl exec -n velero deployment/velero -- velero restore create --from-backup manual-backup
```

---

## 13. Validation Checklist

### Pre-Production

- [ ] Cluster created with HA control plane
- [ ] Multiple node pools configured
- [ ] Network policies enforced
- [ ] Workload identity configured
- [ ] Ingress controller deployed and tested
- [ ] Cert-manager installed and issuer configured
- [ ] External-secrets syncing from vault
- [ ] Logging daemonset running on all nodes
- [ ] RBAC and PSP enforced
- [ ] HPA tested with load
- [ ] Backup/restore procedure tested

### Post-Deployment

```bash
# Daily health check
kubectl get nodes
kubectl get pods -A | grep -v Running
kubectl top nodes
kubectl top pods -A

# Weekly verification
kubectl get events -A --sort-by='.lastTimestamp' | tail -20
kubectl describe certificates -A | grep -E "Status|Not After"
```

---

## 14. Incident Response

### Certificate Expiry Alert

```bash
# Find expiring certificates
kubectl get certificate -A -o json | jq '.items[] | select(.status.renewalTime < now) | .metadata'

# Manual renewal
kubectl annotate certificate <CERT_NAME> cert-manager.io/issue-temporary-certificate="true" --overwrite -n <NS>
```

### Ingress Errors

```bash
# Check ingress status
kubectl describe ingress <INGRESS_NAME> -n <NS>

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller -f

# Verify backend service
kubectl get svc <SERVICE_NAME> -n <NS>
kubectl get endpoints <SERVICE_NAME> -n <NS>
```

---

**Last Updated**: January 2026
**Maintained by**: Platform Engineering Team
**Version**: 1.0.0

