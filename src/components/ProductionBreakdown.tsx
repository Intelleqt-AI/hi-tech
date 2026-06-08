import React, { useState } from 'react';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { Filter, Download, ChevronDown } from 'lucide-react';
import { useProductionData } from '@/hooks/useProductionData';
import { useStaffData } from '@/hooks/useUploadData';

const ProductionBreakdown = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { data: productionData, isLoading: productionLoading } = useProductionData();
  const { data: staffData, isLoading: staffLoading } = useStaffData();

  // Combine production records with staff logs
  const allRecords = [
    ...(productionData || []).map(record => ({
      ...record,
      type: 'production',
      date: fmtDate(record.recorded_at || ''),
      shift: 'Day Shift'
    })),
    ...(staffData || []).map(record => ({
      ...record,
      type: 'staff',
      date: fmtDate(record.date || ''),
      shift: record.shift?.replace('_', ' ') || 'Unknown',
      machine_name: 'Staff Log',
      operator_name: record.employee_name
    }))
  ];

  const filteredRecords = allRecords.filter(record => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'shift1') return record.shift === 'shift 1';
    if (selectedFilter === 'shift2') return record.shift === 'shift 2';
    if (selectedFilter === 'shift3') return record.shift === 'shift 3';
    return true;
  });

  if (productionLoading || staffLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading production data...</div>
      </div>
    );
  }

  if (allRecords.length === 0) {
    return (
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Production Breakdown</h2>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="dev-placeholder">
            <div className="text-sm text-gray-500 italic text-center py-2">
              No production data available yet.<br />
              Production records will appear here once data is uploaded and processed.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">Production Breakdown</h2>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <select 
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <option value="all">All Records</option>
              <option value="shift1">Shift 1</option>
              <option value="shift2">Shift 2</option>
              <option value="shift3">Shift 3</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
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

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-4 font-semibold text-gray-900 text-sm">Date</th>
                <th className="text-left p-4 font-semibold text-gray-900 text-sm">Shift</th>
                <th className="text-left p-4 font-semibold text-gray-900 text-sm">Type</th>
                <th className="text-left p-4 font-semibold text-gray-900 text-sm">Machine/Staff</th>
                <th className="text-right p-4 font-semibold text-gray-900 text-sm">Units/Hours</th>
                <th className="text-left p-4 font-semibold text-gray-900 text-sm">Operator/Staff ID</th>
                <th className="text-center p-4 font-semibold text-gray-900 text-sm">Quality/Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => (
                <tr key={`${record.type}-${record.id || index}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm text-gray-900">
                    {record.date}
                  </td>
                  <td className="p-4 text-sm text-gray-700 capitalize">
                    {record.shift}
                  </td>
                  <td className="p-4 text-sm text-gray-700">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      record.type === 'production' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {record.type === 'production' ? 'Production' : 'Staff Log'}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-900">
                    {record.type === 'production' 
                      ? (record as any).machines?.name || 'Unknown Machine'
                      : 'Staff Record'
                    }
                  </td>
                  <td className="p-4 text-sm text-gray-900 text-right font-medium">
                    {record.type === 'production' 
                      ? (record as any).units_produced?.toLocaleString() || 0
                      : `${(record as any).hours || 0} hrs`
                    }
                  </td>
                  <td className="p-4 text-sm text-gray-700">
                    {record.type === 'production'
                      ? (record as any).operator?.full_name || 'Unknown Operator'
                      : (record as any).staff_id || 'Unknown Staff'
                    }
                  </td>
                  <td className="p-4 text-sm text-center">
                    {record.type === 'production' ? (
                      (record as any).quality_score ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (record as any).quality_score >= 90 ? 'bg-green-100 text-green-800' :
                          (record as any).quality_score >= 80 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {(record as any).quality_score}%
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-600">
                        {(record as any).notes || 'No notes'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Showing {filteredRecords.length} records total</span>
        <span>
          Production: {filteredRecords.filter(r => r.type === 'production').length} | 
          Staff: {filteredRecords.filter(r => r.type === 'staff').length}
        </span>
      </div>
    </section>
  );
};

export default ProductionBreakdown;
