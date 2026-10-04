const authRoutes = require('./auth.routes');
const authController = require('../../controllers/authController');
const passwordPolicy = require('../../utils/passwordPolicy');

module.exports = {
  routes: authRoutes,
  controller: authController,
  passwordPolicy
};
