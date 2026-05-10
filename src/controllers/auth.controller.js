const User = require('../models/User');
const createToken = require('../utils/create-token');

async function signup(req, res, next) {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const user = await User.create({
      username,
      email,
      password,
      role
    });

    const token = createToken(user);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  signup,
  login
};
