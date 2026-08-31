import React from 'react';
import {
  buildRows,
  fmtR,
  getNettPay,
  sumEntries,
  type AccountingData,
  type TableRow,
} from '@/lib/accountingRows';

interface AccountingSummaryPrintProps {
  data: AccountingData;
  /** The app's own Total Net Pay for this batch, for reconciliation. */
  appTotalNet: number;
  status?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

const fmtApprovedAt = (value: string) =>
  new Date(value).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * One ledger cell. Height is a minimum, not a fixed value — SimplePay labels
 * such as "Travel Allowance Fixed And Costs" wrap onto a second line, and a
 * fixed height pushed that text through the border of the row below. The
 * amount never wraps; the label takes the remaining width and wraps instead.
 */
const Cell = ({ row }: { row: TableRow | undefined }) => (
  <div
    className={`border border-black px-2 py-1 min-h-[26px] flex justify-between items-center gap-3 ${
      row?.isCategory ? 'bg-gray-200 font-bold' : 'bg-white'
    }`}
  >
    {row && (
      <>
        <span className="min-w-0">{row.label}</span>
        {row.amount !== null && (
          <span className="whitespace-nowrap shrink-0">{fmtR(row.amount)}</span>
        )}
      </>
    )}
  </div>
);

/**
 * SimplePay's Accounting Report, laid out to read the same as the report in
 * SimplePay itself. Rendered inside the print-only payroll summary overlay.
 */
const AccountingSummaryPrint = ({
  data,
  appTotalNet,
  status,
  approvedBy,
  approvedAt,
}: AccountingSummaryPrintProps) => {
  const debitRows = buildRows(data.debit);
  const creditRows = buildRows(data.credit);
  const maxRows = Math.max(debitRows.length, creditRows.length);

  const debitTotal = sumEntries(data.debit);
  const creditTotal = sumEntries(data.credit);

  const nettPay = getNettPay(data);
  // Employee UIF/PAYE is deducted by SimplePay but not by the app, so these
  // two legitimately differ. Show the gap rather than hiding it.
  const variance = nettPay !== null ? appTotalNet - nettPay : null;
  const hasVariance = variance !== null && Math.abs(variance) >= 0.01;

  return (
    <div className="border rounded-lg p-6 text-sm break-inside-avoid">
      {(status || approvedBy || approvedAt) && (
        <div className="space-y-2 mb-5 pb-4 border-b text-base">
          {status && (
            <div className="flex justify-between gap-4">
              <span>Status:</span>
              <span className="capitalize">{status}</span>
            </div>
          )}
          {approvedBy && (
            <div className="flex justify-between gap-4">
              <span>Approved by:</span>
              <span>{approvedBy}</span>
            </div>
          )}
          {approvedAt && (
            <div className="flex justify-between gap-4">
              <span>Approved on:</span>
              <span>{fmtApprovedAt(approvedAt)}</span>
            </div>
          )}
        </div>
      )}

      <h3 className="text-center text-lg font-bold mb-4">{data.company_name}</h3>

      <p className="text-xs">Accounting info for payment run ending {data.period_end_date}</p>
      {data.pay_frequency && <p className="text-xs">Pay frequency: {data.pay_frequency}</p>}
      <p className="text-xs mb-5">Number of payslips: {data.payslip_count}</p>

      {/* One grid, not two stacked columns: a debit cell and the credit cell
          beside it are siblings in the same grid row, so a wrapped label makes
          both grow together and the two ledgers stay aligned. */}
      <div className="grid grid-cols-2 gap-x-4 items-stretch">
        <div className="text-center font-bold mb-1">Debits</div>
        <div className="text-center font-bold mb-1">Credits</div>

        {Array.from({ length: maxRows }, (_, i) => [
          <Cell key={`d${i}`} row={debitRows[i]} />,
          <Cell key={`c${i}`} row={creditRows[i]} />,
        ])}

        <div className="mt-3 border border-black px-2 py-1 min-h-[26px] flex justify-between items-center gap-3 bg-white">
          <span className="min-w-0">Total Debits</span>
          <span className="whitespace-nowrap shrink-0">{fmtR(debitTotal)}</span>
        </div>
        <div className="mt-3 border border-black px-2 py-1 min-h-[26px] flex justify-between items-center gap-3 bg-white">
          <span className="min-w-0">Total Credits</span>
          <span className="whitespace-nowrap shrink-0">{fmtR(creditTotal)}</span>
        </div>
      </div>

      {nettPay !== null && (
        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex justify-between gap-4">
            <span className="min-w-0">Total Net Pay (app):</span>
            <span className="whitespace-nowrap shrink-0">{fmtR(appTotalNet)}</span>
          </div>
          <div className="flex justify-between gap-4 font-semibold">
            <span className="min-w-0">Nett Pay (SimplePay):</span>
            <span className="whitespace-nowrap shrink-0 text-green-600">{fmtR(nettPay)}</span>
          </div>
          {hasVariance && (
            <div className="flex justify-between gap-4 text-muted-foreground">
              <span className="min-w-0">Variance (employee UIF / PAYE):</span>
              <span className="whitespace-nowrap shrink-0">{fmtR(variance as number)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountingSummaryPrint;
