# Apache Kafka Operations & Infrastructure Runbook

## 1. Overview

This runbook covers production operational procedures for deploying, managing, and troubleshooting Apache Kafka clusters, including broker management, topic administration, producer/consumer operations, and disaster recovery.

**Scope**: Kafka cluster setup, topic management, performance tuning, monitoring, troubleshooting
**Target Audience**: DevOps engineers, SREs, platform engineers, Kafka administrators
**Prerequisite**: CONCEPT.md (architecture, core concepts)

---

## 2. Kafka Cluster Deployment

### 2.1 Broker Configuration (Production)

**Broker Properties** (`server.properties`):

```properties
# Basic Configuration
broker.id=1                                    # Unique ID per broker
listeners=PLAINTEXT://kafka-broker-1:9092,SSL://kafka-broker-1:9093
advertised.listeners=PLAINTEXT://kafka-broker-1:9092,SSL://kafka-broker-1:9093
listener.security.protocol.map=PLAINTEXT:PLAINTEXT,SSL:SSL

# Zookeeper/KRaft Coordination
zookeeper.connect=zk-1:2181,zk-2:2181,zk-3:2181
zookeeper.session.timeout.ms=18000

# Log Configuration
log.dirs=/var/kafka-logs
log.retention.hours=168                       # 7 days
log.retention.bytes=1073741824                # 1 GB per partition
log.segment.bytes=1073741824                  # 1 GB segments
log.cleanup.policy=delete                     # or 'compact' for compacted topics

# Performance Tuning
num.network.threads=8
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Replication
min.insync.replicas=2
default.replication.factor=3
auto.leader.rebalance.enable=true

# Topic Defaults
num.partitions=3
default.replication.factor=3
auto.create.topics.enable=false               # Explicitly create topics

# Metrics & Monitoring
metrics.num.samples=3
metrics.sample.window.ms=30000
```

### 2.2 Kubernetes Deployment (Strimzi Operator)

**Install Strimzi Operator**:

```bash
# Add Helm repository
helm repo add strimzi https://strimzi.io/charts
helm repo update

# Install operator
helm install strimzi strimzi/strimzi-kafka-operator \
  --namespace kafka \
  --create-namespace \
  --set watchAnyNamespace=true

# Verify operator running
kubectl get pods -n kafka
```

**Create Kafka Cluster**:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: prod-cluster
  namespace: kafka
spec:
  # Broker Configuration
  kafka:
    version: 3.7.0
    replicas: 3
    
    listeners:
    - name: plain
      port: 9092
      type: internal
      tls: false
    - name: tls
      port: 9093
      type: internal
      tls: true
    - name: external
      port: 9094
      type: loadbalancer
      tls: true
    
    config:
      log.retention.hours: 168
      log.retention.bytes: 1073741824
      num.network.threads: 8
      num.io.threads: 8
      min.insync.replicas: 2
      auto.create.topics.enable: "false"
      compression.type: "snappy"
    
    # Storage
    storage:
      type: persistent-claim
      size: 100Gi
      class: fast-ssd
    
    # Resources
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
    
    # Pod Disruption Budget
    template:
      pod:
        terminationGracePeriodSeconds: 300
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                  - key: strimzi.io/cluster
                    operator: In
                    values:
                    - prod-cluster
                topologyKey: kubernetes.io/hostname
  
  # Zookeeper Configuration (or use KRaft mode)
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
      class: fast-ssd
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1"
        memory: "2Gi"
  
  # Cluster Operator
  entityOperator:
    topicOperator:
      watchedNamespace: kafka
      reconciliationIntervalSeconds: 60
    userOperator:
      watchedNamespace: kafka
```

**Deploy cluster**:

```bash
kubectl apply -f kafka-cluster.yaml

# Monitor rollout
kubectl get kafka prod-cluster -n kafka -w
kubectl describe kafka prod-cluster -n kafka

# Verify brokers
kubectl get pods -n kafka -l strimzi.io/cluster=prod-cluster
```

---

## 3. Topic Management

### 3.1 Creating Topics

**Using Kafka CLI**:

```bash
# Create topic with 3 partitions, replication factor 3
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 3 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config compression.type=snappy

# Verify creation
kafka-topics.sh --describe \
  --bootstrap-server localhost:9092 \
  --topic orders
```

**Using Kubernetes CRD** (Strimzi):

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: orders
  namespace: kafka
  labels:
    strimzi.io/cluster: prod-cluster
spec:
  partitions: 3
  replicationFactor: 3
  config:
    retention.ms: 604800000              # 7 days
    compression.type: snappy
    segment.ms: 86400000                 # 1 day segments
    cleanup.policy: delete
    min.cleanable.dirty.ratio: 0.5
```

**Topic Configuration Best Practices**:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: user-events
  namespace: kafka
spec:
  partitions: 6                           # Scale based on throughput
  replicationFactor: 3                    # HA requirement
  config:
    retention.ms: 2592000000              # 30 days for events
    compression.type: snappy              # Reduce disk usage
    segment.ms: 3600000                   # 1 hour segments
    cleanup.policy: delete                # TTL-based cleanup
    min.insync.replicas: 2                # Durability
    leader.imbalance.check.interval.seconds: 300
```

### 3.2 Partition Reassignment

**Rebalance Partitions** (balance broker load):

```bash
# Generate reassignment plan
kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --topics-to-move-json-file topics.json \
  --broker-list "1,2,3" \
  --generate > reassignment.json

# Cat topics.json:
{
  "topics": [
    {"topic": "orders"},
    {"topic": "user-events"}
  ],
  "version": 1
}

# Review plan
cat reassignment.json

# Execute reassignment
kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json \
  --execute

# Monitor progress
kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json \
  --verify
```

**Scaling Partitions** (increase parallelism):

```bash
# Add partitions (can only increase, not decrease)
kafka-topics.sh --alter \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 6

# Verify
kafka-topics.sh --describe \
  --bootstrap-server localhost:9092 \
  --topic orders
```

---

## 4. Producer Operations

### 4.1 Producer Configuration (Performance)

```properties
# Batch Settings (for high throughput)
batch.size=32768                     # 32 KB batches
linger.ms=100                        # Wait 100ms to batch
compression.type=snappy              # Reduce network/disk

# Reliability (trade-off with latency)
acks=all                             # Wait for all replicas (durability)
retries=2147483647                   # Retry indefinitely
max.in.flight.requests.per.connection=5  # Pipeline for throughput

# Timeouts
request.timeout.ms=30000             # 30 seconds
delivery.timeout.ms=300000           # 5 minutes total

# Buffer Management
buffer.memory=67108864               # 64 MB buffer pool
```

### 4.2 Monitoring Producer Performance

```bash
# Monitor producer metrics
kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --property parse.key=true \
  --property key.separator=:

# In another terminal, monitor JMX metrics
jconsole -Dcom.sun.jndi.ldap.connect.pool=false

# Check producer metrics via JMX:
# kafka.producer:type=producer-metrics,client-id=*
#   - record-send-rate (messages/sec)
#   - record-error-rate (errors/sec)
#   - record-queue-time-avg (batching delay)
```

---

## 5. Consumer Operations

### 5.1 Consumer Configuration

```properties
# Offset Management
group.id=order-processing-service
auto.offset.reset=earliest           # Start from beginning if no offset found
enable.auto.commit=false              # Manual offset management (safer)
auto.commit.interval.ms=1000         # If auto-commit enabled

# Performance
fetch.min.bytes=1024
fetch.max.wait.ms=500
max.partition.fetch.bytes=1048576    # 1 MB per partition
session.timeout.ms=30000

# Rebalancing
heartbeat.interval.ms=10000          # Send heartbeat every 10 sec
max.poll.records=500
max.poll.interval.ms=300000          # 5 minutes to process records

# Isolation Level
isolation.level=read_committed       # Only committed messages
```

### 5.2 Consumer Group Management

**List Consumer Groups**:

```bash
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --list

# Output:
# order-processing-service
# user-events-processor
# analytics-consumer
```

**Monitor Consumer Group**:

```bash
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processing-service \
  --describe

# Output shows:
# TOPIC          PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG     CONSUMER-ID
# orders         0          1000            1500            500     consumer-1
# orders         1          2000            2000            0       consumer-2
# orders         2          1800            2000            200     consumer-3
```

**Reset Consumer Offset**:

```bash
# Reset to earliest (from beginning)
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processing-service \
  --topic orders \
  --reset-offsets \
  --to-earliest \
  --execute

# Reset to specific offset
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processing-service \
  --topic orders \
  --reset-offsets \
  --to-offset 1000 \
  --execute

# Reset to timestamp
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processing-service \
  --topic orders \
  --reset-offsets \
  --to-datetime 2024-01-15T10:00:00.000 \
  --execute
```

---

## 6. Monitoring & Alerting

### 6.1 Key Metrics

```bash
# Broker Health
# kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions
# Alert if > 0 (indicates replica lag)

# Consumer Lag
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processing-service \
  --describe | awk '{if ($5 > 1000) print "HIGH LAG: " $0}'

# Alert if LAG > threshold (e.g., 1000 messages)

# Broker Disk Usage
kafka-log-dirs.sh \
  --bootstrap-server localhost:9092 \
  --describe

# Alert if disk usage > 80%

# Replication Status
kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# Alert if any output (indicates failed replicas)
```

### 6.2 Prometheus Metrics

```yaml
# ServiceMonitor for Strimzi (Prometheus Operator)
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kafka-metrics
  namespace: kafka
spec:
  selector:
    matchLabels:
      strimzi.io/cluster: prod-cluster
  endpoints:
  - port: metrics
    interval: 30s
```

**Key Alert Rules**:

```yaml
groups:
- name: kafka.rules
  interval: 30s
  rules:
  - alert: KafkaUnderReplicatedPartitions
    expr: kafka_server_replicamanager_underreplicatedpartitions > 0
    for: 5m
    annotations:
      summary: "Kafka under-replicated partitions: {{ $value }}"
  
  - alert: KafkaConsumerLagHigh
    expr: kafka_consumer_lag{consumer_group=~"order.*"} > 10000
    for: 10m
    annotations:
      summary: "Consumer group {{ $labels.consumer_group }} lag: {{ $value }}"
  
  - alert: KafraBrokerDiskUsage
    expr: kafka_log_log_size_bytes / kafka_log_log_max_size_bytes > 0.8
    for: 5m
    annotations:
      summary: "Broker {{ $labels.broker_id }} disk usage: {{ $value | humanizePercentage }}"
```

---

## 7. Troubleshooting

### 7.1 Broker Issues

**Broker Won't Start**:

```bash
# Check logs
tail -f /var/log/kafka/server.log | grep ERROR

# Common issues:
# 1. Port already in use
lsof -i :9092

# 2. Broker ID conflict
kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# 3. Zookeeper connection failed
zookeeper-shell.sh localhost:2181 ls /brokers/ids
```

**Leader Election Issues**:

```bash
# Check controller status
zookeeper-shell.sh localhost:2181 get /controller

# Check broker leadership
kafka-topics.sh --describe \
  --bootstrap-server localhost:9092 \
  --topic orders

# Expected: Different leader for each partition
# If all partitions same leader: rebalance needed
```

### 7.2 Consumer Issues

**High Consumer Lag**:

```bash
# 1. Check consumer status
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group slow-consumer \
  --describe

# 2. Check partition assignment
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group slow-consumer \
  --describe --members

# 3. Increase consumer instances (up to partition count)
# 4. Tune fetch settings:
max.poll.records=1000               # Increase if memory allows
fetch.min.bytes=10240               # Larger batches

# 5. Monitor consumer processing time
# In application code:
processing_time = time.time() - start_time
metrics.histogram('message_processing_ms', processing_time * 1000)
```

**Message Loss**:

```bash
# 1. Verify producer acks setting
# Should be: acks=all

# 2. Verify min.insync.replicas >= 2
kafka-configs.sh --bootstrap-server localhost:9092 \
  --describe --entity-type topics --entity-name orders

# 3. Check replication factor
kafka-topics.sh --describe --bootstrap-server localhost:9092 \
  --topic orders

# Expected: Replication-factor: 3 (or at least 2)
```

---

## 8. Backup & Disaster Recovery

### 8.1 Topic Backup

```bash
# Export topic data to file
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --from-beginning \
  --property print.offset=true \
  --property print.partition=true > orders-backup.txt

# Or export as JSON
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --from-beginning \
  --formatter kafka.tools.DefaultMessageFormatter \
  --property print.key=true \
  --property key.deserializer=org.apache.kafka.common.serialization.StringDeserializer \
  --property value.deserializer=org.apache.kafka.common.serialization.StringDeserializer > orders-backup.json
```

### 8.2 Topic Restore

```bash
# Restore from backup
kafka-console-producer.sh \
  --broker-list localhost:9092 \
  --topic orders-restored < orders-backup.txt

# For production, use Kafka Mirror Maker or Confluent Replicator for
# better control and durability
```

---

## 9. Operational Checklists

### Pre-Production

- [ ] Cluster deployed with 3+ brokers
- [ ] Replication factor set to 3 on all topics
- [ ] min.insync.replicas = 2
- [ ] Monitoring and alerting configured
- [ ] Consumer groups created and tested
- [ ] Backup/restore procedure tested
- [ ] Load testing completed (throughput verified)
- [ ] Failover testing completed (broker down scenario)

### Daily Operations

- [ ] Check broker health (no under-replicated partitions)
- [ ] Monitor consumer lag (should be < 1000 messages)
- [ ] Verify disk usage (< 80%)
- [ ] Check for rebalancing events

### Weekly Maintenance

- [ ] Review slow consumer groups
- [ ] Optimize topic partitioning if needed
- [ ] Verify replication status
- [ ] Test backup/restore procedure

---

## 10. Performance Tuning

**High Throughput Settings**:

```properties
# Broker
num.network.threads=16
num.io.threads=16
compression.type=snappy

# Producer
batch.size=65536
linger.ms=100
compression.type=snappy

# Consumer
fetch.min.bytes=10240
fetch.max.wait.ms=500
max.partition.fetch.bytes=10485760
```

**Low Latency Settings**:

```properties
# Producer
batch.size=1024
linger.ms=10
acks=1                           # Trade-off with durability

# Consumer
fetch.min.bytes=1
fetch.max.wait.ms=100
max.poll.records=100
```

---

**Last Updated**: January 2026
**Maintained by**: Platform Engineering Team
**Version**: 1.0.0

