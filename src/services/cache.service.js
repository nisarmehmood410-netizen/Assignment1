const redisClient = require('../config/redis');

async function ensureConnection() {
  if (!redisClient) {
    return false;
  }

  if (redisClient.status === 'ready' || redisClient.status === 'connecting') {
    return true;
  }

  try {
    await redisClient.connect();
    return true;
  } catch {
    return false;
  }
}

async function getCachedValue(key) {
  const isConnected = await ensureConnection();

  if (!isConnected) {
    return null;
  }

  try {
    const payload = await redisClient.get(key);
    return payload ? JSON.parse(payload) : null;
  } catch {
    return null;
  }
}

async function setCachedValue(key, value, ttlSeconds = 120) {
  const isConnected = await ensureConnection();

  if (!isConnected) {
    return;
  }

  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Silent fail - continue without cache
  }
}

async function clearByPattern(pattern) {
  const isConnected = await ensureConnection();

  if (!isConnected) {
    return;
  }

  try {
    const keys = await redisClient.keys(pattern);

    if (keys.length) {
      await redisClient.del(keys);
    }
  } catch {
    // Silent fail - continue without cache clearing
  }
}

module.exports = {
  getCachedValue,
  setCachedValue,
  clearByPattern
};
