import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const StaffView = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/staff/attendance')) return 'attendance';
    if (path.includes('/staff/loans')) return 'loans';
    if (path.includes('/staff/directory')) return 'directory';
    return 'directory'; // default
  };

  const handleTabChange = (value: string) => {
    navigate(`/staff/${value}`);
  };

  return (
    <div className="space-y-4">
      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full clean-tabs">
        <TabsList>
          <TabsTrigger value="attendance">Time & Attendance</TabsTrigger>
          <TabsTrigger value="loans">Loans & Bonuses</TabsTrigger>
          <TabsTrigger value="directory">Staff Directory</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
};

export default StaffView;


