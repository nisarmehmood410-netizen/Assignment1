const requiredVariables = [
  'COSMOS_DB_ENDPOINT',
  'COSMOS_DB_KEY',
  'COSMOS_DB_DATABASE_ID',
  'JWT_SECRET',
  'AZURE_STORAGE_CONNECTION_STRING',
  'AZURE_STORAGE_CONTAINER_NAME'
];

const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length) {
  throw new Error(`Missing environment variables: ${missingVariables.join(', ')}`);
}

// Parse Azure Storage connection string to get account name and key
function parseAzureStorageConnectionString(connectionString) {
  const parts = connectionString.split(';');
  const accountName = parts.find(p => p.startsWith('AccountName='))?.split('=')[1];
  const accountKey = parts.find(p => p.startsWith('AccountKey='))?.split('=')[1];

  if (!accountName || !accountKey) {
    throw new Error('Invalid Azure Storage connection string');
  }

  return { accountName, accountKey };
}

const azureStorage = parseAzureStorageConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5001,
  cosmosDb: {
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY,
    databaseId: process.env.COSMOS_DB_DATABASE_ID || 'photo-sharing-db'
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '3d',
  azureStorage: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    accountName: azureStorage.accountName,
    accountKey: azureStorage.accountKey,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME
  },
  redisUrl: process.env.REDIS_URL || '',
  redisHost: process.env.REDIS_HOST,
  redisPort: Number(process.env.REDIS_PORT) || 6380,
  redisPassword: process.env.REDIS_PASSWORD
};
