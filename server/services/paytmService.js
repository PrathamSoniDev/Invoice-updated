import PaytmChecksum from "paytmchecksum";

const ENVIRONMENT = process.env.PAYTM_ENVIRONMENT || "STAGE";

export const paytmConfig = {
  mid: process.env.PAYTM_MID || "",
  merchantKey: process.env.PAYTM_MERCHANT_KEY || "",
  website: process.env.PAYTM_WEBSITE || "WEBSTAGING",
  industryType: process.env.PAYTM_INDUSTRY_TYPE || "Retail",
  channelId: process.env.PAYTM_CHANNEL_ID || "WEB",
  environment: ENVIRONMENT,
  hostUrl:
    ENVIRONMENT === "PROD"
      ? "https://securegw.paytm.in"
      : "https://securegw-stage.paytm.in",
};

export function isPaytmConfigured() {
  return Boolean(paytmConfig.mid && paytmConfig.merchantKey);
}

export async function generateChecksum(params) {
  return PaytmChecksum.generateSignature(params, paytmConfig.merchantKey);
}

export async function verifyChecksum(params, checksum) {
  const { CHECKSUMHASH, ...rest } = params;
  return PaytmChecksum.verifySignature(rest, paytmConfig.merchantKey, checksum || CHECKSUMHASH);
}
