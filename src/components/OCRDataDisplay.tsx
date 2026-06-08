
import { fmtDate, fmtDateTime } from '@/lib/utils';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useUploadData, useQCData, useWasteData, useStaffData, useMachineCheckData } from '@/hooks/useUploadData';
import { Clock, CheckCircle, Users, AlertTriangle, Wrench, Trash2 } from 'lucide-react';

const OCRDataDisplay = () => {
  const { data: qcData } = useQCData();
  const { data: wasteData } = useWasteData();
  const { data: staffData } = useStaffData();
  const { data: machineCheckData } = useMachineCheckData();

  const getRecentData = (data: any[], limit = 5) => {
    return data?.slice(0, limit) || [];
  };

  return (
    <div className="space-y-6">
      {/* Staff Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <Users className="h-5 w-5 text-purple-600" />
            Recent Staff Logs ({staffData?.length || 0} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getRecentData(staffData).length > 0 ? (
            <div className="space-y-3">
              {getRecentData(staffData).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{log.staff_id || 'Unknown Staff'}</p>
                    <p className="text-sm text-gray-600">
                      {log.hours}h - {log.shift} - {fmtDate(log.date)}
                    </p>
                    {log.notes && <p className="text-xs text-gray-500 mt-1">{log.notes}</p>}
                  </div>
                  <Badge variant="secondary">{log.hours}h</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="dev-placeholder">
              <div className="text-sm text-gray-500 italic text-center py-2">
                No staff logs found for today.<br />
                Upload an Efficiency & Casual Check report to populate this section.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waste Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <Trash2 className="h-5 w-5 text-red-600" />
            Recent Waste Reports ({wasteData?.length || 0} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getRecentData(wasteData).length > 0 ? (
            <div className="space-y-3">
              {getRecentData(wasteData).map((waste: any) => (
                <div key={waste.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{fmtDate(waste.date)}</p>
                    <p className="text-sm text-gray-600">
                      {waste.shift} - {waste.waste_units || 'N/A'} units
                    </p>
                  </div>
                  <Badge 
                    variant={waste.waste_percentage > 5 ? "destructive" : waste.waste_percentage > 3 ? "secondary" : "default"}
                    className={waste.waste_percentage <= 3 ? "bg-green-100 text-green-800" : ""}
                  >
                    {waste.waste_percentage?.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="dev-placeholder">
              <div className="text-sm text-gray-500 italic text-center py-2">
                No waste reports found for today.<br />
                Upload a Waste Summary report to populate this section.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QC Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Recent QC Checks ({qcData?.length || 0} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getRecentData(qcData).length > 0 ? (
            <div className="space-y-3">
              {getRecentData(qcData).map((qc: any) => (
                <div key={qc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{fmtDate(qc.date)}</p>
                    <p className="text-sm text-gray-600">
                      {qc.shift} {qc.machine_id && `- Machine: ${qc.machine_id}`}
                    </p>
                    {qc.defects && qc.defects.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Defects: {qc.defects.join(', ')}</p>
                    )}
                  </div>
                  <Badge 
                    variant={qc.result === 'pass' ? "default" : qc.result === 'fail' ? "destructive" : "secondary"}
                    className={qc.result === 'pass' ? "bg-green-100 text-green-800" : ""}
                  >
                    {qc.result || 'Unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="dev-placeholder">
              <div className="text-sm text-gray-500 italic text-center py-2">
                No QC checks found for today.<br />
                Upload a Tape Testing form to populate this section.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Machine Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <Wrench className="h-5 w-5 text-gray-600" />
            Recent Machine Checks ({machineCheckData?.length || 0} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getRecentData(machineCheckData).length > 0 ? (
            <div className="space-y-3">
              {getRecentData(machineCheckData).map((check: any) => (
                <div key={check.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{check.machine || 'Unknown Machine'}</p>
                    <p className="text-sm text-gray-600">
                      {check.shift} - {fmtDate(check.date)}
                    </p>
                    {check.note && <p className="text-xs text-gray-500 mt-1">{check.note}</p>}
                  </div>
                  <Badge 
                    variant={check.status === 'OK' ? "default" : check.status === 'Issue' ? "destructive" : "secondary"}
                    className={check.status === 'OK' ? "bg-green-100 text-green-800" : ""}
                  >
                    {check.status || 'Unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="dev-placeholder">
              <div className="text-sm text-gray-500 italic text-center py-2">
                No machine checks found for today.<br />
                Upload a Factory Check to log equipment status.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OCRDataDisplay;
