const express = require('express');
const { body } = require('express-validator');
const { signup, login } = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.post(
  '/signup',
  [
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3 to 30 characters long'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').isIn(['creator', 'consumer']).withMessage('Role must be creator or consumer'),
    validate
  ],
  signup
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  login
);

module.exports = router;
