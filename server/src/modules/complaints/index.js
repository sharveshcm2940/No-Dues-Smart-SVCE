const complaintsRoutes = require('./complaints.routes');
const complaintController = require('../../controllers/complaintController');

module.exports = {
  routes: complaintsRoutes,
  controller: complaintController
};
