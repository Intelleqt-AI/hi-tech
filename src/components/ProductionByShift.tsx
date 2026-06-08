import React, { useState, useMemo } from 'react';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { Filter, Download, MessageSquare, ArrowUpDown, Users, Target, Clock, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import { useProductionData } from '@/hooks/useProductionData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ProductionByShift = () => {
  const [sortField, setSortField] = useState<'output' | 'efficiency' | 'completion'>('output');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [expandedDeductions, setExpandedDeductions] = useState<Record<string, boolean>>({});
  
  const { data: productionData, isLoading } = useProductionData();

  // Mock shift data with detailed information
  const mockShiftData = [
    {
      id: 'shift1-16052025',
      shift: 'Shift 1',
      date: '16/05/2025',
      operators: ['S. Moyo (ID: 001)', 'A. Pillay (ID: 003)', 'R. Singh (ID: 007)', 'M. Patel (ID: 012)'],
      machines: ['Loom A1', 'Cutter B2', 'Winder C1'],
      totalOutput: 2780,
      totalTarget: 3000,
      targetCompletion: '92.7',
      hoursWorked: 8,
      avgSpeed: 185,
      operatorTimeline: [
        { operatorId: '001', task: 'Bailing', duration: '3.5h', pcs: 650 },
        { operatorId: '001', task: 'Cutting', duration: '4.5h', pcs: 850 },
        { operatorId: '003', task: 'Reel Change', duration: '2h', pcs: 420 },
        { operatorId: '003', task: 'Quality Check', duration: '6h', pcs: 1180 }
      ],
      deductions: [
        { machine: 'Loom A1', duration: '45min', reason: 'Thread break', note: 'Operator replaced defective thread' },
        { machine: 'Cutter B2', duration: '20min', reason: 'Blade change', note: 'Scheduled maintenance' }
      ],
      taskSummary: [
        { task: 'Bailing', pcs: 1240, time: '5.5h' },
        { task: 'Cutting', pcs: 980, time: '6.2h' },
        { task: 'Reel Change', pcs: 560, time: '3.1h' }
      ]
    },
    {
      id: 'nightshift-16052025',
      shift: 'Night Shift',
      date: '16/05/2025',
      operators: ['T. Kumar (ID: 005)', 'L. Reddy (ID: 009)', 'K. Shah (ID: 015)'],
      machines: ['Loom A2', 'Cutter B1'],
      totalOutput: 1350,
      totalTarget: 1600,
      targetCompletion: '84.4',
      hoursWorked: 8,
      avgSpeed: 168,
      operatorTimeline: [
        { operatorId: '005', task: 'Cutting', duration: '8h', pcs: 680 },
        { operatorId: '009', task: 'Bailing', duration: '6h', pcs: 480 },
        { operatorId: '015', task: 'Quality Check', duration: '4h', pcs: 190 }
      ],
      deductions: [
        { machine: 'Loom A2', duration: '1.2h', reason: 'Power outage', note: 'Generator backup delayed' },
        { machine: 'Cutter B1', duration: '30min', reason: 'Material shortage', note: 'Waiting for delivery' }
      ],
      taskSummary: [
        { task: 'Cutting', pcs: 680, time: '8h' },
        { task: 'Bailing', pcs: 480, time: '6h' },
        { task: 'Quality Check', pcs: 190, time: '4h' }
      ]
    }
  ];

  const shiftData = useMemo(() => {
    if (productionData && productionData.length > 0) {
      const grouped = productionData.reduce((acc: any, record: any) => {
        const shiftKey = `${record.shift || 'unknown'}-${new Date(record.recorded_at || '').toDateString()}`;
        const operatorName = (record as any).operator?.full_name || 'Unknown Operator';
        const target = record.machines?.production_target || 0;
        
        if (!acc[shiftKey]) {
          acc[shiftKey] = {
            id: shiftKey,
            shift: record.shift || 'Unknown',
            date: fmtDate(record.recorded_at || ''),
            operators: new Set(),
            machines: new Set(),
            totalOutput: 0,
            totalTarget: 0,
            recordCount: 0
          };
        }
        
        acc[shiftKey].operators.add(operatorName);
        acc[shiftKey].machines.add(record.machines?.name || 'Unknown');
        acc[shiftKey].totalOutput += record.units_produced || 0;
        acc[shiftKey].totalTarget += target;
        acc[shiftKey].recordCount += 1;
        
        return acc;
      }, {});

      return Object.values(grouped).map((shift: any) => ({
        ...shift,
        operators: Array.from(shift.operators),
        machines: Array.from(shift.machines),
        machinesActive: shift.machines.size,
        operatorsLogged: shift.operators.size,
        targetCompletion: shift.totalTarget > 0 ? ((shift.totalOutput / shift.totalTarget) * 100).toFixed(1) : '0'
      }));
    }
    return mockShiftData;
  }, [productionData]);

  const sortedShiftData = useMemo(() => {
    return [...shiftData].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'output':
          aValue = a.totalOutput;
          bValue = b.totalOutput;
          break;
        case 'completion':
          aValue = parseFloat(a.targetCompletion);
          bValue = parseFloat(b.targetCompletion);
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });
  }, [shiftData, sortField, sortDirection]);

  const handleSort = (field: 'output' | 'efficiency' | 'completion') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleCommentChange = (shiftId: string, comment: string) => {
    setComments(prev => ({ ...prev, [shiftId]: comment }));
  };

  const toggleCommentExpansion = (shiftId: string) => {
    setExpandedComments(prev => ({ ...prev, [shiftId]: !prev[shiftId] }));
  };

  const toggleDeductionsExpansion = (shiftId: string) => {
    setExpandedDeductions(prev => ({ ...prev, [shiftId]: !prev[shiftId] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading shift data...</div>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">Production by Shift</h2>
        <div className="flex items-center space-x-3">
          <button className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button className="flex items-center px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Shift Summary Cards */}
      <div className="space-y-6 mb-8">
        {sortedShiftData.map((shift) => (
          <Card key={shift.id} className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-gray-900">
                  {shift.shift} - {shift.date}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    parseFloat(shift.targetCompletion) >= 90 ? 'bg-hitec-success text-green-800' :
                    parseFloat(shift.targetCompletion) >= 75 ? 'bg-hitec-warning text-yellow-800' :
                    'bg-hitec-error text-red-800'
                  }`}>
                    {shift.targetCompletion}% Target
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500">Total Output</div>
                  <div className="text-lg font-semibold">{shift.totalOutput.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Speed</div>
                  <div className="text-lg font-semibold">{shift.avgSpeed} pcs/min</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Hours Worked</div>
                  <div className="text-lg font-semibold">{shift.hoursWorked}h</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Staff Count</div>
                  <div className="text-lg font-semibold">{shift.operators.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Efficiency</div>
                  <div className="text-lg font-semibold">{shift.targetCompletion}%</div>
                </div>
              </div>

              {/* Operator Timeline */}
              <div className="mb-6">
                <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Users className="h-4 w-4" />
                  Operator & Task Timeline
                </h4>
                <div className="space-y-2">
                  {shift.operatorTimeline.map((timeline, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="font-medium text-sm text-gray-900 min-w-[80px]">
                        ID: {timeline.operatorId}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm text-gray-700">{timeline.task}</span>
                        <span className="text-xs text-gray-500">→</span>
                        <span className="text-sm font-medium">{timeline.duration}</span>
                        <span className="text-xs text-gray-500">→</span>
                        <span className="text-sm text-blue-700 font-medium">{timeline.pcs} pcs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Summary Table */}
              <div className="mb-6">
                <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Target className="h-4 w-4" />
                  PCS by Task Summary
                </h4>
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Task</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">PCS</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shift.taskSummary.map((task, index) => (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="px-4 py-2 text-gray-900">{task.task}</td>
                          <td className="px-4 py-2 text-right font-medium">{task.pcs.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right text-gray-700">{task.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deductions & Notes */}
              <Collapsible 
                open={expandedDeductions[shift.id]}
                onOpenChange={() => toggleDeductionsExpansion(shift.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 mb-3">
                    <Wrench className="h-4 w-4" />
                    Deductions & Notes ({shift.deductions.length})
                    {expandedDeductions[shift.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    {shift.deductions.map((deduction, index) => (
                      <div key={index} className="border-l-4 border-yellow-400 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{deduction.machine}</span>
                          <span className="text-sm text-red-600 font-medium">{deduction.duration}</span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">
                          <span className="font-medium">Reason:</span> {deduction.reason}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Note:</span> {deduction.note}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Supervisor Notes */}
              <Collapsible 
                open={expandedComments[shift.id]}
                onOpenChange={() => toggleCommentExpansion(shift.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Add Supervisor Notes
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supervisor Notes for {shift.shift} - {shift.date}
                    </label>
                    <Textarea
                      value={comments[shift.id] || ''}
                      onChange={(e) => handleCommentChange(shift.id, e.target.value)}
                      placeholder="Add notes about this shift's performance..."
                      className="min-h-[80px]"
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      <div>Operators: {shift.operators.join(', ')}</div>
                      <div>Machines: {shift.machines.join(', ')}</div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Showing {shiftData.length} shift records</span>
      </div>
    </section>
  );
};

export default ProductionByShift;
