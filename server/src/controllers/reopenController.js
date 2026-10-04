const { reopenStage } = require('../utils/workflowHelper');

/**
 * Stage Reopening Controller
 * Allows stage officer or HOD/Admin to reopen a previously approved stage.
 */
exports.reopenStageAction = async (req, res) => {
  try {
    const { requestId, departmentName, reason } = req.body;

    if (!requestId || !departmentName || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Request ID, Department Name, and a valid Reason are mandatory.'
      });
    }

    const result = await reopenStage({
      requestId: parseInt(requestId),
      departmentName,
      reason,
      actorUser: req.user
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.message
      });
    }

    return res.json({
      success: true,
      message: `Stage '${result.departmentName}' has been successfully reopened. Downstream stages reset: ${result.downstreamStagesReset}.${result.certificateRevoked ? ' Previously issued certificate was revoked.' : ''}`,
      result
    });
  } catch (error) {
    console.error('Reopen Stage Action Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing stage reopening.'
    });
  }
};
