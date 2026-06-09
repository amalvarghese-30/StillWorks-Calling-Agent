import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
    const Database = await import('better-sqlite3');
    const db = new (Database.default as any)(dbPath, { readonly: true });

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ? OR quote_id = ?').get(id, id) as any;
    db.close();

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Parse financing options
    let financing: any = {};
    try {
      financing = typeof quote.financing_options_json === 'string'
        ? JSON.parse(quote.financing_options_json)
        : quote.financing_options_json || {};
    } catch {}

    const taxAmount = Math.round((quote.total_price || 0) * 0.18);
    const rtoAmount = Math.round((quote.total_price || 0) * 0.03);
    const insuranceAmount = 15000;
    const totalWithTax = (quote.total_price || 0) + taxAmount + rtoAmount + insuranceAmount;

    // Build HTML for PDF
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AgriForge — Quote ${quote.quote_id || id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #111827; padding: 40px; max-width: 700px; margin: 0 auto; }
  .header { border-bottom: 3px solid #16A34A; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
  .logo { font-size: 24px; font-weight: 800; color: #16A34A; }
  .tagline { font-size: 11px; color: #9CA3AF; }
  .title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .ref { font-size: 12px; color: #6B7280; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; }
  .card-title { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .card-val { font-size: 14px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; border-bottom: 2px solid #E5E7EB; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #E5E7EB; }
  .total-row td { font-weight: 700; font-size: 15px; border-bottom: none; padding-top: 16px; }
  .financing { border: 1px solid #DCFCE7; border-radius: 8px; padding: 16px; background: #F0FDF4; margin-bottom: 24px; }
  .financing-title { font-size: 14px; font-weight: 600; color: #16A34A; margin-bottom: 8px; }
  .emi { display: inline-block; margin-right: 24px; }
  .footer { font-size: 11px; color: #9CA3AF; text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; }
  .valid { font-size: 11px; color: #CA8A04; margin-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">AgriForge</div>
    <div class="tagline">Agricultural Equipment Dealership</div>
  </div>
  <div style="text-align:right;font-size:12px;color:#6B7280;">
    <div>Vellapara, Chithali Post</div>
    <div>Palakkad, Kerala</div>
    <div>mail@manasgroupindia.in</div>
  </div>
</div>

<div class="title">Price Quotation</div>
<div class="ref">Quote #${quote.quote_id || id} | Date: ${quote.created_at ? new Date(quote.created_at).toLocaleDateString('en-IN') : '—'}</div>

<div class="grid" style="margin-top:16px;">
  <div class="card">
    <div class="card-title">Customer</div>
    <div class="card-val">${quote.customer_name || 'Customer'}</div>
    <div style="font-size:12px;color:#6B7280;margin-top:4px;">${quote.phone || ''}</div>
  </div>
  <div class="card">
    <div class="card-title">Product</div>
    <div class="card-val">${quote.brand || ''} ${quote.model || ''}</div>
    <div style="font-size:12px;color:#6B7280;margin-top:4px;">Ex-showroom: ₹${(quote.ex_showroom_price || 0).toLocaleString('en-IN')}</div>
  </div>
</div>

<table>
  <thead><tr><th>Item</th><th style="text-align:right;">Amount (₹)</th></tr></thead>
  <tbody>
    <tr><td>Ex-showroom Price</td><td style="text-align:right;">₹${(quote.ex_showroom_price || 0).toLocaleString('en-IN')}</td></tr>
    <tr><td>RTO Charges (3%)</td><td style="text-align:right;">₹${rtoAmount.toLocaleString('en-IN')}</td></tr>
    <tr><td>Insurance</td><td style="text-align:right;">₹${insuranceAmount.toLocaleString('en-IN')}</td></tr>
    <tr><td>GST (18%)</td><td style="text-align:right;">₹${taxAmount.toLocaleString('en-IN')}</td></tr>
    ${(quote.total_price || 0) !== totalWithTax ? `<tr><td>Additional Charges</td><td style="text-align:right;">₹${((quote.total_price || 0) - (quote.ex_showroom_price || 0) - taxAmount - rtoAmount - insuranceAmount).toLocaleString('en-IN')}</td></tr>` : ''}
    <tr class="total-row"><td>Total On-Road Price</td><td style="text-align:right;color:#16A34A;">₹${totalWithTax.toLocaleString('en-IN')}</td></tr>
  </tbody>
</table>

${financing.emi_3yr || financing.emi_5yr ? `
<div class="financing">
  <div class="financing-title">Financing Options (Estimated EMI)</div>
  ${financing.emi_3yr ? `<div class="emi">3 Years: ₹${financing.emi_3yr.toLocaleString('en-IN')}/mo</div>` : ''}
  ${financing.emi_5yr ? `<div class="emi">5 Years: ₹${financing.emi_5yr.toLocaleString('en-IN')}/mo</div>` : ''}
  <div style="font-size:11px;color:#6B7280;margin-top:8px;">Subject to credit approval. Terms and conditions apply.</div>
</div>
` : ''}

${quote.valid_until ? `<div class="valid">Valid until: ${new Date(quote.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>` : ''}

<div class="footer">
  This is a computer-generated quotation from AgriForge Voice AI Platform.<br/>
  For questions, contact +91 1171366938 | mail@manasgroupindia.in
</div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF HTML:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
