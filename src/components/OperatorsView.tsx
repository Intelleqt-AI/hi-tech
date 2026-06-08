
import { fmtDate, fmtDateTime } from '@/lib/utils';
import React, { useState } from 'react';
import { User, Clock, TrendingUp, ChevronDown, ChevronUp, Calendar, BarChart3 } from 'lucide-react';
import { useProfiles } from '@/hooks/useSupabaseData';
import { useAttendanceData } from '@/hooks/useProductionData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const OperatorsView = () => {
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceData();
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);
  const [staffTypeFilter, setStaffTypeFilter] = useState<string>('all');

  if (profilesLoading || attendanceLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading staff data...</div>
      </div>
    );
  }

  const operators = profiles?.filter(profile => profile.role === 'operator') || [];

  // Mock data for shift history and summary (in real app, this would come from production/attendance data)
  const getOperatorSummary = (operatorId: string) => {
    const mockData = {
      efficiency: Math.floor(Math.random() * 20) + 80, // 80-100%
      avgOutput: Math.floor(Math.random() * 50) + 150, // 150-200 units
      shiftsWorked: Math.floor(Math.random() * 15) + 10, // 10-25 shifts
      staffType: Math.random() > 0.7 ? 'casual' : 'permanent'
    };
    return mockData;
  };

  const getShiftHistory = (operatorId: string) => {
    return Array.from({ length: 7 }, (_, i) => ({
      id: `${operatorId}-${i}`,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
      shift: ['Morning', 'Afternoon', 'Night'][Math.floor(Math.random() * 3)],
      output: Math.floor(Math.random() * 50) + 120,
      target: 150,
      efficiency: Math.floor(Math.random() * 20) + 75,
      notes: i === 0 ? 'Machine maintenance delay in 2nd hour' : i === 2 ? 'Exceeded target by 15%' : ''
    }));
  };

  const filteredOperators = staffTypeFilter === 'all' 
    ? operators 
    : operators.filter(op => getOperatorSummary(op.id).staffType === staffTypeFilter);

  const toggleExpanded = (operatorId: string) => {
    setExpandedOperator(expandedOperator === operatorId ? null : operatorId);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 80) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div>
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Operators & Staff Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Staff Type:</label>
              <Select value={staffTypeFilter} onValueChange={setStaffTypeFilter}>
                <SelectTrigger className="w-32 h-10 border border-gray-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="all">All Staff</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Performance Overview with Summary Metrics */}
      <section className="mb-8">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Overview</h2>
          {filteredOperators.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-sm text-gray-500 italic text-center py-2">
                No staff records yet. Use Quick Actions to add your first operator.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOperators.map((operator) => {
                const summary = getOperatorSummary(operator.id);
                const shiftHistory = getShiftHistory(operator.id);
                const isExpanded = expandedOperator === operator.id;

                return (
                  <Card key={operator.id} className="overflow-hidden bg-white">
                    <CardContent className="p-0">
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-gray-900">{operator.full_name}</h3>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  summary.staffType === 'permanent' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {summary.staffType}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span>Machine: Not assigned</span>
                <span>•</span>
                <span>Shift: Not assigned</span>
                              </div>
                              {/* Compact metrics row */}
                              <div className="flex items-center space-x-6 text-sm mt-2">
                                <div className="flex items-center">
                                  <TrendingUp className="h-3 w-3 text-gray-400 mr-1" />
                                  <span className="text-gray-500 mr-1">Efficiency:</span>
                                  <span className="font-medium text-gray-900">{summary.efficiency}%</span>
                                </div>
                                <div className="flex items-center">
                                  <BarChart3 className="h-3 w-3 text-gray-400 mr-1" />
                                  <span className="text-gray-500 mr-1">Avg Output:</span>
                                  <span className="font-medium text-gray-900">{summary.avgOutput}</span>
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                                  <span className="text-gray-500 mr-1">Shifts:</span>
                                  <span className="font-medium text-gray-900">{summary.shiftsWorked}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpanded(operator.id)}
                              className="flex items-center gap-2"
                            >
                              Shift History
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Shift History - Expandable */}
                      {isExpanded && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                          <h4 className="font-medium text-gray-900 mb-3">Recent Shift History</h4>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead className="h-10 text-xs font-medium text-gray-600">Date</TableHead>
                                  <TableHead className="h-10 text-xs font-medium text-gray-600">Shift</TableHead>
                                  <TableHead className="h-10 text-xs font-medium text-gray-600">Output</TableHead>
                                  <TableHead className="h-10 text-xs font-medium text-gray-600">Target</TableHead>
                                  <TableHead className="h-10 text-xs font-medium text-gray-600">Efficiency</TableHead>
                                  <TableHead className="h-10 text-xs font-medium text-gray-600">Notes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {shiftHistory.map((shift) => (
                                  <TableRow key={shift.id} className="h-10 hover:bg-gray-50 border-b border-gray-100">
                                    <TableCell className="text-sm">{shift.date}</TableCell>
                                    <TableCell className="text-sm">{shift.shift}</TableCell>
                                    <TableCell className="text-sm">{shift.output} units</TableCell>
                                    <TableCell className="text-sm">{shift.target} units</TableCell>
                                    <TableCell>
                                      <span className={`font-medium text-sm ${getEfficiencyColor(shift.efficiency)}`}>
                                        {shift.efficiency}%
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      {shift.notes && (
                                        <span className="text-xs text-gray-600 italic">{shift.notes}</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Attendance Tracking */}
      <section className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Attendance Logs</h2>
        {!attendanceData || attendanceData.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-sm text-gray-500 italic text-center py-2">
              No attendance records yet.<br />
              Attendance logs will appear here once staff clock in/out.
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {(record as any).user?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {fmtDate(record.date || '')}
                    </TableCell>
                    <TableCell>
                      {record.check_in ? new Date(`2000-01-01 ${record.check_in}`).toLocaleTimeString() : '-'}
                    </TableCell>
                    <TableCell>
                      {record.check_out ? new Date(`2000-01-01 ${record.check_out}`).toLocaleTimeString() : '-'}
                    </TableCell>
                    <TableCell>{record.hours_worked || 0}h</TableCell>
                    <TableCell>
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {record.check_out ? 'complete' : 'active'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left hover:bg-blue-100 transition-colors cursor-pointer">
            <Clock className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Clock In/Out</h3>
            <p className="text-sm text-gray-600">Manual attendance logging</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left hover:bg-blue-100 transition-colors cursor-pointer">
            <User className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Add Staff Member</h3>
            <p className="text-sm text-gray-600">Register new operator</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left hover:bg-blue-100 transition-colors cursor-pointer">
            <TrendingUp className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Performance Report</h3>
            <p className="text-sm text-gray-600">Generate staff analytics</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OperatorsView;
