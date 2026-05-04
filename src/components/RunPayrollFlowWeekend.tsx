import React, { useState, useEffect } from 'react';
import { postData, downloadFile } from '@/lib/Api';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Users, Clock, Calendar, DollarSign, CheckCircle, Download, Mail } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import useFetch from '@/hooks/useFetch';

const RunPayrollFlowWeekend = ({ onBack, onComplete }: any) => {
  const [currentStep, setCurrentStep] = useState(1);
  /* const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]); */
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);
  /* const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]); */
  /* const [payrollCalculations, setPayrollCalculations] = useState<PayrollCalculation[]>([]); */
  const [payRollInfo, setPayRollInfo] = useState<any>([]);
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

  const { data: wageReportData, isLoading: wageReportLoading } = useFetch(
    `/atg/attendance/staff-weekend-wage-report/?factory=${selectedCompany}&staff_type=${selectedStaffType}&start_date=${payPeriod?.start_date}&end_date=${payPeriod?.end_date}`,
    {
      enabled: !!payPeriod?.start_date && !!payPeriod?.end_date,
    },
  );

  const payrollQuery =
    currentStep >= 3 && selectedEmployees.length > 0
      ? `/atg/attendance/staff-weekend-payroll-details/?factory=${selectedCompany}&staff_type=${selectedStaffType}&start_date=${payPeriod.start_date}&end_date=${payPeriod.end_date}&staff_ids=${selectedEmployees.map((e: any) => e.id).join(',')}`
      : '';

  const { data: payrollDetails, isLoading: payrollLoading } = useFetch(payrollQuery, { enabled: !!payrollQuery });

  // Calculate dynamic fortnightly pay periods based on actual time records
  const calculatePayPeriods = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fmt = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      return `${month} ${date.getDate()}`;
    };

    const toISO = (date: Date) => date.toISOString().split('T')[0];

    const addDays = (date: Date, n: number) => {
      const d = new Date(date);
      d.setDate(d.getDate() + n);
      return d;
    };

    // Find the most recent Sunday on or before today
    const dayOfWeek = today.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const daysToLastSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
    const lastSunday = addDays(today, -daysToLastSunday);

    // Build last 3 Fri–Sun weekends (most recent first, then reverse for display order)
    const periods = [];
    for (let i = 0; i < 3; i++) {
      const sunday = addDays(lastSunday, -i * 7);
      const friday = addDays(sunday, -2);
      const payDate = addDays(sunday, 1);

      periods.push({
        id: i + 1,
        dates: `${fmt(friday)}-${fmt(sunday)}`,
        status: 'ready-for-payroll',
        days: 3,
        startDate: toISO(friday),
        endDate: toISO(sunday),
        payDate: toISO(payDate),
      });
    }

    // Reverse so oldest is first in the list
    return periods.reverse();
  };

  // Initialize available periods based on actual time records
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        // ✅ Use your local calculatePayPeriods() function
        const calculatedPeriods = calculatePayPeriods();

        // Set all available periods (previous, current, upcoming)
        setAvailablePeriods(calculatedPeriods);

        // Default to the most recent weekend (last in the list)
        const mostRecent = calculatedPeriods[calculatedPeriods.length - 1];
        if (mostRecent) {
          setSelectedPeriodId(mostRecent.id);
          setPayPeriod({
            start_date: mostRecent.startDate,
            end_date: mostRecent.endDate,
            pay_date: mostRecent.payDate,
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
        // Net = Gross - loan_deductions - other_deductions
        const net_pay = gross_pay - loan_deductions - other_deductions;

        return {
          id: emp.id,
          atg_clock_number: emp.clock_number,
          first_name: emp.first_name,
          last_name: emp.last_name,
          name: emp.name,
          department: emp.department,
          hourly_rate: emp.hourly_rate,
          capped_hours: emp.cap_hour,
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
                    const period = availablePeriods.find(p => p.id === value);
                    if (period) {
                      setPayPeriod({
                        start_date: period.startDate,
                        end_date: period.endDate,
                        pay_date: period.payDate,
                      });
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
                  </SelectContent>
                </Select>
              </div>

              {/* Period Details */}
              {payPeriod.start_date && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg border">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground font-medium">Start Date</div>
                    <div className="text-sm font-semibold mt-1">{new Date(payPeriod.start_date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground font-medium">End Date</div>
                    <div className="text-sm font-semibold mt-1">{new Date(payPeriod.end_date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground font-medium">Pay Date</div>
                    <div className="text-sm font-semibold mt-1">{new Date(payPeriod.pay_date).toLocaleDateString()}</div>
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
    return `R ${amount.toLocaleString('en-US', {})}`;
  };

  // Update bonus for employee
  const updateBonus = (atgClockNumber: string, bonusAmount: number) => {
    setPayRollInfo(prev =>
      prev.map(calc => {
        if (calc.atg_clock_number === atgClockNumber) {
          const newBonus = bonusAmount;
          // Gross = base_gross_salary_from_api + newBonus
          const newGross = calc.base_gross_salary_from_api + newBonus;
          // Net = newGross - loan_deductions - other_deductions
          const newNet = newGross - (calc.loan_deductions || 0) - (calc.other_deductions || 0);

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
          // Net = currentGross - newLoanDeductions - other_deductions
          const newNet = currentGross - newLoanDeductions - (calc.other_deductions || 0);

          return {
            ...calc,
            loan_deductions: newLoanDeductions,
            gross_pay: currentGross, // Ensure gross is consistent
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
          // Net = currentGross - loan_deductions - newOtherDeductions
          const newNet = currentGross - (calc.loan_deductions || 0) - newOtherDeductions;

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
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + Math.round(calc.gross_pay), 0))}
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
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + Math.round(calc.net_pay), 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Net</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                {/* <TableHead>Total off weekend hours</TableHead> */}
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
                    {/* <TableCell className="text-orange-600">{Math.floor(calc.total_weekend_hours || 0)}h</TableCell> */}
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
                    <TableCell className="font-bold text-green-600">{formatCurrency(Math.round(calc.net_pay))}</TableCell>
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
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + Math.round(calc.gross_pay), 0))}
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
                  {formatCurrency(payRollInfo.reduce((sum: any, calc: any) => sum + Math.round(calc.net_pay), 0))}
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
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          Confirm & Process Payroll
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h4 className="font-medium text-sm mb-2">Payroll Summary</h4>
              <div className="space-y-1 text-sm">
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
                  <span>{selectedEmployees.length}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total Net Pay:</span>
                  <span className="text-green-600">R{payRollInfo.reduce((sum: any, calc: any) => sum + Math.round(calc.net_pay), 0)}</span>
                </div>
              </div>
            </div>

            {/* <div>
              <h4 className="font-medium text-sm mb-2">Processing Options</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox defaultChecked />
                  <span className="text-sm">Save payroll records</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox defaultChecked />
                  <span className="text-sm">Export CSV report</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox />
                  <span className="text-sm">Email payslips to employees</span>
                </div>
              </div>
            </div> */}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleProcessPayroll} className="bg-green-600 hover:bg-green-700" disabled={!!payrollId}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {payrollId ? 'Payroll Processed' : 'Process Payroll'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadReport}
              disabled={!payrollId}
              className="disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-200 disabled:hover:bg-gray-200 disabled:hover:text-gray-500 disabled:hover:border-gray-200 disabled:hover:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  const handleDownloadReport = async () => {
    if (!payrollId) return;
    try {
      await downloadFile(
        `staff/payroll-batches/${payrollId}/export-csv/`,
        `Payroll_Report_${payPeriod.start_date}_to_${payPeriod.end_date}.csv`,
      );
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const processPayrollMutation = useMutation({
    mutationFn: (data: any) => postData({ url: 'atg/attendance/save-payroll-run/', data }),
    onSuccess: data => {
      //   onComplete();
      setPayrollId(data.batch_id);
    },
    onError: error => {
      console.error('Error processing payroll:', error);
    },
  });

  const handleProcessPayroll = () => {
    const payload = {
      start_date: payPeriod.start_date,
      end_date: payPeriod.end_date,
      type: 'weekend',
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
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Run Payroll</h1>
            <p className="text-sm text-muted-foreground">
              {payPeriod.start_date} to {payPeriod.end_date}
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="sticky top-0 z-10 bg-background pb-4">
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
      <div className="flex justify-between">
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

export default RunPayrollFlowWeekend;
