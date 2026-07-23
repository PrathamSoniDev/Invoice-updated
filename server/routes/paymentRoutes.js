import { Router } from "express";
import crypto from "crypto";
import { razorpay } from "../services/razorpayService.js";
import { reconcilePayment, methodMappers } from "../services/reconciliationService.js";

const router = Router();

router.post("/create-order", async (req, res) => {
  try {
    const { amount, invoiceId, paymentLinkId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    // invoiceId/paymentLinkId are attached as Razorpay order notes so the
    // webhook (and /verify below) can reliably work out which invoice 
   
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        ...(invoiceId ? { invoiceId } : {}),
        ...(paymentLinkId ? { paymentLinkId } : {}),
      },
    });

    return res.json(order);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});


router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Reconcile immediately, on the same code path the /api/webhooks/razorpay
    // webhook uses, rather than trusting a client-supplied invoiceId — pull
    // invoiceId/paymentLinkId from the order's own notes (set server-side in
    // /create-order above) and the payment's real amount/method from
    // Razorpay's API, not from the request body. This also means a customer
    // can't pay for a ₹1 order and claim it was for a ₹50,000 invoice by
    // tampering with the client.
    //
    // If this throws or the webhook hasn't landed yet, no harm done: the
    // webhook is idempotent and will (re)reconcile independently once it
    // arrives — this call is purely a same-request UX speedup.
    try {
      const [order, payment] = await Promise.all([
        razorpay.orders.fetch(razorpay_order_id),
        razorpay.payments.fetch(razorpay_payment_id),
      ]);

      await reconcilePayment({
        gateway: "RAZORPAY",
        outcome: payment.status === "captured" ? "captured" : "failed",
        transactionId: razorpay_payment_id,
        amount: (payment.amount || 0) / 100,
        method: methodMappers.razorpay(payment.method),
        invoiceId: order.notes?.invoiceId || null,
        paymentLinkId: order.notes?.paymentLinkId || null,
        rawPayload: { order, payment, verifiedVia: "verify-endpoint" },
      });
    } catch (reconcileError) {
      console.error("[payment/verify] inline reconciliation failed (webhook will retry):", reconcileError);
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
export default router;
