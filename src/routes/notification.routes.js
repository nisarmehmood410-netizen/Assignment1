const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notification.controller');

const router = express.Router();

// Get user notifications
router.get('/', authenticate, getNotifications);

// Get unread notifications count
router.get('/unread-count', authenticate, getUnreadCount);

// Mark notification as read
router.patch('/:id/mark-read', authenticate, markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', authenticate, markAllAsRead);

// Delete notification
router.delete('/:id', authenticate, deleteNotification);

module.exports = router;
