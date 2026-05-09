const Notification = require('../models/Notification');
const buildPagination = require('../utils/pagination');

// Get user notifications
async function getNotifications(req, res, next) {
  try {
    const { page, limit } = req.query;
    const { type, read } = req.query;
    const pagination = buildPagination(page, limit);

    const filter = { recipientId: req.user.id };

    if (type) {
      filter.type = type;
    }

    if (read !== undefined) {
      filter.read = read === 'true';
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter, {
        limit: pagination.limit,
        skip: pagination.skip
      }),
      Notification.count(filter)
    ]);

    const payload = {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      data: notifications
    };

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}

// Get unread notifications count
async function getUnreadCount(req, res, next) {
  try {
    const unreadCount = await Notification.count({
      recipientId: req.user.id,
      read: false
    });

    return res.status(200).json({ unreadCount });
  } catch (error) {
    return next(error);
  }
}

// Mark notification as read
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification || notification.recipientId !== req.user.id) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const updated = await notification.update({ read: true });

    return res.status(200).json({
      message: 'Notification marked as read',
      notification: updated
    });
  } catch (error) {
    return next(error);
  }
}

// Mark all notifications as read
async function markAllAsRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user.id, read: false },
      { read: true }
    );

    return res.status(200).json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    return next(error);
  }
}

// Delete notification
async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification || notification.recipientId !== req.user.id) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await Notification.delete(id, id);

    return res.status(200).json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
