const express = require('express');
const { body, param, query } = require('express-validator');
const {
  upload,
  listImages,
  getImageById,
  addComment,
  addRating
} = require('../controllers/image.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');

const router = express.Router();

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('creatorId').optional().trim().notEmpty().withMessage('Creator id must be valid'),
    validate
  ],
  listImages
);

router.post(
  '/upload',
  authenticate,
  authorize('creator'),
  uploadMiddleware.single('image'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('caption').optional().trim().isLength({ max: 500 }).withMessage('Caption cannot exceed 500 characters'),
    body('location').optional().trim().isLength({ max: 120 }).withMessage('Location cannot exceed 120 characters'),
    validate
  ],
  upload
);

router.get(
  '/:id',
  [param('id').trim().notEmpty().withMessage('Image id is required'), validate],
  getImageById
);

router.post(
  '/:id/comments',
  authenticate,
  authorize('consumer'),
  [
    param('id').trim().notEmpty().withMessage('Image id is required'),
    body('text').trim().notEmpty().withMessage('Comment text is required').isLength({ max: 300 }).withMessage('Comment is too long'),
    validate
  ],
  addComment
);

router.post(
  '/:id/rate',
  authenticate,
  authorize('consumer'),
  [
    param('id').trim().notEmpty().withMessage('Image id is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    validate
  ],
  addRating
);

module.exports = router;
