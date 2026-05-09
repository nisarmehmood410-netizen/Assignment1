/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           description: User unique identifier
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           description: User username
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         role:
 *           type: string
 *           enum: [creator, consumer]
 *           description: User role in the system
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 */
const bcrypt = require('bcryptjs');
const cosmosDB = require('../config/cosmos');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(userData) {
    this.id = userData.id || uuidv4();
    this.username = userData.username;
    this.email = userData.email;
    this.password = userData.password;
    this.role = userData.role;
    this.createdAt = userData.createdAt || new Date().toISOString();
    this.updatedAt = userData.updatedAt || new Date().toISOString();
    this.type = 'user'; // For Cosmos DB type discrimination
  }

  // Hash password before saving
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  // Compare password method
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Convert to public JSON (exclude password)
  toPublicJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt
    };
  }

  // Save user to Cosmos DB
  async save() {
    await this.hashPassword();
    this.updatedAt = new Date().toISOString();

    const result = await cosmosDB.createItem('users', this);
    return new User(result);
  }

  // Update user in Cosmos DB
  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date().toISOString();

    await this.hashPassword();

    const result = await cosmosDB.updateItem('users', this.id, this.id, this);
    return new User(result);
  }

  // Static methods
  static async findById(userId) {
    const user = await cosmosDB.getItem('users', userId, userId);
    return user ? new User(user) : null;
  }

  static async findByEmail(email) {
    const user = await cosmosDB.findItem('users', 'c.email = @email', {
      parameters: [{ name: '@email', value: email.toLowerCase() }]
    });
    return user ? new User(user) : null;
  }

  static async findByUsername(username) {
    const user = await cosmosDB.findItem('users', 'c.username = @username', {
      parameters: [{ name: '@username', value: username }]
    });
    return user ? new User(user) : null;
  }

  static async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  static async delete(userId) {
    await cosmosDB.deleteItem('users', userId, userId);
  }

  static async findMany(filter = {}, options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.type = \'user\''
    };

    // Add filters if provided
    if (filter.role) {
      querySpec.query += ' AND c.role = @role';
      querySpec.parameters = [{ name: '@role', value: filter.role }];
    }

    if (options.limit) {
      querySpec.query += ` OFFSET 0 LIMIT ${options.limit}`;
    }

    const users = await cosmosDB.queryItems('users', querySpec);
    return users.map(user => new User(user));
  }

  // Validation methods
  validate() {
    const errors = [];

    if (!this.username || this.username.length < 3 || this.username.length > 30) {
      errors.push('Username must be between 3 and 30 characters');
    }

    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Valid email is required');
    }

    if (!this.password || this.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (!this.role || !['creator', 'consumer'].includes(this.role)) {
      errors.push('Role must be either creator or consumer');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = User;
