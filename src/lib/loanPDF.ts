import jsPDF from 'jspdf';

export interface LoanSummaryData {
  id: number;
  staff_member_name: string;
  clock_number?: string;
  bank_account_number?: string;
  bank_branch_code?: string;
  loan_type: string;
  amount: string;
  interest_rate?: string;
  total_repayment?: number;
  repayment_amount?: number;
  term_type: string;
  term_duration: number;
  start_date: string;
  notes?: string;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  added_by?: string;
  created_at?: string;
}

function fmtMoney(value: number): string {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
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

function addInstallmentDate(startDate: string, index: number, termType: string): string {
  const d = new Date(startDate);
  if (termType === 'fortnightly') {
    d.setDate(d.getDate() + index * 14);
  } else {
    d.setMonth(d.getMonth() + index);
  }
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateLoanPDF(loan: LoanSummaryData): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margin = 20;
  const pageW = 210;
  const pageH = 297;
  const contentW = pageW - 2 * margin;
  let y = 25;

  // ── Header ────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('HITEC PACKAGING (PTY) LTD', pageW / 2, y, { align: 'center' });
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Loan Summary Sheet', pageW / 2, y, { align: 'center' });
  y += 8;

  pdf.setLineWidth(0.5);
  pdf.line(margin, y, margin + contentW, y);
  y += 8;

  // ── Field helper ──────────────────────────────────────────────
  const labelX = margin;
  const valueX = margin + 50;
  const rowGap = 7.5;

  function row(label: string, value: string) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.text(label, labelX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value || '-', valueX, y);
    y += rowGap;
  }

  // ── Employee Details ──────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Employee Details', labelX, y);
  y += 6;

  row('Employee:', loan.staff_member_name);
  row('Clock Number:', loan.clock_number || '-');
  row('Bank Account:', loan.bank_account_number || '-');
  row('Branch Code:', loan.bank_branch_code || '-');

  y += 3;
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentW, y);
  y += 7;

  // ── Loan Details ─────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Loan Details', labelX, y);
  y += 6;

  const principal = parseFloat(loan.amount);
  const interestRate = parseFloat(loan.interest_rate || '0');
  const totalRepayment = loan.total_repayment ?? principal * (1 + interestRate / 100);
  const installment = loan.repayment_amount ?? (totalRepayment / loan.term_duration);

  row('Loan ID:', `#${loan.id}`);
  row('Loan Type:', loan.loan_type);
  row('Principal Amount:', `R ${fmtMoney(principal)}`);
  row('Interest Rate:', `${interestRate}%`);
  row('Total Repayment:', `R ${fmtMoney(totalRepayment)}`);
  row('Installment:', `R ${fmtMoney(installment)} per ${loan.term_type === 'fortnightly' ? 'fortnight' : 'month'}`);
  row('Term:', `${loan.term_duration} ${loan.term_type === 'fortnightly' ? 'fortnights' : 'months'}`);
  row('Start Date:', fmtDate(loan.start_date));
  row('Added By:', loan.added_by || '-');

  if (loan.notes) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.text('Notes:', labelX, y);
    pdf.setFont('helvetica', 'normal');
    const wrapped = pdf.splitTextToSize(loan.notes, contentW - 50);
    pdf.text(wrapped, valueX, y);
    y += wrapped.length * 5.5 + 2.5;
  }

  y += 3;
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentW, y);
  y += 7;

  // ── Approval Details ─────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Approval Details', labelX, y);
  y += 6;

  row('Approved By:', loan.approved_by || 'Not yet approved');
  row('Approved At:', loan.approved_at ? fmtDateTime(loan.approved_at) : 'Not yet approved');

  y += 3;
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentW, y);
  y += 7;

  // ── Repayment Schedule ───────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Repayment Schedule', labelX, y);
  y += 6;

  // Table header
  const col = { num: margin, date: margin + 12, amount: margin + 75, balance: margin + 130 };
  const thHeight = 6;
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y - 4, contentW, thHeight, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('#', col.num, y);
  pdf.text('Due Date', col.date, y);
  pdf.text('Installment', col.amount, y);
  pdf.text('Balance After', col.balance, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);

  let balance = totalRepayment;
  for (let i = 1; i <= loan.term_duration; i++) {
    // Page break if needed
    if (y > pageH - 25) {
      pdf.addPage();
      y = 20;
    }
    balance -= installment;
    const dueDate = addInstallmentDate(loan.start_date, i, loan.term_type);
    const balStr = balance < 0.005 ? 'R 0.00' : `R ${fmtMoney(balance)}`;

    if (i % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, y - 4, contentW, 6, 'F');
    }

    pdf.text(String(i), col.num, y);
    pdf.text(dueDate, col.date, y);
    pdf.text(`R ${fmtMoney(installment)}`, col.amount, y);
    pdf.text(balStr, col.balance, y);
    y += 6;
  }

  // Total row
  y += 2;
  pdf.setLineWidth(0.3);
  pdf.line(margin, y - 1, margin + contentW, y - 1);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('Total', col.date, y + 3);
  pdf.text(`R ${fmtMoney(totalRepayment)}`, col.amount, y + 3);
  y += 10;

  // ── Footer ───────────────────────────────────────────────────
  if (y > pageH - 20) {
    pdf.addPage();
    y = 20;
  }
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentW, y);
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Generated on ${fmtDateTime(new Date().toISOString())}`, margin, y);

  pdf.save(`loan-summary-${loan.id}-${loan.staff_member_name.replace(/\s+/g, '-')}.pdf`);
}
