const libraryRoutes = require('./library.routes');
const libraryController = require('../../controllers/libraryController');
const mainLibraryController = require('../../controllers/mainLibraryController');
const finePaymentController = require('../../controllers/finePaymentController');
const fineCalculator = require('../../utils/fineCalculator');
const paymentGateway = require('../../services/paymentGateway');

module.exports = {
  routes: libraryRoutes,
  controllers: {
    library: libraryController,
    mainLibrary: mainLibraryController,
    finePayment: finePaymentController
  },
  fineCalculator,
  paymentGateway
};
