# Security Workshop: Hands-On Practical Lab

## Overview

This workshop provides hands-on exercises covering OWASP Top 10 vulnerabilities, secure coding practices, and security testing tools. Estimated time: 120 minutes.

---

## Part 1: Prerequisites (10 min)

### Required Tools

- Docker & Docker Compose
- Git
- Text editor (VS Code, vim, nano)
- Python 3.8+ (for SAST scanning)
- cURL (for API testing)

### Verification

```bash
# Check Docker installation
docker --version
# Expected: Docker version 20.10+

docker-compose --version
# Expected: Docker Compose version 1.29+

# Check Python
python3 --version
# Expected: Python 3.8+

# Check cURL
curl --version
# Expected: curl 7.0+
```

---

## Part 2: Environment Setup (15 min)

### Task 1: Clone Vulnerable Application

We'll use **DVWA** (Damn Vulnerable Web Application) for hands-on practice.

```bash
# Create workspace
mkdir -p ~/security-workshop && cd ~/security-workshop

# Clone DVWA
git clone https://github.com/digininja/DVWA.git
cd DVWA

# List files
ls -la
# Expected output:
# ├── config/
# ├── dvwa/
# ├── docker-compose.yml
# └── README.md
```

### Task 2: Start DVWA with Docker Compose

```bash
# Start containers (MySQL database + DVWA app)
docker-compose up -d

# Wait for startup (15-20 seconds)
sleep 20

# Check status
docker-compose ps
# Expected output:
# STATUS: Up (seconds)
```

### Task 3: Access DVWA

```bash
# Open in browser or verify with curl
curl -s http://localhost:80 | grep -i "dvwa" | head -5

# Expected: HTML content with DVWA title
# Or visit: http://localhost:80 in browser
# Default credentials:
#   Username: admin
#   Password: password
```

**Note**: DVWA is intentionally vulnerable — use only in isolated lab environment.

---

## Part 3: Code Vulnerability Exercises (45 min)

### Exercise 1: SQL Injection Vulnerability (10 min)

#### 1a. Analyze Vulnerable Code

```bash
# Create vulnerable PHP file
cat > ~/security-workshop/vulnerable-sqli.php << 'EOF'
<?php
// VULNERABLE: SQL Injection

$user_id = $_GET['id'];  // Unsanitized user input

// Concatenating user input directly into SQL query
$query = "SELECT username, email FROM users WHERE id = " . $user_id;

$result = mysqli_query($connection, $query);
while ($row = mysqli_fetch_assoc($result)) {
    echo "User: " . $row['username'];
}
?>
EOF

# View the vulnerable code
cat ~/security-workshop/vulnerable-sqli.php
```

#### 1b: Identify the Vulnerability

```
Question: What's wrong with this code?

Answer:
1. $user_id comes directly from $_GET (untrusted source)
2. No input validation (not checked if numeric)
3. No parameterized query (direct concatenation)
4. Attacker input: id=1 OR 1=1
   → Query becomes: SELECT * FROM users WHERE id = 1 OR 1=1
   → Returns: ALL users (not just one)
```

#### 1c: Fix with Parameterized Query

```bash
cat > ~/security-workshop/secure-sqli.php << 'EOF'
<?php
// SECURE: Parameterized Query

$user_id = $_GET['id'];

// Use prepared statement with ? placeholder
$query = "SELECT username, email FROM users WHERE id = ?";
$stmt = $connection->prepare($query);

// Bind parameter (user_id treated as DATA, not SQL code)
$stmt->bind_param("i", $user_id);  // "i" = integer type
$stmt->execute();

$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    echo "User: " . $row['username'];
}
?>
EOF

cat ~/security-workshop/secure-sqli.php
```

#### 1d: Test in DVWA

```bash
# In DVWA, navigate to SQL Injection menu
# URL: http://localhost:80/vulnerabilities/sqli/

# Try SQL injection payload:
# User ID: 1' OR '1'='1
# Expected (vulnerable): Shows all users

# Try multiple attacks:
# Payload: 1; DROP TABLE users;--
# Payload: 1 UNION SELECT 1,2,3 FROM information_schema.tables--
```

---

### Exercise 2: Cross-Site Scripting (XSS) (10 min)

#### 2a: Vulnerable Code

```bash
cat > ~/security-workshop/vulnerable-xss.py << 'EOF'
# VULNERABLE: XSS (Python Flask)

from flask import Flask, request, render_template_string

app = Flask(__name__)

@app.route('/search')
def search():
    query = request.args.get('q', '')
    
    # DANGEROUS: User input rendered directly in HTML
    html = f"<h1>Search results for: {query}</h1>"
    
    return html

if __name__ == '__main__':
    app.run(debug=True)
EOF

cat ~/security-workshop/vulnerable-xss.py
```

#### 2b: Identify Vulnerability

```
Question: How could an attacker exploit this?

Attack URL:
/search?q=<script>alert('XSS')</script>

Result:
✓ Script tag renders in HTML
✓ JavaScript executes in browser
✓ Attacker can:
  - Steal session cookies
  - Redirect to phishing site
  - Modify page content
```

#### 2c: Fix with HTML Escaping

```bash
cat > ~/security-workshop/secure-xss.py << 'EOF'
# SECURE: XSS Prevention (Python Flask)

from flask import Flask, request, render_template_string, escape

app = Flask(__name__)

@app.route('/search')
def search():
    query = request.args.get('q', '')
    
    # HTML-escape user input
    safe_query = escape(query)
    
    html = f"<h1>Search results for: {safe_query}</h1>"
    
    return html

# HTML escaping converts:
# <script> → &lt;script&gt;
# Then browser renders as text, not code

if __name__ == '__main__':
    app.run(debug=True)
EOF

cat ~/security-workshop/secure-xss.py
```

#### 2d: Test in DVWA

```bash
# In DVWA, navigate to Stored XSS or Reflected XSS
# URL: http://localhost:80/vulnerabilities/xss_r/

# Try payload:
# <script>alert('XSS Vulnerability!')</script>
# Expected (vulnerable): Alert box appears

# Try: <img src=x onerror="alert('XSS')">
# Expected: Alert appears
```

---

### Exercise 3: Command Injection (10 min)

#### 3a: Vulnerable Code

```bash
cat > ~/security-workshop/vulnerable-cmd.py << 'EOF'
# VULNERABLE: Command Injection (Python)

import os
from flask import Flask, request

app = Flask(__name__)

@app.route('/convert', methods=['POST'])
def convert():
    filename = request.form.get('filename')
    
    # DANGEROUS: User input passed to shell
    os.system(f"ffmpeg -i {filename} output.mp3")
    
    return "Converted"

# Attacker input: "video.mp4; rm -rf /"
# Executes: ffmpeg -i video.mp4; rm -rf /
# Result: Filesystem deleted!

if __name__ == '__main__':
    app.run(debug=True)
EOF

cat ~/security-workshop/vulnerable-cmd.py
```

#### 3b: Fix with subprocess.run()

```bash
cat > ~/security-workshop/secure-cmd.py << 'EOF'
# SECURE: Command Injection Prevention (Python)

import subprocess
from flask import Flask, request

app = Flask(__name__)

@app.route('/convert', methods=['POST'])
def convert():
    filename = request.form.get('filename')
    
    # SECURE: Pass arguments as list, not string
    # Shell doesn't interpret semicolon or special characters
    subprocess.run(
        ["ffmpeg", "-i", filename, "output.mp3"],
        check=True
    )
    
    return "Converted"

if __name__ == '__main__':
    app.run(debug=True)
EOF

cat ~/security-workshop/secure-cmd.py
```

#### 3c: Test Command Injection Risk

```bash
# Create test script to demonstrate vulnerability
cat > ~/security-workshop/test-cmd.sh << 'EOF'
#!/bin/bash

# VULNERABLE approach (direct string)
filename="test.txt; echo 'injected command'"
echo "❌ VULNERABLE:"
eval "cat $filename"

# SECURE approach (array)
echo ""
echo "✅ SECURE:"
/bin/bash -c "cat 'test.txt; echo injected command'"
# Note: The shell treats entire thing as filename, not two commands
EOF

bash ~/security-workshop/test-cmd.sh
```

---

### Exercise 4: Broken Authentication (10 min)

#### 4a: Vulnerable Session Management

```bash
cat > ~/security-workshop/vulnerable-auth.py << 'EOF'
# VULNERABLE: Weak Session Token (Python Flask)

from flask import Flask, session, request
import time

app = Flask(__name__)
app.secret_key = "weak-secret-key-123"

sessions_db = {}

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    
    # Verify credentials (simplified)
    if verify_password(username, password):
        # DANGEROUS: Predictable session token
        session_token = str(int(time.time()))  # WEAK!
        
        sessions_db[session_token] = username
        return {'token': session_token}
    
    return {'error': 'Invalid credentials'}

# Attacker can predict next token based on current time
# Session token: 1643123456
# Guess next: 1643123457, 1643123458, etc.
EOF

cat ~/security-workshop/vulnerable-auth.py
```

#### 4b: Fix with Cryptographic Random

```bash
cat > ~/security-workshop/secure-auth.py << 'EOF'
# SECURE: Strong Session Token (Python Flask)

from flask import Flask, session, request
import secrets

app = Flask(__name__)
app.secret_key = "strong-secret-key-with-high-entropy"

sessions_db = {}

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    
    if verify_password(username, password):
        # SECURE: Cryptographically random token (256 bits)
        session_token = secrets.token_urlsafe(32)
        
        sessions_db[session_token] = {
            'username': username,
            'created': time.time(),
            'expires': time.time() + 3600  # 1 hour
        }
        
        return {'token': session_token}
    
    return {'error': 'Invalid credentials'}

# Token format: "a3xK-Jd_5mN2lP9q..."
# Impossible to predict (256-bit random)
# Expires in 1 hour
EOF

cat ~/security-workshop/secure-auth.py
```

---

## Part 4: SAST Security Scanning (20 min)

### Task 1: Install Semgrep (SAST Tool)

```bash
# Install semgrep
pip3 install semgrep

# Verify installation
semgrep --version
# Expected: semgrep X.XX.X
```

### Task 2: Create Vulnerable Code Repository

```bash
# Create test project
mkdir -p ~/security-workshop/vulnerable-app
cd ~/security-workshop/vulnerable-app

# Create Python files with vulnerabilities
cat > app.py << 'EOF'
# Application with intentional vulnerabilities

import os
import requests
from flask import Flask, request

app = Flask(__name__)

# VULNERABILITY 1: SQL Injection
@app.route('/user/<user_id>')
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"  # VULNERABLE
    return query

# VULNERABILITY 2: Command Injection
@app.route('/process')
def process_file():
    filename = request.args.get('file')
    os.system(f"process {filename}")  # VULNERABLE
    return "Done"

# VULNERABILITY 3: Hardcoded Credentials
DB_PASSWORD = "admin123456"  # VULNERABLE
API_KEY = "sk-12345secretkey"  # VULNERABLE

# VULNERABILITY 4: Insecure Randomness
import random
token = random.randint(1, 999999)  # VULNERABLE (predictable)

# VULNERABILITY 5: Weak Cryptography
import hashlib
password_hash = hashlib.md5(password.encode()).hexdigest()  # VULNERABLE
EOF

cat app.py
```

### Task 3: Run SAST Scan with Semgrep

```bash
# Scan for OWASP Top 10 vulnerabilities
semgrep --config=p/owasp-top-ten app.py

# Expected output:
# ✗ SQL Injection (CWE-89)
#   app.py:10: query = f"SELECT * FROM users WHERE id = {user_id}"
#   Use parameterized queries
#
# ✗ Command Injection (CWE-78)
#   app.py:15: os.system(f"process {filename}")
#   Use subprocess.run() instead
#
# ✗ Hardcoded Credentials (CWE-798)
#   app.py:20: DB_PASSWORD = "admin123456"
#   Move to environment variables or secret manager
```

### Task 4: Custom Semgrep Rule

```bash
# Create custom rule to detect print() for secrets (bad practice)
cat > custom-rule.yaml << 'EOF'
rules:
  - id: print-debug-sensitive
    pattern: |
      print(...$API_KEY...)
    message: "Printing sensitive data (API key) is dangerous"
    languages: [python]
    severity: WARNING
EOF

# Run custom rule
semgrep --config=custom-rule.yaml app.py
```

### Task 5: Fix Vulnerabilities

```bash
cat > app-secure.py << 'EOF'
# Secure version of application

import os
import requests
from flask import Flask, request
from cryptography.fernet import Fernet
import secrets

app = Flask(__name__)

# SECURE 1: Parameterized Query
@app.route('/user/<user_id>')
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = ?"  # Parameterized
    result = db.execute(query, [user_id])
    return result

# SECURE 2: Subprocess with list (no shell injection)
@app.route('/process')
def process_file():
    filename = request.args.get('file')
    subprocess.run(["process", filename], check=True)  # SECURE
    return "Done"

# SECURE 3: Credentials from environment
import os
DB_PASSWORD = os.getenv('DB_PASSWORD')  # From environment variable
API_KEY = os.getenv('API_KEY')  # From environment variable

# SECURE 4: Cryptographic randomness
token = secrets.token_urlsafe(32)  # Cryptographically random

# SECURE 5: Strong hashing (bcrypt)
import bcrypt
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
EOF

# Run scan on secure code
semgrep --config=p/owasp-top-ten app-secure.py
# Expected: No or very few issues
```

---

## Part 5: Manual Code Review (15 min)

### Code Review Checklist

Use this checklist to review any code for security issues:

```yaml
Authentication:
  ☐ Passwords hashed (bcrypt, Argon2, not MD5/SHA1)
  ☐ Session tokens cryptographically random
  ☐ MFA implemented for sensitive operations
  ☐ Token expiration set

Authorization:
  ☐ Ownership checks (user owns resource before returning)
  ☐ Role validation (admin-only endpoints check role)
  ☐ Permission denied by default (whitelist approach)

Input Validation:
  ☐ All inputs validated (type, length, format)
  ☐ File uploads scanned for malware
  ☐ File uploads type-checked (not just extension)

SQL Queries:
  ☐ Parameterized queries used (? or :param)
  ☐ No string concatenation with user input
  ☐ SQL keywords escaped if necessary

Shell Commands:
  ☐ subprocess.run() with list (not string)
  ☐ No os.system() or shell=True
  ☐ Input validated before passing to shell

Output Encoding:
  ☐ HTML escaped (prevent XSS)
  ☐ JSON properly formatted
  ☐ Error messages don't leak sensitive info

Data Protection:
  ☐ HTTPS enforced
  ☐ Sensitive data not logged
  ☐ PII encrypted at rest
  ☐ Backups encrypted
```

### Exercise: Review Sample Code

```bash
# Review this code for vulnerabilities
cat > code-review.py << 'EOF'
from flask import Flask, request
import json
import pickle
import mysql.connector

app = Flask(__name__)

# Issue 1: Deserialization vulnerability
@app.route('/data', methods=['POST'])
def receive_data():
    data = request.data
    obj = pickle.loads(data)  # DANGEROUS: Arbitrary code execution
    return {'received': obj}

# Issue 2: SQL Injection
@app.route('/search')
def search():
    query_term = request.args.get('q')
    query = f"SELECT * FROM products WHERE name LIKE '%{query_term}%'"
    result = db.execute(query)
    return result

# Issue 3: No authorization check
@app.route('/user/<user_id>/delete', methods=['POST'])
def delete_user(user_id):
    db.execute(f"DELETE FROM users WHERE id = {user_id}")
    return "Deleted"

# Issue 4: Sensitive data in error
@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    try:
        user = db.query(f"SELECT * FROM users WHERE username = '{username}'")
    except Exception as e:
        return {'error': str(e)}  # Leaks database schema
EOF

# Identify issues:
# Issue 1: pickle.loads() → Use JSON instead
# Issue 2: LIKE query → Use parameterized
# Issue 3: No ownership check → Add authorization
# Issue 4: Exception to string → Log safely, return generic message
```

---

## Part 6: Phishing Awareness (15 min)

### Exercise 1: Spot the Phishing Email

```
Email 1:
From: noreply@github.com
To: alice@company.com
Subject: Verify your GitHub account - Action required

Hello,

Your GitHub account requires verification to maintain security.
Please click the link below to verify:
[VERIFY ACCOUNT]

If you didn't request this, ignore this email.

Best regards,
GitHub Security Team
```

**Is this phishing?**
- [ ] Definitely phishing
- [ ] Probably phishing  
- [ ] Might be legitimate
- [ ] Definitely legitimate

**Answer**: Probably phishing (⚠️)
- Vague urgency ("maintain security")
- Requests to verify account (GitHub doesn't ask this via email)
- Generic greeting ("Hello" not "Hi Alice")
- Generic button text

**How to verify**:
1. Hover over [VERIFY ACCOUNT] link
2. Check if URL is github.com (not github-verify.io)
3. When in doubt, go to github.com directly and check

---

### Exercise 2: Check Email Headers

```bash
# If you received suspicious email, check headers
# (In Gmail: Click "..." → "Show original")

# Legit GitHub email header:
From: noreply@github.com
Authentication-Results: spf=pass dkim=pass

# Phishing email header:
From: noreply@github.com
Authentication-Results: spf=fail dkim=fail
Return-Path: attacker@phishing.com  # Different sender!
```

### Exercise 3: Phishing Simulation Quiz

Visit: https://phishingquiz.withgoogle.com

Test yourself on identifying real phishing emails. Score your result:
- 8/10 or higher: Good phishing awareness
- 5-7/10: Moderate (needs more practice)
- Below 5: High risk (more training needed)

---

## Part 7: WAF Testing (10 min)

### Task 1: Test WAF Rules with cURL

```bash
# Normal request (should pass)
curl -X GET "http://localhost/index.php?page=home"
# Expected: 200 OK

# SQL Injection attempt (WAF should block)
curl -X GET "http://localhost/index.php?id=1' OR '1'='1"
# Expected: 403 Forbidden (if WAF is enabled in DVWA)

# XSS attempt (WAF should block)
curl -X GET "http://localhost/index.php?name=<script>alert('xss')</script>"
# Expected: 403 Forbidden

# Command injection attempt
curl -X GET "http://localhost/index.php?cmd=; rm -rf /"
# Expected: 403 Forbidden
```

### Task 2: Understand WAF Rules

```yaml
Example WAF Rules:

Rule 1: SQL Injection Detection
  Pattern: OR 1=1
  Pattern: UNION SELECT
  Pattern: DROP TABLE
  Action: Block (403)

Rule 2: XSS Detection
  Pattern: <script>
  Pattern: javascript:
  Pattern: onerror=
  Action: Block (403)

Rule 3: Rate Limiting
  Limit: 100 requests/second per IP
  Limit: 1000 requests/hour per IP
  Action: Challenge (CAPTCHA) or Block

Rule 4: Bot Detection
  Known bot signatures (Nmap, SQLmap, etc.)
  User-Agent detection
  Action: Block or rate-limit
```

---

## Part 8: Cleanup (5 min)

### Stop DVWA

```bash
cd ~/security-workshop/DVWA

# Stop all containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Verify
docker-compose ps
# Expected: Empty (no running containers)
```

### Clean Up Workspace

```bash
# Keep workshop files for reference
# Optional: Remove after training

rm -rf ~/security-workshop/vulnerable-app
# Keep: ~/security-workshop/DVWA (for future practice)
```

---

## Validation Checklist

After completing this workshop, verify you can:

- [ ] Identify SQL injection vulnerability in code
- [ ] Write parameterized query to fix SQLi
- [ ] Spot XSS vulnerability in HTML output
- [ ] Escape output to prevent XSS
- [ ] Identify command injection risk
- [ ] Use subprocess.run() safely
- [ ] Run SAST scan with Semgrep
- [ ] Understand OWASP Top 10 (6 vulnerabilities)
- [ ] Review code for security issues using checklist
- [ ] Identify phishing emails
- [ ] Understand WAF rule types
- [ ] Know PAM best practices
- [ ] Explain authentication vs authorization

---

## Key Learnings

### The 6 Most Critical Vulnerabilities

1. **SQL Injection**: Use parameterized queries
2. **XSS**: HTML-escape all output
3. **Command Injection**: Use subprocess with list
4. **Broken Authentication**: Strong tokens, MFA, expiration
5. **Broken Authorization**: Ownership checks, whitelist permissions
6. **Sensitive Data Exposure**: Encrypt in transit (HTTPS) and at rest

### Tools Learned

- **DVWA**: Practice vulnerable application
- **Semgrep**: SAST code scanning
- **cURL**: Manual API testing
- **Docker**: Isolated lab environment

### Next Steps

1. **Code Review**: Apply security checklist to your code
2. **Integrate SAST**: Add Semgrep to CI/CD pipeline
3. **DAST Testing**: Run OWASP ZAP on staging environment
4. **Phishing Training**: Take annual security awareness training
5. **PAM Implementation**: Review your privileged access controls

---

**Last Updated**: January 2026

For questions, refer to [CONCEPT.md](./CONCEPT.md) or contact your security team.
