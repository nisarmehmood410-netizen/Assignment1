const cosmosDB = require('../config/cosmos');
const { v4: uuidv4 } = require('uuid');

class Notification {
  constructor(notificationData) {
    this.id = notificationData.id || uuidv4();
    this.recipientId = notificationData.recipientId;
    this.senderId = notificationData.senderId;
    this.type = notificationData.type;
    this.message = notificationData.message;
    this.relatedImageId = notificationData.relatedImageId;
    this.read = notificationData.read || false;
    this.createdAt = notificationData.createdAt || new Date().toISOString();
    this.updatedAt = notificationData.updatedAt || new Date().toISOString();
    this.type = 'notification';
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    const result = await cosmosDB.createItem('notifications', this);
    return new Notification(result);
  }

  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date().toISOString();
    const result = await cosmosDB.updateItem('notifications', this.id, this.recipientId, this);
    return new Notification(result);
  }

  static async findById(notificationId) {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.type = \'notification\'',
      parameters: [{ name: '@id', value: notificationId }]
    };
    const notifications = await cosmosDB.queryItems('notifications', querySpec);
    return notifications.length > 0 ? new Notification(notifications[0]) : null;
  }

  static async findByRecipientId(recipientId, options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.recipientId = @recipientId AND c.type = \'notification\' ORDER BY c.createdAt DESC',
      parameters: [{ name: '@recipientId', value: recipientId }]
    };

    if (options.limit) {
      querySpec.query += ` OFFSET 0 LIMIT ${options.limit}`;
    }

    const notifications = await cosmosDB.queryItems('notifications', querySpec, { partitionKey: recipientId });
    return notifications.map(notification => new Notification(notification));
  }

  static async findUnreadByRecipientId(recipientId, options = {}) {
    let querySpec = {
      query: 'SELECT * FROM c WHERE c.recipientId = @recipientId AND c.read = false AND c.type = \'notification\' ORDER BY c.createdAt DESC',
      parameters: [{ name: '@recipientId', value: recipientId }]
    };

    if (options.limit) {
      querySpec.query += ` OFFSET 0 LIMIT ${options.limit}`;
    }

    const notifications = await cosmosDB.queryItems('notifications', querySpec, { partitionKey: recipientId });
    return notifications.map(notification => new Notification(notification));
  }

  static async create(notificationData) {
    const notification = new Notification(notificationData);
    return await notification.save();
  }

  static async delete(notificationId, partitionKey) {
    await cosmosDB.deleteItem('notifications', notificationId, partitionKey);
  }

  static async createLikeNotification(imageId, likerId, imageOwnerId) {
    if (likerId === imageOwnerId) {
      return null;
    }

    return Notification.create({
      recipientId: imageOwnerId,
      senderId: likerId,
      type: 'like',
      message: 'Someone liked your photo',
      relatedImageId: imageId
    });
  }

  static async createCommentNotification(imageId, commenterId, imageOwnerId, commentText) {
    if (commenterId === imageOwnerId) {
      return null;
    }

    return Notification.create({
      recipientId: imageOwnerId,
      senderId: commenterId,
      type: 'comment',
      message: `Someone commented: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      relatedImageId: imageId
    });
  }

  static async markAllAsReadForUser(recipientId) {
    const unreadNotifications = await Notification.find({ recipientId, read: false });
    const updatePromises = unreadNotifications.map(notification => notification.update({ read: true }));
    await Promise.all(updatePromises);
    return unreadNotifications.length;
  }

  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date().toISOString();
    const result = await cosmosDB.updateItem('notifications', this.id, this.recipientId, this);
    return new Notification(result);
  }

  validate() {
    const errors = [];

    if (!this.recipientId) {
      errors.push('Recipient ID is required');
    }

    if (!this.senderId) {
      errors.push('Sender ID is required');
    }

    if (!this.type || !['like', 'comment'].includes(this.type)) {
      errors.push('Type must be either like or comment');
    }

    if (!this.message || this.message.trim().length === 0) {
      errors.push('Message is required');
    }

    if (this.message && this.message.length > 500) {
      errors.push('Message must be less than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Notification;
