# Application Security: Operations & Defense

Welcome to the Security section of the runbooks. This guide covers application security fundamentals, common vulnerabilities, defensive mechanisms, and secure development practices.

---

## 🚀 Quick Start

### Choose Your Learning Path

- **5-minute overview**: [What is AppSec?](./CONCEPT.md#1-what-is-application-security)
- **30-minute deep dive**: Sections 1-4 in [CONCEPT.md](./CONCEPT.md)
- **90-minute hands-on lab**: [WORKSHOP.md](./WORKSHOP.md) with DVWA

---

## 📚 Learning Paths

### **Beginner**: Security Fundamentals (40 min)

1. **[CONCEPT.md § 1](./CONCEPT.md#1-what-is-application-security)** — Why security matters
2. **[CONCEPT.md § 2](./CONCEPT.md#2-privilege-access-management-pam)** — PAM basics
3. **[CONCEPT.md § 3 (intro)](./CONCEPT.md#vulnerability-1-injection-sql-command-nosql)** — Top 3 OWASP vulnerabilities (Injection, XSS, SSRF)
4. **[CONCEPT.md § 7](./CONCEPT.md#7-social-engineering--phishing-awareness)** — Phishing awareness

### **Intermediate**: Secure Development (75 min)

1. **[CONCEPT.md § 3 (all)](./CONCEPT.md#3-owasp-top-10-common-web-vulnerabilities-2021)** — All 6 OWASP vulnerabilities with code examples
2. **[CONCEPT.md § 5](./CONCEPT.md#5-secure-sdlc-sast--dast)** — SAST & DAST security testing
3. **[CONCEPT.md § 4](./CONCEPT.md#4-web-application-firewall-waf-architecture)** — WAF architecture and rules
4. **[WORKSHOP.md § Part 4](./WORKSHOP.md#part-4-sast-security-scanning-20-min)** — SAST scanning with Semgrep

### **Advanced**: Hands-On Lab & Defense (120 min)

1. **[WORKSHOP.md](./WORKSHOP.md)** — Complete Docker-based lab covering:
   - SQL injection exploitation
   - XSS vulnerability testing
   - Command injection risks
   - Phishing identification
   - WAF rule testing
   - Code review process

---

## 🎯 Quick Reference

### OWASP Top 10 (2021)

| # | Vulnerability | Example | Prevention |
|---|---|---|---|
| **1** | Injection | `query = f"SELECT * WHERE id={user_id}"` | Parameterized queries |
| **2** | Broken Auth | Weak session tokens | Cryptographic random + MFA |
| **3** | Sensitive Data | HTTP instead of HTTPS | Encrypt in transit (HTTPS) + at rest |
| **4** | XML/XXE | Parse untrusted XML | Disable external entity processing |
| **5** | Access Control | User reads other's data | Ownership checks, RBAC |
| **6** | SSRF | Request to internal URL | Whitelist allowed URLs |
| **7** | XSS | `<script>alert('xss')</script>` | HTML escape output |
| **8** | Deserialization | `pickle.loads(data)` | Use JSON, not pickle |
| **9** | Using Components | Vulnerable library | Dependency scanning, updates |
| **10** | Logging | Log sensitive data | Sanitize logs, PII awareness |

### The 6 Most Critical Vulnerabilities (Practical)

| Vuln | Attack | Fix | Impact |
|-----|--------|-----|--------|
| **SQL Injection** | Break SQL syntax | Parameterized queries | Data breach |
| **XSS** | Inject JavaScript | HTML escape | Cookie theft, malware |
| **Command Injection** | Execute shell commands | subprocess.run() list | Full system compromise |
| **Broken Auth** | Bypass or impersonate | Strong tokens, MFA | Unauthorized access |
| **Broken AuthZ** | Access others' data | Ownership checks | Privacy violation |
| **Sensitive Data** | Expose in transit/at rest | HTTPS + encryption | PII exposure, compliance |

### Password Security Guidelines

| Aspect | Requirement | Why |
|--------|---|---|
| **Length** | 16+ characters | More entropy = harder to crack |
| **Complexity** | Upper, lower, number, symbol | Increases keyspace |
| **Rotation** | Every 90 days (privileged) | Limits exposure window |
| **Storage** | Bcrypt (rounds=12) | Adaptive hashing, slow |
| **Comparison** | Always use `==` carefully | Prevent timing attacks |

**Example Strong Password**:
```
✅ "Blue-Mountain-42-Sunset-2024!"  (passphrase)
✅ "Tr0p!cal$unset@Dawn#2024"  (complexity)
❌ "Admin123"  (too simple)
❌ "password"  (guessable)
```

### PAM: The 6 Pillars

| Pillar | Implementation | Benefit |
|---|---|---|
| **1. MFA** | Google Authenticator + password | Can't compromise with password alone |
| **2. Session Timeout** | 1-2 hours for prod | Limits exposure if session stolen |
| **3. JIT Access** | Approve for 4 hours only | Reduces standing privileges |
| **4. Audit Logging** | Immutable, centralized | Detective control, compliance |
| **5. Access Review** | Quarterly cleanup | Removes unnecessary permissions |
| **6. Strong Auth** | Bcrypt passwords, MFA | First line of defense |

### Authentication Methods Comparison

| Method | Security | User Experience | Scalability |
|--------|----------|---|---|
| **Password Only** | ⭐ Low | ✅ Simple | ✅ Easy |
| **Password + MFA** | ⭐⭐⭐⭐ High | ⚠️ Extra step | ✅ Easy |
| **OAuth 2.0** | ⭐⭐⭐⭐ High | ✅ Easy (third-party) | ✅ Easy |
| **JWT** | ⭐⭐⭐ Medium | ✅ Stateless | ✅⭐ Great |
| **Biometric** | ⭐⭐⭐⭐⭐ Very High | ✅ Fast | ⚠️ Hardware dependent |

---

## 📖 File Guide

### CONCEPT.md (~800 lines, 10 Sections)

**Comprehensive security theory guide** covering:
- [§1] Application security overview (why it matters)
- [§2] PAM concepts and best practices (6 pillars)
- [§3] OWASP Top 10 (6 vulnerabilities with code examples)
- [§4] WAF architecture and detection methods
- [§5] SAST & DAST security testing (CI/CD integration)
- [§6] Authentication & authorization methods
- [§7] Phishing and social engineering awareness
- [§8] Defensive layers (defense in depth)
- [§9] Security pre-deployment checklist
- [§10] Key takeaways and resources

**Diagrams included**:
- OWASP Top 10 chart
- WAF architecture flow
- Secure SDLC lifecycle
- Authentication flow diagram

### WORKSHOP.md (~600 lines, 7 Parts)

**Hands-on practical lab** using Docker:
- Part 1: Prerequisites setup
- Part 2: Environment (DVWA) startup
- Part 3: Code vulnerability exercises (4 exercises)
  - SQL injection analysis and fix
  - XSS identification and escape
  - Command injection prevention
  - Authentication weakness demo
- Part 4: SAST scanning with Semgrep (5 tasks)
- Part 5: Manual code review (checklist + exercise)
- Part 6: Phishing awareness (3 exercises)
- Part 7: WAF testing and cleanup

**Time breakdown**:
- Setup: 15 min
- Code exercises: 45 min
- SAST scanning: 20 min
- Code review: 15 min
- Phishing: 15 min
- WAF testing: 10 min
- Cleanup: 5 min
- **Total: 125 min**

### README.md (This file)

Navigation hub with learning paths, quick reference tables, and FAQs.

---

## 🔍 Common Questions

### Q: What's the difference between authentication and authorization?

**Authentication**: "Are you who you claim?"
- User logs in with password (proves identity)
- Returns: 401 Unauthorized if failed

**Authorization**: "Are you allowed to do this?"
- User tries to access /admin endpoint
- Returns: 403 Forbidden if unauthorized

```
Flow:
1. User sends password
2. Server: "Are you Alice?" → Authentication
   ✓ Verified → Session created
3. User accesses /admin
4. Server: "Can Alice access /admin?" → Authorization
   ✓ Permission found → Access granted
```

---

### Q: Which OWASP vulnerability is most common?

**By frequency**: Injection attacks (#1)
- **Why**: Easy to exploit, high impact
- **Fix**: Always use parameterized queries
- **Cost of breach**: $4M+ average

**By impact**: Broken Access Control (#5)
- **Why**: Direct path to sensitive data
- **Fix**: Ownership checks on all user resources
- **Prevention**: 90% of breaches exploitable with simple checks

---

### Q: How do I prevent SQL injection?

**Method 1: Parameterized Queries** (✅ Recommended)
```python
# SECURE
cursor.execute("SELECT * FROM users WHERE id = ?", [user_id])
```

**Method 2: ORM** (Object-Relational Mapping)
```python
# SECURE (SQLAlchemy)
user = db.session.query(User).filter(User.id == user_id).first()
```

**Method 3: Input Validation** (❌ Not sufficient alone)
```python
# WEAK - Can still be bypassed
if not user_id.isdigit():
    return error()
```

**Never do**:
```python
# VULNERABLE - Direct concatenation
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

---

### Q: What should I do if a phishing email makes it to my inbox?

**5-Step Response**:

1. **Don't click** — Don't click link or download attachment
2. **Don't reply** — Don't respond (confirms valid email)
3. **Verify** — Contact sender via known phone/email (not from email)
4. **Report** — Forward to security@company.com with [PHISHING]
5. **Delete** — Remove from inbox

**Example**:
```
Suspicious Email: "Verify your GitHub account"

Action:
1. Don't click "Verify" link
2. Don't respond to email
3. Go to github.com directly → Settings → Security
4. Forward to security@company.com with subject: [PHISHING] Fake GitHub email
5. Delete email
```

---

### Q: How do I implement MFA?

**Step 1: Choose provider**
```
Options:
- Google Authenticator (TOTP, free)
- Authy (TOTP, better UX)
- Yubikey (Hardware, most secure)
- SMS (Avoid if possible, less secure)
```

**Step 2: User enables MFA**
```
1. User scans QR code
2. Authenticator generates codes (refreshes every 30 sec)
3. User enters code to verify
4. Server stores recovery codes (in case phone lost)
```

**Step 3: Login flow**
```
1. User enters username & password
2. Server: "Enter 6-digit code from authenticator"
3. User enters code (valid for 30 seconds)
4. Server verifies code
5. Session created
```

---

### Q: Can I store passwords in plaintext?

**Answer**: ❌ **NEVER**

**Why**:
- Database breaches expose all passwords
- Users reuse passwords across sites
- Attacker can login as any user

**What to use**:
```
✅ bcrypt     (adaptive, recommended)
✅ Argon2     (GPU-resistant)
✅ scrypt     (KDF, good option)
❌ SHA1/MD5   (cryptographic hash, too fast)
❌ Plaintext  (criminal negligence)
```

**Implementation**:
```python
import bcrypt

# Hashing on signup
password_hash = bcrypt.hashpw(
    password.encode('utf-8'),
    bcrypt.gensalt(rounds=12)
)
# Store password_hash in database

# Verification on login
if bcrypt.checkpw(entered_password.encode('utf-8'), stored_hash):
    print("Password correct")
else:
    print("Wrong password")
```

---

### Q: What does "defense in depth" mean?

**Concept**: Multiple layers of security, so if one fails, others still protect.

**Layers**:
```
Layer 1: Network
└─ Firewall blocks malicious IPs

Layer 2: Edge
└─ WAF blocks SQL injection, XSS

Layer 3: Authentication
└─ MFA prevents unauthorized login

Layer 4: Authorization
└─ RBAC limits what user can access

Layer 5: Application
└─ Input validation prevents exploitation

Layer 6: Data
└─ Encryption protects compromised data

Layer 7: Monitoring
└─ Alerts on suspicious activity
```

**Example**: Even if Layer 2 (WAF) fails:
- Layer 3 (Auth) still prevents unauthorized access
- Layer 4 (AuthZ) still limits damage
- Layer 6 (Encryption) still protects data
- Layer 7 (Monitoring) detects attack

---

## 📋 Next Steps After Learning

### Immediate (Today)

- [ ] Complete [WORKSHOP.md](./WORKSHOP.md) Docker lab
- [ ] Run all exercises end-to-end
- [ ] Take phishing quiz (score 8/10+)

### This Week

- [ ] Review your code for 6 OWASP vulnerabilities
- [ ] Integrate Semgrep SAST into your CI/CD
- [ ] Enable MFA on all personal accounts

### This Month

- [ ] Conduct security code review of critical service
- [ ] Run DAST (OWASP ZAP) on staging environment
- [ ] Document security architecture diagram
- [ ] Set up WAF monitoring and alerting

### This Quarter

- [ ] Implement SAST + DAST in CI/CD pipeline
- [ ] Audit all privileged accounts (PAM review)
- [ ] Conduct phishing simulation (track metrics)
- [ ] Plan API security improvements

---

## 🛠️ Tools & Resources

### Development Tools
- **Semgrep**: SAST code scanning (free, open-source)
- **DVWA**: Damn Vulnerable Web App (intentionally vulnerable practice app)
- **Burp Suite Community**: Web proxy + scanner (free tier)
- **OWASP ZAP**: Dynamic testing tool (free, open-source)

### Libraries & Frameworks
- **bcrypt**: Python password hashing
- **cryptography**: Encryption library
- **OWASP Cheat Sheets**: Security guidelines per technology
- **Snyk**: Dependency vulnerability scanning

### Monitoring & Operations
- **Splunk**: Log analysis + alerting
- **ELK Stack**: Elasticsearch, Logstash, Kibana (free, open-source)
- **Wazuh**: Security monitoring platform
- **Falcon**: Cloud-native security

### Official Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Secure Coding Guidelines](https://www.securecoding.cert.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## ✅ Do's and ❌ Don'ts

### ✅ DO:

- ✅ Use parameterized queries (prevent SQLi)
- ✅ HTML escape output (prevent XSS)
- ✅ Require MFA for admin accounts
- ✅ Check user ownership (prevent authZ bypass)
- ✅ Enforce HTTPS everywhere
- ✅ Hash passwords with bcrypt (rounds=12+)
- ✅ Log authentication attempts
- ✅ Conduct code reviews before deployment

### ❌ DON'T:

- ❌ Concatenate user input into SQL queries
- ❌ Render user input directly in HTML
- ❌ Use `os.system()` with user input
- ❌ Store passwords in plaintext
- ❌ Disable HTTPS for "convenience"
- ❌ Trust client-side validation alone
- ❌ Log sensitive data (passwords, tokens, PII)
- ❌ Use weak authentication (password only)

---

## 🔑 Security Principles

### Principles of Secure Design

1. **Least Privilege**: Give minimum permissions needed
2. **Fail Securely**: Errors should deny, not grant access
3. **Separation of Duty**: Critical actions need approval
4. **Defense in Depth**: Multiple layers of security
5. **Keep It Simple**: Complex = hard to audit
6. **Assume Breach**: Plan for "when", not "if"
7. **Trust Nothing**: Validate everything
8. **Security by Default**: Safe by default, opt-in for features

### Security vs Usability Trade-Off

```
Security (Strong):                  Usability (Easy):
├─ 16-char password                 ├─ 4-digit PIN
├─ Hardware MFA                      ├─ SMS code
├─ Annual password rotation          ├─ Never expire
├─ TOTP codes (time-based)           ├─ Biometric (fingerprint)
├─ Approval workflow (24-48h)        └─ Auto-approval

Goal: Optimize for both
- Strong enough to be secure
- Simple enough for users to adopt
```

---

## 📊 Security Maturity Levels

### Level 1: Ad-Hoc
- ❌ No security process
- ❌ Vulnerabilities discovered in production
- **Risk**: Data breaches, compliance violations

### Level 2: Awareness
- ✅ Basic authentication (password)
- ✅ HTTPS enabled
- ❌ No code scanning, no monitoring
- **Risk**: Known vulnerabilities exploited

### Level 3: Managed
- ✅ SAST in CI/CD
- ✅ Security checklist before deployment
- ✅ Basic monitoring and alerting
- ⚠️ Reactive (catch issues after deployment)

### Level 4: Optimized
- ✅ SAST + DAST + dependency scanning
- ✅ WAF with custom rules
- ✅ PAM with JIT access
- ✅ Proactive monitoring and threat hunting
- **Goal**: Catch issues before production

---

## 🆘 Troubleshooting Quick Links

- [SQL Injection Prevention](./CONCEPT.md#vulnerability-1-injection-sql-command-nosql)
- [XSS Prevention](./CONCEPT.md#vulnerability-2-cross-site-scripting-xss)
- [SSRF Prevention](./CONCEPT.md#vulnerability-3-server-side-request-forgery-ssrf)
- [MFA Setup](./CONCEPT.md#authentication-methods)
- [Phishing Response](#q-what-should-i-do-if-a-phishing-email-makes-it-to-my-inbox)
- [Password Security](#password-security-guidelines)

---

**Last Updated**: January 2026

Questions or feedback? Check [CONTRIBUTING.md](../CONTRIBUTING.md) for how to contribute.
