import React, { useState, useMemo } from 'react';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { Filter, Download, MessageSquare, ArrowUpDown } from 'lucide-react';
import { useProductionData } from '@/hooks/useProductionData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ProductionByMachine = () => {
  const [sortField, setSortField] = useState<'output' | 'efficiency' | 'waste'>('output');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  
  const { data: productionData, isLoading } = useProductionData();

  const processedData = useMemo(() => {
    if (!productionData || productionData.length === 0) return [];

    return productionData.map(record => ({
      id: record.id,
      machine: record.machines?.name || 'Unknown Machine',
      outputUnits: record.quantity || 0,
      target: record.machines?.production_target || 0,
      efficiency: record.efficiency_percentage?.toFixed(1) || '0',
      operator: 'Unknown Operator',
      shift: 'Day Shift',
      date: fmtDate(record.recorded_at || '')
    }));
  }, [productionData]);

  const sortedData = useMemo(() => {
    return [...processedData].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'output':
          aValue = a.outputUnits;
          bValue = b.outputUnits;
          break;
        case 'efficiency':
          aValue = parseFloat(a.efficiency);
          bValue = parseFloat(b.efficiency);
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });
  }, [processedData, sortField, sortDirection]);

  const handleSort = (field: 'output' | 'efficiency' | 'waste') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleCommentChange = (recordId: string, comment: string) => {
    setComments(prev => ({ ...prev, [recordId]: comment }));
  };

  const toggleCommentExpansion = (recordId: string) => {
    setExpandedComments(prev => ({ ...prev, [recordId]: !prev[recordId] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading machine data...</div>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">Production by Machine</h2>
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

      <div className="dev-mock mt-4">
        <table className="w-full text-sm text-left border border-gray-200 rounded-md overflow-hidden">
          <thead className="bg-gray-50 text-gray-600 font-semibold">
            <tr>
              <th className="p-2">Machine</th>
              <th className="p-2">Output (units)</th>
              <th className="p-2">Target</th>
              <th className="p-2">Efficiency</th>
              <th className="p-2">Operator</th>
              <th className="p-2">Shift</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white text-gray-800">
            <tr className="border-t">
              <td className="p-2">Loom A1</td>
              <td className="p-2">1,250</td>
              <td className="p-2">1,500</td>
              <td className="p-2">83%</td>
              <td className="p-2">S. Moyo</td>
              <td className="p-2">Day</td>
              <td className="p-2">11/06/2025</td>
            </tr>
            <tr className="border-t">
              <td className="p-2">Cutter B2</td>
              <td className="p-2">890</td>
              <td className="p-2">1,000</td>
              <td className="p-2">89%</td>
              <td className="p-2">A. Pillay</td>
              <td className="p-2">Night</td>
              <td className="p-2">11/06/2025</td>
            </tr>
          </tbody>
        </table>
      </div>

      {processedData.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="dev-placeholder">
              <p className="text-sm text-gray-500 italic text-center py-4">
                No production data found for this view.<br/>
                Upload a Loomage or Cutting report to populate this section.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {processedData.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="font-semibold text-gray-900">Machine</TableHead>
                  <TableHead 
                    className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('output')}
                  >
                    <div className="flex items-center justify-end">
                      Output Units
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center">Target</TableHead>
                  <TableHead 
                    className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('efficiency')}
                  >
                    <div className="flex items-center justify-center">
                      Efficiency
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">Operator</TableHead>
                  <TableHead className="font-semibold text-gray-900">Shift</TableHead>
                  <TableHead className="font-semibold text-gray-900">Date</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((record) => (
                  <React.Fragment key={record.id}>
                    <TableRow className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium text-gray-900">
                        {record.machine}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {record.outputUnits.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-gray-700">
                        {record.target.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          parseFloat(record.efficiency) >= 90 ? 'bg-green-100 text-green-800' :
                          parseFloat(record.efficiency) >= 75 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {record.efficiency}%
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {record.operator}
                      </TableCell>
                      <TableCell className="text-gray-700 capitalize">
                        {record.shift}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {record.date}
                      </TableCell>
                      <TableCell className="text-center">
                        <Collapsible 
                          open={expandedComments[record.id]}
                          onOpenChange={() => toggleCommentExpansion(record.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                        </Collapsible>
                      </TableCell>
                    </TableRow>
                    <Collapsible 
                      open={expandedComments[record.id]}
                      onOpenChange={() => toggleCommentExpansion(record.id)}
                    >
                      <CollapsibleContent>
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={8} className="p-4">
                            <div className="max-w-md">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Supervisor Notes for {record.machine}
                              </label>
                              <Textarea
                                value={comments[record.id] || ''}
                                onChange={(e) => handleCommentChange(record.id, e.target.value)}
                                placeholder="Add notes about this machine's performance..."
                                className="min-h-[80px]"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </Collapsible>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Showing {processedData.length} machine records</span>
      </div>
    </section>
  );
};

export default ProductionByMachine;
