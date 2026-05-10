const cosmosDB = require('../config/cosmos');
const { v4: uuidv4 } = require('uuid');

class Comment {
  constructor(commentData) {
    this.id = commentData.id || uuidv4();
    this.imageId = commentData.imageId;
    this.userId = commentData.userId;
    this.text = commentData.text;
    this.userName = commentData.userName;
    this.createdAt = commentData.createdAt || new Date().toISOString();
    this.updatedAt = commentData.updatedAt || new Date().toISOString();
    this.type = 'comment';
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    const result = await cosmosDB.createItem('comments', this);
    return new Comment(result);
  }

  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date().toISOString();
    const result = await cosmosDB.updateItem('comments', this.id, this.imageId, this);
    return new Comment(result);
  }

  static async findById(commentId) {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.type = \'comment\'',
      parameters: [{ name: '@id', value: commentId }]
    };
    const comments = await cosmosDB.queryItems('comments', querySpec);
    return comments.length > 0 ? new Comment(comments[0]) : null;
  }

  static async findByImageId(imageId, options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.imageId = @imageId AND c.type = \'comment\' ORDER BY c.createdAt DESC',
      parameters: [{ name: '@imageId', value: imageId }]
    };

    if (options.limit) {
      querySpec.query += ` OFFSET 0 LIMIT ${options.limit}`;
    }

    const comments = await cosmosDB.queryItems('comments', querySpec, { partitionKey: imageId });
    return comments.map(comment => new Comment(comment));
  }

  static async findByUserId(userId, options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.userId = @userId AND c.type = \'comment\' ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }]
    };

    if (options.limit) {
      querySpec.query += ` OFFSET 0 LIMIT ${options.limit}`;
    }

    const comments = await cosmosDB.queryItems('comments', querySpec);
    return comments.map(comment => new Comment(comment));
  }

  static async create(commentData) {
    const comment = new Comment(commentData);
    return await comment.save();
  }

  static async delete(commentId, partitionKey) {
    await cosmosDB.deleteItem('comments', commentId, partitionKey);
  }

  validate() {
    const errors = [];

    if (!this.imageId) {
      errors.push('Image ID is required');
    }

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!this.text || this.text.trim().length === 0) {
      errors.push('Comment text is required');
    }

    if (this.text && this.text.length > 300) {
      errors.push('Comment must be less than 300 characters');
    }

    if (!this.userName || this.userName.trim().length === 0) {
      errors.push('User name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Comment;
