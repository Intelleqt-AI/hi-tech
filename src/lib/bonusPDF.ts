import jsPDF from 'jspdf';

export interface BonusSummaryData {
  id: number;
  staff_member_name: string;
  clock_number?: string;
  amount: string;
  reason?: string;
  status: string;
  created_at: string;
  added_by?: string;
  approved_by?: string;
  approved_at?: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function generateBonusPDF(bonus: BonusSummaryData): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - 2 * margin;
  let y = 25;

  // ── Header ─────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('HITEC PACKAGING (PTY) LTD', pageWidth / 2, y, { align: 'center' });
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Bonus Summary Sheet', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // ── Divider ────────────────────────────────────────────────────
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, margin + contentWidth, y);
  y += 8;

  // ── Field rows ─────────────────────────────────────────────────
  const labelX = margin;
  const valueX = margin + 45;
  const rowGap = 8;

  function row(label: string, value: string) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.text(label, labelX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value || '-', valueX, y);
    y += rowGap;
  }

  row('Employee:', bonus.staff_member_name);
  row('Clock Number:', bonus.clock_number || '-');
  row('Bonus ID:', `#${bonus.id}`);
  row('Added By:', bonus.added_by || '-');
  row('Amount:', `R ${parseFloat(bonus.amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`);
  row('Date Awarded:', fmtDate(bonus.created_at));
  row('Status:', capitalize(bonus.status));

  if (bonus.reason) {
    // Reason may be long — wrap it
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.text('Reason:', labelX, y);
    pdf.setFont('helvetica', 'normal');
    const wrapped = pdf.splitTextToSize(bonus.reason, contentWidth - 45);
    pdf.text(wrapped, valueX, y);
    y += wrapped.length * 5.5 + 2.5;
  }

  // ── Approval section ───────────────────────────────────────────
  y += 3;
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentWidth, y);
  y += 7;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Approval Details', labelX, y);
  y += 7;

  row('Approved By:', bonus.approved_by || 'Not yet approved');
  row('Approved At:', bonus.approved_at ? fmtDateTime(bonus.approved_at) : 'Not yet approved');

  // ── Footer ─────────────────────────────────────────────────────
  y += 5;
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentWidth, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Generated on ${fmtDateTime(new Date().toISOString())}`, margin, y);

  pdf.save(`bonus-summary-${bonus.id}-${bonus.staff_member_name.replace(/\s+/g, '-')}.pdf`);
}
