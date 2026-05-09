const { CosmosClient } = require('@azure/cosmos');
const env = require('./env');

class CosmosDBService {
  constructor() {
    this.client = null;
    this.database = null;
    this.containers = {};
  }

  async connect() {
    try {
      this.client = new CosmosClient({
        endpoint: env.cosmosDb.endpoint,
        key: env.cosmosDb.key
      });

      const { database } = await this.client.databases.createIfNotExists({
        id: env.cosmosDb.databaseId
      });

      this.database = database;

      await this.initializeContainers();

      console.log('✅ Connected to Azure Cosmos DB');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Cosmos DB:', error.message);
      throw error;
    }
  };

  async initializeContainers() {
    const containerDefinitions = [
      { id: 'users', partitionKey: '/id' },
      { id: 'images', partitionKey: '/creatorId' },
      { id: 'comments', partitionKey: '/imageId' },
      { id: 'ratings', partitionKey: '/imageId' },
      { id: 'notifications', partitionKey: '/recipientId' }
    ];

    for (const containerDef of containerDefinitions) {
      const { container } = await this.database.containers.createIfNotExists({
        id: containerDef.id,
        partitionKey: {
          paths: [containerDef.partitionKey]
        }
      });

      this.containers[containerDef.id] = container;
    }
  }

  getContainer(containerName) {
    if (!this.containers[containerName]) {
      throw new Error(`Container '${containerName}' not initialized`);
    }
    return this.containers[containerName];
  }

  // Generic CRUD operations
  async createItem(containerName, item) {
    const container = this.getContainer(containerName);
    const { resource } = await container.items.create(item);
    return resource;
  }

  async getItem(containerName, itemId, partitionKey) {
    const container = this.getContainer(containerName);
    const { resource } = await container.item(itemId, partitionKey).read();
    return resource;
  }

  async updateItem(containerName, itemId, partitionKey, item) {
    const container = this.getContainer(containerName);
    const { resource } = await container.item(itemId, partitionKey).replace(item);
    return resource;
  }

  async deleteItem(containerName, itemId, partitionKey) {
    const container = this.getContainer(containerName);
    await container.item(itemId, partitionKey).delete();
  }

  async queryItems(containerName, querySpec, options = {}) {
    const container = this.getContainer(containerName);
    const { resources } = await container.items.query(querySpec, options).fetchAll();
    return resources;
  }

  async findItem(containerName, filter, options = {}) {
    const querySpec = {
      query: `SELECT * FROM c WHERE ${filter}`,
      ...options
    };
    const items = await this.queryItems(containerName, querySpec);
    return items.length > 0 ? items[0] : null;
  }

  async findManyItems(containerName, filter, options = {}) {
    const querySpec = {
      query: `SELECT * FROM c WHERE ${filter}`,
      ...options
    };
    return await this.queryItems(containerName, querySpec);
  }
}

// Create singleton instance
const cosmosDBService = new CosmosDBService();

module.exports = cosmosDBService;
