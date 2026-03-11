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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, Mail, Phone, DollarSign, Download, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Textarea } from '../ui/textarea';

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

const StaffDirectory = () => {
  const { data: employees, isLoading, refetch } = useFetch('/staff/members/');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [timeRecords, setTimeRecords] = useState([]);
  const [loanDetails, setLoanDetails] = useState([]);
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [showEditStaffDialog, setShowEditStaffDialog] = useState(false);
  const [loanForm, setLoanForm] = useState({
    loan_type: '',
    original_amount: '',
    monthly_payment: '',
    start_date: '',
    notes: '',
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [newStaffForm, setNewStaffForm] = useState({
    clock_number: '',
    first_name: '',
    last_name: '',
    employee_type: 'permanent',
    factory: 'hitec',
    department: 'unit_1',
    position: '',
    hourly_rate: '',
    email: '',
    phone_number: '',
    address: '',
    cap_hour: '',
  });

  const [editStaffForm, setEditStaffForm] = useState({
    id: '',
    clock_number: '',
    first_name: '',
    last_name: '',
    employee_type: 'permanent',
    factory: 'hitec',
    department: 'unit_1',
    position: '',
    hourly_rate: '',
    email: '',
    phone_number: '',
    address: '',
    cap_hour: '',
  });

  const { toast } = useToast();

  const { mutate: addStaff, isPending: isAdding } = usePost({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Staff member added successfully' });
      setShowAddStaffDialog(false);
      // Reset form
      setNewStaffForm({
        clock_number: '',
        first_name: '',
        last_name: '',
        employee_type: 'permanent',
        factory: 'hitec',
        department: 'unit_1',
        position: '',
        hourly_rate: '',
        email: '',
        phone_number: '',
        address: '',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to add staff', variant: 'destructive' });
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
      toast({ title: 'Error', description: error.message || 'Failed to update staff', variant: 'destructive' });
    },
  });

  const itemsPerPage = 20;

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

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
  const paginatedStaff = filteredStaff.slice(startIdx, startIdx + itemsPerPage);

  const handleRowClick = async employee => {
    setSelectedEmployee(employee);
    setShowDetails(true);
  };

  const handleAddLoan = async () => {
    // Loan functionality removed for this refactor as Supabase is removed
    toast({ title: 'Info', description: 'Loan functionality is temporarily disabled.' });
  };

  const handleExportCSV = () => {
    console.log('Exporting staff directory to CSV...');
  };

  const handleAddNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newStaffForm.first_name || !newStaffForm.last_name || !newStaffForm.clock_number) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    addStaff({
      url: '/staff/members/',
      data: newStaffForm,
    });
  };

  const handleEditStaff = (employee: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditStaffForm({
      id: employee.id,
      clock_number: employee.clock_number || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      employee_type: employee.employee_type?.toLowerCase() || 'permanent',
      factory: employee.factory?.toLowerCase() || 'hitec',
      department: employee.department?.toLowerCase() || 'unit_1',
      position: employee.position || '',
      hourly_rate: employee.hourly_rate || '',
      email: employee.email || '',
      phone_number: employee.phone_number || '',
      address: employee.address || '',
      cap_hour: employee.cap_hour || '',
    });
    setShowEditStaffDialog(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaffForm.first_name || !editStaffForm.last_name) {
      toast({ title: 'Error', description: 'First and Last Name are required', variant: 'destructive' });
      return;
    }

    editStaff({
      url: `/staff/members/${editStaffForm.id}/`,
      data: {
        clock_number: editStaffForm.clock_number,
        first_name: editStaffForm.first_name,
        last_name: editStaffForm.last_name,
        employee_type: editStaffForm.employee_type,
        factory: editStaffForm.factory,
        department: editStaffForm.department,
        position: editStaffForm.position,
        hourly_rate: editStaffForm.hourly_rate,
        email: editStaffForm.email,
        phone_number: editStaffForm.phone_number,
        address: editStaffForm.address,
        cap_hour: editStaffForm.cap_hour,
      },
    });
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteStaff({
        url: `/staff/members/${deleteId}/`,
      });
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = amount => {
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

  return (
    <div className="space-y-4">
      {/* Header - Clients style */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Staff Directory</h3>
        <div className="flex items-center gap-2">
          {/* <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button> */}
          {/* <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button> */}
          <Button onClick={() => setShowAddStaffDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add new staff
          </Button>
        </div>
      </div>

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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddNewStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={newStaffForm.first_name}
                  onChange={e => setNewStaffForm({ ...newStaffForm, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={newStaffForm.last_name}
                  onChange={e => setNewStaffForm({ ...newStaffForm, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Clock Number</Label>
                <Input
                  value={newStaffForm.clock_number}
                  onChange={e => setNewStaffForm({ ...newStaffForm, clock_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newStaffForm.email}
                  onChange={e => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={newStaffForm.phone_number}
                  onChange={e => setNewStaffForm({ ...newStaffForm, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newStaffForm.hourly_rate}
                  onChange={e => setNewStaffForm({ ...newStaffForm, hourly_rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Type</Label>
                <Select
                  value={newStaffForm.employee_type}
                  onValueChange={value => setNewStaffForm({ ...newStaffForm, employee_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_TYPE_CHOICES.map(choice => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Factory</Label>
                <Select value={newStaffForm.factory} onValueChange={value => setNewStaffForm({ ...newStaffForm, factory: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACTORY_CHOICES.map(choice => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={newStaffForm.department} onValueChange={value => setNewStaffForm({ ...newStaffForm, department: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_CHOICES.map(choice => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input value={newStaffForm.position} onChange={e => setNewStaffForm({ ...newStaffForm, position: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={newStaffForm.address} onChange={e => setNewStaffForm({ ...newStaffForm, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cap Hour</Label>
                <Input value={newStaffForm.cap_hour} onChange={e => setNewStaffForm({ ...newStaffForm, cap_hour: e.target.value })} />
              </div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editStaffForm.first_name}
                  onChange={e => setEditStaffForm({ ...editStaffForm, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editStaffForm.last_name}
                  onChange={e => setEditStaffForm({ ...editStaffForm, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Clock Number</Label>
                <Input
                  value={editStaffForm.clock_number}
                  onChange={e => setEditStaffForm({ ...editStaffForm, clock_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editStaffForm.email}
                  onChange={e => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={editStaffForm.phone_number}
                  onChange={e => setEditStaffForm({ ...editStaffForm, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editStaffForm.hourly_rate}
                  onChange={e => setEditStaffForm({ ...editStaffForm, hourly_rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Type</Label>
                <Select
                  value={editStaffForm.employee_type}
                  onValueChange={value => setEditStaffForm({ ...editStaffForm, employee_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_TYPE_CHOICES.map(choice => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Factory</Label>
                <Select value={editStaffForm.factory} onValueChange={value => setEditStaffForm({ ...editStaffForm, factory: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACTORY_CHOICES.map(choice => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={editStaffForm.department} onValueChange={value => setEditStaffForm({ ...editStaffForm, department: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_CHOICES.map(choice => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input value={editStaffForm.position} onChange={e => setEditStaffForm({ ...editStaffForm, position: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={editStaffForm.address} onChange={e => setEditStaffForm({ ...editStaffForm, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cap Hour</Label>
                <Input value={editStaffForm.cap_hour} onChange={e => setEditStaffForm({ ...editStaffForm, cap_hour: e.target.value })} />
              </div>
            </div>
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
            {EMPLOYEE_TYPE_CHOICES.map(choice => (
              <SelectItem key={choice.value} value={choice.value}>
                {choice.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {/* Floating header with no container - matching Clients page */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Staff Management</h3>
          {/* <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div> */}
        </div>

        {/* Table with grey header - matching Clients page exactly */}
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
                  {/* <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Status</th> */}
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredStaff.map(employee => (
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
                    {/* <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          employee.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-xs">
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td> */}
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

      {/* Pagination */}
      {/* {totalPages > 1 && (
            <div className="flex items-center justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )} */}

      {/* <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-600">
              Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, filteredStaff.length)} of {filteredStaff.length} staff members
            </p>
          </div> */}

      {/* Enhanced Employee Details Modal - Orders Style */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </h1>
                    <p className="text-gray-600">
                      {selectedEmployee.employee_number} • {selectedEmployee.department || 'Unassigned'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={selectedEmployee.is_active ? 'default' : 'secondary'}>
                    {selectedEmployee.is_active ? 'Active' : 'Inactive'}
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
                        <p className="text-lg font-semibold text-gray-900">{selectedEmployee.employee_number}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Department</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold text-gray-900">{selectedEmployee.department || 'Unassigned'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Hourly Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedEmployee.hourly_rate)}/hr</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Start Date</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold text-gray-900">{formatDate(selectedEmployee.hire_date)}</p>
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
                          <p className="text-gray-900">{selectedEmployee.employee_type}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Factory Location</p>
                          <p className="text-gray-900">{selectedEmployee.factory}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Position</p>
                          <p className="text-gray-900">{selectedEmployee.position || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Clock Number</p>
                          <p className="text-gray-900">{selectedEmployee.atg_clock_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Union Member</p>
                          <Badge variant="outline">{selectedEmployee.union_member ? 'Yes' : 'No'}</Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Bonus Eligible</p>
                          <Badge variant="outline">{selectedEmployee.bonus_eligible ? 'Yes' : 'No'}</Badge>
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
                          <p className="text-gray-900">{selectedEmployee.email || 'No email on file'}</p>
                        </div>
                        <div>
                          <Label>Phone Number</Label>
                          <p className="text-gray-900">{selectedEmployee.phone || 'No phone on file'}</p>
                        </div>
                        <div>
                          <Label>Emergency Contact</Label>
                          <p className="text-gray-900">{selectedEmployee.emergency_contact || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label>Address</Label>
                          <p className="text-gray-900">{selectedEmployee.address || 'Not provided'}</p>
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
                          <Label>Bank Name</Label>
                          <p className="text-gray-900">{selectedEmployee.bank_name || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label>Account Number</Label>
                          <p className="text-gray-900">{selectedEmployee.bank_account_number || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label>Payment Method</Label>
                          <p className="text-gray-900">{selectedEmployee.payment_method || 'Bank Transfer'}</p>
                        </div>
                        <div>
                          <Label>Tax Number</Label>
                          <p className="text-gray-900">{selectedEmployee.tax_number || 'Not provided'}</p>
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
                            timeRecords.map(record => (
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
                            <TableHead>Overtime Hours</TableHead>
                            <TableHead>Gross Pay</TableHead>
                            <TableHead>Deductions</TableHead>
                            <TableHead>Net Pay</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payrollHistory.length > 0 ? (
                            payrollHistory.map(record => (
                              <TableRow key={record.id}>
                                <TableCell>{record.payroll_periods?.period_name || 'N/A'}</TableCell>
                                <TableCell>{record.regular_hours || '0'}</TableCell>
                                <TableCell>{record.overtime_hours || '0'}</TableCell>
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
                              <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                          loanDetails.map(loan => (
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
                              {loan.notes && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-sm text-gray-700">{loan.notes}</p>
                                </div>
                              )}
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
