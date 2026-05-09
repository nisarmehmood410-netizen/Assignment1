const crypto = require('crypto');

if (!global.crypto) {
  global.crypto = crypto.webcrypto;
}

require('dotenv').config();
const app = require('./app');
const cosmosDB = require('./config/cosmos');
const env = require('./config/env');
const { validateRedisConnection } = require('./config/redis');

async function startServer() {
  try {
    console.log('🚀 Starting application...');

    app.listen(env.port, () => {
      console.log(`🌐 Server running on port ${env.port}`);
    });
    // Connect to database first
    console.log('📦 Connecting to Cosmos DB...');
    await cosmosDB.connect();
    console.log('✅ Cosmos DB connected successfully');

    // Validate Redis connection
    console.log(' Validating Redis connection...');
    const redisConnected = await validateRedisConnection();

    if (!redisConnected) {
      console.warn(' Redis is not connected - application will run without caching');
      console.warn('   To enable Redis, add these to your .env file:');
      console.warn('   REDIS_HOST=your-redis-host');
      console.warn('   REDIS_PORT=6380');
      console.warn('   REDIS_PASSWORD=your-redis-password');
      console.warn('   See .env.example for configuration examples');
    } else {
      console.log('✅ Redis connection validated');
    }
    // Start the server
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
