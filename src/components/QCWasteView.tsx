import React, { useState } from 'react';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { AlertTriangle, TrendingUp, Filter, Eye, X, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useQCData, useWasteData } from '@/hooks/useUploadData';

const QCWasteView = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const { data: qcData, isLoading: qcLoading } = useQCData();
  const { data: wasteData, isLoading: wasteLoading } = useWasteData();

  // Calculate waste trends from real data
  const todayWaste = wasteData?.filter(record => {
    const today = new Date().toDateString();
    const recordDate = new Date(record.created_at || '').toDateString();
    return today === recordDate;
  }) || [];

  const weekWaste = wasteData?.filter(record => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recordDate = new Date(record.created_at || '');
    return recordDate >= weekAgo;
  }) || [];

  const todayAvgWaste = todayWaste.length > 0 
    ? (todayWaste.reduce((sum, record) => sum + (record.waste_percentage || 0), 0) / todayWaste.length).toFixed(1)
    : '0.0';

  const weekAvgWaste = weekWaste.length > 0 
    ? (weekWaste.reduce((sum, record) => sum + (record.waste_percentage || 0), 0) / weekWaste.length).toFixed(1)
    : '0.0';

  // Calculate QC issue frequencies
  const qcIssueFrequency = qcData?.reduce((acc: Record<string, number>, issue) => {
    if (issue.result === 'fail' && issue.defects) {
      const defects = typeof issue.defects === 'string' ? issue.defects.split(',') : [];
      defects.forEach((defect: string) => {
        const trimmedDefect = defect.trim();
        acc[trimmedDefect] = (acc[trimmedDefect] || 0) + 1;
      });
    }
    return acc;
  }, {}) || {};

  const topIssues = Object.entries(qcIssueFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([issue, count]) => ({ issue, count }));

  // Get unique machine IDs, filtering out null/undefined/empty values
  const uniqueMachineIds = qcData
    ?.map(item => item.machine_id)
    .filter((value, index, self) => value && value.trim() !== '' && self.indexOf(value) === index) || [];

  // Filter QC data
  const filteredQCData = qcData?.filter(issue => {
    if (machineFilter !== 'all' && issue.machine_id !== machineFilter) return false;
    if (severityFilter !== 'all') {
      const isCritical = issue.result === 'fail';
      if (severityFilter === 'high' && !isCritical) return false;
      if (severityFilter === 'low' && isCritical) return false;
    }
    return true;
  }) || [];

  const getCardStyles = (status: 'neutral' | 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'hitec-success-bg border-green-300';
      case 'warning': return 'hitec-warning-bg border-yellow-300';
      case 'critical': return 'hitec-error-bg border-red-300';
      case 'neutral': return 'hitec-info-bg border-blue-200';
      default: return 'bg-white border-gray-200';
    }
  };

  const getIconColor = (status: 'neutral' | 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'text-green-700';
      case 'warning': return 'text-yellow-700';
      case 'critical': return 'text-red-700';
      case 'neutral': return 'hitec-brand-blue';
      default: return 'text-gray-600';
    }
  };

  if (qcLoading || wasteLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading QC and waste data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="mb-4">
        <h1 className="text-sm font-semibold text-foreground">Quality Control & Waste Management</h1>
      </header>

      {/* Waste Trends */}
      <section className="mb-4">
        <h2 className="text-sm font-medium text-foreground mb-3">Waste Trends</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`h-4 w-4 ${parseFloat(todayAvgWaste) > 3 ? 'text-hitec-highlight' : 'text-green-600'}`} />
              <h3 className="text-xs font-medium text-muted-foreground">Today's Waste %</h3>
            </div>
            <p className="text-lg font-semibold text-foreground">{todayAvgWaste}%</p>
            <p className="text-xs text-muted-foreground">From {todayWaste.length} records</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-hitec-primary" />
              <h3 className="text-xs font-medium text-muted-foreground">Weekly Average</h3>
            </div>
            <p className="text-lg font-semibold text-foreground">{weekAvgWaste}%</p>
            <p className="text-xs text-muted-foreground">From {weekWaste.length} records</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-hitec-primary" />
              <h3 className="text-xs font-medium text-muted-foreground">Target</h3>
            </div>
            <p className="text-lg font-semibold text-foreground">3.0%</p>
            <p className="text-xs text-muted-foreground">Monthly target</p>
          </div>
        </div>
      </section>

      {/* Top QC Issues */}
      {topIssues.length > 0 ? (
        <section className="mb-4">
          <h2 className="text-sm font-medium text-foreground mb-3">Top QC Issues</h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="space-y-4">
              {topIssues.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 ${
                      index === 0 ? 'bg-red-100 text-red-800' : 
                      index === 1 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{item.issue}</p>
                      <p className="text-sm text-gray-600">{item.count} occurrences</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-4">
          <h2 className="text-sm font-medium text-foreground mb-3">Top QC Issues</h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="dev-placeholder italic text-sm hitec-brand-blue hitec-info-bg border border-blue-200 px-4 py-3 rounded-md">
              No QC issues found yet.<br />
              Upload a Tape Testing form to track quality control defects.
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-hitec-primary" />
          <h3 className="text-sm font-medium text-foreground">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Machine</label>
            <Select value={machineFilter} onValueChange={setMachineFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Machines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Machines</SelectItem>
                {uniqueMachineIds.map(machineId => (
                  <SelectItem key={machineId} value={machineId}>{machineId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Severity</label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="high">Failed Tests</SelectItem>
                <SelectItem value="low">Passed Tests</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* QC Data */}
      <section>
        <h2 className="text-sm font-medium text-foreground mb-3">QC Test Results ({filteredQCData.length})</h2>
        {filteredQCData.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="text-xs text-muted-foreground italic bg-accent/50 border border-accent px-3 py-2 rounded-md">
              No QC data available yet.<br />
              QC test results will appear here once data is uploaded and processed.
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {filteredQCData.map((issue) => (
                <div key={issue.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className={`h-4 w-4 mr-2 ${issue.result === 'fail' ? 'text-red-600' : 'text-green-600'}`} />
                    <div>
                      <p className="text-xs font-medium text-foreground">Machine: {issue.machine_id || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">Result: {issue.result || 'Unknown'}</p>
                      {issue.defects && (
                        <p className="text-xs text-muted-foreground">Defects: {issue.defects}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {issue.date} - Day Shift
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      issue.result === 'fail' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {issue.result === 'fail' ? 'Failed' : 'Passed'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(issue.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default QCWasteView;
