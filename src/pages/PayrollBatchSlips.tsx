import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import useFetch from '@/hooks/useFetch';
import { fetchData, downloadFile } from '@/lib/Api';

const PAGE_SIZE = 20;

const CSV_HEADERS = [
  'Staff Name',
  'Clock No',
  'Department',
  'Position',
  'Capped Hrs',
  'Rate/hr',
  'Total Hrs',
  'Weekend Hrs',
  'Paid Hrs',
  'Bonus',
  'Other Deductions',
  'Loan Deduction',
  'Gross Salary',
  'Net Salary',
];

interface Slip {
  id: number;
  staff_name: string;
  staff_clock_number: string;
  staff_department: string;
  staff_position: string;
  capped_hours_snapshot: string;
  hourly_rate_snapshot: string;
  total_worked_hours: string;
  weekend_hours: string;
  paid_hours: string;
  bonus_added: string;
  other_deductions: string;
  loan_deduction: string;
  gross_salary: string;
  net_salary: string;
}

const slipToRow = (slip: Slip) => [
  slip.staff_name,
  slip.staff_clock_number,
  slip.staff_department?.replace('_', ' '),
  slip.staff_position,
  slip.capped_hours_snapshot,
  slip.hourly_rate_snapshot,
  slip.total_worked_hours,
  slip.weekend_hours,
  slip.paid_hours,
  slip.bonus_added,
  slip.other_deductions,
  slip.loan_deduction,
  slip.gross_salary,
  slip.net_salary,
];

const toCSV = (rows: (string | number | null | undefined)[][]) => {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [CSV_HEADERS, ...rows].map(r => r.map(escape).join(',')).join('\n');
};

const PayrollBatchSlips = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const { data, isLoading } = useFetch(`staff/payroll-batches/${id}/slips/?page=${currentPage}&page_size=${PAGE_SIZE}`);

  const slips = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fmt = (val: string | number) =>
    `R ${parseFloat(val as string).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const allData = await fetchData(`staff/payroll-batches/${id}/slips/?page=1&page_size=${totalCount || 9999}`);
      const rows = ((allData?.results ?? []) as Slip[]).map(slipToRow);
      const csv = toCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-batch-${id}-slips.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-0 space-y-4 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Payroll Slips</h1>
            <p className="text-sm text-muted-foreground">Batch #{id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading || isLoading || totalCount === 0}>
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download CSV'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsDownloadingReport(true);
              try {
                await downloadFile(`staff/payroll-batches/${id}/export-report/`, `payroll_report_batch_${id}.xlsx`);
              } finally {
                setIsDownloadingReport(false);
              }
            }}
            disabled={isDownloadingReport || isLoading || totalCount === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloadingReport ? 'Downloading...' : 'Download Report'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-accent">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Staff Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Clock No</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Department</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Position</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Capped Hrs</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Rate/hr</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Total Hrs</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Weekend Hrs</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Paid Hrs</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Bonus</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Deductions</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Loans</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Gross</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Net Salary</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {Array.from({ length: 14 }).map((_, j) => (
                        <td key={j} className="py-2 px-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                : slips.map((slip: Slip) => (
                    <tr key={slip.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-4">
                        <p className="font-medium text-blue-600 text-xs">{slip.staff_name}</p>
                      </td>
                      <td className="py-2 px-4 text-xs">{slip.staff_clock_number}</td>
                      <td className="py-2 px-4">
                        <Badge variant="outline" className="text-xs capitalize">
                          {slip.staff_department?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-xs">{slip.staff_position}</td>
                      <td className="py-2 px-4 text-xs">{slip.capped_hours_snapshot}</td>
                      <td className="py-2 px-4 text-xs">{fmt(slip.hourly_rate_snapshot)}</td>
                      <td className="py-2 px-4 text-xs">{slip.total_worked_hours}h</td>
                      <td className="py-2 px-4 text-xs">{slip.weekend_hours}h</td>
                      <td className="py-2 px-4 text-xs">{slip.paid_hours}h</td>
                      <td className="py-2 px-4 text-xs">{fmt(slip.bonus_added)}</td>
                      <td className="py-2 px-4 text-xs text-red-600">{fmt(slip.other_deductions)}</td>
                      <td className="py-2 px-4 text-xs text-blue-600">{fmt(slip.loan_deduction)}</td>
                      <td className="py-2 px-4 text-xs">{fmt(slip.gross_salary)}</td>
                      <td className="py-2 px-4 text-xs font-semibold text-green-600">{fmt(slip.net_salary)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">{isLoading ? '...' : `Page ${currentPage} of ${totalPages} — ${totalCount} slips total`}</p>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum} className="cursor-pointer">
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollBatchSlips;
