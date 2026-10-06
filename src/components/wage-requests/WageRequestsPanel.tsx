import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Loader2, RefreshCcw } from 'lucide-react';
import useFetch from '@/hooks/useFetch';
import { downloadFile, postData } from '@/lib/Api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import NewWageRequestDialog, { PaymentType } from './NewWageRequestDialog';

const TYPES: { value: PaymentType; label: string; blurb: string }[] = [
  { value: 'bonus', label: 'Bonus', blurb: 'Flows into the selected payroll run.' },
  { value: 'transport', label: 'Transport', blurb: 'Standalone — bank CSV only. Does NOT touch payroll.' },
  { value: 'airtime', label: 'Airtime', blurb: 'Standalone — bank CSV only. Does NOT touch payroll.' },
  { value: 'fuel', label: 'Fuel', blurb: 'Standalone — bank CSV only. Does NOT touch payroll.' },
  { value: 'other', label: 'Other', blurb: 'Flows into the selected payroll run.' },
];

interface Batch {
  id: number;
  payment_type: PaymentType;
  target_payroll: string;
  bonus_reason: string;
  custom_reason: string;
  status: string;
  submitted_by_name: string;
  submitted_at: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  line_count: number;
  total_amount: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    draft: 'bg-slate-200 text-slate-700',
    pending: 'bg-amber-100 text-amber-800',
    partially_approved: 'bg-indigo-100 text-indigo-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
  };
  const label: Record<string, string> = {
    draft: 'Draft',
    pending: 'Pending',
    partially_approved: 'Partially approved',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || 'bg-slate-100'}`}>
      {label[status] || status}
    </span>
  );
};

const fmtWhen = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const WageRequestsPanel: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth() as any;
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<PaymentType>('bonus');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useFetch<any>(
    `/staff/wage-requests/?payment_type=${tab}&ordering=-created_at`,
    { enabled: true }
  );
  const batches: Batch[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data?.results || [];
  }, [data]);

  const typeMeta = TYPES.find((t) => t.value === tab)!;

  const downloadCSV = async (batch: Batch) => {
    try {
      await downloadFile(
        `staff/wage-requests/${batch.id}/export-csv/`,
        `wage_${batch.payment_type}_${batch.id}.xls`
      );
    } catch (e: any) {
      toast({
        title: 'Download failed',
        description: e?.response?.data?.error || e?.message || 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const recall = async (batch: Batch) => {
    try {
      await postData({ url: `staff/wage-requests/${batch.id}/recall/`, data: {} });
      toast({ title: 'Recalled to draft' });
      refetch?.();
    } catch (e: any) {
      toast({
        title: 'Recall failed',
        description: e?.response?.data?.error || e?.message || 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const approve = async (batch: Batch) => {
    try {
      await postData({ url: `staff/wage-requests/${batch.id}/approve/`, data: {} });
      toast({ title: 'Approved' });
      refetch?.();
    } catch (e: any) {
      toast({
        title: 'Approve failed',
        description: e?.response?.data?.error || e?.message || 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Wage Requests</h1>
          <p className="text-sm text-muted-foreground">
            Submit per-staff payments across five categories. Admin-approved
            batches generate a bank CSV; Bonus and Other flow into their
            selected payroll run on next calculation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch?.()}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New {typeMeta.label} request
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as PaymentType)}>
        <TabsList>
          {TYPES.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {TYPES.map((t) => (
          <TabsContent key={t.value} value={t.value} className="space-y-3">
            <p className="text-xs text-muted-foreground">{t.blurb}</p>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t.label} batches
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading batches…
                  </div>
                ) : batches.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    No {t.label.toLowerCase()} requests yet. Click “New {t.label} request” to start.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr className="text-left">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Staff</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2">For</th>
                          <th className="px-3 py-2">Reason</th>
                          <th className="px-3 py-2">Submitter</th>
                          <th className="px-3 py-2">Approver</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((b) => (
                          <tr key={b.id} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{b.id}</td>
                            <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
                            <td className="px-3 py-2">{b.line_count}</td>
                            <td className="px-3 py-2 text-right">
                              R{Number(b.total_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 capitalize">
                              {b.target_payroll
                                ? b.target_payroll
                                : <span className="text-muted-foreground">(standalone)</span>}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {b.payment_type === 'bonus'
                                ? b.bonus_reason.replace(/_/g, ' ')
                                : b.payment_type === 'other'
                                ? b.custom_reason
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div>{b.submitted_by_name || '—'}</div>
                              <div className="text-muted-foreground">{fmtWhen(b.submitted_at)}</div>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div>{b.approved_by_name || '—'}</div>
                              <div className="text-muted-foreground">{fmtWhen(b.approved_at)}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex gap-1 justify-end">
                                {b.status === 'pending' && (
                                  <>
                                    {isAdmin && (
                                      <Button size="sm" variant="outline" onClick={() => approve(b)}>
                                        Approve
                                      </Button>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={() => recall(b)}>
                                      Recall
                                    </Button>
                                  </>
                                )}
                                {(b.status === 'approved' || b.status === 'partially_approved') && (
                                  <Button size="sm" variant="outline" onClick={() => downloadCSV(b)}>
                                    <Download className="h-3 w-3 mr-1" /> CSV
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <NewWageRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        paymentType={tab}
        onSubmitted={() => refetch?.()}
      />
    </div>
  );
};

export default WageRequestsPanel;
