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
    retryStrategy: () => null, // Disable all retries
    connectTimeout: 5000, // Shorter timeout for faster startup if failing
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    reconnectOnError: () => false
  });

  redisClient.on('error', (err) => {
    // Only log error once if possible, but ioredis might emit multiple errors
    // during the initial connection phase.
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
    console.warn('🔌 Redis connection ended - no more retries will occur');
  });
}

// Connection validation function
async function validateRedisConnection() {
  if (!redisClient) {
    console.warn('Redis client not initialized - missing REDIS_HOST or REDIS_PASSWORD');
    return false;
  }

  // If already ready, we are good
  if (redisClient.status === 'ready') {
    return true;
  }

  // If it's already in a terminal state, it won't connect
  if (redisClient.status === 'end') {
    return false;
  }

  try {
    // Wait for the connection to either succeed or fail
    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        console.warn('Redis connection validation timed out');
        resolve(false);
      }, 6000);

      const onReady = () => {
        cleanup();
        resolve(true);
      };

      const onError = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        redisClient.removeListener('ready', onReady);
        redisClient.removeListener('error', onError);
      };

      redisClient.once('ready', onReady);
      redisClient.once('error', onError);
    });
  } catch (error) {
    console.error('Redis connection validation error:', error.message);
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