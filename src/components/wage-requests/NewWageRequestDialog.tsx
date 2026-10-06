import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import useFetch from '@/hooks/useFetch';
import { postData } from '@/lib/Api';
import { useToast } from '@/hooks/use-toast';

// Payment types supported by the backend WageRequestBatch model.
export type PaymentType = 'bonus' | 'transport' | 'airtime' | 'fuel' | 'other';

const BONUS_REASONS: { value: string; label: string }[] = [
  { value: 'performance', label: 'Performance Bonus' },
  { value: 'special', label: 'Special Bonus' },
  { value: 'every_second_fortnight', label: 'Every Second Fortnight Bonus' },
];

const TYPE_LABEL: Record<PaymentType, string> = {
  bonus: 'Bonus',
  transport: 'Transport',
  airtime: 'Airtime',
  fuel: 'Fuel',
  other: 'Other',
};

// Default-with-override amount model (per UX spec): one shared default
// field fills every selected row; individual rows can be overridden and
// get a dot marker so they are visible before submit.
interface SelectedRow {
  staff_id: number;
  display: string;
  factory: string;
  amount: string; // keep as string during edit — convert to number on submit
  overridden: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentType: PaymentType;
  onSubmitted?: () => void;
}

// Thresholds for the extra confirm step on high-stakes batches.
const CONFIRM_STAFF_COUNT = 20;
const CONFIRM_RAND_TOTAL = 10000;

const NewWageRequestDialog: React.FC<Props> = ({ open, onOpenChange, paymentType, onSubmitted }) => {
  const { toast } = useToast();
  const label = TYPE_LABEL[paymentType];
  const needsPayroll = paymentType === 'bonus' || paymentType === 'other';

  const [targetPayroll, setTargetPayroll] = useState<'general' | 'weekend'>('general');
  const [bonusReason, setBonusReason] = useState<string>('performance');
  const [customReason, setCustomReason] = useState<string>('');
  const [defaultAmount, setDefaultAmount] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<number, SelectedRow>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Staff list — backend paginates /staff/members/ by default; we ask for a
  // large page_size to render all of them in the picker. If the client has
  // thousands of staff, swap this for a server-side search.
  const { data: staffData, isLoading: staffLoading } = useFetch<any>(
    '/staff/members/?page_size=1000',
    { enabled: open }
  );
  const staffList: any[] = useMemo(() => {
    if (!staffData) return [];
    if (Array.isArray(staffData)) return staffData;
    return staffData?.results || [];
  }, [staffData]);

  // Reset state whenever the dialog opens so a reopened dialog never leaks
  // stale selections across payment types.
  useEffect(() => {
    if (open) {
      setTargetPayroll('general');
      setBonusReason('performance');
      setCustomReason('');
      setDefaultAmount('');
      setSearch('');
      setSelected({});
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }, [open, paymentType]);

  // Group staff by factory so the admin can scan by site.
  const staffByFactory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const buckets: Record<string, any[]> = {};
    for (const s of staffList) {
      if (q) {
        const hay = `${s.first_name || ''} ${s.last_name || ''} ${s.clock_number || ''} ${s.factory || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const key = s.factory || '(no factory)';
      (buckets[key] ||= []).push(s);
    }
    return buckets;
  }, [staffList, search]);

  const totalSelected = Object.keys(selected).length;
  const totalRand = useMemo(() => {
    return Object.values(selected).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }, [selected]);

  const toggleOne = (staff: any) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[staff.id]) {
        delete next[staff.id];
        return next;
      }
      next[staff.id] = {
        staff_id: staff.id,
        display: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() +
          (staff.clock_number ? ` (${staff.clock_number})` : ''),
        factory: staff.factory || '',
        amount: defaultAmount || '',
        overridden: false,
      };
      return next;
    });
  };

  const toggleFactory = (factory: string, on: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      const list = staffByFactory[factory] || [];
      for (const s of list) {
        if (on) {
          if (!next[s.id]) {
            next[s.id] = {
              staff_id: s.id,
              display: `${s.first_name || ''} ${s.last_name || ''}`.trim() +
                (s.clock_number ? ` (${s.clock_number})` : ''),
              factory: s.factory || '',
              amount: defaultAmount || '',
              overridden: false,
            };
          }
        } else {
          delete next[s.id];
        }
      }
      return next;
    });
  };

  // When the default amount changes, update any row that hasn't been
  // overridden. Preserves per-row overrides.
  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        const row = next[+id];
        if (!row.overridden) row.amount = defaultAmount || '';
      }
      return next;
    });
  }, [defaultAmount]);

  const overrideRow = (staff_id: number, amount: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (!next[staff_id]) return next;
      next[staff_id] = { ...next[staff_id], amount, overridden: true };
      return next;
    });
  };

  const clearOverride = (staff_id: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (!next[staff_id]) return next;
      next[staff_id] = { ...next[staff_id], amount: defaultAmount || '', overridden: false };
      return next;
    });
  };

  const removeRow = (staff_id: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[staff_id];
      return next;
    });
  };

  const canSubmit = (): string | null => {
    if (totalSelected === 0) return 'Select at least one staff member.';
    if (paymentType === 'bonus' && !bonusReason) return 'Pick a bonus reason.';
    if (paymentType === 'other' && !customReason.trim()) return 'Enter a reason for Other.';
    for (const r of Object.values(selected)) {
      const n = parseFloat(r.amount);
      if (!(n > 0)) return `Enter a positive amount for ${r.display}.`;
    }
    return null;
  };

  const submit = async () => {
    const err = canSubmit();
    if (err) {
      toast({ title: 'Cannot submit', description: err, variant: 'destructive' });
      return;
    }
    // High-stakes confirm step.
    if (!confirmOpen && (totalSelected >= CONFIRM_STAFF_COUNT || totalRand >= CONFIRM_RAND_TOTAL)) {
      setConfirmOpen(true);
      return;
    }
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const payload: any = {
        payment_type: paymentType,
        submit: true,
        lines: Object.values(selected).map((r) => ({
          staff_id: r.staff_id,
          amount: parseFloat(r.amount),
        })),
      };
      if (needsPayroll) payload.target_payroll = targetPayroll;
      if (paymentType === 'bonus') payload.bonus_reason = bonusReason;
      if (paymentType === 'other') payload.custom_reason = customReason.trim();

      await postData({ url: 'staff/wage-requests/', data: payload });
      toast({
        title: `${label} submitted for approval`,
        description: `${totalSelected} staff · R${totalRand.toFixed(2)}`,
      });
      onOpenChange(false);
      onSubmitted?.();
    } catch (e: any) {
      const detail = e?.response?.data?.error
        || e?.response?.data?.detail
        || JSON.stringify(e?.response?.data || {}, null, 2)
        || e?.message
        || 'Unknown error';
      toast({ title: 'Submit failed', description: detail, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              New {label} Request
              <Badge variant="outline" className="font-normal">
                {paymentType === 'transport' || paymentType === 'airtime' || paymentType === 'fuel'
                  ? 'Standalone CSV — does not touch payroll'
                  : 'Flows into selected payroll'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6 pt-2 overflow-y-auto flex-1">
            {/* Left — staff picker */}
            <div className="md:col-span-2 flex flex-col min-h-0">
              <Label className="text-sm font-medium mb-2">Pick staff</Label>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, clock number or factory…"
                  className="pl-8"
                />
              </div>
              <div className="border rounded-md divide-y max-h-[55vh] overflow-y-auto">
                {staffLoading && (
                  <div className="p-4 text-sm text-muted-foreground">Loading staff…</div>
                )}
                {!staffLoading && Object.keys(staffByFactory).length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No staff match that search.</div>
                )}
                {Object.entries(staffByFactory).map(([factory, list]) => {
                  const selectedInFactory = list.filter((s: any) => selected[s.id]).length;
                  const allSelected = selectedInFactory === list.length && list.length > 0;
                  return (
                    <div key={factory}>
                      <div className="sticky top-0 bg-muted/60 backdrop-blur px-3 py-1.5 flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(v) => toggleFactory(factory, !!v)}
                          />
                          <span className="uppercase">{factory}</span>
                          <span className="text-muted-foreground">
                            ({selectedInFactory}/{list.length})
                          </span>
                        </div>
                      </div>
                      {list.map((s: any) => {
                        const isSel = !!selected[s.id];
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/40"
                          >
                            <Checkbox checked={isSel} onCheckedChange={() => toggleOne(s)} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">
                                {s.first_name} {s.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {s.clock_number || '—'} · {s.department || ''}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {totalSelected} selected · R{totalRand.toFixed(2)} total
              </div>
            </div>

            {/* Right — builder */}
            <div className="md:col-span-3 flex flex-col min-h-0 gap-3">
              {needsPayroll && (
                <div>
                  <Label className="text-sm">Payroll</Label>
                  <Select value={targetPayroll} onValueChange={(v) => setTargetPayroll(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Payroll</SelectItem>
                      <SelectItem value="weekend">Weekend Payroll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {paymentType === 'bonus' && (
                <div>
                  <Label className="text-sm">Bonus reason</Label>
                  <Select value={bonusReason} onValueChange={setBonusReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BONUS_REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {paymentType === 'other' && (
                <div>
                  <Label className="text-sm">Reason <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Short description of this payment"
                    maxLength={200}
                    rows={2}
                  />
                </div>
              )}
              <div>
                <Label className="text-sm">Default amount (R)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                  placeholder="e.g. 150.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fills every selected row. Override individuals below.
                </p>
              </div>

              <Separator />

              <div className="flex-1 min-h-0 overflow-y-auto border rounded-md">
                {totalSelected === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Pick staff on the left to build the request.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                      <tr>
                        <th className="text-left px-3 py-2">Staff</th>
                        <th className="text-left px-3 py-2">Factory</th>
                        <th className="text-right px-3 py-2">Amount (R)</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(selected).map((r) => (
                        <tr key={r.staff_id} className="border-t">
                          <td className="px-3 py-1.5">{r.display}</td>
                          <td className="px-3 py-1.5 text-muted-foreground uppercase text-xs">
                            {r.factory}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {r.overridden && (
                                <button
                                  onClick={() => clearOverride(r.staff_id)}
                                  className="text-[10px] text-primary"
                                  title="Reset to default"
                                >
                                  reset
                                </button>
                              )}
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={r.amount}
                                onChange={(e) => overrideRow(r.staff_id, e.target.value)}
                                className={`w-28 h-8 text-right ${r.overridden ? 'border-amber-500' : ''}`}
                              />
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={() => removeRow(r.staff_id)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-2 flex items-center justify-between border-t">
            <div className="text-sm text-muted-foreground">
              {totalSelected} staff · <span className="font-medium text-foreground">R{totalRand.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>) : 'Submit for approval'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm submission</AlertDialogTitle>
            <AlertDialogDescription>
              This batch covers {totalSelected} staff for a total of{' '}
              <strong>R{totalRand.toFixed(2)}</strong>. Please confirm — admin
              approval is still required but mistakes at this scale are expensive
              to unwind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back to edit</AlertDialogCancel>
            <AlertDialogAction onClick={submit}>Submit for approval</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NewWageRequestDialog;
