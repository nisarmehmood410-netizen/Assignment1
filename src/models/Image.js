/**
 * @swagger
 * components:
 *   schemas:
 *     Image:
 *       type: object
 *       required:
 *         - title
 *         - url
 *         - publicId
 *         - creatorId
 *       properties:
 *         id:
 *           type: string
 *           description: Image unique identifier
 *         title:
 *           type: string
 *           maxLength: 120
 *           description: Image title
 *         caption:
 *           type: string
 *           maxLength: 500
 *           description: Image description or caption
 *         location:
 *           type: string
 *           maxLength: 120
 *           description: Where the photo was taken
 *         people:
 *           type: array
 *           items:
 *             type: string
 *           description: People tagged in the photo
 *         url:
 *           type: string
 *           format: uri
 *           description: CDN URL of the uploaded image
 *         publicId:
 *           type: string
 *           description: Azure Blob Storage name for image management
 *         creatorId:
 *           type: string
 *           description: ID of the user who uploaded the image
 *         averageRating:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 5
 *           description: Average rating of the image
 *         ratingCount:
 *           type: integer
 *           minimum: 0
 *           description: Number of ratings received
 *         commentCount:
 *           type: integer
 *           minimum: 0
 *           description: Number of comments received
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Image upload timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */
const cosmosDB = require('../config/cosmos');
const { generateImageUrl } = require('../config/azure-storage');
const { v4: uuidv4 } = require('uuid');

class Image {
  constructor(imageData) {
    this.id = imageData.id || uuidv4();
    this.title = imageData.title;
    this.caption = imageData.caption || '';
    this.location = imageData.location || '';
    this.people = imageData.people || [];
    this.url = imageData.url;
    this.publicId = imageData.publicId;
    this.creatorId = imageData.creatorId;
    this.averageRating = imageData.averageRating || 0;
    this.ratingCount = imageData.ratingCount || 0;
    this.commentCount = imageData.commentCount || 0;
    this.createdAt = imageData.createdAt || new Date().toISOString();
    this.updatedAt = imageData.updatedAt || new Date().toISOString();
    this.type = 'image'; // For Cosmos DB type discrimination
  }

  getImageUrl() {
    if (this.publicId) {
      return generateImageUrl(this.publicId);
    }

    return this.url || null;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      caption: this.caption,
      location: this.location,
      people: this.people,
      url: this.url,
      imageUrl: this.getImageUrl(),
      publicId: this.publicId,
      creatorId: this.creatorId,
      averageRating: this.averageRating,
      ratingCount: this.ratingCount,
      commentCount: this.commentCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      type: this.type
    };
  }

  // Save image to Cosmos DB
  async save() {
    this.updatedAt = new Date().toISOString();

    const result = await cosmosDB.createItem('images', this);
    return new Image(result);
  }

  // Update image in Cosmos DB
  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date().toISOString();

    const result = await cosmosDB.updateItem('images', this.id, this.creatorId, this);
    return new Image(result);
  }

  // Static methods
  static async findById(imageId) {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.type = \'image\'',
      parameters: [{ name: '@id', value: imageId }]
    };
    const images = await cosmosDB.queryItems('images', querySpec);
    return images.length > 0 ? new Image(images[0]) : null;
  }

  static async findByCreatorId(creatorId, options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.creatorId = @creatorId AND c.type = \'image\'',
      parameters: [{ name: '@creatorId', value: creatorId }]
    };

    if (options.limit) {
      querySpec.query += ` ORDER BY c.createdAt DESC OFFSET 0 LIMIT ${options.limit}`;
    } else {
      querySpec.query += ' ORDER BY c.createdAt DESC';
    }

    const images = await cosmosDB.queryItems('images', querySpec);
    return images.map(image => new Image(image));
  }

  static async search(searchTerm, options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.type = \'image\' AND (CONTAINS(c.title, @searchTerm) OR CONTAINS(c.caption, @searchTerm))',
      parameters: [{ name: '@searchTerm', value: searchTerm }]
    };

    if (options.limit) {
      querySpec.query += ` ORDER BY c.createdAt DESC OFFSET 0 LIMIT ${options.limit}`;
    } else {
      querySpec.query += ' ORDER BY c.createdAt DESC';
    }

    const images = await cosmosDB.queryItems('images', querySpec);
    return images.map(image => new Image(image));
  }

  static async findRecent(options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.type = \'image\' ORDER BY c.createdAt DESC'
    };

    if (options.limit) {
      querySpec.query += ` OFFSET 0 LIMIT ${options.limit}`;
    }

    const images = await cosmosDB.queryItems('images', querySpec);
    return images.map(image => new Image(image));
  }

  static async create(imageData) {
    const image = new Image(imageData);
    return await image.save();
  }

  static async delete(imageId, creatorId) {
    await cosmosDB.deleteItem('images', imageId, creatorId);
  }

  // Update rating statistics
  async updateRatingStats(newRating, oldRating = null) {
    if (oldRating !== null) {
      // Update existing rating
      this.ratingCount = Math.max(0, this.ratingCount);
      const totalRating = (this.averageRating * this.ratingCount) - oldRating + newRating;
      this.averageRating = this.ratingCount > 0 ? totalRating / this.ratingCount : 0;
    } else {
      // Add new rating
      this.ratingCount += 1;
      const totalRating = (this.averageRating * (this.ratingCount - 1)) + newRating;
      this.averageRating = totalRating / this.ratingCount;
    }

    return await this.update({});
  }

  // Update comment count
  async updateCommentCount(increment = 1) {
    this.commentCount = Math.max(0, this.commentCount + increment);
    return await this.update({});
  }

  // Validation methods
  validate() {
    const errors = [];

    if (!this.title || this.title.length > 120) {
      errors.push('Title is required and must be less than 120 characters');
    }

    if (this.caption && this.caption.length > 500) {
      errors.push('Caption must be less than 500 characters');
    }

    if (this.location && this.location.length > 120) {
      errors.push('Location must be less than 120 characters');
    }

    if (!this.url) {
      errors.push('Image URL is required');
    }

    if (!this.publicId) {
      errors.push('Public ID is required');
    }

    if (!this.creatorId) {
      errors.push('Creator ID is required');
    }

    if (this.averageRating < 0 || this.averageRating > 5) {
      errors.push('Average rating must be between 0 and 5');
    }

    if (this.ratingCount < 0) {
      errors.push('Rating count cannot be negative');
    }

    if (this.commentCount < 0) {
      errors.push('Comment count cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Image;
