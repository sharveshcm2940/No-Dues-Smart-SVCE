const clearanceRoutes = require('./clearance.routes');
const studentController = require('../../controllers/studentController');
const faController = require('../../controllers/faController');
const hodController = require('../../controllers/hodController');
const dpcController = require('../../controllers/dpcController');
const financeController = require('../../controllers/financeController');
const reopenController = require('../../controllers/reopenController');
const certificateController = require('../../controllers/certificateController');
const workflowHelper = require('../../utils/workflowHelper');
const certificateSigner = require('../../utils/certificateSigner');
const slaCalculator = require('../../utils/slaCalculator');

module.exports = {
  routes: clearanceRoutes,
  controllers: {
    student: studentController,
    fa: faController,
    hod: hodController,
    dpc: dpcController,
    finance: financeController,
    reopen: reopenController,
    certificate: certificateController
  },
  workflowHelper,
  certificateSigner,
  slaCalculator
};
