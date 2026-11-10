import { Kafka } from 'kafkajs';
import { config, log } from './config.js';

const memoryTopics = new Map();

function memoryTopic(name) {
  if (!memoryTopics.has(name)) memoryTopics.set(name, { queue: [], waiters: [] });
  return memoryTopics.get(name);
}

export function createMemoryBus() {
  return {
    kind: 'memory',
    async publish(topic, message) {
      const state = memoryTopic(topic);
      state.queue.push(message);
      while (state.waiters.length && state.queue.length) {
        const waiter = state.waiters.shift();
        waiter(state.queue.shift());
      }
    },
    async consume(topic, handler) {
      const state = memoryTopic(topic);
      while (true) {
        const message = state.queue.length ? state.queue.shift() : await new Promise((resolve) => state.waiters.push(resolve));
        try {
          await handler(message);
        } catch (error) {
          log('error', 'message handler failed', { topic, error: String(error) });
        }
      }
    },
    async close() {},
  };
}

export function createKafkaBus({ brokers, clientId, groupId }) {
  const kafka = new Kafka({ brokers, clientId });
  const producer = kafka.producer();
  let connected = false;
  return {
    kind: 'kafka',
    async publish(topic, message) {
      if (!connected) {
        await producer.connect();
        connected = true;
      }
      await producer.send({ topic, messages: [{ value: JSON.stringify(message) }] });
    },
    async consume(topic, handler) {
      const consumer = kafka.consumer({ groupId });
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });
      await consumer.run({
        autoCommit: true,
        eachMessage: async ({ message }) => {
          try {
            await handler(JSON.parse(message.value.toString()));
          } catch (error) {
            log('error', 'message handler failed', { topic, error: String(error) });
          }
        },
      });
    },
    async close() {
      await producer.disconnect().catch(() => {});
    },
  };
}

let singleton = null;

export function bus() {
  if (singleton) return singleton;
  if (config.kafkaBrokers.length) {
    singleton = createKafkaBus({
      brokers: config.kafkaBrokers,
      clientId: 'ecommarketdata-crawler',
      groupId: config.consumerGroup,
    });
  } else {
    singleton = createMemoryBus();
  }
  log('info', 'bus ready', { kind: singleton.kind });
  return singleton;
}
