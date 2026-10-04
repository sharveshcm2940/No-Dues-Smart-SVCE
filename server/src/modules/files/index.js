const fileController = require('../../controllers/fileController');
const fileUpload = require('../../utils/fileUpload');
const dataMasking = require('../../utils/dataMasking');

module.exports = {
  controller: fileController,
  fileUpload,
  dataMasking
};
