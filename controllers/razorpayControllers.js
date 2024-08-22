import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: 'YOUR_RAZORPAY_KEY_ID',
  key_secret: 'YOUR_RAZORPAY_SECRET_KEY'
});

export const createOrder = async (req, res) => {
  try {
    const options = {
      amount: req.body.amount,
      currency: req.body.currency,
      receipt: req.body.receipt,
      notes: req.body.notes
    };

    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error creating order' });
  }
};

export const verifyPayment = (req, res) => {
    const { order_id, payment_id, signature } = req.body;
    const body = order_id + "|" + payment_id;
  
    const expectedSignature = crypto
      .createHmac('sha256', 'YOUR_RAZORPAY_SECRET_KEY')
      .update(body.toString())
      .digest('hex');
  
    const isAuthentic = expectedSignature === signature;
  
    if (isAuthentic) {
      // Payment is verified
      // Update your database, send confirmation email, etc.
      res.json({ status: 'ok' });
    } else {
      res.status(400).json({ error: 'Invalid payment signature' });
    }
  };