# Cloud Network Operations Runbook

## 1. Overview

This runbook covers operational procedures for managing cloud networks in production environments, including VPC/VNet setup, subnet configuration, firewall/NSG rules, NAT gateways, routing, VPN connectivity, and troubleshooting.

**Scope**: GCP VPC and Azure VNet management with hybrid connectivity (BGP over IPSec)
**Target Audience**: Network engineers, platform engineers, SREs
**Prerequisite Knowledge**: CIDR notation, routing concepts (see CONCEPT.md)

---

## 2. Standard Network Deployment Configuration

### 2.1 GCP VPC Configuration

**Production VPC Standards**:
- CIDR range: Allocate from private IP space (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Subnets: /24 minimum (256 addresses)
- Regions: Primary + secondary for DR
- Firewall: Deny-all default, allow specific ingress/egress

**Create GCP VPC with Subnets**:

```bash
# Create VPC
gcloud compute networks create prod-vpc \
  --subnet-mode=custom \
  --bgp-routing-mode=regional \
  --project=<PROJECT_ID>

# Create subnet (primary region)
gcloud compute networks subnets create prod-subnet-us-central \
  --network=prod-vpc \
  --range=10.0.0.0/24 \
  --region=us-central1 \
  --private-ip-google-access \
  --project=<PROJECT_ID>

# Create subnet (secondary region for DR)
gcloud compute networks subnets create prod-subnet-us-east \
  --network=prod-vpc \
  --range=10.0.1.0/24 \
  --region=us-east1 \
  --private-ip-google-access \
  --project=<PROJECT_ID>

# Verify VPC created
gcloud compute networks describe prod-vpc --project=<PROJECT_ID>
```

### 2.2 Azure VNet Configuration

**Production VNet Standards**:
- Address space: /16 CIDR block (65,536 addresses)
- Subnets: /24 minimum
- NSG: Attach at subnet level
- Service endpoints: Enable for managed services

**Create Azure VNet with Subnets**:

```bash
# Create resource group
az group create \
  --name prod-network-rg \
  --location eastus

# Create VNet
az network vnet create \
  --resource-group prod-network-rg \
  --name prod-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name app-subnet \
  --subnet-prefix 10.0.0.0/24

# Create additional subnet
az network vnet subnet create \
  --resource-group prod-network-rg \
  --vnet-name prod-vnet \
  --name db-subnet \
  --address-prefix 10.0.1.0/24

# Enable service endpoints for database subnet
az network vnet subnet update \
  --resource-group prod-network-rg \
  --vnet-name prod-vnet \
  --name db-subnet \
  --service-endpoints Microsoft.Sql

# Verify VNet
az network vnet show \
  --resource-group prod-network-rg \
  --name prod-vnet
```

### 2.3 Firewall & NSG Rules

**GCP Firewall - Ingress Rules**:

```bash
# Allow SSH from corporate network
gcloud compute firewall-rules create allow-ssh-corp \
  --network=prod-vpc \
  --allow=tcp:22 \
  --source-ranges=203.0.113.0/24 \
  --target-tags=allow-ssh \
  --priority=1000 \
  --project=<PROJECT_ID>

# Allow HTTPS from internet to load balancer
gcloud compute firewall-rules create allow-https-lb \
  --network=prod-vpc \
  --allow=tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server,https-server \
  --priority=1001 \
  --project=<PROJECT_ID>

# Allow internal communication (same VPC)
gcloud compute firewall-rules create allow-internal \
  --network=prod-vpc \
  --allow=tcp,udp,icmp \
  --source-ranges=10.0.0.0/8 \
  --priority=1002 \
  --project=<PROJECT_ID>

# Verify rules
gcloud compute firewall-rules list --filter="network:prod-vpc" --project=<PROJECT_ID>
```

**Azure NSG - Ingress Rules**:

```bash
# Create NSG
az network nsg create \
  --resource-group prod-network-rg \
  --name app-subnet-nsg

# Allow HTTPS from internet
az network nsg rule create \
  --resource-group prod-network-rg \
  --nsg-name app-subnet-nsg \
  --name AllowHTTPS \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '10.0.0.0/24' \
  --destination-port-ranges 443

# Allow SSH from admin network
az network nsg rule create \
  --resource-group prod-network-rg \
  --nsg-name app-subnet-nsg \
  --name AllowSSH \
  --priority 101 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 203.0.113.0/24 \
  --destination-address-prefixes '10.0.0.0/24' \
  --destination-port-ranges 22

# Attach NSG to subnet
az network vnet subnet update \
  --resource-group prod-network-rg \
  --vnet-name prod-vnet \
  --name app-subnet \
  --network-security-group app-subnet-nsg

# Verify rules
az network nsg rule list --resource-group prod-network-rg --nsg-name app-subnet-nsg
```

---

## 3. Network Connectivity Management

### 3.1 VPC/VNet Peering (Intra-Cloud)

**GCP VPC Peering**:

```bash
# Create peering from prod-vpc to dev-vpc
gcloud compute networks peerings create prod-to-dev \
  --network=prod-vpc \
  --peer-network=dev-vpc \
  --project=<PROJECT_ID>

# Accept peering on dev-vpc side
gcloud compute networks peerings create dev-to-prod \
  --network=dev-vpc \
  --peer-network=prod-vpc \
  --project=<PROJECT_ID>

# Verify peering
gcloud compute networks peerings list --network=prod-vpc --project=<PROJECT_ID>
```

**Azure VNet Peering**:

```bash
# Peer prod-vnet to dev-vnet
az network vnet peering create \
  --resource-group prod-network-rg \
  --name prod-to-dev \
  --vnet-name prod-vnet \
  --remote-vnet /subscriptions/<SUB_ID>/resourceGroups/dev-rg/providers/Microsoft.Network/virtualNetworks/dev-vnet \
  --allow-vnet-access \
  --allow-forwarded-traffic

# Verify peering
az network vnet peering list \
  --resource-group prod-network-rg \
  --vnet-name prod-vnet
```

### 3.2 BGP Over IPSec Tunnel (Hybrid Connectivity)

> [!IMPORTANT]
> BGP over IPSec requires careful configuration. Asymmetric routing issues can occur if not properly tuned.

**GCP Side - Configure IPSec Tunnel**:

```bash
# Create VPN gateway on GCP
gcloud compute vpn-gateways create prod-vpn-gateway \
  --network=prod-vpc \
  --region=us-central1 \
  --project=<PROJECT_ID>

# Create peer VPN gateway (for Azure side)
gcloud compute external-vpn-gateways create azure-vpn-gateway \
  --interface-0.ip-address=<AZURE_PUBLIC_IP>

# Create VPN tunnel
gcloud compute vpn-tunnels create prod-to-azure \
  --vpn-gateway=prod-vpn-gateway \
  --peer-external-gateway=azure-vpn-gateway \
  --region=us-central1 \
  --peer-external-gateway-interface=0 \
  --shared-secret=<SHARED_SECRET> \
  --project=<PROJECT_ID>

# Create BGP session for the tunnel
gcloud compute routers add-interface prod-bgp-router \
  --interface-name=bgp-to-azure \
  --vpn-tunnel=prod-to-azure \
  --region=us-central1

# Configure BGP peer
gcloud compute routers create prod-bgp-router \
  --network=prod-vpc \
  --asn=65000 \
  --region=us-central1 \
  --project=<PROJECT_ID>

# Add BGP peer
gcloud compute routers add-bgp-peer prod-bgp-router \
  --peer-name=azure-bgp-peer \
  --peer-asn=65001 \
  --interface=bgp-to-azure \
  --region=us-central1
```

**Azure Side - Configure ExpressRoute/IPSec**:

```bash
# Create VPN gateway
az network vnet-gateway create \
  --resource-group prod-network-rg \
  --name prod-vpn-gateway \
  --public-ip-address prod-vpn-pip \
  --vnet prod-vnet \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw1

# Create local network gateway (GCP side)
az network local-gateway create \
  --resource-group prod-network-rg \
  --gateway-ip-address <GCP_PUBLIC_IP> \
  --name gcp-local-gateway \
  --local-address-prefix 10.0.0.0/8

# Create VPN connection
az network vpn-connection create \
  --resource-group prod-network-rg \
  --name prod-to-gcp \
  --vnet-gateway1 prod-vpn-gateway \
  --local-gateway2 gcp-local-gateway \
  --shared-key <SHARED_SECRET>

# Enable BGP on connection
az network vpn-connection update \
  --resource-group prod-network-rg \
  --name prod-to-gcp \
  --enable-bgp true
```

### 3.3 NAT Gateway Setup

**GCP Cloud NAT**:

```bash
# Create NAT gateway (GCP)
gcloud compute routers create prod-nat-router \
  --network=prod-vpc \
  --region=us-central1 \
  --asn=65000 \
  --project=<PROJECT_ID>

# Configure NAT on router
gcloud compute routers nats create prod-nat \
  --router=prod-nat-router \
  --region=us-central1 \
  --nat-all-subnet-ip-ranges \
  --auto-allocate-nat-external-ips \
  --project=<PROJECT_ID>

# Verify NAT
gcloud compute routers nats describe prod-nat \
  --router=prod-nat-router \
  --region=us-central1
```

**Azure NAT Gateway**:

```bash
# Create public IP for NAT
az network public-ip create \
  --resource-group prod-network-rg \
  --name nat-public-ip \
  --sku Standard

# Create NAT gateway
az network nat gateway create \
  --resource-group prod-network-rg \
  --name prod-nat-gateway \
  --public-ip-addresses nat-public-ip \
  --idle-timeout 10

# Associate with subnet
az network vnet subnet update \
  --resource-group prod-network-rg \
  --vnet-name prod-vnet \
  --name app-subnet \
  --nat-gateway prod-nat-gateway

# Verify NAT configuration
az network nat gateway show \
  --resource-group prod-network-rg \
  --name prod-nat-gateway
```

---

## 4. Routing Management

### 4.1 Custom Routes (GCP)

```bash
# Create static route to on-premise network
gcloud compute routes create route-to-onprem \
  --network=prod-vpc \
  --destination-range=192.168.0.0/16 \
  --next-hop-gateway=prod-vpn-gateway \
  --project=<PROJECT_ID>

# View routing table
gcloud compute routes list --filter="network:prod-vpc" --project=<PROJECT_ID>

# View dynamic routes learned via BGP
gcloud compute routers get-status prod-bgp-router \
  --region=us-central1 \
  --project=<PROJECT_ID>
```

### 4.2 Route Tables (Azure)

```bash
# Create route table
az network route-table create \
  --resource-group prod-network-rg \
  --name prod-route-table

# Add route to on-premise network
az network route-table route create \
  --resource-group prod-network-rg \
  --route-table-name prod-route-table \
  --name route-to-onprem \
  --address-prefix 192.168.0.0/16 \
  --next-hop-type VirtualNetworkGateway

# Associate with subnet
az network vnet subnet update \
  --resource-group prod-network-rg \
  --vnet-name prod-vnet \
  --name app-subnet \
  --route-table prod-route-table

# View effective routes
az network nic show-effective-route-table \
  --resource-group prod-network-rg \
  --name <NIC_NAME>
```

### 4.3 Asymmetric Routing Detection & Fix

> [!WARNING]
> Asymmetric routing can cause connection drops and performance issues. Check routing tables on both cloud providers.

**GCP Inspection**:

```bash
# Check dynamic routes on GCP side
gcloud compute routers get-status prod-bgp-router \
  --region=us-central1 --project=<PROJECT_ID> \
  | grep -A 50 "BGP_SESSION_STATE"

# View all advertised routes
gcloud compute routers describe prod-bgp-router \
  --region=us-central1 \
  --project=<PROJECT_ID>
```

**Azure Inspection**:

```bash
# Check effective routes on Azure
az network nic show-effective-route-table \
  --resource-group prod-network-rg \
  --name <VM_NIC_NAME>

# Check VNet gateway BGP peers
az network vnet-gateway bgp-peer-status list \
  --resource-group prod-network-rg \
  --gateway-name prod-vpn-gateway
```

**Fix Asymmetric Routing**:
```yaml
GCP receives traffic on BGP tunnel, returns on ExpressRoute:
  1. Check Azure route preference (ExpressRoute preferred by default)
  2. Adjust BGP AS Path prepending on Azure side
  3. Modify Azure route weights:
     
az network route-table route update \
  --resource-group prod-network-rg \
  --route-table-name prod-route-table \
  --name route-via-vpn \
  --next-hop-type VirtualNetworkGateway
```

---

## 5. Monitoring & Observability

### 5.1 GCP Network Monitoring

```bash
# Monitor VPC flow logs
gcloud compute networks subnets update prod-subnet-us-central \
  --enable-flow-logs \
  --logging-aggregation-interval=interval-5-sec \
  --logging-flow-sampling=0.5 \
  --region=us-central1

# View VPC flow logs
gcloud logging read "resource.type=gce_subnetwork AND jsonPayload.src_ip=10.0.0.0/24" \
  --format=json | head -20

# Monitor packet loss / latency to on-premise
gcloud compute ssh <INSTANCE_NAME> \
  --zone=us-central1-a \
  -- mtr -r -c 100 <ONPREM_IP>

# Check BGP session health
gcloud compute routers get-status prod-bgp-router \
  --region=us-central1 \
  --format="table(bgp_peer_status[].peer_identity,bgp_peer_status[].state)"
```

### 5.2 Azure Network Monitoring

```bash
# Enable NSG flow logs
az network watcher flow-log create \
  --resource-group prod-network-rg \
  --nsg app-subnet-nsg \
  --workspace /subscriptions/<SUB_ID>/resourceGroups/log-rg/providers/Microsoft.OperationalInsights/workspaces/net-logs

# Monitor VPN connection status
az network vpn-connection show \
  --resource-group prod-network-rg \
  --name prod-to-gcp \
  --query "connectionStatus"

# Check BGP status
az network vnet-gateway bgp-peer-status list \
  --resource-group prod-network-rg \
  --gateway-name prod-vpn-gateway \
  --query "[].state"

# Monitor NAT gateway statistics
az monitor metrics list \
  --resource /subscriptions/<SUB_ID>/resourceGroups/prod-network-rg/providers/Microsoft.Network/natGateways/prod-nat-gateway \
  --metric BytesSentCount BytesReceivedCount
```

---

## 6. Troubleshooting

### 6.1 Connectivity Issues

**Symptom**: Cannot reach server across VPN/peering

| Step | GCP Command | Azure Command | Expected Result |
|------|-------------|---------------|-----------------|
| **Check route exists** | `gcloud compute routes list \| grep <dest>` | `az network route-table route list --route-table-name <rt>` | Route to destination visible |
| **Check firewall rule** | `gcloud compute firewall-rules list \| grep <rule>` | `az network nsg rule list --nsg-name <nsg>` | Ingress rule allows traffic |
| **Test connectivity** | `gcloud compute ssh <vm> -- nc -zv <host> <port>` | `az vm run-command invoke -g <rg> -n <vm> --command-id RunShellScript --scripts "nc -zv <host> <port>"` | Connection succeeds |
| **Check BGP peers** | `gcloud compute routers get-status prod-bgp-router \| grep peer_identity` | `az network vnet-gateway bgp-peer-status list \| grep State` | BGP session "Established" |

### 6.2 Network Diagnostics

**Using netcat to test port**:

```bash
# From GCP instance
nc -zv <AZURE_IP> 443

# Expected output (success):
# Connection to <IP> port 443 [tcp/https] succeeded!

# Expected output (failure):
# nc: connect to <IP> port 443 (tcp) failed: Connection refused
```

**Using mtr to trace packet path**:

```bash
# From GCP instance to Azure VM
mtr -r -c 100 <AZURE_IP>

# Expected: All hops showing 0% packet loss
# If hop shows high % loss: possible network issue or rate limiting
```

**Check routing table decisions**:

```bash
# GCP: Which route will be used?
gcloud compute instances describe <VM_NAME> \
  --zone=us-central1-a \
  --format="table(networkInterfaces[0].fingerprint)"

# Then check route with:
gcloud compute routes describe <ROUTE_NAME> \
  --format="yaml"

# Azure: Effective routes for VM NIC
az network nic show-effective-route-table \
  --resource-group prod-network-rg \
  --name <NIC_NAME>
```

### 6.3 Common Issues & Fixes

| Issue | Symptoms | Root Cause | Fix |
|-------|----------|-----------|-----|
| **Asymmetric Routing** | Outgoing traffic uses one path, return on different path | BGP preferences differ between clouds | Adjust BGP AS path prepending or route weights |
| **BGP Session Down** | "BGP_SESSION_NOT_ESTABLISHED" | IPSec tunnel down or BGP config mismatch | Verify IPSec tunnel status, check BGP AS numbers match |
| **No Route to Destination** | "Route not found" or "Destination unreachable" | Static route not created or BGP not advertising | Add explicit route or verify BGP peer is advertising |
| **Firewall Blocking** | Connection timeout | Firewall rule missing or wrong direction | Add ingress rule allowing traffic on required port |
| **NSG Too Restrictive** | Connection refused | NSG denies traffic | Add Allow rule with correct source/dest/port |

---

## 7. High Availability & Disaster Recovery

### 7.1 Multi-Region Failover

**GCP Setup**:

```bash
# Create failover route policy
gcloud compute network-endpoint-groups create primary-neg \
  --network-endpoint-type=GCE_VM_IP \
  --network=prod-vpc \
  --zone=us-central1-a

gcloud compute network-endpoint-groups create secondary-neg \
  --network-endpoint-type=GCE_VM_IP \
  --network=prod-vpc \
  --zone=us-east1-b

# Backend service with failover
gcloud compute backend-services create prod-backend \
  --global \
  --protocol=HTTPS \
  --health-checks=prod-health-check

# Add backends with failover policy
gcloud compute backend-services add-backend prod-backend \
  --instance-group=primary-neg \
  --global \
  --failover-ratio=0.5
```

**Azure Setup**:

```bash
# Create Traffic Manager profile (failover)
az network traffic-manager profile create \
  --resource-group prod-network-rg \
  --name prod-tm-profile \
  --routing-method Failover

# Add endpoints
az network traffic-manager endpoint create \
  --resource-group prod-network-rg \
  --profile-name prod-tm-profile \
  --name primary-endpoint \
  --endpoint-location eastus \
  --endpoint-type azureEndpoints \
  --target <PRIMARY_LB_IP>

az network traffic-manager endpoint create \
  --resource-group prod-network-rg \
  --profile-name prod-tm-profile \
  --name secondary-endpoint \
  --endpoint-location westus \
  --endpoint-type azureEndpoints \
  --target <SECONDARY_LB_IP>
```

### 7.2 Backup VPN Tunnel

```bash
# GCP: Create secondary VPN tunnel for failover
gcloud compute vpn-tunnels create prod-to-azure-backup \
  --vpn-gateway=prod-vpn-gateway \
  --peer-external-gateway=azure-vpn-gateway \
  --peer-external-gateway-interface=1 \
  --region=us-central1 \
  --shared-secret=<BACKUP_SECRET>

# Configure BGP with preference
gcloud compute routers update prod-bgp-router \
  --region=us-central1 \
  --route-priority-backup=<BACKUP_TUNNEL_PRIORITY>
```

---

## 8. Validation Checklist

### Pre-Production Checklist

- [ ] VPC/VNet created with correct CIDR range
- [ ] Subnets allocated per deployment segment
- [ ] Firewall/NSG rules follow least-privilege principle
- [ ] Routes tested with `nc` and `mtr` commands
- [ ] NAT gateway configured and tested
- [ ] VPN/BGP tunnel established and BGP peers showing "Established"
- [ ] Asymmetric routing analyzed and resolved
- [ ] Health checks configured and passing
- [ ] Monitoring alerts configured for critical metrics
- [ ] Disaster recovery tested (failover works)
- [ ] Documentation updated with production IPs/GW IPs

### Post-Deployment Monitoring

```bash
# Daily health check (GCP)
gcloud compute routers get-status prod-bgp-router --region=us-central1

# Daily health check (Azure)
az network vnet-gateway bgp-peer-status list --resource-group prod-network-rg --gateway-name prod-vpn-gateway

# Check for asymmetric routes monthly
# GCP: gcloud compute routers get-status ... | grep "advertised_routes"
# Azure: az network nic show-effective-route-table ...
```

---

## 9. Rollback Procedures

### Revert Network Changes

**GCP Rollback**:

```bash
# Remove firewall rule (if needed)
gcloud compute firewall-rules delete <RULE_NAME> --quiet

# Remove route
gcloud compute routes delete <ROUTE_NAME> --quiet

# Remove peering
gcloud compute networks peerings delete <PEERING_NAME> --network=prod-vpc --quiet
```

**Azure Rollback**:

```bash
# Remove NSG rule
az network nsg rule delete \
  --resource-group prod-network-rg \
  --nsg-name <NSG_NAME> \
  --name <RULE_NAME>

# Remove route
az network route-table route delete \
  --resource-group prod-network-rg \
  --route-table-name <RT_NAME> \
  --name <ROUTE_NAME>

# Remove peering
az network vnet peering delete \
  --resource-group prod-network-rg \
  --vnet-name prod-vnet \
  --name <PEERING_NAME>
```

---

## 10. Essential Commands Reference

**GCP Network Debugging**:
```bash
gcloud compute networks describe <VPC>
gcloud compute networks subnets list --network=<VPC>
gcloud compute firewall-rules list --filter="network:<VPC>"
gcloud compute routers get-status <ROUTER> --region=<REGION>
gcloud compute vpn-tunnels describe <TUNNEL> --region=<REGION>
```

**Azure Network Debugging**:
```bash
az network vnet show --resource-group <RG> --name <VNET>
az network vnet subnet list --resource-group <RG> --vnet-name <VNET>
az network nsg list --resource-group <RG>
az network vnet-gateway bgp-peer-status list --resource-group <RG> --gateway-name <GW>
az network vpn-connection show --resource-group <RG> --name <CONN>
```

**Network Diagnostics**:
```bash
# Check connectivity to port
nc -zv <HOST> <PORT>

# Trace route and performance
mtr -r -c 100 <DESTINATION>

# Check local routing table
route -n (Linux) or netstat -rn (macOS)

# Check effective routes for VM
route get <DESTINATION> (macOS) or ip route get <DESTINATION> (Linux)
```

---

**Last Updated**: January 2026
**Maintained by**: Network Engineering Team
**Version**: 1.0.0

