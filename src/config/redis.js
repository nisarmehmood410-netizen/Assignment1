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
    lazyConnect: true,
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
    // If already connected and ready, just test with ping
    if (redisClient.status === 'ready') {
      const pong = await redisClient.ping();
      if (pong === 'PONG') {
        console.log('✅ Redis connection validated successfully');
        return true;
      }
    }

    // Try to connect with timeout
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );

    await Promise.race([connectPromise, timeoutPromise]);

    // Test connection with ping
    const pong = await redisClient.ping();
    if (pong === 'PONG') {
      console.log('✅ Redis connection validated successfully');
      return true;
    }
    return false;
  } catch (error) {
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error('Redis connection timeout - server may be unreachable');
      console.error('   Check your REDIS_HOST, REDIS_PORT, and network connectivity');
    } else {
      console.error('Redis connection validation failed:', error.message);
    }
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