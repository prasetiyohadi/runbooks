# Apache Kafka: Operations & Fundamentals

Welcome to the Kafka section of the runbooks. This guide covers Kafka architecture, operations, and hands-on practices for stream processing platforms.

---

## 🚀 Quick Start

### Choose Your Learning Path

- **5-minute overview**: [What is Kafka?](./CONCEPT.md#1-what-is-apache-kafka)
- **30-minute deep dive**: Sections 1-5 in [CONCEPT.md](./CONCEPT.md)
- **90-minute hands-on lab**: [WORKSHOP.md](./WORKSHOP.md) with Docker

---

## 📚 Learning Paths

### **Beginner**: Kafka Fundamentals (30 min)

1. **[CONCEPT.md § 1](./CONCEPT.md#1-what-is-apache-kafka)** — Understand Kafka
2. **[CONCEPT.md § 2](./CONCEPT.md#2-kafka-architecture-visual-overview)** — Architecture overview
3. **[CONCEPT.md § 3](./CONCEPT.md#3-core-kafka-concepts)** — Core concepts (7 key components)
4. **[CONCEPT.md § 6](./CONCEPT.md#6-producer-and-consumer-operations)** — Producers & consumers

### **Intermediate**: Operations & Production (60 min)

1. **[CONCEPT.md § 4](./CONCEPT.md#4-kafka-cluster-coordination)** — Cluster coordination
2. **[CONCEPT.md § 5](./CONCEPT.md#5-kafka-configuration-static-vs-dynamic)** — Configuration (static & dynamic)
3. **[CONCEPT.md § 7-11](./CONCEPT.md#7-replication--durability)** — Topic management, producing, consuming, offsets
4. **[CONCEPT.md § 12](./CONCEPT.md#12-partition-reassignment)** — Scaling (partition reassignment)

### **Advanced**: Hands-On Lab (90 min)

**[WORKSHOP.md](./WORKSHOP.md)** — Complete Docker-based lab:
- 6-broker Kafka cluster + Zookeeper
- 14 practical tasks covering:
  - Topic creation and configuration
  - Producing and consuming messages
  - Consumer group management
  - Partition reassignment for scaling
  - Topic deletion and purging

---

## 🎯 Quick Reference

### Kafka Architecture Components

| Component | Role | Key Details |
|-----------|------|-------------|
| **Broker** | Core server | Stores messages, handles requests |
| **Topic** | Message channel | Logical grouping (e.g., `orders`) |
| **Partition** | Parallel stream | Subdivides topic for parallelism |
| **Replica** | Fault tolerance | Copy of partition across brokers |
| **Producer** | Sender | Publishes messages to topics |
| **Consumer** | Receiver | Subscribes to topics, reads messages |
| **Consumer Group** | Coordination | Group of consumers for same topic |

### Key Metrics to Monitor

| Metric | Definition | Good Range |
|--------|-----------|-----------|
| **Consumer Lag** | Messages behind leader | < 10K messages |
| **Throughput** | Messages/sec produced | Depends on hardware |
| **Latency** | P99 end-to-end time | < 1 second |
| **ISR Size** | In-sync replicas | == Replication factor |
| **Broker Disk** | Used space | < 80% capacity |

### ACK Levels (Producer Durability)

| ACK Value | Behavior | Risk | Latency |
|-----------|----------|------|---------|
| **acks=0** | No wait | ❌ High loss | ✅ Lowest |
| **acks=1** | Leader only | ⚠️ Medium | ⚠️ Medium |
| **acks=all** | All replicas | ✅ Very Low | ❌ Highest |

**Production Recommendation**: Use `acks=all` for critical data (orders, payments)

---

## 📖 File Guide

### CONCEPT.md (14 Sections, ~700 lines)

**Comprehensive theory guide** covering:
- [§1] What is Kafka and why it matters
- [§2] Architecture diagram with visual components
- [§3] 7 core concepts (Broker, Topic, Partition, Replica, ISR, Producer, Consumer)
- [§4] Cluster coordination (Zookeeper vs. KRaft)
- [§5] Static vs. dynamic configuration
- [§6] Producer and consumer workflows (diagrams)
- [§7] Replication and durability (failure scenarios)
- [§8-11] Topic management, producing, consuming, offset management
- [§12] Partition reassignment (scale-up, scale-down)
- [§13] Troubleshooting common issues
- [§14] Additional resources

**Diagrams included**:
- Kafka architecture overview
- Producer-consumer flow
- Replication architecture

### WORKSHOP.md (14 Tasks, ~500 lines)

**Practical hands-on lab** with Docker:
- Docker Compose setup (6 Kafka brokers + Zookeeper)
- Step-by-step tasks with expected outputs
- Covers: create topic → produce → consume → reassign → cleanup
- Validation checklist
- Troubleshooting guide

**Time breakdown**:
- Setup: 10 min
- Tasks 1-14: 60 min
- Validation: 10 min
- Cleanup: 5 min

### README.md (This file)

Navigation hub with learning paths, quick reference, and FAQs.

---

## 🔍 Common Questions

### Q: When should I use Kafka vs. RabbitMQ?

**Use Kafka when**:
- High throughput required (millions of messages/sec)
- Long-term message retention needed
- Stream processing (Apache Flink, Spark)
- Event sourcing architecture
- Multiple consumers reading same data

**Use RabbitMQ when**:
- Low-to-medium throughput
- Complex routing rules needed
- Request-reply patterns
- Simple message queuing

---

### Q: How many partitions should I create?

**Guidelines**:
- Start with `num_partitions = target_throughput / single_partition_throughput`
- Typical single partition throughput: 1-10 MB/sec
- Target: 1 consumer per partition
- If 3 consumers, minimum 3 partitions
- Can increase partitions later, but can't decrease

**Example**:
```
Target: 30 MB/sec
Single partition: 10 MB/sec
Partitions needed: 30 / 10 = 3 minimum
Consumers: Match partition count for parallelism
```

---

### Q: What replication factor should I use?

| RF | Broker Loss Tolerance | Use Case |
|----|--------|----------|
| **1** | 0 (none) | ❌ Dev/test only |
| **2** | 1 broker | ⚠️ Non-critical data |
| **3** | 2 brokers | ✅ Production (standard) |
| **4+** | 3+ brokers | High durability (extra cost) |

**Production**: Use RF=3 unless you have > 10 brokers, then RF=2 is acceptable.

---

### Q: How do I handle consumer lag?

```bash
# Check lag
kafka-consumer-groups.sh --describe --group <group-name>

# If high:
# 1. Increase consumers (up to partition count)
kafka-consumer-groups.sh --members --group <group-name>

# 2. Optimize consumer processing
# 3. Increase partitions (requires reassignment)

# 4. Temporarily increase fetch.max.bytes
kafka-configs.sh --alter --entity-type brokers \
  --entity-default --add-config fetch.max.bytes=52428800
```

---

### Q: Can I change partition count after creation?

**Yes**, but with caveats:

```bash
# Increase partitions (safe, doesn't rebalance existing data)
kafka-topics.sh --alter \
  --topic orders \
  --partitions 12

# Messages with existing keys go to same partition
# New messages distributed across all partitions
```

**You cannot decrease partitions** — would require:
1. Creating new topic with fewer partitions
2. Copying data over
3. Updating producers/consumers
4. Deleting old topic

---

### Q: How do I monitor Kafka in production?

**Essential metrics** (using Prometheus/Grafana):
- Broker disk usage
- Consumer lag per group
- ISR size per broker
- Message throughput (in/out)
- Replication latency
- Network error rate

**Tools**:
- Kafka Manager (CMAK) — Web UI for cluster management
- Burrow — LinkedIn's consumer lag monitoring
- Prometheus JMX exporter — Metrics collection
- Grafana — Visualization

---

## 📋 Next Steps After Learning

### Day 1: Setup (30 min)
1. Complete [WORKSHOP.md](./WORKSHOP.md) Docker lab
2. Run all 14 tasks end-to-end
3. Understand topic creation, producing, consuming

### Week 1: Development (2-3 hours)
1. Create topics for your application
2. Write producer client (e.g., Python, Java)
3. Write consumer client
4. Test end-to-end flow
5. Measure throughput and latency

### Week 2: Deployment (2-3 hours)
1. Design cluster topology (brokers, replication factor)
2. Set retention policies (time/size-based)
3. Configure monitoring (Prometheus + Grafana)
4. Document runbook for team

### Month 1: Optimization (4-6 hours)
1. Monitor consumer lag in production
2. Tune partition count and replication
3. Optimize producer batch settings
4. Implement alerting (lag, disk, ISR)

### Ongoing: Operations
- Weekly: Check consumer lag and disk usage
- Monthly: Review retention policies
- Quarterly: Capacity planning (partition/broker growth)

---

## 🛠️ Tools & Resources

### Local Development
- [Docker Kafka Images](https://hub.docker.com/r/wurstmeister/kafka)
- [Kafka Manager (CMAK)](https://github.com/hlebalbau/kafka-manager) — Visual cluster management
- [Kafdrop](https://github.com/obsidiandynamics/kafdrop) — Web UI alternative
- [kcat](https://github.com/edenhill/kcat) — Command-line producer/consumer

### Production Deployment
- [Confluent Cloud](https://www.confluent.io/confluent-cloud/) — Managed Kafka
- [Azure Event Hubs](https://azure.microsoft.com/services/event-hubs/) — Kafka-compatible
- [AWS MSK](https://aws.amazon.com/msk/) — Amazon Managed Streaming for Kafka
- [Strimzi](https://strimzi.io/) — Kafka on Kubernetes

### Monitoring & Operations
- [Prometheus JMX Exporter](https://github.com/prometheus/jmx_exporter)
- [Burrow](https://github.com/linkedin/Burrow) — Consumer lag monitoring
- [Kafka Connect](https://kafka.apache.org/documentation/#connect) — Data integration
- [Schema Registry](https://docs.confluent.io/platform/current/schema-registry/) — Data format management

### Official Resources
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Kafka Platform Docs](https://docs.confluent.io/)
- [Kafka Configuration Reference](https://kafka.apache.org/documentation/#brokerconfigs)

---

## ✅ Do's and ❌ Don'ts

### ✅ DO:

- ✅ Use `acks=all` for critical data (orders, payments, PII)
- ✅ Monitor consumer lag continuously
- ✅ Set retention policies (prevent unbounded disk growth)
- ✅ Use consumer groups for parallel processing
- ✅ Test partition count before production deployment
- ✅ Document topic purposes and retention rationale
- ✅ Backup consumer group offsets before reset

### ❌ DON'T:

- ❌ Use `acks=0` for critical data
- ❌ Ignore consumer lag (means data backlog)
- ❌ Create one partition per consumer (limits scaling)
- ❌ Disable replication to save disk (risk of data loss)
- ❌ Change partition count without testing
- ❌ Keep messages forever (plan retention)
- ❌ Reset consumer offsets without backup

---

## 📊 Architecture Patterns

### Pattern 1: Fan-Out (1 Producer, Multiple Consumers)

```
Producer → Topic (1 partition) → Consumer Group 1 (reads all)
                               → Consumer Group 2 (reads all)
```

**Use case**: Event streams consumed by different services (payments, notifications, analytics)

### Pattern 2: Parallel Processing (1 Producer, 1 Consumer Group)

```
Producer → Topic (3 partitions) → Consumer Group (3 consumers)
                                ├─ Consumer 1 (partition 0)
                                ├─ Consumer 2 (partition 1)
                                └─ Consumer 3 (partition 2)
```

**Use case**: High-throughput event processing

### Pattern 3: Stream Topology (Pipeline)

```
Source Topic → Consumer 1 (Filter) → Intermediate Topic
                                    → Consumer 2 (Aggregate)
                                    → Output Topic
```

**Use case**: Multi-stage data transformations

---

## 🔑 Key Takeaways

1. **Kafka is a log, not a queue** — Messages are immutable, multiple consumers read independently
2. **Partitions enable parallelism** — More partitions = more concurrent consumers
3. **Replication provides durability** — RF=3 tolerates 2 broker failures
4. **Consumer groups coordinate** — Each partition assigned to one consumer per group
5. **Offsets track position** — Enable replaying messages and resetting consumption
6. **Configuration is dual** — Static (restart needed) vs. dynamic (immediate)
7. **Monitoring is essential** — Track lag, ISR, disk, throughput
8. **Scaling is dynamic** — Add partitions and brokers without stopping

---

## 🆘 Troubleshooting Quick Links

- [Consumer Lag Issues](./CONCEPT.md#131-check-broker-connectivity)
- [Producer Failures](./CONCEPT.md#133-producer-failures)
- [Broker Connectivity](./CONCEPT.md#131-check-broker-connectivity)
- [Disk Space Issues](./CONCEPT.md#134-disk-space-issues)

---

**Last Updated**: January 2026

Questions or feedback? Check [CONTRIBUTING.md](../CONTRIBUTING.md) for how to contribute.
