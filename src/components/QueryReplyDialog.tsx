import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { postData } from '@/lib/Api';
import { useToast } from '@/hooks/use-toast';

interface QueryReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalId: number | null;
  queryComment: string;
  memberReply?: string;
  onResubmitted?: () => void;
}

const QueryReplyDialog = ({
  open,
  onOpenChange,
  approvalId,
  queryComment,
  memberReply = '',
  onResubmitted,
}: QueryReplyDialogProps) => {
  const { toast } = useToast();
  const [reply, setReply] = useState(memberReply);
  const [loading, setLoading] = useState(false);

  const handleResubmit = async () => {
    if (!approvalId) return;
    setLoading(true);
    try {
      await postData({ url: `approvals/requests/${approvalId}/resubmit/`, data: { reply } });
      toast({ title: 'Resubmitted', description: 'Your reply has been sent for review.' });
      onOpenChange(false);
      onResubmitted?.();
    } catch {
      toast({ title: 'Error', description: 'Could not resubmit. Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-red-500" />
            Query
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs font-medium text-red-700 mb-1">Admin comment:</p>
            <p className="text-sm text-red-800">{queryComment}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-foreground mb-1">Your reply:</p>
            <Textarea
              placeholder="Explain how you've resolved the query..."
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleResubmit}
            disabled={loading || !reply.trim()}
            className="gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {loading ? 'Resubmitting...' : 'Resubmit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QueryReplyDialog;
