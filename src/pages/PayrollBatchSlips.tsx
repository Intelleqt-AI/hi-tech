import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import useFetch from '@/hooks/useFetch';

const PayrollBatchSlips = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useFetch(`staff/payroll-batches/${id}/slips/`);

  const slips = data?.results ?? [];

  const fmt = (val: string | number) =>
    `R ${parseFloat(val as string).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
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

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
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
                : slips.map((slip: any) => (
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

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            {isLoading ? '...' : `Showing ${slips.length} of ${data?.count ?? slips.length} slips`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayrollBatchSlips;
