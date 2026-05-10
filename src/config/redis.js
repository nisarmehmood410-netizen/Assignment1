const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;

// Create Redis client if credentials are available
if (env.redisHost && env.redisPassword) {
  redisClient = new Redis({
    host: env.redisHost,
    port: Number(env.redisPort),
    password: env.redisPassword,
    tls: {},
    retryStrategy: null,
    connectTimeout: 10000,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    reconnectOnError: () => false
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('🔗 Redis connecting...');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis connected successfully and ready');
  });

  redisClient.on('close', () => {
    console.warn('Redis connection closed');
  });

  redisClient.on('end', () => {
    console.warn('🔌 Redis connection ended');
  });
}

// Connection validation function
async function validateRedisConnection() {
  if (!redisClient) {
    console.warn('Redis client not initialized - missing REDIS_HOST or REDIS_PASSWORD');
    return false;
  }

  try {
    // Just check the status or perform a quick ping if it's already attempting to connect
    if (redisClient.status === 'ready') {
      const pong = await redisClient.ping();
      return pong === 'PONG';
    }

    // If it's not ready, it will NOT automatically retry due to retryStrategy: null
    // We just return false as we don't want to force a manual connection with retries
    return false;
  } catch (error) {
    console.error('Redis connection validation failed:', error.message);
    return false;
  }
}

// Get Redis status
function getRedisStatus() {
  if (!redisClient) {
    return { connected: false, status: 'not_initialized', error: 'Redis client not initialized' };
  }

  return {
    connected: redisClient.status === 'ready',
    status: redisClient.status,
    host: env.redisHost,
    port: env.redisPort
  };
}

module.exports = redisClient;
module.exports.validateRedisConnection = validateRedisConnection;
module.exports.getRedisStatus = getRedisStatus;