const Image = require('../models/Image');
const Comment = require('../models/Comment');
const Rating = require('../models/Rating');
const Notification = require('../models/Notification');
const { uploadImage } = require('../services/image.service');
const { getCachedValue, setCachedValue, clearByPattern } = require('../services/cache.service');
const buildPagination = require('../utils/pagination');

function normalizePeople(people) {
  if (!people) {
    return [];
  }

  if (Array.isArray(people)) {
    return people.map((name) => String(name).trim()).filter(Boolean);
  }

  return String(people)
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

/**
 * @swagger
 * /api/images/upload:
 *   post:
 *     summary: Upload a new image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - title
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (max 5MB)
 *               title:
 *                 type: string
 *                 maxLength: 120
 *                 description: Image title
 *                 example: Sunset at the beach
 *               caption:
 *                 type: string
 *                 maxLength: 500
 *                 description: Image description or caption
 *                 example: Beautiful sunset captured during evening walk
 *               location:
 *                 type: string
 *                 maxLength: 120
 *                 description: Where the photo was taken
 *                 example: Santa Monica Beach, CA
 *               people:
 *                 type: string
 *                 description: Comma-separated list of people tagged in the photo
 *                 example: John Doe, Jane Smith
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Image uploaded successfully
 *                 image:
 *                   $ref: '#/components/schemas/Image'
 *       400:
 *         description: Validation error or missing file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Creator role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const uploadResult = await uploadImage(req.file.buffer, req.file.originalname);

    const image = await Image.create({
      title: req.body.title,
      caption: req.body.caption,
      location: req.body.location,
      people: normalizePeople(req.body.people),
      url: uploadResult.url,
      publicId: uploadResult.public_id,
      creatorId: req.user.id
    });

    await clearByPattern('images:*');
    await clearByPattern('search:*');

    return res.status(201).json({
      message: 'Image uploaded successfully',
      image
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * @swagger
 * /api/images:
 *   get:
 *     summary: Get paginated list of images
 *     tags: [Images]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of images per page
 *       - in: query
 *         name: creatorId
 *         schema:
 *           type: string
 *         description: Filter images by creator ID
 *     responses:
 *       200:
 *         description: List of images retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function listImages(req, res, next) {
  try {
    const { page, limit } = req.query;
    const { creatorId } = req.query;
    const pagination = buildPagination(page, limit);

    const cacheKey = `images:${pagination.page}:${pagination.limit}:${creatorId || 'all'}`;
    const cachedPayload = await getCachedValue(cacheKey);

    if (cachedPayload) {
      return res.status(200).json(cachedPayload);
    }

    let images;
    let total = 0;

    if (creatorId) {
      // Get images by creator
      images = await Image.findByCreatorId(creatorId, {
        limit: pagination.limit
      });
      total = images.length;
    } else {
      // Get all recent images
      images = await Image.findRecent({
        limit: pagination.limit
      });
      total = images.length;
    }

    const payload = {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      data: images
    };

    await setCachedValue(cacheKey, payload, 90);

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}

/**
 * @swagger
 * /api/images/{id}:
 *   get:
 *     summary: Get image by ID with comments and ratings
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               allOf:
 *                 - $ref: '#/components/schemas/Image'
 *                 - type: object
 *                   properties:
 *                     comments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Comment'
 *                     ratings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Invalid image ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function getImageById(req, res, next) {
  try {
    const { id } = req.params;

    const image = await Image.findById(id);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const [comments, ratings] = await Promise.all([
      Comment.findByImageId(id, { limit: 20 }),
      Rating.findByImageId(id)
    ]);

    return res.status(200).json({
      ...image.toJSON(),
      comments,
      ratings
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * @swagger
 * /api/images/{id}/comments:
 *   post:
 *     summary: Add a comment to an image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Image ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 300
 *                 description: Comment text
 *                 example: Amazing photo! Love the colors.
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment added successfully
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Consumer role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function addComment(req, res, next) {
  try {
    const { id } = req.params;

    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const comment = await Comment.create({
      imageId: id,
      userId: req.user.id,
      userName: req.user.username,
      text: req.body.text
    });

    image.commentCount += 1;
    await image.save();

    await clearByPattern('images:*');
    await clearByPattern('search:*');

    // Create notification for image owner
    await Notification.createCommentNotification(
      image.id,
      req.user.id,
      image.creatorId,
      req.body.text
    );

    return res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * @swagger
 * /api/images/{id}/rate:
 *   post:
 *     summary: Rate an image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Image ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating value from 1 to 5
 *                 example: 4
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Rating submitted successfully
 *                 averageRating:
 *                   type: number
 *                   format: float
 *                   minimum: 0
 *                   maximum: 5
 *                   description: Updated average rating
 *                   example: 4.2
 *                 ratingCount:
 *                   type: integer
 *                   minimum: 0
 *                   description: Total number of ratings
 *                   example: 15
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Consumer role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function addRating(req, res, next) {
  try {
    const { id } = req.params;

    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const { rating } = req.body;

    // Check for existing rating by this user
    const existingRating = await Rating.findByUserAndImage(req.user.id, id);
    let isNewRating = false;

    if (existingRating) {
      existingRating.rating = rating;
      await existingRating.update({ rating });
    } else {
      isNewRating = true;
      await Rating.create({
        imageId: id,
        userId: req.user.id,
        rating
      });
    }

    const stats = await Rating.aggregateStats(id);

    image.averageRating = stats.averageRating || 0;
    image.ratingCount = stats.ratingCount || 0;
    await image.save();

    await clearByPattern('images:*');
    await clearByPattern('search:*');

    // Create notification for image owner (only on first rating)
    if (isNewRating) {
      await Notification.createLikeNotification(
        image.id,
        req.user.id,
        image.creatorId
      );
    }

    return res.status(200).json({
      message: 'Rating submitted successfully',
      averageRating: Number(image.averageRating.toFixed(1)),
      ratingCount: image.ratingCount
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search images by title or caption
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: sunset
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *       400:
 *         description: Missing search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function searchImages(req, res, next) {
  try {
    const searchQuery = String(req.query.q || '').trim();

    if (!searchQuery) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const cacheKey = `search:${searchQuery.toLowerCase()}`;
    const cachedPayload = await getCachedValue(cacheKey);

    if (cachedPayload) {
      return res.status(200).json(cachedPayload);
    }

    const images = await Image.search(searchQuery, { limit: 20 });

    const payload = {
      query: searchQuery,
      count: images.length,
      data: images
    };

    await setCachedValue(cacheKey, payload, 120);

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  upload,
  listImages,
  getImageById,
  addComment,
  addRating,
  searchImages
};
