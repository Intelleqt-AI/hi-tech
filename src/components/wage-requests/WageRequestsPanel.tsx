import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, FileDown, Loader2, RefreshCcw, CheckCircle, RotateCcw } from 'lucide-react';
import useFetch from '@/hooks/useFetch';
import { downloadFile, postData } from '@/lib/Api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fmtDateTime } from '@/lib/utils';
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
  // Matches the house pill shape (Approvals.tsx StatusBadge).
  const map: Record<string, string> = {
    draft: 'bg-slate-200 text-slate-700',
    pending: 'bg-amber-100 text-amber-800',
    queried: 'bg-rose-100 text-rose-800',
    partially_approved: 'bg-indigo-100 text-indigo-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
  };
  const label: Record<string, string> = {
    draft: 'Draft',
    pending: 'Pending',
    queried: 'Queried',
    partially_approved: 'Partially approved',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-slate-100 text-slate-700'}`}>
      {label[status] || status}
    </span>
  );
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
          <h1 className="text-xl font-bold">Wage Requests</h1>
          <p className="text-sm text-muted-foreground">
            Submit per-staff payments across five categories. Admin-approved
            batches generate a bank CSV; Bonus and Other flow into their
            selected payroll run on next calculation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => refetch?.()}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" className="h-9" onClick={() => setDialogOpen(true)}>
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
            <p className="text-sm text-muted-foreground">{t.blurb}</p>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {t.label} batches
            </h3>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-10">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading batches…
              </div>
            ) : batches.length === 0 ? (
              <div className="text-sm text-muted-foreground py-10 text-center">
                No {t.label.toLowerCase()} requests yet. Click New {t.label} request to start.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-accent border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-foreground">#</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Staff</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-foreground">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-foreground">For</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Reason</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Submitter</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Approver</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-foreground">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((b) => (
                        <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-4 text-xs text-muted-foreground font-mono tabular-nums">{b.id}</td>
                          <td className="py-2 px-4 text-xs"><StatusBadge status={b.status} /></td>
                          <td className="py-2 px-4 text-xs">{b.line_count}</td>
                          <td className="py-2 px-4 text-xs text-right">
                            R{Number(b.total_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-4 text-xs capitalize">
                            {b.target_payroll
                              ? b.target_payroll
                              : <span className="text-muted-foreground uppercase text-[10px] tracking-wide">Standalone</span>}
                          </td>
                          <td className="py-2 px-4 text-xs">
                            {b.payment_type === 'bonus'
                              ? b.bonus_reason.replace(/_/g, ' ')
                              : b.payment_type === 'other'
                              ? b.custom_reason
                              : '—'}
                          </td>
                          <td className="py-2 px-4 text-xs">
                            <div>{b.submitted_by_name || '—'}</div>
                            <div className="text-muted-foreground">{fmtDateTime(b.submitted_at) || '—'}</div>
                          </td>
                          <td className="py-2 px-4 text-xs">
                            <div>{b.approved_by_name || '—'}</div>
                            <div className="text-muted-foreground">{fmtDateTime(b.approved_at) || '—'}</div>
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap">
                            <div className="flex gap-1 justify-end">
                              {b.status === 'pending' && (
                                <>
                                  {isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                                      onClick={() => approve(b)}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      Approve
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50"
                                    onClick={() => recall(b)}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Recall
                                  </Button>
                                </>
                              )}
                              {(b.status === 'approved' || b.status === 'partially_approved') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1.5"
                                  onClick={() => downloadCSV(b)}
                                  title="Download bank CSV"
                                >
                                  <FileDown className="h-3.5 w-3.5" />
                                  CSV
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
