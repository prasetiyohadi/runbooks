# Networking: Hands-On Workshop Lab

## Overview

This workshop provides a hands-on, practical introduction to cloud networking concepts through six progressive parts covering:
- IP addressing and CIDR calculations
- Network routing and connectivity
- VPN and secure access patterns
- Multi-VNet architecture and isolation
- NAT and outbound connectivity
- Network troubleshooting

**Estimated Time**: 90-120 minutes

**Prerequisites**: 
- Access to Azure subscription (or GCP equivalent)
- Familiarity with basic networking concepts from [CONCEPT.md](CONCEPT.md)
- Linux CLI tools (dig, nslookup, ip, netcat)

---

## Part 1: IP Addressing & CIDR Fundamentals (15 min, 3 tasks)

Master IP address classification and CIDR notation calculations—essential foundation for subnet planning.

### Task 1.1: Classify IP Address Types

**Objective**: Understand private vs public IP address ranges

**Instructions**: Identify each IP address as private or public:

```
172.16.0.1
172.64.0.1
192.168.0.1
192.169.0.1
10.42.0.1
10.200.0.1
```

**Expected Output**:
```
172.16.0.1       - private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 are private)
172.64.0.1       - public  (outside private ranges)
192.168.0.1      - private
192.169.0.1      - public
10.42.0.1        - private
10.200.0.1       - private
```

**Verification**: All 6 addresses correctly classified ✓

---

### Task 1.2: Calculate CIDR IP Ranges

**Objective**: Determine number of addresses and address ranges using CIDR notation

**Instructions**: For each CIDR range, calculate total addresses and first/last usable IPs:

```bash
# Install calculator if needed
apt-get install -y ipcalc

# Calculate each range
ipcalc 10.224.0.1/32
ipcalc 10.224.0.8/29
ipcalc 10.224.0.0/24
ipcalc 10.224.0.0/16
```

**Expected Output**:
```
10.224.0.1/32    → 1 address   (host only)
10.224.0.8/29    → 8 addresses (first: 10.224.0.8, last: 10.224.0.15)
10.224.0.0/24    → 256 addresses (first: 10.224.0.0, last: 10.224.0.255)
10.224.0.0/16    → 65,536 addresses (first: 10.224.0.0, last: 10.224.255.255)
```

**Verification**: All ranges calculated correctly ✓

---

### Task 1.3: Subnet Division Planning

**Objective**: Split larger networks into smaller subnets with proper CIDR notation

**Instructions**: Divide `10.224.0.0/24` into 4 equal-sized subnets:

```bash
# Method: /24 network can split into /26 subnets (4 subnets)
# Each /26 has 64 addresses (256 / 4 = 64)

ipcalc 10.224.0.0/24
```

**Expected Output**:
```
Original: 10.224.0.0/24 (256 addresses)

Divided into 4 /26 subnets:
  Subnet 1: 10.224.0.0/26     (10.224.0.0 - 10.224.0.63)
  Subnet 2: 10.224.0.64/26    (10.224.0.64 - 10.224.0.127)
  Subnet 3: 10.224.0.128/26   (10.224.0.128 - 10.224.0.191)
  Subnet 4: 10.224.0.192/26   (10.224.0.192 - 10.224.0.255)
```

**Verification**: All 4 subnets partition the /24 network without overlap ✓

---

## Part 2: Network Connectivity & Routing (20 min, 4 tasks)

Test network connectivity, understand routing tables, and verify DNS resolution.

### Task 2.1: DNS Resolution & Network Interface Discovery

**Objective**: Resolve DNS names and understand local network configuration

**Instructions**:

```bash
# Resolve DNS name
dig api.preproduction.company.com +short
# or
nslookup api.preproduction.company.com

# List network interfaces
ip a

# Display routing table
ip r
```

**Expected Output**:
```
# DNS resolution example:
api.preproduction.company.com.  300  IN  A  35.198.XXX.XXX

# Network interfaces show local connections (eth0, wlan0, etc.)
# Routing table shows default route and connected networks
```

**Verification**: 
- DNS name resolved to an IP address ✓
- Network interfaces visible ✓
- Routing table displayed ✓

---

### Task 2.2: Trace Network Routing

**Objective**: Understand how traffic is routed through network layers

**Instructions**:

```bash
# Trace route to example IP
route -n | grep -E "^0.0.0.0|^10\.|^172\."

# Find route to specific destination
ip route get 35.198.XXX.XXX  # Replace with DNS-resolved IP

# For internal networks, check if routable
ip route get 172.21.64.242
```

**Expected Output**:
```
# If network is NOT reachable:
RTNETLINK answers: Network is unreachable

# If network IS reachable:
172.21.64.242 via <gateway> dev <interface>
```

**Verification**: Route determination correct for each test IP ✓

---

### Task 2.3: Test Network Connectivity (Without VPN)

**Objective**: Verify network connectivity and diagnose unreachable hosts

**Instructions**: Test connectivity to internal network IP:

```bash
# Install netcat
apt-get install -y netcat-openbsd

# Test connectivity (timeout after 2 seconds)
nc -zv 172.21.64.242 22
```

**Expected Output** (if unreachable):
```
Connection refused / Connection timed out
```

**Diagnosis**: If unreachable, there are typically 2 reasons:
1. **No route exists** - IP is on different network, no routing configured
2. **Firewall blocks** - Route exists but NSG/firewall rejects traffic

**Verification**: Connectivity test executed and result documented ✓

---

### Task 2.4: Connect to VPN & Observe Changes

**Objective**: Understand how VPN changes network topology and routing

**Instructions**:

```bash
# Before VPN: Document current state
ip a > /tmp/interfaces_before.txt
ip r > /tmp/routes_before.txt

# Connect to GCP Preproduction VPN
# [Use your organization's VPN client]

# After VPN: Document changes
ip a > /tmp/interfaces_after.txt
ip r > /tmp/routes_after.txt

# Compare differences
diff /tmp/interfaces_before.txt /tmp/interfaces_after.txt
diff /tmp/routes_before.txt /tmp/routes_after.txt

# Identify VPN interface
ip a | grep -E "tun|vpn"

# Check new routes added
ip r | grep -E "10\.|172\."
```

**Expected Output**:
```
# New interface appears (e.g., tun0, wg0)
# New routes appear for remote networks
# Gateway might change for certain destinations
```

**Verification**: 
- VPN interface detected ✓
- New routes visible after connection ✓
- Network changes documented ✓

---

## Part 3: VPN Routing & Public IP Discovery (15 min, 3 tasks)

Understand VPN traffic flow and determine outbound public IP addresses.

### Task 3.1: Verify Route Changes After VPN

**Objective**: Confirm that VPN connection enables access to previously unreachable networks

**Instructions**:

```bash
# Test connectivity to previously unreachable IP
nc -zv 172.21.64.242 22

# Check new route
ip route get 172.21.64.242
```

**Expected Output** (after VPN):
```
Connection successful (or connection refused from SSH, meaning network is reachable)
172.21.64.242 via <vpn-gateway> dev tun0
```

**Verification**: Previously unreachable IP now has valid route ✓

---

### Task 3.2: Discover VPN Outbound Public IP (Method 1: CLI)

**Objective**: Identify the public IP address used for VPN outbound traffic

**Instructions**:

```bash
# Method 1: Query public IP service
curl -s https://api.ipify.org

# or
curl -s https://ifconfig.me

# or
dig +short myip.opendns.com @resolver1.opendns.com
```

**Expected Output**:
```
35.198.XXX.XXX  # Public IP of VPN gateway
```

**Verification**: Public IP address obtained ✓

---

### Task 3.3: Discover VPN Outbound Public IP (Method 2: Cloud Portal)

**Objective**: Verify CLI-discovered IP against cloud provider's actual configuration

**Instructions**:

```bash
# For GCP:
gcloud compute networks list
gcloud compute addresses list --global

# For Azure:
az network public-ip list --resource-group <rg-name>

# For AWS:
aws ec2 describe-addresses
```

**Expected Output**:
```
# Should match IP discovered in Task 3.2
Allocated IP: 35.198.XXX.XXX
Status: In use
```

**Verification**: CLI IP matches cloud portal configuration ✓

---

## Part 4: Multi-VNet Architecture & Isolation (25 min, 4 tasks)

Build and test a multi-network environment with proper segmentation and access control.

### Task 4.1: Create Two VNets in Azure

**Objective**: Set up isolated virtual networks with subnets

**Instructions**: Create in Azure Portal (or CLI):

```bash
# Using Azure CLI
az network vnet create \
  --resource-group rg-network-workshop-20230302 \
  --name vnet1 \
  --address-prefix 10.0.0.0/16

az network vnet subnet create \
  --resource-group rg-network-workshop-20230302 \
  --vnet-name vnet1 \
  --name subnet1 \
  --address-prefix 10.0.1.0/24

# Repeat for vnet2
az network vnet create \
  --resource-group rg-network-workshop-20230302 \
  --name vnet2 \
  --address-prefix 10.1.0.0/16

az network vnet subnet create \
  --resource-group rg-network-workshop-20230302 \
  --vnet-name vnet2 \
  --name subnet1 \
  --address-prefix 10.1.1.0/24
```

**Expected Output**:
```
✓ VNet 1 created (10.0.0.0/16)
✓ Subnet 1 created (10.0.1.0/24)
✓ VNet 2 created (10.1.0.0/16)
✓ Subnet 2 created (10.1.1.0/24)
```

**Verification**: Both VNets and subnets created and visible in portal ✓

---

### Task 4.2: Deploy VMs in Each VNet

**Objective**: Create VMs with private IP addresses for testing

**Instructions**: Deploy two B1s VMs (smallest SKU):

```bash
# VM in VNet1
az vm create \
  --resource-group rg-network-workshop-20230302 \
  --name vm1 \
  --image UbuntuLTS \
  --vnet-name vnet1 \
  --subnet subnet1 \
  --private-ip-address 10.0.1.10 \
  --size Standard_B1s \
  --zone 2 \
  --no-public-ip

# VM in VNet2
az vm create \
  --resource-group rg-network-workshop-20230302 \
  --name vm2 \
  --image UbuntuLTS \
  --vnet-name vnet2 \
  --subnet subnet1 \
  --private-ip-address 10.1.1.10 \
  --size Standard_B1s \
  --zone 2 \
  --no-public-ip
```

**Expected Output**:
```
✓ VM1 created with IP 10.0.1.10 (no public IP)
✓ VM2 created with IP 10.1.1.10 (no public IP)
```

**Verification**: Both VMs created and private IPs assigned ✓

---

### Task 4.3: Test Connectivity Between Isolated VNets

**Objective**: Verify that VNets are isolated (no cross-VNet communication by default)

**Instructions**: 

```bash
# From your laptop (via VPN), try to ping VM2 from VM1
# First, SSH to VM1 (requires bastion or public IP)

# If VMs have no public IP, use Azure Bastion or create one temporarily:
az network nic ip-config create \
  --resource-group rg-network-workshop-20230302 \
  --nic-name vm1VMNic \
  --name ipconfig2 \
  --private-ip-address 10.0.1.11

# Once connected to VM1:
ping 10.1.1.10

# Expected: No response (networks isolated)
```

**Expected Output**:
```
# From VM1 trying to reach VM2:
PING 10.1.1.10: Destination Host Unreachable

# Reason: No VNet peering configured
```

**Verification**: Confirmed VNets are isolated by default ✓

---

### Task 4.4: Enable Cross-VNet Communication via Peering

**Objective**: Connect two VNets using VNet peering

**Instructions**:

```bash
# Create VNet peering
az network vnet peering create \
  --resource-group rg-network-workshop-20230302 \
  --name vnet1-to-vnet2 \
  --vnet-name vnet1 \
  --remote-vnet vnet2 \
  --allow-vnet-access

az network vnet peering create \
  --resource-group rg-network-workshop-20230302 \
  --name vnet2-to-vnet1 \
  --vnet-name vnet2 \
  --remote-vnet vnet1 \
  --allow-vnet-access

# Test connectivity again
# [SSH to VM1]
ping 10.1.1.10
nc -zv 10.1.1.10 8080
```

**Expected Output**:
```
# After peering:
PING 10.1.1.10: bytes=32 from 10.1.1.10: time=5ms
# Connection successful - VNets now peered
```

**Verification**: Ping successful and port 8080 reachable after peering ✓

---

## Part 5: NAT Gateway & Outbound Connectivity (15 min, 2 tasks)

Configure outbound network address translation and verify traffic flows through NAT gateway.

### Task 5.1: Create NAT Gateway

**Objective**: Set up NAT gateway for outbound connectivity with fixed public IP

**Instructions**:

```bash
# Create public IP for NAT
az network public-ip create \
  --resource-group rg-network-workshop-20230302 \
  --name nat-public-ip

# Create NAT gateway
az network nat gateway create \
  --resource-group rg-network-workshop-20230302 \
  --name nat-gateway \
  --public-ip-addresses nat-public-ip \
  --idle-timeout 10

# Associate with subnet
az network vnet subnet update \
  --resource-group rg-network-workshop-20230302 \
  --vnet-name vnet1 \
  --name subnet1 \
  --nat-gateway nat-gateway
```

**Expected Output**:
```
✓ Public IP created: 35.198.XXX.XXX
✓ NAT Gateway created
✓ NAT associated with subnet
```

**Verification**: NAT gateway visible in Azure Portal ✓

---

### Task 5.2: Verify Outbound IP Through NAT

**Objective**: Confirm that outbound traffic uses NAT gateway's public IP

**Instructions**:

```bash
# From VM1, check outbound IP
# [SSH to VM1]
curl https://api.ipify.org

# Should return NAT gateway's public IP
```

**Expected Output**:
```
35.198.XXX.XXX  # NAT gateway public IP
# (should match IP from Task 5.1)
```

**Verification**: Outbound IP matches NAT gateway public IP ✓

---

## Part 6: Troubleshooting & Advanced Scenarios (10 min, 2 tasks)

Diagnose and resolve complex network connectivity issues.

### Task 6.1: Diagnose Connectivity Issues

**Objective**: Systematically troubleshoot network connectivity problems

**Troubleshooting Checklist**:

```bash
# Step 1: Verify IP connectivity
ping <destination>

# Step 2: Check routes
ip route get <destination>

# Step 3: Test specific port
nc -zv <destination> <port>

# Step 4: Monitor packet flow (if connectivity issue)
tcpdump -i any host <destination>

# Step 5: Check NSG rules (Azure)
az network nsg rule list \
  --resource-group rg-network-workshop-20230302 \
  --nsg-name <nsg-name>
```

**Expected Output**: Each step provides insight into where connectivity breaks

**Verification**: Issue diagnosed through systematic troubleshooting ✓

---

### Task 6.2: Resolve Isolated Network Access

**Objective**: Access HTTP service on isolated VM without public IP (advanced scenario)

**Scenario**: Access HTTP on `192.168.43.4` (private IP, no public access)

**Solution Approaches**:

| Approach | Steps | When to Use |
|---|---|---|
| **VPN + VNet Peering** | 1. VPN to network 2. Peer VNets | Network directly connected |
| **Bastion Host** | 1. Create bastion 2. SSH through bastion 3. Access HTTP locally | Isolated networks, secure access |
| **Private Endpoint** | 1. Create private endpoint 2. Access via private DNS | Hybrid cloud, on-premises access |

**Example: Via Bastion + Reverse SSH**:

```bash
# From your laptop (with VPN)
ssh -L 8080:192.168.43.4:80 user@bastion-vm

# Then access locally
curl http://localhost:8080
```

**Expected Output**:
```
# HTTP response from 192.168.43.4 forwarded through bastion
HTTP/1.1 200 OK
```

**Verification**: Successfully accessed private HTTP service ✓

---

## Validation Checklist

Verify you've completed all 18 tasks:

### Part 1: IP Addressing (3 tasks)
- [ ] Task 1.1: Classified 6 IP addresses as private/public
- [ ] Task 1.2: Calculated CIDR ranges using ipcalc
- [ ] Task 1.3: Divided /24 network into 4 /26 subnets

### Part 2: Routing & Connectivity (4 tasks)
- [ ] Task 2.1: Resolved DNS and listed network interfaces
- [ ] Task 2.2: Traced network routes to multiple destinations
- [ ] Task 2.3: Tested connectivity without VPN (expected failure)
- [ ] Task 2.4: Connected to VPN and observed routing changes

### Part 3: VPN & Public IPs (3 tasks)
- [ ] Task 3.1: Verified route changes after VPN connection
- [ ] Task 3.2: Discovered outbound public IP via CLI
- [ ] Task 3.3: Verified IP against cloud portal configuration

### Part 4: Multi-VNet Architecture (4 tasks)
- [ ] Task 4.1: Created two VNets with subnets
- [ ] Task 4.2: Deployed VMs in each VNet with private IPs
- [ ] Task 4.3: Tested isolated connectivity (expected failure)
- [ ] Task 4.4: Enabled peering and verified cross-VNet communication

### Part 5: NAT Gateway (2 tasks)
- [ ] Task 5.1: Created NAT gateway with public IP
- [ ] Task 5.2: Verified outbound traffic uses NAT IP

### Part 6: Troubleshooting (2 tasks)
- [ ] Task 6.1: Diagnosed connectivity issues systematically
- [ ] Task 6.2: Accessed isolated network service (advanced)

---

## Common Issues & Resolution

| Issue | Cause | Solution |
|-------|-------|----------|
| **Cannot reach VPN network** | Route not configured | Verify VPN client active; check `ip r` for new routes |
| **DNS not resolving** | DNS server unreachable | `dig @8.8.8.8 example.com`; check `/etc/resolv.conf` |
| **Port unreachable** | NSG/Security Group blocks | Review Azure NSG rules; ensure inbound rule exists |
| **VNet peering fails** | Address space overlaps | Use non-overlapping subnets (10.0.x.x vs 10.1.x.x) |
| **NAT not working** | Route tables incorrect | Verify subnet associated with NAT gateway |

---

## Key Takeaways

1. **IP Addressing**: CIDR notation enables efficient subnet planning and address allocation
2. **Routing**: Understanding routes (local, remote, default) is essential for troubleshooting
3. **Isolation**: VNets isolated by default; explicit peering/connectivity needed
4. **VPN Security**: VPN enables secure access to private networks with controlled routes
5. **NAT**: Network Address Translation enables outbound connectivity via fixed public IP
6. **Systematic Troubleshooting**: Follow OSI model (IP → Route → Port → Application)

---

## Next Steps

1. **Advanced**: Implement BGP-based routing between on-premises and cloud networks
2. **Security**: Add NSG rules demonstrating zero-trust network access patterns
3. **Multi-Region**: Extend lab to multiple regions with cross-region peering
4. **Monitoring**: Add network monitoring and alerting for connectivity issues

See [CONCEPT.md](CONCEPT.md) for deeper technical details on each topic.
