import React, { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import useFetch from '@/hooks/useFetch';
import { postData } from '@/lib/Api';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import CommentsModal from '@/components/CommentsModal';

interface ApprovalRequest {
  id: number;
  request_type: string;
  status: string;
  query_comment: string;
  member_reply: string;
  submitted_by_email: string;
  submitted_by_name: string;
  reviewed_by_email: string | null;
  loan_detail: any;
  bonus_detail: any;
  payroll_batch_detail: any;
  created_at: string;
  updated_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  loan: 'Loan',
  bonus: 'Bonus',
  general_payroll: 'General Payroll',
  weekend_payroll: 'Weekend Payroll',
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    queried: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const DetailRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex gap-2 text-sm">
    <span className="text-muted-foreground min-w-28">{label}:</span>
    <span className="font-medium">{value ?? '—'}</span>
  </div>
);

const ApprovalCard = ({
  approval,
  onApprove,
  onQuery,
  isAdmin,
}: {
  approval: ApprovalRequest;
  onApprove: (id: number) => void;
  onQuery: (id: number) => void;
  isAdmin: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const detail = approval.loan_detail || approval.bonus_detail || approval.payroll_batch_detail;

  const threadLabel = `${TYPE_LABELS[approval.request_type] ?? approval.request_type} — ${approval.submitted_by_name || approval.submitted_by_email}`;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{TYPE_LABELS[approval.request_type] ?? approval.request_type}</span>
            <StatusBadge status={approval.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted by <strong>{approval.submitted_by_name || approval.submitted_by_email}</strong>
            {' · '}
            {new Date(approval.created_at).toLocaleDateString('en-ZA', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </p>
          {approval.status === 'queried' && approval.query_comment && (
            <div className="mt-2 p-2 rounded bg-red-50 border border-red-100 text-xs text-red-700">
              <strong>Query:</strong> {approval.query_comment}
            </div>
          )}
          {approval.member_reply && (
            <div className="mt-1 p-2 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">
              <strong>Member reply:</strong> {approval.member_reply}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && approval.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                onClick={() => onApprove(approval.id)}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => onQuery(approval.id)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Query
              </Button>
            </>
          )}
          {isAdmin && approval.status === 'queried' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => onQuery(approval.id)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Re-Query
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="View thread"
            onClick={() => setCommentsOpen(true)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          {detail && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {expanded && detail && (
        <div className="mt-3 pt-3 border-t grid gap-1.5">
          {approval.loan_detail && (
            <>
              <DetailRow label="Staff" value={detail.staff_name} />
              <DetailRow label="Loan Type" value={detail.loan_type} />
              <DetailRow label="Amount" value={`R${detail.amount}`} />
              <DetailRow label="Term" value={`${detail.term_duration} × ${detail.term_type}`} />
            </>
          )}
          {approval.bonus_detail && (
            <>
              <DetailRow label="Staff" value={detail.staff_name} />
              <DetailRow label="Amount" value={`R${detail.amount}`} />
              <DetailRow label="Reason" value={detail.reason} />
            </>
          )}
          {approval.payroll_batch_detail && (
            <>
              <DetailRow label="Type" value={detail.run_type} />
              <DetailRow label="Factory" value={detail.factory} />
              <DetailRow label="Period" value={`${detail.start_date} → ${detail.end_date}`} />
              <DetailRow label="Total Gross" value={`R${parseFloat(detail.total_gross).toFixed(2)}`} />
              <DetailRow label="Total Net" value={`R${parseFloat(detail.total_net).toFixed(2)}`} />
            </>
          )}
        </div>
      )}

      <CommentsModal
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        approvalId={approval.id}
        batchLabel={threadLabel}
        batchStatus={approval.status}
      />
    </div>
  );
};

const ApprovalsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [queryComment, setQueryComment] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const isAdmin = user?.role === 'admin';
  if (!isAdmin) return <Navigate to="/staff/directory" replace />;

  const { data: rawData, refetch } = useFetch<any>('approvals/requests/?ordering=-created_at');
  const allApprovals: ApprovalRequest[] = rawData?.results ?? (Array.isArray(rawData) ? rawData : []);

  const byType = (list: ApprovalRequest[]) =>
    filterType === 'all' ? list : list.filter(a => a.request_type === filterType);

  const pending = byType(allApprovals.filter(a => a.status === 'pending'));
  const queried = byType(allApprovals.filter(a => a.status === 'queried'));
  const approved = byType(allApprovals.filter(a => a.status === 'approved'));

  const handleApprove = async (id: number) => {
    setLoading(true);
    try {
      await postData({ url: `approvals/requests/${id}/approve/`, data: {} });
      toast({ title: 'Approved', description: 'Request approved successfully.' });
      refetch();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not approve.' });
    } finally {
      setLoading(false);
    }
  };

  const openQueryDialog = (id: number) => {
    setSelectedId(id);
    setQueryComment('');
    setQueryDialogOpen(true);
  };

  const handleQuery = async () => {
    if (!selectedId || !queryComment.trim()) return;
    setLoading(true);
    try {
      await postData({ url: `approvals/requests/${selectedId}/query/`, data: { comment: queryComment } });
      toast({ title: 'Query Raised', description: 'The submitter has been notified.' });
      setQueryDialogOpen(false);
      refetch();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not raise query.' });
    } finally {
      setLoading(false);
    }
  };

  const renderList = (list: ApprovalRequest[]) =>
    list.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-10">Nothing here.</p>
    ) : (
      <div className="grid gap-3">
        {list.map(a => (
          <ApprovalCard
            key={a.id}
            approval={a}
            onApprove={handleApprove}
            onQuery={openQueryDialog}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Approvals</h1>
          <p className="text-sm text-muted-foreground">Review and approve pending submissions</p>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="loan">Loan</SelectItem>
            <SelectItem value="bonus">Bonus</SelectItem>
            <SelectItem value="general_payroll">General Payroll</SelectItem>
            <SelectItem value="weekend_payroll">Weekend Payroll</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pending
            {pending.length > 0 && (
              <span className="ml-1 bg-amber-100 text-amber-800 text-xs px-1.5 rounded-full">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="queried" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Queried
            {queried.length > 0 && (
              <span className="ml-1 bg-red-100 text-red-800 text-xs px-1.5 rounded-full">
                {queried.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            Approved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">{renderList(pending)}</TabsContent>
        <TabsContent value="queried">{renderList(queried)}</TabsContent>
        <TabsContent value="approved">{renderList(approved)}</TabsContent>
      </Tabs>

      <Dialog open={queryDialogOpen} onOpenChange={setQueryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise a Query</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Describe your query or what needs to be corrected..."
            value={queryComment}
            onChange={e => setQueryComment(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setQueryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleQuery} disabled={loading || !queryComment.trim()}>
              Submit Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalsPage;
