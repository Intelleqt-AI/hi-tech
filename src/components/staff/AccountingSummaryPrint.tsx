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

const Cell = ({ row }: { row: TableRow | undefined }) => {
  if (!row) {
    return <div className="border border-black px-2 py-1 h-[26px]" />;
  }
  return (
    <div
      className={`border border-black px-2 py-1 h-[26px] flex justify-between items-center ${
        row.isCategory ? 'bg-gray-200 font-bold' : 'bg-white'
      }`}
    >
      <span>{row.label}</span>
      {row.amount !== null && <span>{fmtR(row.amount)}</span>}
    </div>
  );
};

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
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="capitalize">{status}</span>
            </div>
          )}
          {approvedBy && (
            <div className="flex justify-between">
              <span>Approved by:</span>
              <span>{approvedBy}</span>
            </div>
          )}
          {approvedAt && (
            <div className="flex justify-between">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center font-bold mb-1">Debits</div>
        <div className="text-center font-bold mb-1">Credits</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          {Array.from({ length: maxRows }, (_, i) => (
            <Cell key={`d${i}`} row={debitRows[i]} />
          ))}
          <div className="mt-3">
            <div className="border border-black px-2 py-1 h-[26px] flex justify-between items-center bg-white">
              <span>Total Debits</span>
              <span>{fmtR(debitTotal)}</span>
            </div>
          </div>
        </div>
        <div>
          {Array.from({ length: maxRows }, (_, i) => (
            <Cell key={`c${i}`} row={creditRows[i]} />
          ))}
          <div className="mt-3">
            <div className="border border-black px-2 py-1 h-[26px] flex justify-between items-center bg-white">
              <span>Total Credits</span>
              <span>{fmtR(creditTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {nettPay !== null && (
        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex justify-between">
            <span>Total Net Pay (app):</span>
            <span>{fmtR(appTotalNet)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Nett Pay (SimplePay):</span>
            <span className="text-green-600">{fmtR(nettPay)}</span>
          </div>
          {hasVariance && (
            <div className="flex justify-between text-muted-foreground">
              <span>Variance (employee UIF / PAYE):</span>
              <span>{fmtR(variance as number)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountingSummaryPrint;
