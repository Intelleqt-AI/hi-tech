/**
 * Shared shaping for the SimplePay accounting report.
 *
 * Both renderers consume these — the downloadable PDF (accountingPDF.ts) and
 * the printed payroll summary (components/staff/AccountingSummaryPrint.tsx) —
 * so the two can never drift into showing different figures for one pay run.
 *
 * Source: GET atg/attendance/payroll-accounting-info/?batch_id=
 * which proxies SimplePay /payment_runs/{id}/accounting.
 */

/**
 * Factories that have a SimplePay client ID. Mirrors CLIENT_IDS in
 * hitec-backend/atg_api/simplepay.py — CASUALS and YOUTH_WORK are unmapped,
 * so requesting an accounting report for them can only 404.
 */
export const SIMPLEPAY_FACTORIES = ['hitec', 'RANDM'];

export function hasSimplePayAccounting(factory?: string | null): boolean {
  return !!factory && SIMPLEPAY_FACTORIES.includes(factory);
}

export interface AccountingEntry {
  category: string;
  line_item: string;
  label: string;
  amount: Record<string, number>;
}

export interface AccountingData {
  company_name: string;
  period_end_date: string;
  pay_frequency: string;
  payslip_count: number;
  debit: AccountingEntry[];
  credit: AccountingEntry[];
}

export interface TableRow {
  label: string;
  amount: number | null;
  isCategory: boolean;
}

export const CATEGORY_LABELS: Record<string, string> = {
  salary_expense: 'Salary Expenses',
  expense: 'Other Expenses',
  liability: 'Liabilities',
};

/** SimplePay returns each amount as a single-entry dict keyed by cost centre. */
export function getAmount(entry: AccountingEntry): number {
  const vals = Object.values(entry.amount);
  return vals.length > 0 ? vals[0] : 0;
}

export function fmtR(amount: number): string {
  return (
    'R ' +
    amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Group entries by category: a category row carrying its total, then its line items. */
export function buildRows(entries: AccountingEntry[]): TableRow[] {
  const order: string[] = [];
  const groups: Record<string, AccountingEntry[]> = {};

  for (const entry of entries) {
    if (!groups[entry.category]) {
      groups[entry.category] = [];
      order.push(entry.category);
    }
    groups[entry.category].push(entry);
  }

  const rows: TableRow[] = [];
  for (const cat of order) {
    const catEntries = groups[cat];
    const catTotal = catEntries.reduce((s, e) => s + getAmount(e), 0);
    rows.push({
      label: CATEGORY_LABELS[cat] || cat,
      amount: catTotal,
      isCategory: true,
    });
    for (const e of catEntries) {
      rows.push({ label: e.label, amount: getAmount(e), isCategory: false });
    }
  }
  return rows;
}

export function sumEntries(entries: AccountingEntry[]): number {
  return entries.reduce((s, e) => s + getAmount(e), 0);
}

/** SimplePay's own net figure — the credit line the client reconciles against. */
export function getNettPay(data: AccountingData): number | null {
  const entry = data.credit.find(e => e.line_item === 'nett_pay');
  return entry ? getAmount(entry) : null;
}
