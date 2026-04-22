import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Eye, DollarSign, Users, Calendar, Clock, Paperclip, X, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import useFetch from '@/hooks/useFetch';
import { usePost } from '@/hooks/usePost';
import { usePut } from '@/hooks/usePut';

interface Loan {
  id: number;
  staff_member: number;
  staff_member_name: string;
  loan_type: string;
  amount: string;
  term_type: string;
  term_duration: number;
  start_date: string;
  interest_rate?: string;
  notes?: string;
}

interface StaffMember {
  id: number;
  clock_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_type: string;
  department: string;
  position: string;
  email: string;
}

interface Bonus {
  id: number;
  staff_member: number;
  staff_member_name: string;
  amount: string;
  reason?: string;
  status: string;
  created_at: string;
}

const LoansAndBonusesTab = () => {
  const { toast } = useToast();

  const { data: staffMembers } = useFetch<StaffMember[]>('staff/members/');
  const { data: loansData, isLoading: loansLoading, refetch: refetchLoans } = useFetch<Loan[]>('staff/loans/');
  const { data: bonusesData, isLoading: bonusesLoading, refetch: refetchBonuses } = useFetch<Bonus[]>('staff/bonuses/');
  const { mutateAsync: postLoan } = usePost();
  const { mutateAsync: putLoan } = usePut();
  const [activeSection, setActiveSection] = useState('loans');
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [showBonusDialog, setShowBonusDialog] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);

  const [loanForm, setLoanForm] = useState({
    employee_id: '',
    loan_type: '',
    original_amount: '',
    interest_rate: '0',
    term_type: 'monthly',
    term_months: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [loanDocuments, setLoanDocuments] = useState<File[]>([]);

  const handleLoanDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setLoanDocuments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeLoanDocument = (index: number) => {
    setLoanDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const [bonusForm, setBonusForm] = useState({
    employee_id: '',
    bonus_amount: '',
    bonus_reason: '',
    payroll_period_id: '',
    status: 'pending'
  });

  useEffect(() => {
    // Initialization logic if needed
  }, []);

  const calculateInstallment = (amount: number, interestRate: number, duration: number, termType: string) => {
    if (interestRate === 0) {
      return amount / duration;
    }

    // Adjust rate and periods based on term type
    const periodsPerYear = termType === 'fortnightly' ? 26 : 12;
    const periodicRate = interestRate / 100 / periodsPerYear;

    const payment = (amount * periodicRate * Math.pow(1 + periodicRate, duration)) /
      (Math.pow(1 + periodicRate, duration) - 1);
    return payment;
  };

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const loanData = {
        staff_member: parseInt(loanForm.employee_id),
        loan_type: loanForm.loan_type,
        amount: loanForm.original_amount,
        interest_rate: loanForm.interest_rate,
        term_type: loanForm.term_type,
        term_duration: parseInt(loanForm.term_months),
        start_date: loanForm.start_date,
        notes: loanForm.notes
      };

      if (editingLoan) {
        await putLoan({
          url: `staff/loans/${editingLoan.id}/`,
          data: loanData
        });
      } else {
        await postLoan({
          url: 'staff/loans/',
          data: loanData
        });
      }

      toast({
        title: "Success",
        description: `Loan ${editingLoan ? 'updated' : 'created'} successfully`,
      });

      setShowLoanDialog(false);
      setEditingLoan(null);
      setLoanForm({
        employee_id: '',
        loan_type: '',
        original_amount: '',
        interest_rate: '0',
        term_type: 'monthly',
        term_months: '',
        start_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      refetchLoans();
    } catch (error) {
      console.error('Error saving loan:', error);
      toast({
        title: "Error",
        description: "Failed to save loan",
        variant: "destructive",
      });
    }
  };

  const handleBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const bonusData = {
        staff_member: parseInt(bonusForm.employee_id),
        amount: bonusForm.bonus_amount,
        reason: bonusForm.bonus_reason,
        status: bonusForm.status
      };

      if (editingBonus) {
        await putLoan({
          url: `staff/bonuses/${editingBonus.id}/`,
          data: bonusData
        });
      } else {
        await postLoan({
          url: 'staff/bonuses/',
          data: bonusData
        });
      }

      toast({
        title: "Success",
        description: `Bonus ${editingBonus ? 'updated' : 'created'} successfully`,
      });

      setShowBonusDialog(false);
      setEditingBonus(null);
      setBonusForm({
        employee_id: '',
        bonus_amount: '',
        bonus_reason: '',
        payroll_period_id: '',
        status: 'pending'
      });
      refetchBonuses();
    } catch (error) {
      console.error('Error saving bonus:', error);
      toast({
        title: "Error",
        description: "Failed to save bonus",
        variant: "destructive",
      });
    }
  };



  const editLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanForm({
      employee_id: loan.staff_member.toString(),
      loan_type: loan.loan_type,
      original_amount: loan.amount,
      interest_rate: loan.interest_rate || '0',
      term_type: loan.term_type || 'monthly',
      term_months: loan.term_duration.toString(),
      start_date: loan.start_date,
      notes: loan.notes || ''
    });
    setShowLoanDialog(true);
  };

  const editBonus = (bonus: Bonus) => {
    setEditingBonus(bonus);
    setBonusForm({
      employee_id: bonus.staff_member.toString(),
      bonus_amount: bonus.amount,
      bonus_reason: bonus.reason || '',
      payroll_period_id: '',
      status: bonus.status
    });
    setShowBonusDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      paid_off: 'secondary',
      defaulted: 'destructive',
      pending: 'outline',
      paid: 'default'
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  if (loansLoading || bonusesLoading) {
    return <div className="p-6">Loading...</div>;
  }

  const loans = loansData || [];
  const bonuses = bonusesData || [];

  return (
    <div className="space-y-6">
      {/* Section Navigation Buttons - Left Aligned */}
      <div className="flex justify-start gap-2">
        <Button
          variant={activeSection === 'loans' ? 'default' : 'outline'}
          onClick={() => setActiveSection('loans')}
          className={`flex items-center gap-2 ${activeSection === 'loans'
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300'
            }`}
        >
          <DollarSign className="h-4 w-4" />
          Loans
        </Button>
        <Button
          variant={activeSection === 'bonuses' ? 'default' : 'outline'}
          onClick={() => setActiveSection('bonuses')}
          className={`flex items-center gap-2 ${activeSection === 'bonuses'
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300'
            }`}
        >
          <Users className="h-4 w-4" />
          Bonuses
        </Button>
      </div>

      {/* Loans Section */}
      {activeSection === 'loans' && (
        <div className="space-y-4">
          {/* Floating header with no container - matching Clients page */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Employee Loans
            </h3>
            <Dialog open={showLoanDialog} onOpenChange={setShowLoanDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingLoan(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Loan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLoan ? 'Edit Loan' : 'Create New Loan'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLoanSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="employee_id">Staff Member</Label>
                    <Select
                      value={loanForm.employee_id}
                      onValueChange={(value) => setLoanForm(prev => ({ ...prev, employee_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="loan_type">Loan Type</Label>
                    <Input
                      id="loan_type"
                      value={loanForm.loan_type}
                      onChange={(e) => setLoanForm(prev => ({ ...prev, loan_type: e.target.value }))}
                      placeholder="e.g., Emergency Advance, Equipment"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="original_amount">Amount</Label>
                      <Input
                        id="original_amount"
                        type="number"
                        step="0.01"
                        value={loanForm.original_amount}
                        onChange={(e) => setLoanForm(prev => ({ ...prev, original_amount: e.target.value }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                      <Input
                        id="interest_rate"
                        type="number"
                        step="0.1"
                        value={loanForm.interest_rate}
                        onChange={(e) => setLoanForm(prev => ({ ...prev, interest_rate: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="term_type">Term Type</Label>
                      <Select
                        value={loanForm.term_type}
                        onValueChange={(value) => setLoanForm(prev => ({ ...prev, term_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select term type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="fortnightly">Fortnightly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="term_months">Term Duration</Label>
                      <Input
                        id="term_months"
                        type="number"
                        value={loanForm.term_months}
                        onChange={(e) => setLoanForm(prev => ({ ...prev, term_months: e.target.value }))}
                        placeholder="12"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={loanForm.start_date}
                      onChange={(e) => setLoanForm(prev => ({ ...prev, start_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={loanForm.notes}
                      onChange={(e) => setLoanForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                    />
                  </div>

                  {loanForm.original_amount && loanForm.term_months && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Installment Amount: R{calculateInstallment(
                          parseFloat(loanForm.original_amount) || 0,
                          parseFloat(loanForm.interest_rate) || 0,
                          parseInt(loanForm.term_months) || 1,
                          loanForm.term_type
                        ).toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label>Supporting Documents</Label>
                    <div
                      className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => document.getElementById('loan-doc-upload')?.click()}
                    >
                      <Paperclip className="mx-auto h-6 w-6 text-gray-400 mb-1" />
                      <p className="text-sm text-gray-500">Click to attach documents</p>
                      <p className="text-xs text-gray-400">PDF, PNG, JPG up to 10MB each</p>
                      <input
                        id="loan-doc-upload"
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        className="hidden"
                        onChange={handleLoanDocumentChange}
                      />
                    </div>
                    {loanDocuments.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {loanDocuments.map((file, index) => (
                          <li key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="truncate text-gray-700">{file.name}</span>
                              <span className="text-gray-400 text-xs shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                            </div>
                            <button type="button" onClick={() => removeLoanDocument(index)} className="ml-2 text-gray-400 hover:text-red-500 shrink-0">
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingLoan ? 'Update Loan' : 'Create Loan'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowLoanDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Table with grey header - matching Clients page exactly */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Staff Member</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Loan Type</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Date Issued</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Term</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-4 text-xs font-medium">
                        {loan.staff_member_name}
                      </td>
                      <td className="py-2 px-4 text-xs">{loan.loan_type}</td>
                      <td className="py-2 px-4 text-xs">{new Date(loan.start_date).toLocaleDateString()}</td>
                      <td className="py-2 px-4 text-xs">R{parseFloat(loan.amount).toFixed(2)}</td>
                      <td className="py-2 px-4 text-xs">{loan.term_duration} {loan.term_type}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editLoan(loan)} className="text-xs">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {loans.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted-foreground py-4 text-xs">
                        No loans found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bonuses Section */}
      {activeSection === 'bonuses' && (
        <div className="space-y-4">
          {/* Floating header with no container - matching Clients page */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employee Bonuses
            </h3>
            <Dialog open={showBonusDialog} onOpenChange={setShowBonusDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingBonus(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bonus
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingBonus ? 'Edit Bonus' : 'Add New Bonus'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBonusSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="employee_id">Staff Member</Label>
                    <Select
                      value={bonusForm.employee_id}
                      onValueChange={(value) => setBonusForm(prev => ({ ...prev, employee_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bonus_amount">Amount</Label>
                    <Input
                      id="bonus_amount"
                      type="number"
                      step="0.01"
                      value={bonusForm.bonus_amount}
                      onChange={(e) => setBonusForm(prev => ({ ...prev, bonus_amount: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="bonus_reason">Reason or Notes</Label>
                    <Textarea
                      id="bonus_reason"
                      value={bonusForm.bonus_reason}
                      onChange={(e) => setBonusForm(prev => ({ ...prev, bonus_reason: e.target.value }))}
                      placeholder="Performance bonus, overtime, etc."
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={bonusForm.status}
                      onValueChange={(value) => setBonusForm(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingBonus ? 'Update Bonus' : 'Add Bonus'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowBonusDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Table with grey header - matching Clients page exactly */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Staff Member</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Date Awarded</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Reason</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {bonuses.map((bonus) => (
                    <tr key={bonus.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-4 text-xs font-medium">
                        {bonus.staff_member_name}
                      </td>
                      <td className="py-2 px-4 text-xs">{new Date(bonus.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-4 text-xs">R{parseFloat(bonus.amount).toFixed(2)}</td>
                      <td className="py-2 px-4 text-xs">{bonus.reason}</td>
                      <td className="py-2 px-4">{getStatusBadge(bonus.status)}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editBonus(bonus)} className="text-xs">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bonuses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted-foreground py-4 text-xs">
                        No bonuses found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoansAndBonusesTab;