const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Photo Sharing API',
      version: '1.0.0',
      description: 'REST API backend for a photo-sharing application with authentication, image management, and social features',
      contact: {
        name: 'API Support',
        email: 'support@photo-sharing.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://your-production-domain.com'
          : `http://localhost:${process.env.PORT || 5001}`,
        description: process.env.NODE_ENV === 'production'
          ? 'Production server'
          : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User unique identifier',
              example: '507f1f77bcf86cd799439011'
            },
            username: {
              type: 'string',
              description: 'User username',
              example: 'john_doe',
              minLength: 3,
              maxLength: 30
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com'
            },
            role: {
              type: 'string',
              enum: ['creator', 'consumer'],
              description: 'User role in the system',
              example: 'creator'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Image: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Image unique identifier',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              description: 'Image title',
              example: 'Sunset at the beach',
              maxLength: 120
            },
            caption: {
              type: 'string',
              description: 'Image description or caption',
              example: 'Beautiful sunset captured during evening walk',
              maxLength: 500
            },
            location: {
              type: 'string',
              description: 'Where the photo was taken',
              example: 'Santa Monica Beach, CA',
              maxLength: 120
            },
            people: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'People tagged in the photo',
              example: ['John Doe', 'Jane Smith']
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'CDN URL of the uploaded image',
              example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/photo.jpg'
            },
            publicId: {
              type: 'string',
              description: 'Cloudinary public ID for image management',
              example: 'photo-sharing/sunset_beach'
            },
            creatorId: {
              type: 'string',
              description: 'ID of the user who uploaded the image',
              example: '507f1f77bcf86cd799439011'
            },
            averageRating: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 5,
              description: 'Average rating of the image',
              example: 4.2
            },
            ratingCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of ratings received',
              example: 15
            },
            commentCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of comments received',
              example: 8
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Image upload timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Comment unique identifier',
              example: '507f1f77bcf86cd799439011'
            },
            imageId: {
              type: 'string',
              description: 'ID of the image being commented on',
              example: '507f1f77bcf86cd799439012'
            },
            userId: {
              type: 'string',
              description: 'ID of the user who wrote the comment',
              example: '507f1f77bcf86cd799439013'
            },
            text: {
              type: 'string',
              description: 'Comment content',
              example: 'Amazing photo! Love the colors.',
              maxLength: 300
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Comment creation timestamp'
            }
          }
        },
        Rating: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Rating unique identifier',
              example: '507f1f77bcf86cd799439011'
            },
            imageId: {
              type: 'string',
              description: 'ID of the image being rated',
              example: '507f1f77bcf86cd799439012'
            },
            userId: {
              type: 'string',
              description: 'ID of the user who rated the image',
              example: '507f1f77bcf86cd799439013'
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              description: 'Rating value from 1 to 5',
              example: 4
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Rating creation timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Validation failed'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Current page number',
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              description: 'Number of items per page',
              example: 10
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of items',
              example: 45
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of pages',
              example: 5
            },
            data: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Array of items for the current page'
            }
          }
        },
        SearchResponse: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
              example: 'sunset'
            },
            count: {
              type: 'integer',
              minimum: 0,
              description: 'Number of results found',
              example: 12
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Image'
              },
              description: 'Array of matching images'
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
