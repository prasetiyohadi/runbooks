# Application Security Operations & Incident Response Runbook

## 1. Overview

This runbook covers production operational procedures for managing security infrastructure, enforcing access controls, responding to security incidents, and maintaining compliance posture.

**Scope**: PAM implementation, access control enforcement, vulnerability management, incident response, audit & compliance
**Target Audience**: Security engineers, DevOps engineers, SREs, platform engineers, incident responders
**Prerequisite**: CONCEPT.md (OWASP, PAM, security fundamentals)

---

## 2. Privilege Access Management (PAM) Implementation

### 2.1 SSH Access Control

**Enforce Bastion Host Architecture**:

```bash
# Configure SSH key-based access only (no passwords)
# /etc/ssh/sshd_config on all servers

PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
PermitRootLogin no               # Disable root SSH

# Require MFA for bastion hosts
Match User ubuntu
  AuthenticationMethods publickey,keyboard-interactive:pam

# Restart SSH service
systemctl reload sshd
```

**Bastion Host Setup**:

```bash
#!/bin/bash
# Deploy SSH bastion (jump host)

# 1. Create bastion security group (restricted)
gcloud compute security-policies create bastion-policy \
  --rules \
  rule-priority=1000,action=allow,expression="origin.ip in ['YOUR_OFFICE_IP']"

# 2. Create bastion instance
gcloud compute instances create bastion-host \
  --machine-type=e2-medium \
  --service-account=bastion-sa@PROJECT.iam.gserviceaccount.com \
  --scopes=cloud-platform \
  --tags=bastion

# 3. Configure ssh config locally
cat > ~/.ssh/config << EOF
Host *
    ProxyCommand ssh -q ubuntu@bastion-host nc -q0 %h 22
    StrictHostKeyChecking=accept-new

Host bastion-host
    HostName 34.xxx.xxx.xxx
    User ubuntu
    IdentityFile ~/.ssh/bastion_key
EOF

chmod 600 ~/.ssh/config

# 4. Connect via bastion
ssh app-server  # Automatically routes through bastion
```

### 2.2 MFA for Privileged Access

**Google Authenticator Setup** (Linux/SSH):

```bash
#!/bin/bash
# Install and configure MFA on bastion

# 1. Install Google Authenticator PAM module
sudo apt-get install libpam-google-authenticator

# 2. Configure for user
google-authenticator -t -d -w 3 -r 3 -R 30
# -t: Use TOTP (time-based) instead of HOTP
# -d: Disable QR code display (security)
# -w 3: Window of 3 for time drift
# -r 3: Recovery codes
# -R 30: Rate limit to 3 attempts per 30 seconds

# 3. Output includes:
# - Secret key (store in vault)
# - Recovery codes (backup)
# - QR code (scan with Authenticator app)

# 4. Enable PAM module
echo "auth required pam_google_authenticator.so nullok" | \
  sudo tee /etc/pam.d/ssh-mfa

# 5. Update sshd_config to use MFA
cat >> /etc/ssh/sshd_config << EOF
AuthenticationMethods publickey,keyboard-interactive:pam
PAMAuthentication yes
EOF

sudo systemctl reload sshd
```

**AWS MFA for CLI Access**:

```bash
#!/bin/bash
# Configure MFA for AWS CLI

# 1. Create virtual MFA device
aws iam create-virtual-mfa-device \
  --virtual-mfa-device-name "arn:aws:iam::ACCOUNT:mfa/username-mfa" \
  --outfile mfa-device.json

# 2. Associate with user
aws iam enable-mfa-device \
  --user-name username \
  --serial-number "arn:aws:iam::ACCOUNT:mfa/username-mfa" \
  --authentication-code1 123456 \
  --authentication-code2 654321

# 3. Assume role with MFA
function aws-profile-mfa() {
  local profile=$1
  local mfa_token=$2
  
  CREDENTIALS=$(aws sts assume-role \
    --role-arn arn:aws:iam::ACCOUNT:role/admin \
    --role-session-name mfa-session \
    --serial-number arn:aws:iam::ACCOUNT:mfa/username-mfa \
    --token-code $mfa_token \
    --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
    --output text)
  
  export AWS_ACCESS_KEY_ID=$(echo $CREDENTIALS | awk '{print $1}')
  export AWS_SECRET_ACCESS_KEY=$(echo $CREDENTIALS | awk '{print $2}')
  export AWS_SESSION_TOKEN=$(echo $CREDENTIALS | awk '{print $3}')
  
  echo "MFA session active for 1 hour"
}

# Usage
aws-profile-mfa production 123456
```

### 2.3 Just-in-Time (JIT) Access for Database Admin

**Using HashiCorp Vault**:

```bash
#!/bin/bash
# Temporary database credentials

# 1. Request temporary credentials
vault write -field=password database/creds/readonly
# Returns: password=TEMP_PASSWORD, username=temp_user_xxx

# 2. Use credentials (valid for 1 hour)
mysql -u $(vault read -field=username database/creds/readonly) \
      -p$(vault read -field=password database/creds/readonly) \
      -h prod-mysql.example.com

# 3. Credentials auto-revoked after TTL
# 4. Access logged in Vault audit trail

# Setup: Configure Vault database engine
vault write database/config/mysql \
  plugin_name=mysql-database-plugin \
  allowed_roles="readonly,admin" \
  connection_url="{{username}}:{{password}}@tcp(prod-mysql:3306)/" \
  username="vault_admin" \
  password="vault_password"

vault write database/roles/readonly \
  db_name=mysql \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; \
                        GRANT SELECT ON *.* TO '{{name}}'@'%';" \
  default_ttl="1h" \
  max_ttl="24h"
```

---

## 3. Web Application Firewall (WAF)

### 3.1 AWS WAF Rules (Common Attack Patterns)

```bash
#!/bin/bash
# Deploy WAF rules to CloudFront/ALB

# Create WAF WebACL
aws wafv2 create-web-acl \
  --name prod-waf \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --rules file://waf-rules.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=prod-waf

# waf-rules.json
cat > waf-rules.json << 'EOF'
[
  {
    "Name": "AWSManagedRulesCommonRuleSet",
    "Priority": 0,
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesCommonRuleSet",
        "ExcludedRules": [
          {"Name": "SizeRestrictions_BODY"},
          {"Name": "GenericRFI_BODY"}
        ]
      }
    },
    "OverrideAction": {"None": {}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "CommonRuleSetMetric"
    }
  },
  {
    "Name": "AWSManagedRulesKnownBadInputsRuleSet",
    "Priority": 1,
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesKnownBadInputsRuleSet"
      }
    },
    "OverrideAction": {"None": {}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "KnownBadInputsMetric"
    }
  },
  {
    "Name": "RateLimitRule",
    "Priority": 2,
    "Statement": {
      "RateBasedStatement": {
        "Limit": 2000,
        "AggregateKeyType": "IP"
      }
    },
    "Action": {"Block": {"CustomResponse": {"ResponseCode": 429}}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "RateLimitMetric"
    }
  },
  {
    "Name": "GeoBlockingRule",
    "Priority": 3,
    "Statement": {
      "GeoMatchStatement": {
        "CountryCodes": ["KP", "IR", "SY"]
      }
    },
    "Action": {"Block": {}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "GeoBlockMetric"
    }
  }
]
EOF
```

### 3.2 ModSecurity (Web Server WAF)

**Install on Nginx**:

```bash
# 1. Install ModSecurity v3 for Nginx
sudo apt-get install libnginx-mod-http-modsecurity

# 2. Configure ModSecurity
sudo cp /etc/nginx/modsecurity/modsecurity.conf-recommended \
     /etc/nginx/modsecurity/modsecurity.conf

# /etc/nginx/modsecurity/modsecurity.conf
SecRuleEngine On                              # Enable detection
SecDefaultAction "phase:2,log,deny,status:403"

# Load OWASP CRS rules
Include /usr/share/modsecurity-crs/crs-setup.conf
Include /usr/share/modsecurity-crs/rules/*.conf

# 3. Enable in Nginx
cat >> /etc/nginx/nginx.conf << EOF
http {
  modsecurity on;
  modsecurity_rules_file /etc/nginx/modsecurity/main.conf;
}
EOF

# 4. Test and reload
nginx -t
systemctl reload nginx
```

---

## 4. Secure Software Development

### 4.1 SAST (Static Application Security Testing)

**SonarQube Integration**:

```bash
#!/bin/bash
# Scan code for vulnerabilities before deployment

# 1. Install SonarQube Scanner
wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip
unzip sonar-scanner-cli-4.8.0.2856-linux.zip

# 2. Run scan
./sonar-scanner-4.8.0.2856-linux/bin/sonar-scanner \
  -Dsonar.projectKey=my-app \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://sonarqube:9000 \
  -Dsonar.login=$SONAR_TOKEN

# 3. Check results
curl "http://sonarqube:9000/api/qualitygates/project_status?projectKey=my-app" \
  | jq '.projectStatus.status'

# If status != OK, fail pipeline
if [ $(echo $RESULT | jq -r '.projectStatus.status') != "OK" ]; then
  echo "Quality gate failed"
  exit 1
fi
```

**Checkov for Infrastructure-as-Code**:

```bash
#!/bin/bash
# Scan Terraform/CloudFormation for security issues

pip install checkov

# Scan Terraform files
checkov -d ./terraform --framework terraform

# Scan CloudFormation
checkov -f template.yaml --framework cloudformation

# Example output:
# Passed checks: 45
# Failed checks: 3
# Skipped checks: 2

# Integration with CI/CD:
checkov -d ./terraform --soft-fail --json > scan-results.json

# Fail if critical violations
CRITICAL=$(jq '[.results.failed_checks[] | select(.check_id | contains("HIGH"))] | length' scan-results.json)
if [ $CRITICAL -gt 0 ]; then
  echo "Critical security violations found"
  exit 1
fi
```

### 4.2 DAST (Dynamic Application Security Testing)

**OWASP ZAP Scanning**:

```bash
#!/bin/bash
# Dynamic security testing against running application

# 1. Start ZAP in daemon mode
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://app:8080 \
  -r zap-report.html \
  -J zap-report.json

# 2. Parse results
jq '.site[] | select(.alerts[] | .riskcode > 1)' zap-report.json

# 3. CI/CD integration (fail on high risk)
RISKS=$(jq '[.site[0].alerts[] | select(.riskcode >= 3)] | length' zap-report.json)
if [ $RISKS -gt 0 ]; then
  echo "High-risk vulnerabilities detected in DAST"
  exit 1
fi
```

---

## 5. Audit Logging & Compliance

### 5.1 Centralized Audit Logging

**Configuration**:

```yaml
# Google Cloud Audit Logging
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all requests
- level: RequestResponse
  
# Don't log calls to certain resources
- level: None
  nonResourceURLs:
  - /metrics
  - /logs
  
# Log pod exec (sensitive)
- level: RequestResponse
  verbs: [create, delete]
  resources:
  - group: ""
    resources: [pods/exec, pods/log]
  
# Log RBAC changes
- level: RequestResponse
  verbs: [create, patch, delete]
  resources:
  - group: rbac.authorization.k8s.io
    resources: [roles, rolebindings, clusterroles, clusterrolebindings]
```

**Enable GCP Cloud Audit Logs**:

```bash
# Enable for all services
gcloud logging sinks create cloud-audit-sink \
  logging.googleapis.com/projects/YOUR_PROJECT/logs/cloudaudit.googleapis.com \
  --log-filter='logName:("cloudaudit.googleapis.com")' \
  --storage-bucket=gs://audit-logs-bucket

# Verify logs flowing
gcloud logging read "logName:cloudaudit.googleapis.com" --limit 10
```

### 5.2 Compliance Reporting

**Generate Compliance Reports**:

```bash
#!/bin/bash
# Monthly compliance report

echo "=== Monthly Security Compliance Report ===" > compliance-report.txt
echo "Date: $(date)" >> compliance-report.txt

# 1. Check RBAC
echo -e "\n[RBAC Audit]" >> compliance-report.txt
kubectl get rolebindings,clusterrolebindings -A --sort-by=.metadata.creationTimestamp >> compliance-report.txt

# 2. Check network policies
echo -e "\n[Network Policies]" >> compliance-report.txt
kubectl get networkpolicies -A >> compliance-report.txt

# 3. Check pod security policies
echo -e "\n[Pod Security Policies]" >> compliance-report.txt
kubectl get psp >> compliance-report.txt

# 4. Check secrets not in git
echo -e "\n[Secrets Scan]" >> compliance-report.txt
git log --all --full-history --oneline | \
  xargs -I {} git log -p {} | \
  grep -iE '(password|secret|token|key)' | wc -l >> compliance-report.txt

# Send for compliance review
mail -s "Security Compliance Report" compliance@company.com < compliance-report.txt
```

---

## 6. Security Incident Response

### 6.1 Incident Response Plan

**Activation Criteria**:

```yaml
Severity Levels:
  Critical: System compromised, data breach, active exploitation
    Action: Immediate incident commander activation, CISOs notified
    Response Time: < 15 minutes
  
  High: Vulnerability exploited, access compromised
    Action: Security team notified, investigation started
    Response Time: < 1 hour
  
  Medium: Misconfiguration, failed security control
    Action: Team notified, remediation planned
    Response Time: < 4 hours
  
  Low: Security advisory, preventive improvement
    Action: Logged and tracked
    Response Time: < 1 week
```

### 6.2 Incident Triage & Containment

**Suspected Compromise Response**:

```bash
#!/bin/bash
# Quick incident response for compromised pod

COMPROMISED_POD=$1
NAMESPACE=${2:-default}

echo "=== INCIDENT RESPONSE: Pod Compromise ==="
echo "Pod: $COMPROMISED_POD in namespace $NAMESPACE"
echo "Time: $(date)"

# 1. Isolate pod (network policy)
kubectl apply -f - << EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-compromised
  namespace: $NAMESPACE
spec:
  podSelector:
    matchLabels:
      pod: $COMPROMISED_POD
  policyTypes:
  - Ingress
  - Egress
  # Deny all ingress/egress
EOF

echo "[✓] Pod isolated via network policy"

# 2. Capture logs
kubectl logs $COMPROMISED_POD -n $NAMESPACE > pod-${COMPROMISED_POD}-logs.txt
echo "[✓] Logs captured to pod-${COMPROMISED_POD}-logs.txt"

# 3. Get pod details for forensics
kubectl get pod $COMPROMISED_POD -n $NAMESPACE -o yaml > pod-${COMPROMISED_POD}-manifest.yaml
echo "[✓] Manifest captured to pod-${COMPROMISED_POD}-manifest.yaml"

# 4. Kill compromised pod (new pod will start)
kubectl delete pod $COMPROMISED_POD -n $NAMESPACE
echo "[✓] Compromised pod terminated, replacement starting"

# 5. Alert security team
echo "INCIDENT: Pod $COMPROMISED_POD compromised at $(date)" | \
  mail -s "[CRITICAL] Pod Compromise Detected" security-team@company.com

echo "[✓] Security team alerted"
echo "=== Containment Complete ==="
```

### 6.3 Post-Incident Analysis

**Forensics & Root Cause Analysis**:

```bash
#!/bin/bash
# Post-incident investigation

# 1. Review audit logs for unusual activity
gcloud logging read \
  'resource.type="k8s_pod" AND severity="CRITICAL"' \
  --limit=1000 > incident-audit-logs.json

# 2. Check for lateral movement
kubectl get events -A --sort-by='.lastTimestamp' | \
  grep -E '(exec|port-forward|created)' > incident-events.txt

# 3. Analyze network traffic (if available)
kubectl logs -n kube-system -l app=calico | grep -i blocked > incident-network.txt

# 4. Generate incident timeline
echo "=== Incident Timeline ===" > incident-timeline.md
echo "Discovery: $(date -d @DISCOVERY_TIMESTAMP)" >> incident-timeline.md
echo "Containment: $(date)" >> incident-timeline.md
echo "Duration: $(($(date +%s) - DISCOVERY_TIMESTAMP)) seconds" >> incident-timeline.md

# 5. Create remediation checklist
cat > remediation.md << EOF
# Incident Remediation

## Root Cause
- [ ] Container image vulnerability patched
- [ ] Configuration error corrected
- [ ] Access control enhanced

## Prevention
- [ ] Security scanning enabled
- [ ] RBAC policy tightened
- [ ] Network policy deployed

## Detection
- [ ] Monitoring rule created
- [ ] Alert threshold configured
- [ ] Test alert verified
EOF
```

---

## 7. Security Best Practices Checklist

### Pre-Production

- [ ] All images scanned for vulnerabilities
- [ ] Secrets not stored in code (Vault/managed service)
- [ ] Network policies deployed
- [ ] RBAC configured with least privilege
- [ ] Pod security policies enforced
- [ ] WAF rules deployed
- [ ] SSL/TLS certificates valid and renewed
- [ ] Audit logging enabled
- [ ] Incident response runbook tested
- [ ] Security training completed

### Weekly Security Tasks

- [ ] Review security alerts
- [ ] Check for new CVEs affecting dependencies
- [ ] Verify secrets rotation
- [ ] Audit privileged access requests
- [ ] Review network policy violations

### Monthly Security Audit

- [ ] RBAC review (remove unnecessary permissions)
- [ ] Credential rotation verification
- [ ] Security patch application
- [ ] Vulnerability scan results review
- [ ] Incident log review

---

## 8. Security Reference

### OWASP Top 10 Mitigation Strategies

| Vulnerability | Mitigation | Implementation |
|---|---|---|
| Injection | Input validation, parameterized queries | sqlalchemy.sql.text() with bound parameters |
| Broken Authentication | MFA, strong password policy | Google Authenticator + 16-char passwords |
| Sensitive Data Exposure | Encryption at rest/transit, TLS | AES-256 + TLS 1.3 |
| XML External Entity | Disable XML processing | Disable DTD processing in parsers |
| Broken Access Control | RBAC, least privilege | Kubernetes RBAC + network policies |
| CSRF | CSRF tokens, SameSite cookies | Django CSRF middleware |
| Security Misconfiguration | Security scanning, hardening | Checkov + CIS benchmarks |
| XSS | Input sanitization, CSP headers | DOMPurify + Content-Security-Policy |
| Deserialization | Input validation | Avoid pickle; use JSON |
| Logging & Monitoring | Centralized logging, alerting | ELK + Prometheus alerts |

---

- **Last Updated**: January 2026
- **Maintained by**: Security Engineering Team
- **Version**: 1.0.0