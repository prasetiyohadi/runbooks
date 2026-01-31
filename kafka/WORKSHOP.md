# Kafka Workshop: Hands-On Lab

## Practical Assessment

**Duration**: 90 minutes

**Objective**: Set up a local Kafka cluster using Docker, create topics, produce/consume messages, manage consumer groups, and perform partition reassignment.

---

## Part 1: Prerequisites & Environment Setup

### System Requirements
- Docker installed
- Docker Compose installed
- Basic terminal knowledge

### 1.1: Verify Docker Installation

```bash
docker --version
docker compose --version
```

---

## Part 2: Start Kafka Cluster

### 2.1: Docker Compose Configuration

Create a file named `docker-compose.yml`:

```yaml
version: '3'

services:
  zookeeper:
    image: wurstmeister/zookeeper
    container_name: zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOO_CFG_EXTRA: "server.1=zookeeper:2888:3888"

  kafka1:
    image: wurstmeister/kafka
    container_name: kafka-1
    ports:
      - "8091:9092"
    environment:
      KAFKA_ADVERTISED_HOST_NAME: kafka-1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_BROKER_ID: 1
    depends_on:
      - zookeeper

  kafka2:
    image: wurstmeister/kafka
    container_name: kafka-2
    ports:
      - "8092:9092"
    environment:
      KAFKA_ADVERTISED_HOST_NAME: kafka-2
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_BROKER_ID: 2
    depends_on:
      - zookeeper

  kafka3:
    image: wurstmeister/kafka
    container_name: kafka-3
    ports:
      - "8093:9092"
    environment:
      KAFKA_ADVERTISED_HOST_NAME: kafka-3
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_BROKER_ID: 3
    depends_on:
      - zookeeper

  kafka4:
    image: wurstmeister/kafka
    container_name: kafka-4
    ports:
      - "8094:9092"
    environment:
      KAFKA_ADVERTISED_HOST_NAME: kafka-4
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_BROKER_ID: 4
    depends_on:
      - zookeeper

  kafka5:
    image: wurstmeister/kafka
    container_name: kafka-5
    ports:
      - "8095:9092"
    environment:
      KAFKA_ADVERTISED_HOST_NAME: kafka-5
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_BROKER_ID: 5
    depends_on:
      - zookeeper

  kafka6:
    image: wurstmeister/kafka
    container_name: kafka-6
    ports:
      - "8096:9092"
    environment:
      KAFKA_ADVERTISED_HOST_NAME: kafka-6
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_BROKER_ID: 6
    depends_on:
      - zookeeper

  kafka-client:
    image: adoptopenjdk/openjdk8:jre8u372-b07-ubuntu
    container_name: kafka-client
    volumes:
      - ./data:/opt/data
    command: >
      bash -c "
        [ -d '/opt/data/kafka' ] && tail -f /dev/null || (
          apt-get update && 
          apt-get install -y iputils-ping netcat telnet wget && 
          cd /opt/data && 
          wget https://archive.apache.org/dist/kafka/2.13-2.13.1/kafka_2.13-2.13.1.tgz && 
          tar zxvf kafka_2.13-2.13.1.tgz && 
          mv kafka_2.13-2.13.1 kafka && 
          tail -f /dev/null
        )
      "
    depends_on:
      - kafka1
      - kafka2
      - kafka3

  cmak:
    image: ghcr.io/eshepelyuk/dckr/cmak-3.0.0.5:latest
    container_name: cmak
    restart: always
    ports:
      - "9000:9000"
    environment:
      ZK_HOSTS: "zookeeper:2181"
    depends_on:
      - zookeeper
```

### 2.2: Start Cluster

```bash
# Start all services
docker compose up -d

# Verify services are running
docker compose ps

# Expected output:
# kafka-1     Running
# kafka-2     Running
# kafka-3     Running
# kafka-4     Running
# kafka-5     Running
# kafka-6     Running
# zookeeper   Running
# kafka-client Running
# cmak        Running
```

### 2.3: Access Kafka Client Container

```bash
# Enter the client container
docker exec -it kafka-client bash

# Kafka tools are in /opt/data/kafka/bin/
cd /opt/data/kafka

# Verify Kafka tools are available
ls -la bin/ | grep kafka
```

---

## Part 3: Practical Assessment Tasks

### Task 1: Create Topic

```bash
cd /opt/data/kafka

# Create topic "orders-topic" with 9 partitions and replication factor 3
./bin/kafka-topics.sh --create \
  --zookeeper zookeeper:2181 \
  --topic orders-topic \
  --replication-factor 3 \
  --partitions 9

# Expected output: Created topic orders-topic.
```

**Verify Topic Creation**:

```bash
# List topics
./bin/kafka-topics.sh --list \
  --zookeeper zookeeper:2181

# Describe topic (see partition layout)
./bin/kafka-topics.sh --describe \
  --zookeeper zookeeper:2181 \
  --topic orders-topic
```

---

### Task 2: Configure Topic Retention

```bash
# Set retention to 3 hours (10800000 ms)
./bin/kafka-configs.sh --alter \
  --zookeeper zookeeper:2181 \
  --entity-type topics \
  --entity-name orders-topic \
  --add-config retention.ms=10800000

# Verify configuration
./bin/kafka-configs.sh --describe \
  --zookeeper zookeeper:2181 \
  --entity-type topics \
  --entity-name orders-topic
```

**Expected Output**:
```
Configs for topic 'orders-topic' are:
  retention.ms=10800000
```

---

### Task 3: Produce Messages (Performance Test)

```bash
# Produce 100 messages at 10 msg/s with 1KB payload and acks=all
./bin/kafka-producer-perf-test.sh \
  --topic orders-topic \
  --num-records 100 \
  --record-size 1024 \
  --throughput 10 \
  --producer-props \
    bootstrap.servers=kafka-1:9092,kafka-2:9092,kafka-3:9092 \
    acks=all

# Expected output:
# 100 records sent, 10 records/sec, avg latency X ms, max latency Y ms
```

---

### Task 4: Create Consumer Group and Consume

```bash
# Consume messages from beginning using consumer group "cg-orders"
./bin/kafka-console-consumer.sh \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --topic orders-topic \
  --group cg-orders \
  --from-beginning

# This will stream messages. Press Ctrl+C to stop.
```

---

### Task 5: Check Consumer Group Offset Lag

```bash
# Open new terminal in kafka-client
docker exec -it kafka-client bash
cd /opt/data/kafka

# Describe consumer group (see lag)
./bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --group cg-orders \
  --describe

# Expected output:
# TOPIC           PARTITION LAG  CURRENT-OFFSET  LOG-END-OFFSET
# orders-topic    0         0    100             100
# orders-topic    1         0    100             100
# ...
```

---

### Task 6: Reassign Partitions to Fewer Brokers

```bash
# Create JSON file with topic
cat > topics.json <<EOF
{
  "version": 1,
  "topics": [
    {"topic": "orders-topic"}
  ]
}
EOF

# Generate assignment for brokers 1, 2, 3 (remove 4, 5, 6)
./bin/kafka-reassign-partitions.sh \
  --zookeeper zookeeper:2181 \
  --generate \
  --topics-to-move-json-file topics.json \
  --broker-list 1,2,3 > reassign.json

# View the proposed reassignment
cat reassign.json

# Execute the reassignment
./bin/kafka-reassign-partitions.sh \
  --zookeeper zookeeper:2181 \
  --execute \
  --reassignment-json-file reassign.json

# Monitor progress (takes ~30-60 seconds)
./bin/kafka-reassign-partitions.sh \
  --zookeeper zookeeper:2181 \
  --verify \
  --reassignment-json-file reassign.json
```

---

### Task 7: Purge Topic (Delete All Messages)

```bash
# Set retention to 1 second to quickly delete messages
./bin/kafka-configs.sh --alter \
  --zookeeper zookeeper:2181 \
  --entity-type topics \
  --entity-name orders-topic \
  --add-config retention.ms=1000

# Wait 5 seconds for cleanup
sleep 5

# Verify messages are gone (consume should return nothing)
./bin/kafka-console-consumer.sh \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --topic orders-topic \
  --from-beginning \
  --timeout-ms 2000

# Restore retention to 3 hours
./bin/kafka-configs.sh --alter \
  --zookeeper zookeeper:2181 \
  --entity-type topics \
  --entity-name orders-topic \
  --add-config retention.ms=10800000
```

---

### Task 8: Produce Messages via Console

```bash
# Start interactive producer
./bin/kafka-console-producer.sh \
  --topic orders-topic \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092

# Type messages (one per line):
# order-001
# order-002
# order-003
# order-004

# Press Ctrl+C to exit
```

---

### Task 9: Consume Messages

```bash
# Open new terminal
docker exec -it kafka-client bash
cd /opt/data/kafka

# Consume messages from beginning
./bin/kafka-console-consumer.sh \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --topic orders-topic \
  --from-beginning

# Should see the 4 messages you produced above
```

---

### Task 10: Produce More Messages

```bash
# Start producer again
./bin/kafka-console-producer.sh \
  --topic orders-topic \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092

# Type more messages:
# order-005
# order-006
# order-007

# Press Ctrl+C to exit
```

---

### Task 11: Reset Consumer Group Offset

```bash
# Reset to current (latest) offset
./bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --group cg-orders \
  --reset-offsets \
  --to-latest \
  --topic orders-topic \
  --execute

# Verify new offset
./bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --group cg-orders \
  --describe
```

---

### Task 12: Reassign Partitions Back to All Brokers

```bash
# Generate assignment for all 6 brokers
./bin/kafka-reassign-partitions.sh \
  --zookeeper zookeeper:2181 \
  --generate \
  --topics-to-move-json-file topics.json \
  --broker-list 1,2,3,4,5,6 > reassign-all.json

# Execute
./bin/kafka-reassign-partitions.sh \
  --zookeeper zookeeper:2181 \
  --execute \
  --reassignment-json-file reassign-all.json

# Monitor
./bin/kafka-reassign-partitions.sh \
  --zookeeper zookeeper:2181 \
  --verify \
  --reassignment-json-file reassign-all.json
```

---

### Task 13: Fix Leader Imbalance

```bash
# Elect preferred replicas to balance leaders
./bin/kafka-preferred-replica-election.sh \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092

# Verify leadership is balanced
./bin/kafka-topics.sh --describe \
  --zookeeper zookeeper:2181 \
  --topic orders-topic
```

---

### Task 14: Delete Topic

```bash
# Delete topic "orders-topic"
./bin/kafka-topics.sh --delete \
  --zookeeper zookeeper:2181 \
  --topic orders-topic

# Verify deletion
./bin/kafka-topics.sh --list \
  --zookeeper zookeeper:2181

# Expected: orders-topic should not appear
```

---

## Part 4: Validation Checklist

- [ ] Kafka cluster started (6 brokers + Zookeeper)
- [ ] Topic created with 9 partitions and RF=3
- [ ] Retention set to 3 hours
- [ ] Produced 100 messages successfully
- [ ] Consumed messages in consumer group
- [ ] Offset lag checked and visible
- [ ] Partition reassignment to 3 brokers succeeded
- [ ] Topic purged (all messages deleted)
- [ ] Console producer worked
- [ ] Console consumer received messages
- [ ] Produced additional messages
- [ ] Consumer offset reset to latest
- [ ] Partition reassignment back to 6 brokers succeeded
- [ ] Leader rebalancing completed
- [ ] Topic deleted successfully

---

## Part 5: Cleanup

### Stop Kafka Cluster

```bash
# Exit client container
exit

# Stop all services
docker compose down

# Remove data volume (optional)
docker compose down -v
```

---

## Key Concepts Demonstrated

| Concept | Task | Learning |
|---------|------|----------|
| **Topic Creation** | Task 1 | How to create distributed topics |
| **Configuration** | Task 2 | Dynamic configs without restart |
| **Producing** | Tasks 3, 8, 10 | Message publishing with different methods |
| **Consuming** | Tasks 4, 9 | Message consumption and groups |
| **Consumer Groups** | Tasks 4, 11 | Offset tracking and resetting |
| **Partition Reassignment** | Tasks 6, 12 | Scaling operations |
| **Leader Election** | Task 13 | Balancing and failure recovery |
| **Topic Deletion** | Task 14 | Cleanup procedures |

---

## Troubleshooting

### Issue: Connection Refused

```bash
# Verify services are running
docker compose ps

# Check broker logs
docker logs kafka-1

# Verify broker is responsive
nc -zv kafka-1 9092
```

### Issue: Consumer Not Receiving Messages

```bash
# Check consumer group lag
./bin/kafka-consumer-groups.sh --describe \
  --bootstrap-server kafka-1:9092 \
  --group <group-name>

# If lag is high, check if broker is persisting data
./bin/kafka-topics.sh --describe \
  --zookeeper zookeeper:2181 \
  --topic <topic-name>
```

### Issue: Reassignment Stuck

```bash
# Check reassignment status
./bin/kafka-reassign-partitions.sh \
  --zookeeper zookeeper:2181 \
  --verify \
  --reassignment-json-file reassign.json

# If stuck, check broker logs for errors
docker logs kafka-1
```

---

## Additional Resources

- [Kafka CLI Tools](./CONCEPT.md#10-producing-messages)
- [Consumer Offset Management](./CONCEPT.md#11-consumer-offset-management)
- [Partition Reassignment](./CONCEPT.md#12-partition-reassignment)
- [Official Kafka Docs](https://kafka.apache.org/documentation/)

---

## Next Steps

1. ✅ **Completed**: Basic Kafka operations via CLI
2. 📖 **Read**: [CONCEPT.md](./CONCEPT.md) for deeper understanding
3. 🔧 **Explore**: CMAK web UI at `http://localhost:9000` for visual cluster management
4. 📊 **Monitor**: Set up Prometheus/Grafana for production monitoring
5. 🚀 **Deploy**: Run on cloud (Azure, GCP, AWS) for real workloads
