import { useDelete } from '@/hooks/useDelete';
import { usePost } from '@/hooks/usePost';
import { usePatch } from '@/hooks/usePatch';
import useFetch from '@/hooks/useFetch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Mail, DollarSign, Paperclip, X, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';

// ─── Choices (must match backend model exactly) ───────────────────────────────

const EMPLOYEE_TYPE_CHOICES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'casual', label: 'Casual' },
];

const FACTORY_CHOICES = [
  { value: 'RANDM', label: 'RANDM' },
  { value: 'hitec', label: 'Hitec' },
  { value: 'CASUALS', label: 'CASUALS' },
  { value: 'YOUTH_WORK', label: 'YOUTH @ WORK' },
];

const DEPARTMENT_CHOICES = [
  { value: 'unit_1', label: 'Unit 1' },
  { value: 'unit_2', label: 'Unit 2' },
  { value: 'Looms', label: 'Looms' },
  { value: 'Cutting', label: 'Cutting' },
  { value: 'unit_3', label: 'Unit 3' },
  { value: 'unit_6', label: 'Unit 6' },
  { value: 'General', label: 'General' },
  { value: 'Extruder', label: 'Extruder' },
  { value: 'Reel_to_Reel', label: 'Reel to Reel' },
  { value: 'Printing', label: 'Printing' },
  { value: 'Supervisor', label: 'Supervisor' },
  { value: 'Bailing', label: 'Bailing' },
  { value: 'unit_5', label: 'Unit 5' },
  { value: 'Bobbin_Burners', label: 'Bobbin Burners' },
];

// ─── Zod schema — mirrors backend StaffCreateUpdateSerializer + model constraints ─

const EMPLOYEE_TYPE_VALUES = ['permanent', 'casual'] as const;
const FACTORY_VALUES = ['RANDM', 'hitec', 'CASUALS', 'YOUTH_WORK'] as const;
const DEPARTMENT_VALUES = [
  'unit_1', 'unit_2', 'Looms', 'Cutting', 'unit_3', 'unit_6', 'General',
  'Extruder', 'Reel_to_Reel', 'Printing', 'Supervisor', 'Bailing', 'unit_5', 'Bobbin_Burners',
] as const;

const toOptionalNumber = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : Number(v);

const staffSchema = z.object({
  // Required — CharField no blank/null
  first_name: z.string().min(1, 'Required').max(100, 'Max 100 characters'),
  last_name:  z.string().min(1, 'Required').max(100, 'Max 100 characters'),
  email:      z.string().min(1, 'Required').email('Invalid email address'),
  position:   z.string().min(1, 'Required').max(100, 'Max 100 characters'),

  // Required with choices — CharField with choices
  department:    z.enum(DEPARTMENT_VALUES, { errorMap: () => ({ message: 'Select a department' }) }),
  employee_type: z.enum(EMPLOYEE_TYPE_VALUES),
  factory:       z.enum(FACTORY_VALUES),

  // Optional — CharField blank=True null=True
  clock_number:        z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  phone_number:        z.string().min(1, 'Required').max(20, 'Max 20 characters'),
  address:             z.string().optional().or(z.literal('')),
  bank_account_number: z.string().max(50, 'Max 50 characters').optional().or(z.literal('')),
  bank_branch_code:    z.string().max(20, 'Max 20 characters').optional().or(z.literal('')),

  // Optional decimals — DecimalField with default=0.00
  hourly_rate: z.preprocess(
    toOptionalNumber,
    z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be ≥ 0').optional(),
  ),
  cap_hour: z.preprocess(
    toOptionalNumber,
    z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be ≥ 0').optional(),
  ),
});

type StaffFormData = z.infer<typeof staffSchema>;

const ADD_DEFAULTS: StaffFormData = {
  first_name: '',
  last_name: '',
  email: '',
  position: '',
  department: 'unit_1',
  employee_type: 'permanent',
  factory: 'hitec',
  clock_number: '',
  phone_number: '',
  address: '',
  bank_account_number: '',
  bank_branch_code: '',
  hourly_rate: undefined,
  cap_hour: undefined,
};

// ─── Small helper ─────────────────────────────────────────────────────────────

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-destructive text-xs mt-1">{message}</p> : null;

// ─── Component ────────────────────────────────────────────────────────────────

const StaffDirectory = () => {
  const { data: employees, isLoading, refetch } = useFetch('/staff/members/');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [payrollHistory] = useState([]);
  const [timeRecords] = useState([]);
  const [loanDetails] = useState([]);
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [showEditStaffDialog, setShowEditStaffDialog] = useState(false);
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({
    loan_type: '',
    original_amount: '',
    monthly_payment: '',
    start_date: '',
    notes: '',
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [staffDocuments, setStaffDocuments] = useState<File[]>([]);

  // ── React Hook Form instances ──────────────────────────────────────────────

  const addForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: ADD_DEFAULTS,
  });

  const editForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
  });

  const { toast } = useToast();

  // ── Mutations ─────────────────────────────────────────────────────────────

  const applyServerErrors = (form: ReturnType<typeof useForm<StaffFormData>>, error: any) => {
    const data = error?.response?.data;
    if (!data || typeof data !== 'object') {
      toast({ title: 'Error', description: error?.message || 'Request failed', variant: 'destructive' });
      return;
    }
    for (const [key, messages] of Object.entries(data)) {
      const msg = Array.isArray(messages) ? (messages[0] as string) : String(messages);
      if (key === 'non_field_errors' || key === 'detail') {
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      } else {
        form.setError(key as any, { type: 'server', message: msg });
      }
    }
  };

  const { mutate: addStaff, isPending: isAdding } = usePost({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Staff member added successfully' });
      setShowAddStaffDialog(false);
      addForm.reset(ADD_DEFAULTS);
      setStaffDocuments([]);
      refetch();
    },
    onError: (error: any) => {
      applyServerErrors(addForm, error);
    },
  });

  const { mutate: deleteStaff, isPending: isDeleting } = useDelete({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Staff member deleted successfully' });
      setDeleteId(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete staff', variant: 'destructive' });
    },
  });

  const { mutate: editStaff, isPending: isEditing } = usePatch({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Staff member updated successfully' });
      setShowEditStaffDialog(false);
      refetch();
    },
    onError: (error: any) => {
      applyServerErrors(editForm, error);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const itemsPerPage = 20;

  const filteredStaff =
    employees?.filter((employee: any) => {
      const fullName = employee.full_name?.toLowerCase() || `${employee.first_name} ${employee.last_name}`.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        fullName.includes(searchLower) ||
        employee.clock_number?.toLowerCase().includes(searchLower) ||
        employee.email?.toLowerCase().includes(searchLower);
      const matchesType = filterType === 'all' || employee.employee_type?.toLowerCase() === filterType.toLowerCase();
      return matchesSearch && matchesType;
    }) || [];

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;

  const handleRowClick = (employee: any) => {
    setSelectedEmployee(employee);
    setShowDetails(true);
  };

  const handleAddLoan = () => {
    toast({ title: 'Info', description: 'Loan functionality is temporarily disabled.' });
  };

  const handleAddNewStaff = addForm.handleSubmit((data) => {
    addStaff({ url: '/staff/members/', data });
  });

  const handleEditStaff = (employee: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditStaffId(employee.id);
    editForm.reset({
      clock_number:        employee.clock_number        || '',
      first_name:          employee.first_name          || '',
      last_name:           employee.last_name           || '',
      employee_type:       employee.employee_type       || 'permanent',
      factory:             employee.factory             || 'hitec',
      department:          employee.department          || 'unit_1',
      position:            employee.position            || '',
      hourly_rate:         employee.hourly_rate         != null ? Number(employee.hourly_rate) : undefined,
      email:               employee.email               || '',
      phone_number:        employee.phone_number        || '',
      address:             employee.address             || '',
      cap_hour:            employee.cap_hour            != null ? Number(employee.cap_hour) : undefined,
      bank_account_number: employee.bank_account_number || '',
      bank_branch_code:    employee.bank_branch_code    || '',
    });
    setShowEditStaffDialog(true);
  };

  const handleUpdateStaff = editForm.handleSubmit((data) => {
    editStaff({ url: `/staff/members/${editStaffId}/`, data });
  });

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleDelete = () => {
    if (deleteId) deleteStaff({ url: `/staff/members/${deleteId}/` });
  };

  const handleStaffDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setStaffDocuments(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeStaffDocument = (index: number) => {
    setStaffDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: any) => {
    if (!amount) return 'R0.00';
    return `R${parseFloat(amount).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-lg">Loading staff directory...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Shared form fields renderer (used for both Add and Edit) ───────────────

  const renderFormFields = (form: ReturnType<typeof useForm<StaffFormData>>) => {
    const { register, control, formState: { errors } } = form;
    return (
      <div className="grid grid-cols-2 gap-4">
        {/* First Name — required CharField max 100 */}
        <div className="space-y-2">
          <Label>First Name <span className="text-destructive">*</span></Label>
          <Input {...register('first_name')} />
          <FieldError message={errors.first_name?.message} />
        </div>

        {/* Last Name — required CharField max 100 */}
        <div className="space-y-2">
          <Label>Last Name <span className="text-destructive">*</span></Label>
          <Input {...register('last_name')} />
          <FieldError message={errors.last_name?.message} />
        </div>

        {/* Email — required EmailField unique */}
        <div className="space-y-2">
          <Label>Email <span className="text-destructive">*</span></Label>
          <Input type="email" {...register('email')} />
          <FieldError message={errors.email?.message} />
        </div>

        {/* Position — required CharField max 100 */}
        <div className="space-y-2">
          <Label>Position <span className="text-destructive">*</span></Label>
          <Input {...register('position')} />
          <FieldError message={errors.position?.message} />
        </div>

        {/* Clock Number — required CharField max 50 */}
        <div className="space-y-2">
          <Label>Clock Number <span className="text-destructive">*</span></Label>
          <Input {...register('clock_number')} />
          <FieldError message={errors.clock_number?.message} />
        </div>

        {/* Phone Number — required CharField max 20 */}
        <div className="space-y-2">
          <Label>Phone Number <span className="text-destructive">*</span></Label>
          <Input {...register('phone_number')} />
          <FieldError message={errors.phone_number?.message} />
        </div>

        {/* Hourly Rate — optional DecimalField default 0 */}
        <div className="space-y-2">
          <Label>Hourly Rate</Label>
          <Input type="number" step="0.01" min="0" {...register('hourly_rate')} />
          <FieldError message={errors.hourly_rate?.message} />
        </div>

        {/* Cap Hour — optional DecimalField default 0 */}
        <div className="space-y-2">
          <Label>Cap Hour</Label>
          <Input type="number" step="0.01" min="0" {...register('cap_hour')} />
          <FieldError message={errors.cap_hour?.message} />
        </div>

        {/* Employee Type — required CharField with choices, default permanent */}
        <div className="space-y-2">
          <Label>Employee Type</Label>
          <Controller
            name="employee_type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_TYPE_CHOICES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.employee_type?.message} />
        </div>

        {/* Factory — required CharField with choices, default hitec */}
        <div className="space-y-2">
          <Label>Factory</Label>
          <Controller
            name="factory"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACTORY_CHOICES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.factory?.message} />
        </div>

        {/* Department — required CharField with choices */}
        <div className="space-y-2">
          <Label>Department <span className="text-destructive">*</span></Label>
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_CHOICES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.department?.message} />
        </div>

        {/* Address — optional TextField */}
        <div className="space-y-2">
          <Label>Address</Label>
          <Input {...register('address')} />
          <FieldError message={errors.address?.message} />
        </div>

        {/* Bank Account Number — optional CharField max 50 */}
        <div className="space-y-2">
          <Label>Bank Account Number</Label>
          <Input {...register('bank_account_number')} />
          <FieldError message={errors.bank_account_number?.message} />
        </div>

        {/* Bank Branch Code — optional CharField max 20 */}
        <div className="space-y-2">
          <Label>Bank Branch Code</Label>
          <Input {...register('bank_branch_code')} />
          <FieldError message={errors.bank_branch_code?.message} />
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Staff Directory</h3>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddStaffDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add new staff
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the staff member and their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Staff Dialog */}
      <Dialog open={showAddStaffDialog} onOpenChange={setShowAddStaffDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddNewStaff} className="space-y-4">
            {renderFormFields(addForm)}

            {/* Documents upload */}
            <div className="space-y-2">
              <Label>Documents</Label>
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => document.getElementById('staff-doc-upload')?.click()}
              >
                <Paperclip className="mx-auto h-6 w-6 text-gray-400 mb-1" />
                <p className="text-sm text-gray-500">Click to attach documents</p>
                <p className="text-xs text-gray-400">PDF, PNG, JPG, DOC up to 10MB each</p>
                <input
                  id="staff-doc-upload"
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="hidden"
                  onChange={handleStaffDocumentChange}
                />
              </div>
              {staffDocuments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {staffDocuments.map((file, index) => (
                    <li key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="truncate text-gray-700">{file.name}</span>
                        <span className="text-gray-400 text-xs shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button type="button" onClick={() => removeStaffDocument(index)} className="ml-2 text-gray-400 hover:text-red-500 shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddStaffDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? 'Adding...' : 'Add Staff'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={showEditStaffDialog} onOpenChange={setShowEditStaffDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStaff} className="space-y-4">
            {renderFormFields(editForm)}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditStaffDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {EMPLOYEE_TYPE_CHOICES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Staff Management</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Employee</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Clock Number</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Department</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Hourly Rate</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredStaff.map((employee: any) => (
                  <tr
                    key={employee.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(employee)}
                  >
                    <td className="py-2 px-4">
                      <div>
                        <p className="font-medium text-blue-600 text-xs">{employee.full_name}</p>
                        <p className="text-xs text-gray-500">{employee.email}</p>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-xs">{employee.clock_number || 'N/A'}</td>
                    <td className="py-2 px-4 text-xs">{employee.department || 'N/A'}</td>
                    <td className="py-2 px-4 text-xs">R{employee.hourly_rate}/hr</td>
                    <td className="py-2 px-4">
                      <Badge variant="outline" className="text-xs">
                        {employee.employee_type}
                      </Badge>
                    </td>
                    <td className="py-2 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs" onClick={e => handleEditStaff(employee, e)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" className="text-xs" onClick={e => confirmDelete(e, employee.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Employee Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {(selectedEmployee as any).first_name} {(selectedEmployee as any).last_name}
                    </h1>
                    <p className="text-gray-600">
                      {(selectedEmployee as any).employee_number} • {(selectedEmployee as any).department || 'Unassigned'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={(selectedEmployee as any).is_active ? 'default' : 'secondary'}>
                    {(selectedEmployee as any).is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="clean-tabs">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="contact">Contact & Bank</TabsTrigger>
                  <TabsTrigger value="hours">Hours</TabsTrigger>
                  <TabsTrigger value="payslips">Payslips</TabsTrigger>
                  <TabsTrigger value="loans">Loans</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Employee Number</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold text-gray-900">{(selectedEmployee as any).employee_number}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Department</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold text-gray-900">{(selectedEmployee as any).department || 'Unassigned'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Hourly Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency((selectedEmployee as any).hourly_rate)}/hr</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Start Date</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold text-gray-900">{formatDate((selectedEmployee as any).hire_date)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Employment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Employee Type</p>
                          <p className="text-gray-900">{(selectedEmployee as any).employee_type}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Factory Location</p>
                          <p className="text-gray-900">{(selectedEmployee as any).factory}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Position</p>
                          <p className="text-gray-900">{(selectedEmployee as any).position || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Clock Number</p>
                          <p className="text-gray-900">{(selectedEmployee as any).clock_number || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Mail className="h-5 w-5" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Email Address</Label>
                          <p className="text-gray-900">{(selectedEmployee as any).email || 'No email on file'}</p>
                        </div>
                        <div>
                          <Label>Phone Number</Label>
                          <p className="text-gray-900">{(selectedEmployee as any).phone_number || 'No phone on file'}</p>
                        </div>
                        <div>
                          <Label>Address</Label>
                          <p className="text-gray-900">{(selectedEmployee as any).address || 'Not provided'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Banking Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Account Number</Label>
                          <p className="text-gray-900">{(selectedEmployee as any).bank_account_number || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label>Branch Code</Label>
                          <p className="text-gray-900">{(selectedEmployee as any).bank_branch_code || 'Not provided'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="hours" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Time Records (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Clock In</TableHead>
                            <TableHead>Clock Out</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Overtime</TableHead>
                            <TableHead>Late (mins)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {timeRecords.length > 0 ? (
                            (timeRecords as any[]).map((record: any) => (
                              <TableRow key={record.id}>
                                <TableCell>{formatDate(record.date)}</TableCell>
                                <TableCell>{record.clock_in || 'N/A'}</TableCell>
                                <TableCell>{record.clock_out || 'N/A'}</TableCell>
                                <TableCell>{record.total_hours || '0'}</TableCell>
                                <TableCell>{record.overtime_hours || '0'}</TableCell>
                                <TableCell>{record.late_minutes || '0'}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                No time records found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payslips" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payroll History (Last 12 Months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Regular Hours</TableHead>
                            <TableHead>Gross Pay</TableHead>
                            <TableHead>Deductions</TableHead>
                            <TableHead>Net Pay</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payrollHistory.length > 0 ? (
                            (payrollHistory as any[]).map((record: any) => (
                              <TableRow key={record.id}>
                                <TableCell>{record.payroll_periods?.period_name || 'N/A'}</TableCell>
                                <TableCell>{record.regular_hours || '0'}</TableCell>
                                <TableCell>{formatCurrency(record.gross_pay)}</TableCell>
                                <TableCell>{formatCurrency(record.total_deductions)}</TableCell>
                                <TableCell className="font-semibold">{formatCurrency(record.net_pay)}</TableCell>
                                <TableCell>
                                  <Badge variant={record.payment_status === 'paid' ? 'default' : 'secondary'}>
                                    {record.payment_status || 'pending'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                No payroll records found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="loans" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Employee Loans</CardTitle>
                        <Button size="sm" onClick={() => setShowLoanDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Loan
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {loanDetails.length > 0 ? (
                          (loanDetails as any[]).map((loan: any) => (
                            <div key={loan.id} className="p-4 rounded-lg border-l-4 border-l-blue-500 bg-blue-50">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Loan Type</p>
                                  <p className="font-medium text-gray-900">{loan.loan_type}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Original Amount</p>
                                  <p className="text-gray-900">{formatCurrency(loan.original_amount)}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Outstanding Balance</p>
                                  <p className="font-semibold text-red-600">{formatCurrency(loan.outstanding_balance)}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Monthly Payment</p>
                                  <p className="text-gray-900">{formatCurrency(loan.monthly_payment)}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Start Date</p>
                                  <p className="text-gray-900">{formatDate(loan.start_date)}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Status</p>
                                  <Badge variant={loan.status === 'active' ? 'destructive' : 'default'}>{loan.status}</Badge>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <p>No loans found for this employee</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Loan Dialog */}
      <Dialog open={showLoanDialog} onOpenChange={setShowLoanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Employee Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="loan_type">Loan Type</Label>
              <Select value={loanForm.loan_type} onValueChange={value => setLoanForm({ ...loanForm, loan_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select loan type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary_advance">Salary Advance</SelectItem>
                  <SelectItem value="equipment_loan">Equipment Loan</SelectItem>
                  <SelectItem value="emergency_loan">Emergency Loan</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="original_amount">Loan Amount (R)</Label>
              <Input
                id="original_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={loanForm.original_amount}
                onChange={e => setLoanForm({ ...loanForm, original_amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="monthly_payment">Monthly Payment (R)</Label>
              <Input
                id="monthly_payment"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={loanForm.monthly_payment}
                onChange={e => setLoanForm({ ...loanForm, monthly_payment: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={loanForm.start_date}
                onChange={e => setLoanForm({ ...loanForm, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about the loan..."
                value={loanForm.notes}
                onChange={e => setLoanForm({ ...loanForm, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowLoanDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddLoan} className="flex-1">
                Add Loan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffDirectory;
