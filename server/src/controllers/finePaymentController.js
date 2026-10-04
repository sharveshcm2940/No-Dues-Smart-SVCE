const { query, getOne } = require('../config/db');
const { getFineSettings, calculateOverdueFine } = require('../utils/fineCalculator');
const { paymentGateway } = require('../services/paymentGateway');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Get active fine policies
 */
exports.getFineRules = async (req, res) => {
  try {
    const rules = await getFineSettings();
    return res.json({ success: true, rules });
  } catch (error) {
    console.error('Get Fine Rules Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve fine rules.' });
  }
};

/**
 * Calculate dynamic overdue fine
 */
exports.calculateFine = async (req, res) => {
  try {
    const { dueDate, returnDate } = req.body;
    if (!dueDate) {
      return res.status(400).json({ success: false, message: 'dueDate is required.' });
    }

    const calculation = await calculateOverdueFine(dueDate, returnDate);
    return res.json({ success: true, calculation });
  } catch (error) {
    console.error('Calculate Fine Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate fine.' });
  }
};

/**
 * Mark fine as paid by authorized officer with receipt number
 */
exports.markFinePaid = async (req, res) => {
  try {
    const { recordId, receiptNumber, paymentMethod, remarks } = req.body;

    if (!recordId || !receiptNumber || receiptNumber.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid borrow record ID and receipt number are mandatory to mark a fine as paid.'
      });
    }

    const record = await getOne('SELECT * FROM borrow_records WHERE id = ?', [recordId]);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Borrow record not found.' });
    }

    if (record.fine_status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: `Fine for this book was already paid on ${record.paid_at} with receipt #${record.receipt_number}.`
      });
    }

    const cleanReceipt = receiptNumber.trim();
    const cleanMethod = paymentMethod ? paymentMethod.trim() : 'Cash';
    const officerName = req.user.full_name || req.user.username;

    await query(
      `UPDATE borrow_records 
       SET fine_status = 'Paid',
           receipt_number = ?,
           paid_at = NOW(),
           paid_by = ?,
           payment_method = ?,
           remarks = CONCAT(COALESCE(remarks, ''), ' | Fine paid: ', ?)
       WHERE id = ?`,
      [cleanReceipt, officerName, cleanMethod, remarks || 'Officer Manual Verification', recordId]
    );

    await logAuditEvent({
      req,
      user: req.user,
      action: 'FINE_MARKED_PAID',
      details: `Officer ${officerName} marked fine (₹${record.fine_amount}) as Paid for student ${record.register_number} (Book: ${record.book_id}). Receipt #${cleanReceipt} [${cleanMethod}].`,
      module: 'Fines & Accounts'
    });

    return res.json({
      success: true,
      message: `Fine for book ${record.book_id} successfully recorded as Paid under receipt #${cleanReceipt}.`,
      recordId,
      receiptNumber: cleanReceipt,
      amount: record.fine_amount,
      paidAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Mark Fine Paid Error:', error);
    return res.status(500).json({ success: false, message: 'Server error marking fine as paid.' });
  }
};

/**
 * Initiate online payment order via payment gateway interface
 */
exports.initiateOnlinePayment = async (req, res) => {
  try {
    const { recordId } = req.body;
    if (!recordId) {
      return res.status(400).json({ success: false, message: 'Borrow record ID is required.' });
    }

    const record = await getOne('SELECT * FROM borrow_records WHERE id = ?', [recordId]);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Borrow record not found.' });
    }

    // Authorization: student can only initiate payment for their own record
    if (req.user.role === 'student' && req.user.username !== record.register_number) {
      return res.status(403).json({ success: false, message: 'You can only pay fines on your own borrow records.' });
    }

    if (record.fine_status === 'Paid') {
      return res.status(400).json({ success: false, message: 'Fine for this record has already been settled.' });
    }

    const fineAmount = parseFloat(record.fine_amount);
    if (!fineAmount || fineAmount <= 0) {
      return res.status(400).json({ success: false, message: 'No outstanding fine amount on this record.' });
    }

    const orderId = `FINE_ORD_${record.id}_${Date.now()}`;
    const paymentOrder = await paymentGateway.initiatePayment({
      orderId,
      amount: fineAmount,
      currency: 'INR',
      customerInfo: {
        registerNumber: record.register_number,
        username: req.user.username
      },
      metadata: {
        borrowRecordId: record.id,
        bookId: record.book_id
      }
    });

    return res.json({
      success: true,
      order: paymentOrder
    });
  } catch (error) {
    console.error('Initiate Online Payment Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate online payment session.' });
  }
};

/**
 * Verify payment signature from payment gateway and record receipt
 */
exports.verifyOnlinePayment = async (req, res) => {
  try {
    const { recordId, orderId, paymentId, signature } = req.body;

    if (!recordId || !orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'recordId, orderId, paymentId, and signature are required for payment verification.'
      });
    }

    const record = await getOne('SELECT * FROM borrow_records WHERE id = ?', [recordId]);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Borrow record not found.' });
    }

    // Verify signature cryptographically via gateway interface
    const verification = await paymentGateway.verifyPaymentSignature({
      orderId,
      paymentId,
      signature
    });

    if (!verification.valid) {
      await logAuditEvent({
        req,
        user: req.user,
        action: 'PAYMENT_SIGNATURE_FAILED',
        details: `Online fine payment signature mismatch for record #${recordId} (Order: ${orderId}).`,
        module: 'Payment Gateway'
      });
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Signature mismatch or invalid transaction.'
      });
    }

    const receiptNumber = `RCP-ONL-${Date.now().toString().slice(-8)}`;

    await query(
      `UPDATE borrow_records 
       SET fine_status = 'Paid',
           receipt_number = ?,
           paid_at = NOW(),
           paid_by = 'Payment Gateway Online',
           payment_method = 'Online (MockGateway)',
           payment_reference = ?,
           remarks = CONCAT(COALESCE(remarks, ''), ' | Online payment verified: ', ?)
       WHERE id = ?`,
      [receiptNumber, paymentId, paymentId, recordId]
    );

    await logAuditEvent({
      req,
      user: req.user,
      action: 'FINE_PAID_ONLINE',
      details: `Online fine payment of ₹${record.fine_amount} confirmed for ${record.register_number} (Book: ${record.book_id}). Receipt #${receiptNumber}, Ref: ${paymentId}.`,
      module: 'Payment Gateway'
    });

    return res.json({
      success: true,
      message: 'Payment verified and fine successfully marked as Paid.',
      receiptNumber,
      paymentId,
      amount: record.fine_amount
    });
  } catch (error) {
    console.error('Verify Online Payment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying payment transaction.' });
  }
};
