
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, Plus, Download, Send, X } from 'lucide-react';

const PayrollRun = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCreatePayRun, setShowCreatePayRun] = useState(false);

  // New payroll run state
  const [newPayrollRun, setNewPayrollRun] = useState({
    period: '',
    runType: 'Regular Monthly',
    notes: ''
  });

  // Historical payroll data
  const payrollHistory = [
    {
      id: 1,
      period: 'Jan 15–25',
      type: 'Regular',
      checkDate: '2024-01-26',
      earnings: 32179.92,
      taxes: 56.00,
      totalPay: 32874.00,
      status: 'Paid'
    },
    {
      id: 2,
      period: 'Feb 1–14',
      type: 'Hourly',
      checkDate: '2024-02-15',
      earnings: 15870.00,
      taxes: 42.00,
      totalPay: 16170.00,
      status: 'Draft'
    },
    {
      id: 3,
      period: 'Dec 1–31',
      type: 'Regular',
      checkDate: '2024-12-31',
      earnings: 45230.00,
      taxes: 78.00,
      totalPay: 46120.00,
      status: 'Ready'
    },
    {
      id: 4,
      period: 'Nov 15–30',
      type: 'Bonus',
      checkDate: '2024-11-30',
      earnings: 8500.00,
      taxes: 15.00,
      totalPay: 8750.00,
      status: 'Cancelled'
    }
  ];

  // Employee data for pay run builder
  const employees = [
    {
      name: 'John Smith',
      role: 'Machine Operator',
      regularHours: 160,
      overtimeHours: 20,
      bonus: 500,
      deductions: 2200,
      grossPay: 18500,
      netPay: 16300
    },
    {
      name: 'Sarah Johnson',
      role: 'Quality Inspector',
      regularHours: 160,
      overtimeHours: 15,
      bonus: 0,
      deductions: 2050,
      grossPay: 17200,
      netPay: 15150
    },
    {
      name: 'Mike Davis',
      role: 'Supervisor',
      regularHours: 160,
      overtimeHours: 25,
      bonus: 1000,
      deductions: 2800,
      grossPay: 22400,
      netPay: 19600
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Ready':
        return 'bg-blue-100 text-blue-800';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return '💸';
      case 'Ready':
        return '✅';
      case 'Draft':
        return '📝';
      case 'Cancelled':
        return '🛑';
      default:
        return '';
    }
  };

  const handleCreatePayRun = () => {
    console.log('Creating payroll run:', newPayrollRun);
    // Process payroll logic here
    setShowCreatePayRun(false);
    setNewPayrollRun({
      period: '',
      runType: 'Regular Monthly',
      notes: ''
    });
  };

  const filteredPayrollHistory = payrollHistory.filter(payroll => {
    const matchesSearch = payroll.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payroll.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payroll.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculateTotals = () => {
    return employees.reduce((totals, emp) => ({
      grossPay: totals.grossPay + emp.grossPay,
      netPay: totals.netPay + emp.netPay,
      deductions: totals.deductions + emp.deductions
    }), { grossPay: 0, netPay: 0, deductions: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Payroll</h2>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search Payroll"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Payment Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="current">Current Period</SelectItem>
                  <SelectItem value="previous">Previous Period</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Ready">Ready</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full sm:w-auto"
              >
                Advanced Filter
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">Import</Button>
              <Sheet open={showCreatePayRun} onOpenChange={setShowCreatePayRun}>
                <SheetTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Pay Run
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Create Pay Run</SheetTitle>
                  </SheetHeader>

                  <div className="space-y-6 mt-6">
                    {/* Pay Run Controls */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-medium">Pay Run Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="payroll-period">Payroll Period</Label>
                            <Input
                              id="payroll-period"
                              value={newPayrollRun.period}
                              onChange={(e) => setNewPayrollRun({ ...newPayrollRun, period: e.target.value })}
                              placeholder="e.g., Jan 1-15, 2024"
                            />
                          </div>
                          <div>
                            <Label htmlFor="run-type">Run Type</Label>
                            <Select value={newPayrollRun.runType} onValueChange={(value) => setNewPayrollRun({ ...newPayrollRun, runType: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Regular Monthly">Regular Monthly</SelectItem>
                                <SelectItem value="Hourly">Hourly</SelectItem>
                                <SelectItem value="Bonus">Bonus</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={newPayrollRun.notes}
                            onChange={(e) => setNewPayrollRun({ ...newPayrollRun, notes: e.target.value })}
                            placeholder="Add any notes for this payroll run..."
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button onClick={handleCreatePayRun} className="bg-blue-600 hover:bg-blue-700">
                            Process Payroll
                          </Button>
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export Report
                          </Button>
                          <Button variant="outline">
                            <Send className="h-4 w-4 mr-2" />
                            Send Payslips
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Employee Payroll Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-medium">Employee Payroll Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead className="text-right">Regular Hours</TableHead>
                              <TableHead className="text-right">Overtime</TableHead>
                              <TableHead className="text-right">Bonus</TableHead>
                              <TableHead className="text-right">Deductions</TableHead>
                              <TableHead className="text-right">Gross Pay</TableHead>
                              <TableHead className="text-right">Net Pay</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employees.map((employee, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{employee.name}</TableCell>
                                <TableCell>{employee.role}</TableCell>
                                <TableCell className="text-right">{employee.regularHours}h</TableCell>
                                <TableCell className="text-right">{employee.overtimeHours}h</TableCell>
                                <TableCell className="text-right">R{employee.bonus.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-red-600">R{employee.deductions.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-medium">R{employee.grossPay.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-semibold text-green-600">R{employee.netPay.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2 bg-gray-50">
                              <TableCell className="font-semibold" colSpan={6}>Totals</TableCell>
                              <TableCell className="text-right font-semibold">R{calculateTotals().grossPay.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-semibold text-green-600">R{calculateTotals().netPay.toLocaleString()}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll History Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pay Run Period</TableHead>
                <TableHead>Payroll Type</TableHead>
                <TableHead>Check Date</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
                <TableHead className="text-right">Taxes</TableHead>
                <TableHead className="text-right">Total Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayrollHistory.map((payroll) => (
                <TableRow key={payroll.id}>
                  <TableCell className="font-medium">{payroll.period}</TableCell>
                  <TableCell>{payroll.type}</TableCell>
                  <TableCell>{payroll.checkDate}</TableCell>
                  <TableCell className="text-right">R{payroll.earnings.toLocaleString()}</TableCell>
                  <TableCell className="text-right">R{payroll.taxes.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">R{payroll.totalPay.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payroll.status)}>
                      {getStatusIcon(payroll.status)} {payroll.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                        View
                      </Button>
                      {payroll.status === 'Draft' && (
                        <>
                          <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800">
                            Resume
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                            Delete
                          </Button>
                        </>
                      )}
                      {payroll.status !== 'Draft' && (
                        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                          Edit
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollRun;
