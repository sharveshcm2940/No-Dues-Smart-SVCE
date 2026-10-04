const adminRoutes = require('./admin.routes');
const adminController = require('../../controllers/adminController');
const bulkImportController = require('../../controllers/bulkImportController');
const csvTemplates = require('../../utils/csvTemplates');

module.exports = {
  routes: adminRoutes,
  controllers: {
    admin: adminController,
    bulkImport: bulkImportController
  },
  csvTemplates
};
