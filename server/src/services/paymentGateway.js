const crypto = require('crypto');

/**
 * Payment Gateway Interface (Vendor-Agnostic Abstraction)
 */
class PaymentGatewayInterface {
  async initiatePayment(options) {
    throw new Error('Method initiatePayment() must be implemented.');
  }

  async verifyPaymentSignature(params) {
    throw new Error('Method verifyPaymentSignature() must be implemented.');
  }

  async getPaymentStatus(paymentId) {
    throw new Error('Method getPaymentStatus() must be implemented.');
  }

  async refundPayment(paymentId, amount) {
    throw new Error('Method refundPayment() must be implemented.');
  }
}

/**
 * Mock Payment Gateway Implementation
 * Provides deterministic simulation of online payment workflows for testing and offline development
 */
class MockPaymentGateway extends PaymentGatewayInterface {
  constructor(secretKey = 'svce_mock_payment_secret_key_2026') {
    super();
    this.secretKey = secretKey;
    this.simulatedOrders = new Map();
  }

  async initiatePayment({ orderId, amount, currency = 'INR', customerInfo = {}, metadata = {} }) {
    if (!orderId || !amount || amount <= 0) {
      throw new Error('Invalid payment initiation parameters: orderId and positive amount are required.');
    }

    const gatewayOrderId = `MOCK_ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const orderRecord = {
      orderId,
      gatewayOrderId,
      amount: parseFloat(amount).toFixed(2),
      currency,
      customerInfo,
      metadata,
      status: 'CREATED',
      createdAt: new Date()
    };

    this.simulatedOrders.set(gatewayOrderId, orderRecord);

    return {
      success: true,
      gateway: 'MockPaymentGateway',
      orderId,
      gatewayOrderId,
      amount: orderRecord.amount,
      currency,
      checkoutUrl: `https://payments.svce.ac.in/checkout/mock?orderId=${gatewayOrderId}`
    };
  }

  async verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return { valid: false, message: 'Missing orderId, paymentId or signature for verification.' };
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );

    if (isValid && this.simulatedOrders.has(orderId)) {
      const order = this.simulatedOrders.get(orderId);
      order.status = 'PAID';
      order.paymentId = paymentId;
      order.paidAt = new Date();
    }

    return {
      valid: isValid,
      gateway: 'MockPaymentGateway',
      paymentId,
      status: isValid ? 'PAID' : 'SIGNATURE_MISMATCH'
    };
  }

  /**
   * Helper to generate a valid test mock payment payload for client / test assertions
   */
  generateMockSuccessPayload(orderId) {
    const paymentId = `MOCK_PAY_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const payload = `${orderId}|${paymentId}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    return {
      orderId,
      paymentId,
      signature
    };
  }

  async getPaymentStatus(paymentId) {
    for (const [_, order] of this.simulatedOrders.entries()) {
      if (order.paymentId === paymentId) {
        return { success: true, status: order.status, order };
      }
    }
    return { success: false, status: 'NOT_FOUND', message: 'Payment record not found.' };
  }

  async refundPayment(paymentId, amount) {
    return {
      success: true,
      refundId: `MOCK_REF_${Date.now()}`,
      paymentId,
      amount,
      status: 'REFUNDED'
    };
  }
}

// Export singleton instance and class definition
const mockGatewayInstance = new MockPaymentGateway();

module.exports = {
  PaymentGatewayInterface,
  MockPaymentGateway,
  paymentGateway: mockGatewayInstance
};
