export function isIntraStateTransaction(companyState: string | null | undefined, customerState: string | null | undefined): boolean {
  const a = (companyState || '').trim().toLowerCase();
  const b = (customerState || '').trim().toLowerCase();
  if (!a || !b) return false; // Unknown state: treat as inter-state (IGST) — the safer default, avoids silently under-charging CGST+SGST for an intra-state sale that looks inter-state due to missing data.
  return a === b;
}

export interface GstBreakdown {
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

/**
 * Splits a line item's computed tax amount into CGST+SGST (intra-state,
 * split evenly) or IGST (inter-state, in full).
 */
export function computeGstBreakdown(taxAmount: number, isIntraState: boolean): GstBreakdown {
  const safeTax = Number.isFinite(taxAmount) ? taxAmount : 0;
  if (isIntraState) {
    const half = round2(safeTax / 2);
    return { cgstAmount: half, sgstAmount: half, igstAmount: 0 };
  }
  return { cgstAmount: 0, sgstAmount: 0, igstAmount: round2(safeTax) };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Sums the per-line cgst/sgst/igst amounts across an invoice's line items,
 * for rendering the invoice-level tax summary (PDF template + details
 * page) as separate CGST/SGST or IGST rows instead of one lump "Tax" row.
 */
export function summarizeGst(lineItems: { cgstAmount?: number; sgstAmount?: number; igstAmount?: number }[]): GstBreakdown {
  return lineItems.reduce<GstBreakdown>(
    (acc, item) => ({
      cgstAmount: round2(acc.cgstAmount + (item.cgstAmount || 0)),
      sgstAmount: round2(acc.sgstAmount + (item.sgstAmount || 0)),
      igstAmount: round2(acc.igstAmount + (item.igstAmount || 0)),
    }),
    { cgstAmount: 0, sgstAmount: 0, igstAmount: 0 },
  );
}
