const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    message: 'Validation failed',
    errors: result.array().map((item) => ({
      field: item.path,
      message: item.msg
    }))
  });
}

module.exports = validate;
