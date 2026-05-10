const Image = require('../models/Image');
const Comment = require('../models/Comment');
const Rating = require('../models/Rating');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { uploadImage } = require('../services/image.service');
const buildPagination = require('../utils/pagination');

function normalizePeople(people) {
  if (!people) {
    return [];
  }

  if (Array.isArray(people)) {
    return people.map((name) => String(name).trim()).filter(Boolean);
  }

  // Handle JSON stringified arrays
  if (typeof people === 'string' && people.trim().startsWith('[') && people.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(people);
      if (Array.isArray(parsed)) {
        return parsed.map((name) => String(name).trim()).filter(Boolean);
      }
    } catch {
      // Ignore parse error and fallback to comma separation
    }
  }

  return String(people)
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

/**
 * Helper to fetch and attach creator objects to a list of images
 * @param {Array} images - List of image objects
 * @returns {Promise<Array>} - List of image JSON objects with creator attached
 */
async function enrichImagesWithCreators(images) {
  if (!images || images.length === 0) {
    return [];
  }

  const creatorIds = [...new Set(images.map((img) => img.creatorId))];
  const creators = await Promise.all(creatorIds.map((id) => User.findById(id)));

  const creatorMap = creators.reduce((map, user) => {
    if (user) {
      map[user.id] = user.toPublicJSON();
    }
    return map;
  }, {});

  return images.map((img) => {
    const imgJSON = img.toJSON();
    imgJSON.creator = creatorMap[img.creatorId] || { id: img.creatorId, username: 'Unknown User' };
    return imgJSON;
  });
}

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

    return res.status(201).json({
      message: 'Image uploaded successfuly',
      image
    });
  } catch (error) {
    return next(error);
  }
}

async function listImages(req, res, next) {
  try {
    const { page, limit } = req.query;
    const { creatorId } = req.query;
    const pagination = buildPagination(page, limit);

    let images;
    let total = 0;

    if (creatorId) {
      images = await Image.findByCreatorId(creatorId, {
        limit: pagination.limit
      });
      total = images.length;
    } else {
      images = await Image.findRecent({
        limit: pagination.limit
      });
      total = images.length;
    }

    const imagesWithCreators = await enrichImagesWithCreators(images);

    const payload = {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      data: imagesWithCreators
    };

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}

async function getImageById(req, res, next) {
  try {
    const { id } = req.params;

    const image = await Image.findById(id);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const [comments, ratings, creator] = await Promise.all([
      Comment.findByImageId(id, { limit: 20 }),
      Rating.findByImageId(id),
      User.findById(image.creatorId)
    ]);

    return res.status(200).json({
      ...image.toJSON(),
      creator: creator ? creator.toPublicJSON() : { id: image.creatorId, username: 'Unknown User' },
      comments,
      ratings
    });
  } catch (error) {
    return next(error);
  }
}

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
    await image.update({});

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

async function addRating(req, res, next) {
  try {
    const { id } = req.params;

    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const { rating } = req.body;

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
    await image.update({});

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

async function searchImages(req, res, next) {
  try {
    const searchQuery = String(req.query.q || '').trim();

    if (!searchQuery) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const images = await Image.search(searchQuery, { limit: 20 });

    const imagesWithCreators = await enrichImagesWithCreators(images);

    const payload = {
      query: searchQuery,
      count: images.length,
      data: imagesWithCreators
    };

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
