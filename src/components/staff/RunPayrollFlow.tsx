import React, { useState, useEffect } from 'react';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { postData, downloadFile } from '@/lib/Api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Users, Clock, Calendar, DollarSign, CheckCircle, Download, Mail, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchEntries, fetchHours } from '@/lib/Api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import useFetch from '@/hooks/useFetch';

interface ApprovedBatch {
  id: number;
  start_date: string;
  end_date: string;
  total_net: number;
  total_employees: number;
  approved_by?: string | null;
  approved_at?: string | null;
  status?: string | null;
}

interface RunPayrollFlowProps {
  onBack: () => void;
  onComplete: () => void;
  approvedBatch?: ApprovedBatch;
}

const RunPayrollFlow = ({ onBack, onComplete, approvedBatch }: RunPayrollFlowProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const canSubmit = user?.role !== 'viewer';
  const [currentStep, setCurrentStep] = useState(1);
  /* const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]); */
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);
  /* const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]); */
  /* const [payrollCalculations, setPayrollCalculations] = useState<PayrollCalculation[]>([]); */
  const [payRollInfo, setPayRollInfo] = useState<any>([]);
  const [weekendBatchFound, setWeekendBatchFound] = useState<boolean>(true);
  const [availablePeriods, setAvailablePeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedStaffType, setSelectedStaffType] = useState<string>('permanent');
  const [selectedCompany, setSelectedCompany] = useState<string>('hitec');
  const [payPeriod, setPayPeriod] = useState({
    start_date: '',
    end_date: '',
    pay_date: '',
  });
  const [payrollId, setPayrollId] = useState<string>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(false);

  /*
  const {
    data,
    isLoading: customLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['entries', payPeriod?.start_date, payPeriod?.end_date],
    queryFn: () => fetchEntries({ date_from: payPeriod?.start_date, date_to: payPeriod?.end_date, selectedDate: null }),
    enabled: !!payPeriod?.start_date && !!payPeriod?.end_date,
  });
  
  const {
      data: hoursData,
      isLoading: hoursLoading,
  } = useQuery({
      queryKey: ['hours', payPeriod?.start_date, payPeriod?.end_date],
      queryFn: () => fetchHours({ date_from: payPeriod?.start_date, date_to: payPeriod?.end_date }),
      enabled: !!payPeriod?.start_date && !!payPeriod?.end_date,
  });
  */

  const { data: wageReportData, isLoading: wageReportLoading } = useFetch(
    `/atg/attendance/staff-select-wage-report/?factory=${selectedCompany}&staff_type=${selectedStaffType}&start_date=${payPeriod?.start_date}&end_date=${payPeriod?.end_date}`,
    {
      enabled: !!payPeriod?.start_date && !!payPeriod?.end_date,
    },
  );

  const payrollQuery =
    currentStep >= 3 && selectedEmployees.length > 0
      ? `/atg/attendance/staff-payroll-details/?factory=${selectedCompany}&staff_type=${selectedStaffType}&start_date=${payPeriod.start_date}&end_date=${payPeriod.end_date}&staff_ids=${selectedEmployees.map((e: any) => e.id).join(',')}`
      : '';

  const { data: payrollDetails, isLoading: payrollLoading } = useFetch(payrollQuery, { enabled: !!payrollQuery });

  // Calculate dynamic fortnightly pay periods based on actual time records
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
      const daysToFriday = ((5 - end.getDay()) % 7 + 7) % 7 || 7; // next Friday strictly after end
      const payDate = addDays(end, daysToFriday);

      periods.push({
        id,
        dates: `${formatDate(start)}-${formatDate(end)}`,
        status: 'ready-for-payroll',
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

    return periods;
  };

  // Initialize available periods based on actual time records
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        // ✅ Use your local calculatePayPeriods() function
        const calculatedPeriods = calculatePayPeriods();

        // Set all available periods (previous, current, upcoming)
        setAvailablePeriods(calculatedPeriods);

        // ✅ Optionally, set current period as default
        const current = calculatedPeriods.find(p => p.status === 'current');
        if (current) {
          setSelectedPeriodId(current.id);
          setPayPeriod({
            start_date: current.startDate,
            end_date: current.endDate,
            pay_date: current.payDate,
          });
        }
      } catch (error) {
        console.error('Error loading periods:', error);
      }
    };

    loadPeriods();
  }, []);

  const steps = [
    { id: 1, title: 'Select Period & Options', icon: Calendar },
    { id: 2, title: 'Select Staff', icon: Users },
    { id: 3, title: 'Calculate Pay', icon: DollarSign },
    { id: 4, title: 'Confirm & Process', icon: CheckCircle },
  ];

  // Filter employees based on staff type and time records
  const getFilteredEmployees = () => {
    if (!wageReportData?.staff) return [];

    return wageReportData.staff.map((emp: any) => ({
      ...emp,
      atg_clock_number: emp.clock_number, // Map clock_number to atg_clock_number for compatibility
      timeSpend: emp.total_hours || 0,
    }));
  };

  // Auto-select filtered employees when criteria change
  useEffect(() => {
    if (payPeriod.start_date && payPeriod.end_date && wageReportData?.staff) {
      const filteredEmployees = getFilteredEmployees();

      // Auto-select employees if none are selected or if filters changed (effectively selects all visible)
      // We can just select all from the report as the report is already filtered by the API
      setSelectedEmployees(filteredEmployees);
    }
  }, [payPeriod, wageReportData]);

  // Sync payroll details from API to state
  useEffect(() => {
    if (payrollDetails) {
      setWeekendBatchFound(payrollDetails.weekend_batch_found ?? true);
    }
    if (payrollDetails?.staff) {
      const mappedEmployees = payrollDetails.staff.map((emp: any) => {
        // Map API fields to internal state
        // The API response has `gross_salary`, `total_bonus`, `total_loan_installment`, `net_salary`.
        // We need to ensure our internal state `bonus_pay`, `loan_deductions`, `other_deductions`
        // and `gross_pay`, `net_pay` are correctly initialized and can be edited.

        // Let's assume:
        // API `gross_salary` is the base gross (before bonus, after regular/overtime pay).
        // API `total_bonus` is the bonus.
        // API `total_loan_installment` is the loan deduction.
        // API `net_salary` is the final net after all API-calculated deductions.

        // For editable fields, we initialize them from API or 0.
        const bonus_pay = emp.total_bonus || 0;
        const loan_deductions = emp.total_loan_installment || 0;
        const other_deductions = 0; // This is user-editable, starts at 0

        // Calculate gross and net based on these editable fields and API base values
        // Gross = API_gross_salary + bonus_pay
        const gross_pay = (emp.gross_salary || 0) + bonus_pay;
        // Net = Gross - other_deductions (loans shown but not deducted)
        const net_pay = gross_pay - other_deductions;

        return {
          id: emp.id,
          atg_clock_number: emp.clock_number,
          first_name: emp.first_name,
          last_name: emp.last_name,
          name: emp.name,
          department: emp.department,
          hourly_rate: emp.hourly_rate,
          capped_hours: emp.cap_hour,
          phone_number: emp.phone_number || '',
          total_worked_hours: emp.total_hours,
          total_weekend_hours: emp.weekend_hours,
          total_paid_hours: emp.paid_hours,

          base_gross_salary_from_api: emp.gross_salary || 0, // Store original API gross for recalculations
          bonus_pay: bonus_pay,
          loan_deductions: loan_deductions,
          other_deductions: other_deductions, // Initialized to 0

          gross_pay: gross_pay,
          net_pay: net_pay,
        };
      });
      setPayRollInfo(mappedEmployees);
    }
  }, [payrollDetails]);

  useEffect(() => {
    if (!payrollDetails && selectedEmployees.length > 0) {
      // Fallback or initial logic if needed (e.g. before Step 3 fetch)
      // For now, we rely on the fetch in Step 3 for the detailed view.
      // But we might want basic info for Step 2. (Already handled by wageReportData)
    }
  }, [selectedEmployees]);

  // Jump straight to Confirm & Process when opening an already-approved batch
  useEffect(() => {
    if (approvedBatch) {
      setPayrollId(approvedBatch.id.toString());
      setPayPeriod({
        start_date: approvedBatch.start_date,
        end_date: approvedBatch.end_date,
        pay_date: '',
      });
      setCurrentStep(4);
    }
  }, []);

  const handleFinalizeApproved = async () => {
    if (!approvedBatch) return;
    setFinalizing(true);
    try {
      await postData({ url: 'atg/attendance/process-payroll-batch/', data: { batch_id: approvedBatch.id } });
      setFinalized(true);
      toast({ title: 'Payroll Finalized', description: 'Payroll processed and completed.' });
    } catch {
      toast({ title: 'Error', description: 'Could not finalize. Try again.', variant: 'destructive' });
    } finally {
      setFinalizing(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Pay Period Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Pay Period</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div>
                <Label className="text-sm font-medium">Available Pay Periods</Label>
                <Select
                  value={selectedPeriodId}
                  onValueChange={value => {
                    setSelectedPeriodId(value);
                    if (value === 'custom') {
                      setPayPeriod({ start_date: '', end_date: '', pay_date: '' });
                    } else {
                      const period = availablePeriods.find(p => p.id === value);
                      if (period) {
                        setPayPeriod({
                          start_date: period.startDate,
                          end_date: period.endDate,
                          pay_date: period.payDate,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a pay period..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriods.map(period => (
                      <SelectItem key={period.id} value={period.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{period.dates}</span>
                          <Badge
                            className="ml-2 bg-green-500 hover:bg-green-600 text-white"
                            variant={period.status === 'ready-for-payroll' ? 'default' : 'outline'}
                          >
                            {period.status === 'ready-for-payroll' ? 'Ready' : 'Incomplete'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Period</SelectItem>
                  </SelectContent>
                </Select>

                {selectedPeriodId === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Date</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        value={payPeriod.start_date}
                        onChange={e => {
                          const start = e.target.value;
                          const end = payPeriod.end_date;
                          const payDate = end ? (() => {
                            const d = new Date(end);
                            const daysToFri = ((5 - d.getDay()) % 7 + 7) % 7 || 7;
                            d.setDate(d.getDate() + daysToFri);
                            return d.toISOString().split('T')[0];
                          })() : '';
                          setPayPeriod({ start_date: start, end_date: end, pay_date: payDate });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">End Date</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        value={payPeriod.end_date}
                        onChange={e => {
                          const end = e.target.value;
                          const d = new Date(end);
                          const daysToFri = ((5 - d.getDay()) % 7 + 7) % 7 || 7;
                          d.setDate(d.getDate() + daysToFri);
                          const payDate = d.toISOString().split('T')[0];
                          setPayPeriod({ start_date: payPeriod.start_date, end_date: end, pay_date: payDate });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Period Details */}
              {payPeriod.start_date && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg border">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground font-medium">Start Date</div>
                    <div className="text-sm font-semibold mt-1">{fmtDate(payPeriod.start_date)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground font-medium">End Date</div>
                    <div className="text-sm font-semibold mt-1">{fmtDate(payPeriod.end_date)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground font-medium">Pay Date</div>
                    <div className="text-sm font-semibold mt-1">{fmtDate(payPeriod.pay_date)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Type and Company Selection - 50/50 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Type Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Staff Type</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Select Staff Type for Payroll</Label>
                <Select value={selectedStaffType} onValueChange={setSelectedStaffType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select staff type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    <SelectItem value="permanent">Permanent Staff Only</SelectItem>
                    <SelectItem value="casual">Casual Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-700">
                  <strong>Note:</strong> Casual staff have no tax deductions, permanent staff include tax deductions.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Company</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Select Company for Payroll</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value=" ">All Companies</SelectItem> */}
                    <SelectItem value="RANDM">RANDM</SelectItem>
                    <SelectItem value="hitec">HITEC</SelectItem>
                    <SelectItem value="CASUALS">CASUALS</SelectItem>
                    <SelectItem value="YOUTH_WORK">YOUTH @ WORK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-[52px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                Company filtering will affect payroll processing
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Employee Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Select Employees ({selectedEmployees.length} selected)</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const filteredEmployees = getFilteredEmployees();
                  setSelectedEmployees(filteredEmployees);
                }}
              >
                Select All Filtered
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedEmployees([])}>
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Cap Hour</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredEmployees().map(employee => {
                // const empTimeRecords = timeRecords.filter(
                //   tr => tr.employee_id === employee.id || tr.atg_clock_number === employee.atg_clock_number
                // );
                // const totalHours = empTimeRecords.reduce((sum, tr) => sum + (tr.total_hours || 0), 0);

                // // Find active loans for this employee
                // const empLoans = payrollCalculations.find(calc => calc.employee_id === employee.id);
                // const loanDeductions = empLoans?.loan_deductions || 0;

                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEmployees.some(e => e.id === employee.id)}
                        onCheckedChange={checked => {
                          if (checked) {
                            setSelectedEmployees([...selectedEmployees, employee]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter(id => id.id !== employee.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee.atg_clock_number} • {Math.round(employee?.timeSpend || 0)}h worked
                          {/* {loanDeductions > 0 && <span className="text-orange-600 ml-2">• R{loanDeductions.toFixed(2)} loan</span>} */}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.cap_hour}</TableCell>
                    <TableCell>R{employee.hourly_rate}/hr</TableCell>
                    <TableCell>
                      <Badge className="capitalize" variant="outline">
                        {employee.employee_type}
                        {employee.capped_hours && ` • Cap: ${employee.capped_hours}`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  /* renderStep3 removed as it was unused and relied on local timeRecords */

  // Format currency with commas
  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Update bonus for employee
  const updateBonus = (atgClockNumber: string, bonusAmount: number) => {
    setPayRollInfo(prev =>
      prev.map(calc => {
        if (calc.atg_clock_number === atgClockNumber) {
          const newBonus = bonusAmount;
          // Gross = base_gross_salary_from_api + newBonus
          const newGross = calc.base_gross_salary_from_api + newBonus;
          const newNet = newGross - (calc.other_deductions || 0);

          return {
            ...calc,
            bonus_pay: newBonus,
            gross_pay: newGross,
            net_pay: newNet,
          };
        }
        return calc;
      }),
    );
  };

  // Update loans for employee
  const updateLoans = (atgClockNumber: string, loanAmount: number) => {
    setPayRollInfo(prev =>
      prev.map(calc => {
        if (calc.atg_clock_number === atgClockNumber) {
          const newLoanDeductions = loanAmount;
          // Gross remains the same (base_gross_salary_from_api + bonus_pay)
          const currentGross = calc.base_gross_salary_from_api + (calc.bonus_pay || 0);
          const newNet = currentGross - (calc.other_deductions || 0);

          return {
            ...calc,
            loan_deductions: newLoanDeductions,
            gross_pay: currentGross,
            net_pay: newNet,
          };
        }
        return calc;
      }),
    );
  };

  const updateOtherDeductions = (atgClockNumber: string, otherDeductionsAmount: number) => {
    setPayRollInfo(prev =>
      prev.map(calc => {
        if (calc.atg_clock_number === atgClockNumber) {
          const newOtherDeductions = otherDeductionsAmount;
          // Gross remains the same (base_gross_salary_from_api + bonus_pay)
          const currentGross = calc.base_gross_salary_from_api + (calc.bonus_pay || 0);
          const newNet = currentGross - newOtherDeductions;

          return {
            ...calc,
            other_deductions: newOtherDeductions,
            gross_pay: currentGross, // Ensure gross is consistent
            net_pay: newNet,
          };
        }
        return calc;
      }),
    );
  };

  const renderStep4 = () => (
    <div className="space-y-4">
      {/* Summary Totals at Top */}
      <div className="sticky w-full top-32 z-10 bg-background">
        <Card className="shadow-sm">
          <CardContent className="py-4">
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + calc.gross_pay, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Gross</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + calc.bonus_pay, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Additions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + (calc.loan_deductions || 0), 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Loans</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + (calc.other_deductions || 0), 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Deductions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + calc.net_pay, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Net</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!weekendBatchFound && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
          <span className="mt-0.5 text-lg">⚠️</span>
          <div>
            <p className="font-semibold">Weekend Payroll not saved for this period</p>
            <p className="text-sm">Weekend hours have not been deducted. Save the Weekend Payroll for this date range first, then reload General Payroll to apply the correct deductions.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payroll Calculations</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Capped hrs per shift</TableHead>
                <TableHead>Rate p/hr</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Total worked hours</TableHead>
                <TableHead>Weekend Hours (deducted)</TableHead>
                <TableHead>Total paid hours</TableHead>
                <TableHead>Other Deductions</TableHead>
                <TableHead>Loans</TableHead>
                <TableHead>Net Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payRollInfo?.map((calc: any) => {
                return (
                  <TableRow key={calc.atg_clock_number}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {calc.first_name} {calc.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">{calc.atg_clock_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>{calc.capped_hours || 11}</TableCell>
                    <TableCell>{formatCurrency(calc?.hourly_rate || 0)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={calc?.bonus_pay}
                        onChange={e => updateBonus(calc?.atg_clock_number, parseFloat(e.target.value) || 0)}
                        className="w-24 h-8 text-sm"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{Math.floor(calc.total_worked_hours || 0)}h</TableCell>
                    <TableCell className="text-orange-600">{Math.floor(calc.total_weekend_hours || 0)}h</TableCell>
                    <TableCell className="text-red-600">{Math.floor(calc.total_paid_hours || 0)}h</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={calc?.other_deductions}
                        onChange={e => updateOtherDeductions(calc?.atg_clock_number, parseFloat(e.target.value) || 0)}
                        className="w-24 h-8 text-sm"
                        placeholder="0.00"
                      />
                    </TableCell>
                    {/* <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={calc?.loan_deductions}
                        onChange={e => updateLoans(calc?.atg_clock_number, parseFloat(e.target.value) || 0)}
                        className="w-24 h-8 text-sm"
                        placeholder="0.00"
                      />
                    </TableCell> */}
                    <TableCell className="font-medium">{formatCurrency(calc.loan_deductions)}</TableCell>
                    <TableCell className="font-bold text-green-600">{formatCurrency(calc.net_pay)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Summary */}
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-lg font-bold">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + calc.gross_pay, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Gross</div>
              </div>
              <div>
                <div className="text-lg font-bold">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + calc.bonus_pay, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Additions</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + (calc.loan_deductions || 0), 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Loans</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + (calc.other_deductions || 0), 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Deductions</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + calc.net_pay, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Net</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep5 = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base print:text-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="print:hidden">Confirm & Process Payroll</span>
          <span className="hidden print:inline">Payroll Info</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <div className="space-y-1 text-sm print:text-base print:space-y-2">
                {approvedBatch?.status && (
                  <div className="flex justify-between text-sm print:text-base border-b pb-2 mb-1">
                    <span>Status:</span>
                    <span className="capitalize">{approvedBatch.status}</span>
                  </div>
                )}
                {approvedBatch?.approved_by && (
                  <div className="flex justify-between text-sm print:text-base border-b pb-2 mb-1">
                    <span>Approved by:</span>
                    <span>{approvedBatch.approved_by}</span>
                  </div>
                )}
                {approvedBatch?.approved_at && (
                  <div className="flex justify-between text-sm print:text-base border-b pb-2 mb-1">
                    <span>Approved on:</span>
                    <span>{fmtDateTime(approvedBatch.approved_at)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Company:</span>
                  <span className="capitalize">{selectedCompany}</span>
                </div>
                <div className="flex justify-between">
                  <span>Staff Type:</span>
                  <span className="capitalize">{selectedStaffType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Period:</span>
                  <span>
                    {payPeriod.start_date} to {payPeriod.end_date}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pay Date:</span>
                  <span>{payPeriod.pay_date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Employees:</span>
                  <span>{approvedBatch ? approvedBatch.total_employees : selectedEmployees.length}</span>
                </div>
                {!approvedBatch && (
                  <>
                    <div className="flex justify-between">
                      <span>Deductions:</span>
                      <span>{formatCurrency(payRollInfo.reduce((sum, c) => sum + c.other_deductions, 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loans:</span>
                      <span>{formatCurrency(payRollInfo.reduce((sum, c) => sum + c.loan_deductions, 0))}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Net Pay to Bank Account:</span>
                      <span>{formatCurrency(payRollInfo.filter(e => !e.phone_number).reduce((sum, c) => sum + c.net_pay, 0))}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Net Pay to Cell Phone:</span>
                      <span>{formatCurrency(payRollInfo.filter(e => !!e.phone_number).reduce((sum, c) => sum + c.net_pay, 0))}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-medium print:font-semibold print:text-lg print:border-t print:pt-1">
                  <span>Total Net Pay:</span>
                  <span className="text-green-600">
                    {approvedBatch
                      ? formatCurrency(approvedBatch.total_net)
                      : formatCurrency(payRollInfo.reduce((sum, calc) => sum + calc.net_pay, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Approved batch mode */}
          {approvedBatch && (
            <>
              {finalized ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Payroll finalized and completed. Downloads ready below.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Payroll approved — click Finalize to process and enable downloads.</span>
                </div>
              )}
              <div className="flex gap-2 pt-2 print:hidden print-hidden">
                {!finalized && (
                  <Button onClick={handleFinalizeApproved} className="bg-green-600 hover:bg-green-700" disabled={finalizing}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {finalizing ? 'Finalizing...' : 'Finalize Payroll'}
                  </Button>
                )}
                <Button variant="outline" onClick={handleDownloadReport} disabled={!finalized}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button variant="outline" onClick={handleDownloadCellPhoneCSV} disabled={!finalized}>
                  <Download className="h-4 w-4 mr-2" />
                  Cell Phone CSV
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </>
          )}

          {/* Normal new-payroll mode */}
          {!approvedBatch && (
            <>
              {payrollId && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Submitted for approval — awaiting review before processing.</span>
                </div>
              )}
              <div className="flex gap-2 pt-2 print:hidden print-hidden">
                {canSubmit && (
                  <Button onClick={handleProcessPayroll} className="bg-green-600 hover:bg-green-700" disabled={!!payrollId || processPayrollMutation.isPending}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {payrollId ? 'Submitted for Approval' : processPayrollMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleDownloadReport}
                  disabled={true}
                  className="disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-200 disabled:hover:bg-gray-200 disabled:hover:text-gray-500 disabled:hover:border-gray-200 disabled:hover:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadCellPhoneCSV}
                  disabled={true}
                  className="disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-200 disabled:hover:bg-gray-200 disabled:hover:text-gray-500 disabled:hover:border-gray-200 disabled:hover:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Cell Phone CSV
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const handleDownloadReport = async () => {
    if (!payrollId) return;
    try {
      await downloadFile(
        `staff/payroll-batches/${payrollId}/export-csv/`,
        `Payroll_Report_${payPeriod.start_date}_to_${payPeriod.end_date}.xls`,
      );
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const handleDownloadCellPhoneCSV = async () => {
    if (!payrollId) return;
    try {
      await downloadFile(
        `staff/payroll-batches/${payrollId}/export-cell-csv/`,
        `Cell_Payments_${payPeriod.start_date}_to_${payPeriod.end_date}.xls`,
      );
    } catch (error) {
      console.error('Error downloading cell phone CSV:', error);
    }
  };

  const processPayrollMutation = useMutation({
    mutationFn: (data: any) => postData({ url: 'atg/attendance/save-payroll-run/', data }),
    onSuccess: data => {
      setPayrollId(data.batch_id);
      toast({
        title: 'Payroll Submitted for Approval',
        description: 'An admin will review and approve before processing.',
      });
    },
    onError: error => {
      console.error('Error processing payroll:', error);
      toast({ title: 'Error saving payroll', description: 'Please try again.', variant: 'destructive' });
    },
  });

  const handleProcessPayroll = () => {
    const payload = {
      start_date: payPeriod.start_date,
      end_date: payPeriod.end_date,
      type: 'general',
      factory: selectedCompany,
      staff_type: selectedStaffType,
      records: payRollInfo.map(
        (calc: {
          id: number;
          capped_hours?: number;
          hourly_rate?: number;
          bonus_pay?: number;
          total_worked_hours?: number;
          total_weekend_hours?: number;
          total_paid_hours?: number;
          other_deductions?: number;
          loan_deductions?: number;
          net_pay?: number;
        }) => ({
          staff_id: calc.id,
          capped_hours: calc.capped_hours ?? 0,
          hourly_rate: calc.hourly_rate ?? 0,
          bonus: calc.bonus_pay ?? 0,
          total_hours: calc.total_worked_hours ?? 0,
          weekend_hours: calc.total_weekend_hours ?? 0,
          paid_hours: calc.total_paid_hours ?? 0,
          other_deductions: calc.other_deductions ?? 0,
          loans: calc.loan_deductions ?? 0,
          net_salary: calc.net_pay ?? 0,
        }),
      ),
    };

    processPayrollMutation.mutate(payload);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep4();
      case 4:
        return renderStep5();
      default:
        return renderStep1();
    }
  };

  if (wageReportLoading || payrollLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading payroll data...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack} className="print:hidden print-hidden">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Run Payroll (General)</h1>
            <p className="text-sm text-muted-foreground">
              {payPeriod.start_date} to {payPeriod.end_date}
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="sticky top-0 z-10 bg-background pb-4 print:hidden print-hidden">
        <Card className="shadow-md">
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs
                      ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : isCompleted
                            ? 'border-green-500 bg-green-50 text-green-600'
                            : 'border-gray-300 bg-gray-50 text-gray-400'
                      }
                    `}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                    {index < steps.length - 1 && <div className={`w-16 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />}
                  </div>
                );
              })}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-green-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs font-medium">Step {currentStep}: </span>
              <span className="text-xs text-muted-foreground">{steps[currentStep - 1]?.title}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step Content */}
      {renderCurrentStep()}

      {/* Navigation */}
      <div className="flex justify-between print:hidden print-hidden">
        <Button variant="outline" size="sm" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep < steps.length && (
          <Button
            size="sm"
            onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
            disabled={currentStep === 1 && selectedEmployees.length === 0}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default RunPayrollFlow;
