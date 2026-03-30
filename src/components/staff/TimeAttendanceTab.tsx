import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, AlertTriangle, CheckCircle, Edit, Upload, Users, CalendarIcon, ChevronLeft, ChevronRight, Search } from 'lucide-react';
// import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { usePost } from '@/hooks/usePost';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { format } from 'date-fns';
import useFetch from '@/hooks/useFetch';

const TimeAttendanceTab = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(2);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [uploadPeriodId, setUploadPeriodId] = useState<number | undefined>(undefined);
  const [dailyStaffData, setDailyStaffData] = useState<any>({});
  // const [employees, setEmployees] = useState<any[]>([]);
  // const [timeRecords, setTimeRecords] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  // const [itemsPerPage] = useState(20);
  const [itemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([]);
  
  // Upload Modal State
  const [isCsvMode, setIsCsvMode] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [formDate, setFormDate] = useState<Date | undefined>(new Date());
  const [formHours, setFormHours] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Fetch API Data
  const { data: staffList } = useFetch('/staff/members/');

  const { mutate: submitEntry, isPending: isSubmitting } = usePost({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Entry submitted successfully' });
      setShowUploadDialog(false);
      resetForm();
      refetch(); // Refresh main table
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to submit entry', variant: 'destructive' });
    }
  });

  const { mutate: uploadCsv, isPending: isUploading } = usePost({
    onSuccess: () => {
      toast({ title: 'Success', description: 'CSV uploaded successfully' });
      setShowUploadDialog(false);
      resetForm();
      refetch(); // Refresh main table
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to upload CSV', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setSelectedStaffId('');
    setFormDate(new Date());
    setFormHours('');
    setCsvFile(null);
  };

  const { data, isLoading, isError, error, refetch } = useFetch(
    selectedDate ? `/atg/attendance/staff-report?date=${selectedDate}` : '',
    {
      enabled: !!selectedDate,
    }
  );

  useEffect(() => {
    setTimeOffRequests(payPeriods.find(p => p.id === selectedPeriod));
  }, [selectedPeriod]);

  // Calculate dynamic fortnightly pay periods based on current date
  const payPeriods = React.useMemo(() => {
    const today = new Date();

    // Base period starts June 18, 2025 (2-week cycles)
    const basePeriodStart = new Date('2025-06-18');

    // Calculate how many periods have passed since base period
    const daysDiff = Math.floor((today.getTime() - basePeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    const periodsPassed = Math.floor(daysDiff / 14);

    const periods = [];

    // Previous period (for payroll processing)
    const prevPeriodStart = new Date(basePeriodStart);
    prevPeriodStart.setDate(basePeriodStart.getDate() + (periodsPassed - 1) * 14);
    const prevPeriodEnd = new Date(prevPeriodStart);
    prevPeriodEnd.setDate(prevPeriodStart.getDate() + 13);

    // Current period (active/in progress)
    const currentPeriodStart = new Date(basePeriodStart);
    currentPeriodStart.setDate(basePeriodStart.getDate() + periodsPassed * 14);
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setDate(currentPeriodStart.getDate() + 13);

    // Next period (upcoming)
    const nextPeriodStart = new Date(basePeriodStart);
    nextPeriodStart.setDate(basePeriodStart.getDate() + (periodsPassed + 1) * 14);
    const nextPeriodEnd = new Date(nextPeriodStart);
    nextPeriodEnd.setDate(nextPeriodStart.getDate() + 13);

    const formatDate = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day}`;
    };
    
    // periods.push({
    //   id: 0,
    //   dates: `Nov 5-Nov 18`,
    //   status: 'complete',
    //   days: 14,
    //   startDate: '2025-11-05',
    //   endDate: '2025-11-18',
    // });

    periods.push({
      id: 1,
      dates: `${formatDate(prevPeriodStart)}-${formatDate(prevPeriodEnd)}`,
      status: 'complete',
      days: 14,
      startDate: prevPeriodStart.toISOString().split('T')[0],
      endDate: prevPeriodEnd.toISOString().split('T')[0],
    });

    periods.push({
      id: 2,
      dates: `${formatDate(currentPeriodStart)}-${formatDate(currentPeriodEnd)}`,
      status: 'current',
      days: 14,
      startDate: currentPeriodStart.toISOString().split('T')[0],
      endDate: currentPeriodEnd.toISOString().split('T')[0],
    });

    periods.push({
      id: 3,
      dates: `${formatDate(nextPeriodStart)}-${formatDate(nextPeriodEnd)}`,
      status: 'upcoming',
      days: 14,
      startDate: nextPeriodStart.toISOString().split('T')[0],
      endDate: nextPeriodEnd.toISOString().split('T')[0],
    });

    return periods;
  }, []);
  

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-hitec-success'; // Completed period - green
      case 'current':
        return 'bg-hitec-highlight'; // Current active period - orange
      case 'upcoming':
        return 'bg-muted'; // Future period - gray
      default:
        return 'bg-muted';
    }
  };

  // Generate 14 days for selected period (recalculated when period changes)
  const periodDays = React.useMemo(() => {
    const days = [];
    const today = new Date();
    const selectedPeriodData = payPeriods.find(p => p.id === selectedPeriod);
    const startDate = new Date(selectedPeriodData?.startDate || payPeriods[1].startDate); // Default to current period

    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateStr = date.toISOString().split('T')[0];
      const dayNum = date.getDate();
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today;
      const isFuture = date > today;

      let status = 'future';
      if (isToday) status = 'today';
      else if (isPast) status = 'past';

      days.push({
        date: dateStr,
        day: dayNum,
        status,
        staffCount: 0, // Will be calculated later
        totalHours: 0, // Will be calculated later
      });
    }
    return days;
  }, [selectedPeriod, payPeriods]);
  const selectedPeriodData = payPeriods.find(p => p.id === selectedPeriod);

  // Set default selected period to current active period (period 2)
  useEffect(() => {
    setSelectedPeriod(2);
  }, []);

  // Set default upload period to current period (Jun 18 - Jul 1)
  useEffect(() => {
    if (payPeriods.length > 0 && !uploadPeriodId) {
      // Find the incomplete payroll period (Jun 18 - Jul 1, 2025)
      const incompletePeriod = payPeriods.find(p => p.startDate === '2025-06-18');
      if (incompletePeriod) {
        setUploadPeriodId(incompletePeriod.id);
      }
    }
  }, [payPeriods, uploadPeriodId]);

  // Set default selected date to today (only on mount)
  useEffect(() => {
    if (!selectedDate) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, []); // Only run once on mount

  // Update selected date when period changes
  useEffect(() => {
    // Check if 'today' is visible in the current period view
    const todayDay = periodDays.find(d => d.status === 'today');
    
    if (todayDay) {
      setSelectedDate(todayDay.date);
    } else if (periodDays.length > 0) {
      // Default to the last date of the period if today is not in view
      setSelectedDate(periodDays[periodDays.length - 1].date);
    }
  }, [periodDays]);




  const getDayStatusColor = (status: string) => {
    switch (status) {
      case 'past':
        return 'bg-hitec-success text-white'; // Past days - green
      case 'today':
        return 'bg-hitec-highlight text-white'; // Today - orange
      case 'future':
        return 'bg-muted text-muted-foreground'; // Future days - gray
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Reset page when date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);



  const getEntriesByDate = targetDate => {
    if (!data?.records || !targetDate) return [];
    // Since API returns only selected date's records, we only return if target matches
    if (targetDate === selectedDate) {
        return data.records;
    }
    return [];
  };

  // Get filtered + paginated staff data
  const getFilteredRecords = () => {
    const records = data?.records || [];
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r: { staff_details?: { full_name?: string; clock_number?: string | number } }) =>
      r.staff_details?.full_name?.toLowerCase().includes(q) ||
      r.staff_details?.clock_number?.toString().toLowerCase().includes(q)
    );
  };

  const getPaginatedStaff = () => {
    const filtered = getFilteredRecords();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  // Calculate pagination info
  const getTotalPages = () => {
    return Math.ceil(getFilteredRecords().length / itemsPerPage);
  };

  const totalPages = getTotalPages();
  const totalStaff = data?.summary?.total_staff || 0;

  const handleSubmit = () => {
    if (isCsvMode) {
      if (!csvFile) {
        toast({ title: 'Error', description: 'Please select a CSV file', variant: 'destructive' });
        return;
      }
      const formData = new FormData();
      formData.append('file', csvFile);
      
      uploadCsv({
        url: '/atg/attendance/upload-csv/',
        data: formData,
        config: { headers: { 'Content-Type': 'multipart/form-data' } }
      });
    } else {
      if (!selectedStaffId || !formDate || !formHours) {
        toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
        return;
      }
      
      const payload = {
        staff_member: parseInt(selectedStaffId),
        work_date: format(formDate, 'yyyy-MM-dd'),
        total_hours: formHours
      };
      
      submitEntry({
        url: '/atg/attendance/',
        data: payload
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with title and controls - Clients style */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Time & Attendance</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Pay Period: {selectedPeriodData?.dates || 'Jun 18-Jul 1'}, 2025</span>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Hours
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Staff Hours</DialogTitle>
              </DialogHeader>
              
              <div className="flex items-center space-x-2 py-4">
                <Switch 
                  id="mode-switch" 
                  checked={isCsvMode} 
                  onCheckedChange={setIsCsvMode} 
                />
                <Label htmlFor="mode-switch">
                  {isCsvMode ? 'Switch to Single Entry' : 'Switch to CSV Upload'}
                </Label>
              </div>

              <div className="space-y-4">
                {isCsvMode ? (
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="csv-upload">CSV File</Label>
                    <Input 
                      id="csv-upload" 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)} 
                    />
                    <p className="text-sm text-muted-foreground">Upload a CSV file containing attendance records.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                       <Label>Staff Member</Label>
                       <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffList?.map((staff: any) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.full_name} ({staff.clock_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2 flex flex-col">
                       <Label>Date</Label>
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formDate ? format(formDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={formDate}
                            onSelect={setFormDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                       <Label>Total Hours</Label>
                       <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="e.g. 8.5" 
                        value={formHours}
                        onChange={(e) => setFormHours(e.target.value)}
                       />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
                    {(isSubmitting || isUploading) ? 'Processing...' : (isCsvMode ? 'Upload CSV' : 'Submit Entry')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Aligned Row - Day Blocks and Fortnightly Periods */}
      <div className="flex items-center justify-between gap-4">
        {/* Left - 14 Day Blocks */}
        <div className="flex gap-1 overflow-x-auto">
          {periodDays.map((day, index) => (
            <div
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`
                flex-shrink-0 p-2 rounded cursor-pointer transition-all border-2 min-w-[50px] h-[50px] flex flex-col justify-center items-center
                ${selectedDate === day.date ? 'border-primary' : 'border-transparent'}
                ${getDayStatusColor(day.status)}
              `}
            >
              <div className="text-xs font-medium">{day.day}</div>
              {day.status !== 'future' && (
                <div className="flex items-center gap-1">
                  <Users className="h-2 w-2" />
                  <span className="text-xs">{getEntriesByDate(day.date).length}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right - Fortnightly Periods (same height as day blocks) */}
        <div className="flex gap-1">
          {payPeriods.slice(0, 4).map(period => (
            <div
              key={period.id}
              onClick={() => setSelectedPeriod(period.id)}
              className={`
                flex-shrink-0 p-2 rounded cursor-pointer transition-all border-2 min-w-[80px] h-[50px] flex items-center gap-2
                ${selectedPeriod === period.id ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'}
              `}
            >
              <div className={`w-2 h-2 rounded-full ${getStatusColor(period.status)}`}></div>
              <div className="text-xs">
                <div className="font-medium">{period.dates}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Hours Table - Clients style */}
      <div className="space-y-4">
        {/* Floating header with no container - matching Clients page */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Staff Hours</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or clock no..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-7 h-8 text-xs w-52"
              />
            </div>
            <span className="text-xs text-gray-600">
              {selectedDate ? new Date(selectedDate).toLocaleDateString() : new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Table with grey header - matching Clients page exactly */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Staff Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Staff Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Clock Time</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-foreground">Clock No</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-4">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="py-2 px-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="py-2 px-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-2 px-4">
                        <Skeleton className="h-4 w-12" />
                      </td>
                    </tr>
                  ))
                ) : (
                  getPaginatedStaff()?.map((record: any, index: number) => {
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-4">
                          <p className="font-medium text-blue-600 text-xs">{record.staff_details?.full_name}</p>
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="outline" className="text-xs capitalize">
                             {record.staff_details?.employee_type || 'Permanent'}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-xs">
                          {record.total_hours} hrs
                        </td>

                        <td className="py-2 px-4 text-xs">{record.staff_details?.clock_number}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeAttendanceTab;
