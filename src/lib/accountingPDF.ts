import jsPDF from 'jspdf';
import { buildRows, fmtR, sumEntries } from './accountingRows';
import type { AccountingData, AccountingEntry } from './accountingRows';

// Re-exported so existing importers of this module keep working.
export type { AccountingData, AccountingEntry };

function drawCell(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  amountStr: string | null,
  isCategory: boolean,
) {
  // Fill
  if (isCategory) {
    pdf.setFillColor(224, 224, 224);
  } else {
    pdf.setFillColor(255, 255, 255);
  }
  pdf.rect(x, y, w, h, 'F');

  // Border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.rect(x, y, w, h, 'S');

  // Text baseline — vertically centered
  const textY = y + h * 0.63;
  pdf.setFont('helvetica', isCategory ? 'bold' : 'normal');
  pdf.setFontSize(8.5);
  pdf.text(label, x + 2.5, textY);
  if (amountStr !== null) {
    pdf.text(amountStr, x + w - 2.5, textY, { align: 'right' });
  }
}

function drawEmptyCell(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, w, h, 'F');
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.rect(x, y, w, h, 'S');
}

export function generateAccountingPDF(data: AccountingData): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margin = 14;
  const pageWidth = 210;
  const colGap = 5;
  const colW = (pageWidth - 2 * margin - colGap) / 2; // ≈ 88.5 mm
  const leftX = margin;
  const rightX = margin + colW + colGap;
  const rowH = 6.5;

  let y = 20;

  // ── Company title ──────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(data.company_name, pageWidth / 2, y, { align: 'center' });
  y += 11;

  // ── Metadata ───────────────────────────────────────────────────
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.text(
    `Accounting info for payment run ending ${data.period_end_date}`,
    margin,
    y,
  );
  y += 4.2;
  if (data.pay_frequency) {
    pdf.text(`Pay frequency: ${data.pay_frequency}`, margin, y);
    y += 4.2;
  }
  pdf.text(`Number of payslips: ${data.payslip_count}`, margin, y);
  y += 9;

  // ── Column headers ─────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Debits', leftX + colW / 2, y, { align: 'center' });
  pdf.text('Credits', rightX + colW / 2, y, { align: 'center' });
  y += 5;

  // ── Table rows ─────────────────────────────────────────────────
  const debitRows = buildRows(data.debit);
  const creditRows = buildRows(data.credit);
  const maxRows = Math.max(debitRows.length, creditRows.length);

  for (let i = 0; i < maxRows; i++) {
    const dr = debitRows[i];
    const cr = creditRows[i];

    if (dr) {
      drawCell(
        pdf,
        leftX, y, colW, rowH,
        dr.label,
        dr.amount !== null ? fmtR(dr.amount) : null,
        dr.isCategory,
      );
    } else {
      drawEmptyCell(pdf, leftX, y, colW, rowH);
    }

    if (cr) {
      drawCell(
        pdf,
        rightX, y, colW, rowH,
        cr.label,
        cr.amount !== null ? fmtR(cr.amount) : null,
        cr.isCategory,
      );
    } else {
      drawEmptyCell(pdf, rightX, y, colW, rowH);
    }

    y += rowH;
  }

  // ── Gap then totals row ────────────────────────────────────────
  y += 3;

  const debitTotal = sumEntries(data.debit);
  const creditTotal = sumEntries(data.credit);

  drawCell(pdf, leftX, y, colW, rowH, 'Total Debits', fmtR(debitTotal), false);
  drawCell(pdf, rightX, y, colW, rowH, 'Total Credits', fmtR(creditTotal), false);

  pdf.save(`accounting-${data.period_end_date}.pdf`);
}
