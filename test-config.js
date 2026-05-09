// Test configuration without requiring actual environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/photo-sharing';
process.env.JWT_SECRET = 'test-secret';
process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net';
process.env.AZURE_STORAGE_CONTAINER_NAME = 'images';

console.log('Testing Azure Storage config...');
try {
  require('./src/config/azure-storage');
  console.log('✅ Azure Storage config loaded successfully');
} catch (error) {
  console.log('❌ Azure Storage config error:', error.message);
}

console.log('Testing Redis config...');
try {
  require('./src/config/redis');
  console.log('✅ Redis config loaded successfully');
} catch (error) {
  console.log('❌ Redis config error:', error.message);
}

console.log('Testing image service...');
try {
  require('./src/services/image.service');
  console.log('✅ Image service loaded successfully');
} catch (error) {
  console.log('❌ Image service error:', error.message);
}

console.log('Testing env config...');
try {
  require('./src/config/env');
  console.log('✅ Environment config loaded successfully');
} catch (error) {
  console.log('❌ Environment config error:', error.message);
}

console.log('All configuration tests completed!');
