const cosmosDB = require('../config/cosmos');
const { v4: uuidv4 } = require('uuid');

class Rating {
  constructor(ratingData) {
    this.id = ratingData.id || uuidv4();
    this.imageId = ratingData.imageId;
    this.userId = ratingData.userId;
    this.rating = ratingData.rating;
    this.createdAt = ratingData.createdAt || new Date().toISOString();
    this.updatedAt = ratingData.updatedAt || new Date().toISOString();
    this.type = 'rating';
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    const result = await cosmosDB.createItem('ratings', this);
    return new Rating(result);
  }

  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date().toISOString();
    const result = await cosmosDB.updateItem('ratings', this.id, this.imageId, this);
    return new Rating(result);
  }

  static async findById(ratingId) {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.type = \'rating\'',
      parameters: [{ name: '@id', value: ratingId }]
    };
    const ratings = await cosmosDB.queryItems('ratings', querySpec);
    return ratings.length > 0 ? new Rating(ratings[0]) : null;
  }

  static async findByImageId(imageId, options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.imageId = @imageId AND c.type = \'rating\' ORDER BY c.createdAt DESC',
      parameters: [{ name: '@imageId', value: imageId }]
    };

    if (options.limit) {
      querySpec.query += ` OFFSET 0 LIMIT ${options.limit}`;
    }

    const ratings = await cosmosDB.queryItems('ratings', querySpec);
    return ratings.map(rating => new Rating(rating));
  }

  static async findByUserAndImage(userId, imageId) {
    const rating = await cosmosDB.findItem('ratings', 'c.userId = @userId AND c.imageId = @imageId AND c.type = \'rating\'', {
      parameters: [
        { name: '@userId', value: userId },
        { name: '@imageId', value: imageId }
      ]
    });
    return rating ? new Rating(rating) : null;
  }

  static async findByUserId(userId, options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.userId = @userId AND c.type = \'rating\' ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }]
    };

    if (options.limit) {
      querySpec.query += ` OFFSET 0 LIMIT ${options.limit}`;
    }

    const ratings = await cosmosDB.queryItems('ratings', querySpec);
    return ratings.map(rating => new Rating(rating));
  }

  static async create(ratingData) {
    const rating = new Rating(ratingData);
    return await rating.save();
  }

  static async delete(ratingId, partitionKey) {
    await cosmosDB.deleteItem('ratings', ratingId, partitionKey);
  }

  static async aggregateStats(imageId) {
    const query = 'SELECT AVG(c.rating) as averageRating, COUNT(1) as ratingCount FROM c WHERE c.type = \'rating\' AND c.imageId = @imageId';
    const parameters = [{ name: '@imageId', value: imageId }];
    const results = await cosmosDB.queryItems('ratings', { query, parameters });
    return results[0] || { averageRating: 0, ratingCount: 0 };
  }

  validate() {
    const errors = [];

    if (!this.imageId) {
      errors.push('Image ID is required');
    }

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (this.rating === undefined || this.rating === null) {
      errors.push('Rating is required');
    }

    if (this.rating < 1 || this.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate average rating for an image
  static async getAverageRating(imageId) {
    const querySpec = {
      query: 'SELECT AVG(c.rating) as averageRating, COUNT(c.id) as ratingCount FROM c WHERE c.imageId = @imageId AND c.type = \'rating\'',
      parameters: [{ name: '@imageId', value: imageId }]
    };

    const results = await cosmosDB.queryItems('ratings', querySpec);
    const result = results[0];

    return {
      averageRating: result.averageRating || 0,
      ratingCount: result.ratingCount || 0
    };
  }
}

module.exports = Rating;
