import { Router } from "express";
import { paytmConfig, isPaytmConfigured, generateChecksum, verifyChecksum } from "../services/paytmService.js";
import { reconcilePayment, methodMappers } from "../services/reconciliationService.js";
import { parsePaytmOrderId } from "./webhookRoutes.js";

const router = Router();


const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";


router.post("/initiate", async (req, res) => {
  try {
    if (!isPaytmConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          "Paytm is not configured. Add PAYTM_MID and PAYTM_MERCHANT_KEY to server/.env (staging test credentials are fine for now).",
      });
    }

    const { amount, orderId, customerId, invoiceId, paymentLinkId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    const paytmParams = {
      body: {
        requestType: "Payment",
        mid: paytmConfig.mid,
        websiteName: paytmConfig.website,
        orderId,
        callbackUrl: `${req.protocol}://${req.get("host")}/api/paytm/callback`,
        txnAmount: {
          value: Number(amount).toFixed(2),
          currency: "INR",
        },
        userInfo: {
          custId: customerId || `GUEST_${Date.now()}`,
        },
      },
    };

    const checksum = await generateChecksum(paytmParams.body);
    paytmParams.head = { signature: checksum };

    const response = await fetch(
      `${paytmConfig.hostUrl}/theia/api/v1/initiateTransaction?mid=${paytmConfig.mid}&orderId=${orderId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paytmParams),
      }
    );

    const data = await response.json();

    if (data?.body?.resultInfo?.resultStatus !== "S") {
      console.error("[paytm/initiate] Paytm rejected the request:", data?.body?.resultInfo);
      return res.status(502).json({
        success: false,
        message: data?.body?.resultInfo?.resultMsg || "Paytm did not return a transaction token",
      });
    }

    return res.json({
      success: true,
      txnToken: data.body.txnToken,
      orderId,
      mid: paytmConfig.mid,
      amount: Number(amount).toFixed(2),
      paymentPageUrl: `${paytmConfig.hostUrl}/theia/api/v1/showPaymentPage?mid=${paytmConfig.mid}&orderId=${orderId}`,
      // Returned so the frontend can build the redirect-back URL itself.
      context: { invoiceId: invoiceId || null, paymentLinkId: paymentLinkId || null },
    });
  } catch (error) {
    console.error("[paytm/initiate] error:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/callback", async (req, res) => {
  try {
    const params = req.body;
    const isValid = await verifyChecksum(params, params.CHECKSUMHASH);

    const status = isValid && params.STATUS === "TXN_SUCCESS" ? "success" : "failed";
    const orderId = params.ORDERID || "";
    const txnId = params.TXNID || "";

    if (!isValid) {
      console.error("[paytm/callback] Checksum verification failed for order:", orderId);
    }

    // This callback IS a checksum-verified server-to-server notification
    // from Paytm (it just also happens to carry the customer's browser back
    // to the app), so it's safe to reconcile here directly — same shared
    // function POST /api/webhooks/paytm uses, so a customer can't influence
    // the outcome by tampering with the browser redirect. If this fails or
    // races with the dedicated webhook, reconcilePayment's idempotency check
    // (on TXNID) makes either order safe.
    if (isValid && (params.STATUS === "TXN_SUCCESS" || params.STATUS === "TXN_FAILURE")) {
      const parsed = parsePaytmOrderId(orderId);
      if (parsed) {
        try {
          await reconcilePayment({
            gateway: "PAYTM",
            outcome: params.STATUS === "TXN_SUCCESS" ? "captured" : "failed",
            transactionId: txnId,
            amount: parseFloat(params.TXNAMOUNT) || 0,
            method: methodMappers.paytm(params.PAYMENTMODE),
            invoiceId: parsed.type === "invoice" ? parsed.entityId : null,
            paymentLinkId: parsed.type === "link" ? parsed.entityId : null,
            rawPayload: { ...params, verifiedVia: "callback-endpoint" },
          });
        } catch (reconcileError) {
          console.error("[paytm/callback] inline reconciliation failed (webhook will retry):", reconcileError);
        }
      } else {
        console.error("[paytm/callback] could not parse orderId for reconciliation:", orderId);
      }
    }

    // context (invoiceId/paymentLinkId) is embedded in the orderId itself
    // (see buildPaytmOrderId in the frontend), since Paytm's callback only
    // reliably echoes back a handful of known fields.
    const redirectUrl = new URL("/payments/paytm-return", FRONTEND_URL);
    redirectUrl.searchParams.set("status", status);
    redirectUrl.searchParams.set("orderId", orderId);
    redirectUrl.searchParams.set("txnId", txnId);

    return res.redirect(303, redirectUrl.toString());
  } catch (error) {
    console.error("[paytm/callback] error:", error);
    const redirectUrl = new URL("/payments/paytm-return", FRONTEND_URL);
    redirectUrl.searchParams.set("status", "failed");
    return res.redirect(303, redirectUrl.toString());
  }
});

export default router;
