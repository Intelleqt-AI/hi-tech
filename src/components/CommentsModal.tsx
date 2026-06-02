import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { fetchData, postData } from '@/lib/Api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: number;
  author_name: string;
  author_email: string;
  author_role: string;
  message: string;
  comment_type: 'query' | 'reply' | 'note';
  created_at: string;
}

interface CommentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalId: number | null;
  batchLabel: string;
  batchStatus: string;
  onStatusChanged?: () => void;
}

const COMMENT_STYLES: Record<string, { card: string; badge: string; label: string }> = {
  query: { card: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', label: 'Query' },
  reply: { card: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', label: 'Reply' },
  note:  { card: 'bg-gray-50 border-gray-200',  badge: 'bg-gray-100 text-gray-600', label: 'Note' },
};

const CommentsModal = ({
  open,
  onOpenChange,
  approvalId,
  batchLabel,
  batchStatus,
  onStatusChanged,
}: CommentsModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isQueried = batchStatus === 'queried';
  const canReply = isQueried && user?.role !== 'admin';

  const fetchComments = async () => {
    if (!approvalId) return;
    setLoadingComments(true);
    try {
      const data = await fetchData(`approvals/requests/${approvalId}/comments/`);
      setComments(data || []);
    } catch {
      toast({ title: 'Error', description: 'Could not load comments.', variant: 'destructive' });
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (open && approvalId) {
      fetchComments();
      setReply('');
    }
  }, [open, approvalId]);

  useEffect(() => {
    if (comments.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleResubmit = async () => {
    if (!reply.trim() || !approvalId) return;
    setSending(true);
    try {
      await postData({ url: `approvals/requests/${approvalId}/resubmit/`, data: { reply } });
      toast({ title: 'Resubmitted', description: 'Reply sent. Awaiting review.' });
      onStatusChanged?.();
      onOpenChange(false);
    } catch {
      toast({ title: 'Error', description: 'Could not resubmit. Try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col gap-0 p-0 overflow-hidden" style={{ maxHeight: '85vh' }}>
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Thread — {batchLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ minHeight: 0 }}>
          {loadingComments ? (
            <p className="text-xs text-muted-foreground text-center py-10">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No comments yet.</p>
          ) : (
            comments.map(c => {
              const s = COMMENT_STYLES[c.comment_type] ?? COMMENT_STYLES.note;
              return (
                <div key={c.id} className={`p-3 rounded-lg border ${s.card}`}>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold truncate">{c.author_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${s.badge}`}>
                        {s.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.message}</p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply area — only for members with queried status */}
        {canReply && (
          <div className="border-t px-5 py-4 space-y-3 bg-background">
            <p className="text-xs text-muted-foreground">
              Resolve the query and resubmit for review:
            </p>
            <Textarea
              placeholder="Explain how you've resolved the query..."
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleResubmit}
                disabled={sending || !reply.trim()}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {sending ? 'Sending...' : 'Reply & Resubmit'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommentsModal;
