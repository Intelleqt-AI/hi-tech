import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Calendar, FileText, Play, Eye, Download, Filter, MessageSquare, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { generatePayrollPDF, PayrollSummaryData } from '@/utils/payrollPDF';
import { fetchEntries, downloadFile, deleteData } from '@/lib/Api';
import { useQuery } from '@tanstack/react-query';
import useFetch from '@/hooks/useFetch';
import { useNavigate } from 'react-router-dom';
import CommentsModal from '@/components/CommentsModal';

interface PayrollTabProps {
  onRunPayroll: () => void;
}

const calculatePayPeriods = () => {
  const today = new Date();

  // Base period starts June 18, 2025 (2-week cycles)
  const basePeriodStart = new Date('2025-06-18');

  // Calculate how many periods have passed since base period
  const daysDiff = Math.floor((today.getTime() - basePeriodStart.getTime()) / (1000 * 60 * 60 * 24));
  const periodsPassed = Math.floor(daysDiff / 14);

  const periods = [];

  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const addDays = (date: Date, days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  };

  // Helper to push period info
  const pushPeriod = (id: number, start: Date, status: string) => {
    const end = addDays(start, 13);
    const payDate = addDays(end, 1); // Next day after endDate

    periods.push({
      id,
      dates: `${formatDate(start)}-${formatDate(end)}`,
      status,
      days: 14,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      payDate: payDate.toISOString().split('T')[0],
    });
  };

  // Previous, current, next
  pushPeriod(1, addDays(basePeriodStart, (periodsPassed - 1) * 14), 'complete');
  pushPeriod(2, addDays(basePeriodStart, periodsPassed * 14), 'current');
  pushPeriod(3, addDays(basePeriodStart, (periodsPassed + 1) * 14), 'upcoming');

  return periods[1];
};

const WeekendPayrollTab = ({ onRunPayroll }: PayrollTabProps) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriodCalculations, setCurrentPeriodCalculations] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const canRunPayroll = user?.role !== 'viewer';
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [commentsModal, setCommentsModal] = useState<{ approvalId: number; batchLabel: string; batchStatus: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currentPeriod = calculatePayPeriods();
  const navigate = useNavigate();

  const { data: apiPayrollData, isLoading: isApiLoading, refetch: refetchPayrolls } = useFetch('atg/attendance/recent-payroll-runs/');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['entries', currentPeriod?.startDate, currentPeriod?.endDate],
    queryFn: () => fetchEntries({ date_from: currentPeriod?.startDate, date_to: currentPeriod?.endDate, selectedDate: null }),
    enabled: !!currentPeriod?.startDate && !!currentPeriod?.endDate,
  });

  useEffect(() => {
    initializePayrollData();
  }, []);

  const initializePayrollData = async () => {
    await generatePlaceholderPeriods();
  };

  useEffect(() => {
    if (apiPayrollData) {
      const mappedData = apiPayrollData.map((p: any) => ({
        ...p,
        total_employees: p.total_staff,
        total_net_pay: p.total_net,
        total_gross_pay: p.total_gross,
        status: p.status || 'pending',
        period_type: p.period_type || 'fortnightly',
        pay_date: p.pay_date || p.end_date,
      }));
      setPayrollPeriods(mappedData);

      // Logic from fetchPayrollData
      const hasCurrentPeriods = mappedData.some((p: any) => p.start_date >= '2025-06-01' && p.end_date <= '2025-07-31');

      if (hasCurrentPeriods) {
        setPayrollHistory(mappedData);

        // Calculate current period totals
        const currentPeriod = mappedData.find((p: any) => p.status === 'draft');
        if (currentPeriod) {
          calculateCurrentPeriodTotals(currentPeriod);
        }
      }
    }
  }, [apiPayrollData]);

  // Generate dynamic periods based on actual time records data
  const generatePlaceholderPeriods = async () => {
    const periods = [];

    // Get the actual date range from time records
    const { data: dateRange } = await supabase.from('time_records').select('date').order('date', { ascending: true });

    if (!dateRange || dateRange.length === 0) {
      console.log('No time records found');
      // Show current period with 0 hours
      const today = new Date();
      const currentStart = new Date('2025-07-02'); // Period after June 18-July 1
      const currentEnd = new Date('2025-07-15');
      const currentPayDate = new Date('2025-07-16');

      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        return `${month} ${day}`;
      };

      periods.push({
        id: 'current-empty',
        period_name: `${formatDate(currentStart.toISOString().split('T')[0])}-${formatDate(currentEnd.toISOString().split('T')[0])}, 2025`,
        start_date: currentStart.toISOString().split('T')[0],
        end_date: currentEnd.toISOString().split('T')[0],
        pay_date: currentPayDate.toISOString().split('T')[0],
        period_type: 'fortnightly',
        status: 'draft',
        total_employees: 0,
        total_gross_pay: 0,
        total_deductions: 0,
        total_net_pay: 0,
        created_at: currentStart.toISOString(),
        updated_at: currentStart.toISOString(),
      });

      setPayrollHistory(periods);
      setCurrentPeriodCalculations(periods[0]);
      return;
    }

    console.log(calculatePayPeriods());

    const dates = dateRange.map(r => r.date);
    const earliestDate = dates[0];
    const latestDate = dates[dates.length - 1];

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day}`;
    };

    // Calculate payroll for the period with actual data (June 18-July 1)
    let actualCalculations = {
      total_employees: 0,
      total_gross_pay: 0,
      total_deductions: 0,
      total_net_pay: 0,
    };

    try {
      const { data: payrollData, error } = await supabase.rpc('calculate_payroll_for_period', {
        p_start_date: earliestDate,
        p_end_date: latestDate,
      });

      if (!error && payrollData && payrollData.length > 0) {
        // Only include employees with actual hours worked (not 0 hours)
        const employeesWithHours = payrollData.filter((emp: any) => parseFloat(emp.regular_hours) > 0);

        actualCalculations = employeesWithHours.reduce(
          (acc: any, emp: any) => ({
            total_employees: acc.total_employees + 1,
            total_gross_pay: acc.total_gross_pay + (parseFloat(emp.gross_pay) || 0),
            total_deductions: acc.total_deductions + (parseFloat(emp.total_deductions) || 0),
            total_net_pay: acc.total_net_pay + (parseFloat(emp.net_pay) || 0),
          }),
          { total_employees: 0, total_gross_pay: 0, total_deductions: 0, total_net_pay: 0 },
        );

        console.log(`Actual period calculations (${earliestDate} to ${latestDate}):`, actualCalculations);
      }
    } catch (error) {
      console.error('Error calculating actual period payroll:', error);
    }

    // Create the current period (July 2-15) with 0 hours
    const currentStart = new Date('2025-07-02');
    const currentEnd = new Date('2025-07-15');
    const currentPayDate = new Date('2025-07-16');

    periods.push({
      id: 'current-period',
      period_name: `${formatDate(currentStart.toISOString().split('T')[0])}-${formatDate(currentEnd.toISOString().split('T')[0])}, 2025`,
      start_date: currentStart.toISOString().split('T')[0],
      end_date: currentEnd.toISOString().split('T')[0],
      pay_date: currentPayDate.toISOString().split('T')[0],
      period_type: 'fortnightly',
      status: 'draft',
      total_employees: 0,
      total_gross_pay: 0,
      total_deductions: 0,
      total_net_pay: 0,
      created_at: currentStart.toISOString(),
      updated_at: currentStart.toISOString(),
    });

    // Add the period with actual data (June 18-July 1) as a separate draft
    const actualStart = new Date(earliestDate);
    const actualEnd = new Date(latestDate);
    const actualPayDate = new Date(actualEnd);
    actualPayDate.setDate(actualPayDate.getDate() + 1);

    periods.push({
      id: 'previous-period',
      period_name: `${formatDate(earliestDate)}-${formatDate(latestDate)}, 2025`,
      start_date: earliestDate,
      end_date: latestDate,
      pay_date: actualPayDate.toISOString().split('T')[0],
      period_type: 'fortnightly',
      status: 'draft',
      total_employees: actualCalculations.total_employees,
      total_gross_pay: actualCalculations.total_gross_pay,
      total_deductions: actualCalculations.total_deductions,
      total_net_pay: actualCalculations.total_net_pay,
      created_at: actualStart.toISOString(),
      updated_at: actualStart.toISOString(),
    });

    // Add some historical completed periods for context
    for (let i = 1; i <= 3; i++) {
      const historyStart = new Date(actualStart);
      historyStart.setDate(actualStart.getDate() - i * 14);
      const historyEnd = new Date(historyStart);
      historyEnd.setDate(historyStart.getDate() + 13);
      const historyPayDate = new Date(historyEnd);
      historyPayDate.setDate(historyEnd.getDate() + 1);

      periods.unshift({
        id: `history-${i}`,
        period_name: `${formatDate(historyStart.toISOString().split('T')[0])}-${formatDate(historyEnd.toISOString().split('T')[0])}, 2025`,
        start_date: historyStart.toISOString().split('T')[0],
        end_date: historyEnd.toISOString().split('T')[0],
        pay_date: historyPayDate.toISOString().split('T')[0],
        period_type: 'fortnightly',
        status: 'completed',
        total_employees: Math.floor(Math.random() * 20) + 70,
        total_gross_pay: Math.floor(Math.random() * 50000) + 100000,
        total_deductions: Math.floor(Math.random() * 10000) + 20000,
        total_net_pay: Math.floor(Math.random() * 40000) + 80000,
        created_at: historyStart.toISOString(),
        updated_at: historyPayDate.toISOString(),
      });
    }

    // Set the data
    setPayrollHistory(periods);

    // Set the current period (July 2-15 with 0 hours) as the active draft
    const currentPeriod = periods.find(p => p.id === 'current-period');
    if (currentPeriod) {
      setCurrentPeriodCalculations(currentPeriod);
    }
  };

  useEffect(() => {
    console.log('payroll data', payrollPeriods);
  }, [loading]);

  const calculateCurrentPeriodTotals = async (period: any) => {
    try {
      // Call the payroll calculation function
      const { data, error } = await supabase.rpc('calculate_payroll_for_period', {
        p_start_date: period.start_date,
        p_end_date: period.end_date,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        // Only include employees with actual hours worked (not 0 hours)
        const employeesWithHours = data.filter((emp: any) => parseFloat(emp.regular_hours) > 0);

        const totals = employeesWithHours.reduce(
          (acc: any, emp: any) => ({
            totalEmployees: acc.totalEmployees + 1,
            totalGrossPay: acc.totalGrossPay + (parseFloat(emp.gross_pay) || 0),
            totalDeductions: acc.totalDeductions + (parseFloat(emp.total_deductions) || 0),
            totalNetPay: acc.totalNetPay + (parseFloat(emp.net_pay) || 0),
          }),
          { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 },
        );

        setCurrentPeriodCalculations({
          ...period,
          ...totals,
          employeeDetails: data,
        });

        // Update the period in database with calculated totals
        await supabase
          .from('payroll_periods')
          .update({
            total_employees: totals.totalEmployees,
            total_gross_pay: totals.totalGrossPay,
            total_deductions: totals.totalDeductions,
            total_net_pay: totals.totalNetPay,
          })
          .eq('id', period.id);
      }
    } catch (error) {
      console.error('Error calculating payroll totals:', error);
    }
  };

  // Mock payroll history data - now replaced with real data from Supabase

  const handleDownloadPDF = async (payroll: any) => {
    try {
      await downloadFile(
        `staff/payroll-batches/${payroll.id}/export-csv/`,
        `Payroll_Report_${payroll.start_date}_to_${payroll.end_date}.xls`,
      );

      toast({
        title: 'Success',
        description: 'Payroll report downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadCellCSV = async (payroll: any) => {
    try {
      await downloadFile(
        `staff/payroll-batches/${payroll.id}/export-cell-csv/`,
        `Cell_Payments_${payroll.start_date}_to_${payroll.end_date}.xls`,
      );
      toast({ title: 'Success', description: 'Cell phone CSV downloaded' });
    } catch (error) {
      console.error('Error downloading cell CSV:', error);
      toast({ title: 'Error', description: 'Failed to download cell CSV', variant: 'destructive' });
    }
  };

  const handleProcessBatch = (payroll: any) => {
    navigate('/payroll/weekend', {
      state: {
        approvedBatch: {
          id: payroll.id,
          start_date: payroll.start_date,
          end_date: payroll.end_date,
          total_net: payroll.total_net_pay ?? payroll.total_net ?? 0,
          total_employees: payroll.total_employees ?? 0,
        },
      },
    });
  };

  const handleDeleteBatch = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await deleteData({ url: `staff/payroll-batches/${deleteConfirmId}/` });
      toast({ title: 'Deleted', description: 'Payroll batch deleted.' });
      setDeleteConfirmId(null);
      refetchPayrolls();
    } catch {
      toast({ title: 'Error', description: 'Could not delete batch.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
      case 'queried':
        return <Badge className="bg-red-100 text-red-800">Queried</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'draft':
        return <Badge className="bg-orange-100 text-orange-800">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayrolls = payrollPeriods
    .filter(payroll => {
      const matchesStatus = filterStatus === 'all' || payroll.status.toLowerCase() === filterStatus;
      const matchesType = filterType === 'all' || payroll.period_type.toLowerCase() === filterType.toLowerCase();
      const matchesRunType = payroll.run_type === 'weekend';
      return matchesStatus && matchesType && matchesRunType;
    })
    .sort((a, b) => {
      // Active periods first (newest active first), then completed periods (newest completed first)
      const aActive = ['pending', 'approved', 'queried', 'draft'].includes(a.status);
      const bActive = ['pending', 'approved', 'queried', 'draft'].includes(b.status);
      if (aActive && !bActive) return -1;
      if (bActive && !aActive) return 1;

      // Within same status, sort by end date descending (newest first)
      return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
    });

  console.log('Current Payroll Period', data);

  const currentDraft = payrollHistory.find(p => p.id === 'current-period') || currentPeriodCalculations;

  return (
    <div className="space-y-6">
      {/* Current Draft Payroll */}
      {currentDraft && (
        <Card className="border-orange-200 bg-orange-50 hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
                Current Payroll Period
              </div>
              {canRunPayroll && (
                <Button onClick={onRunPayroll} className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2" />
                  Run Payroll
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Period Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Period</div>
                  <div className="font-medium">
                    {new Date(currentPeriod.startDate).toLocaleDateString()} - {new Date(currentPeriod.endDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Employees</div>
                  <div className="font-medium">{data?.items?.length || 0} staff</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Estimated Cost</div>
                  <div className="font-medium">R{(currentDraft.total_net_pay || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Due Date</div>
                  <div className="font-medium text-orange-600">{new Date(currentPeriod.payDate).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Staff Type Breakdown */}
              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-3">Staff Type Breakdown</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">Permanent Staff</div>
                      <div className="font-medium text-blue-700">R0.00</div>
                    </div>
                    <div className="text-xs text-gray-500">{data?.items?.length || 0} employees</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">Casual Staff</div>
                      <div className="font-medium text-green-700">R0.00</div>
                    </div>
                    <div className="text-xs text-gray-500">0 employees</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {/* Floating header with no container - matching Clients page */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Payroll History</h3>
          <div className="flex gap-2">
            {canRunPayroll && (
              <Button onClick={onRunPayroll} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Run Payroll
              </Button>
            )}
            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="queried">Queried</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="fortnightly">Fortnightly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table with grey header - matching Clients page exactly */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Period</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Employees</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Total Cost</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Run Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Bank CSV</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Cell CSV</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">View</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls?.map(payroll => (
                  <tr key={payroll.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-4">
                      <span className="text-xs font-medium text-primary hover:text-primary/80 cursor-pointer">
                        <span>
                          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(payroll.start_date))}
                          {' - '}
                          {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date(payroll.end_date))}
                          {`, ${new Date(payroll.start_date).getFullYear()}`}
                        </span>
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <Badge variant="outline" className="text-xs capitalize">
                        {payroll.period_type}
                      </Badge>
                    </td>
                    <td className="py-2 px-4 text-xs">{payroll.total_employees || 0} staff</td>
                    <td className="py-2 px-4 text-xs font-medium">R{(payroll.total_net_pay || 0).toLocaleString()}</td>
                    <td className="py-2 px-4 text-xs">
                      {payroll.status === 'completed' ? new Date(payroll.pay_date).toLocaleDateString() : '-'}
                    </td>
                    {/* Bank CSV */}
                    <td className="py-2 px-4">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Bank CSV" onClick={() => handleDownloadPDF(payroll)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </td>
                    {/* Cell CSV */}
                    <td className="py-2 px-4">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-orange-500" title="Cell Phone CSV" onClick={() => handleDownloadCellCSV(payroll)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </td>
                    <td className="py-2 px-4">
                      <button onClick={() => navigate(`/staff/payroll-batches/${payroll.id}/slips`)}>
                        <Eye className="h-4 w-4 cursor-pointer hover:text-primary" />
                      </button>
                    </td>
                    <td className="py-2 px-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">{getStatusBadge(payroll.status)}</span>
                          </TooltipTrigger>
                          {payroll.status === 'approved' && payroll.approved_by && (
                            <TooltipContent>
                              Approved by {payroll.approved_by}
                              {payroll.approved_at && ` on ${new Date(payroll.approved_at).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    {/* Actions column */}
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1">
                        {payroll.approval_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground relative"
                            title="View thread"
                            onClick={() => setCommentsModal({
                              approvalId: payroll.approval_id,
                              batchLabel: `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(payroll.start_date))} – ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(payroll.end_date))}`,
                              batchStatus: payroll.status,
                            })}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {payroll.status !== 'completed' && payroll.comment_count > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center leading-none px-0.5">
                                {payroll.comment_count}
                              </span>
                            )}
                          </Button>
                        )}
                        {payroll.status === 'approved' && canRunPayroll && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => handleProcessBatch(payroll)}
                          >
                            Process
                          </Button>
                        )}
                        {payroll.status === 'draft' && canRunPayroll && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onRunPayroll}>
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {canRunPayroll && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                            title="Delete batch"
                            onClick={() => setDeleteConfirmId(payroll.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-xs text-gray-600">Showing {filteredPayrolls.length} payroll runs</p>
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-600">
                Total paid this year:{' '}
                <span className="font-medium">
                  R
                  {payrollHistory
                    .filter(p => p.status === 'completed')
                    .reduce((sum, p) => sum + (p.total_net_pay || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {commentsModal && (
        <CommentsModal
          open={!!commentsModal}
          onOpenChange={open => { if (!open) setCommentsModal(null); }}
          approvalId={commentsModal.approvalId}
          batchLabel={commentsModal.batchLabel}
          batchStatus={commentsModal.batchStatus}
          onStatusChanged={() => { setCommentsModal(null); window.location.reload(); }}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payroll batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the batch and all its payslips. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WeekendPayrollTab;
