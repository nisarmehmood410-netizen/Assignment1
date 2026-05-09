const jwt = require('jsonwebtoken');
const env = require('../config/env');

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

module.exports = createToken;
