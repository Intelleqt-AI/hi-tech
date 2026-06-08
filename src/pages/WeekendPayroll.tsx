import RunPayrollFlowWeekend from "@/components/RunPayrollFlowWeekend";
import WeekendPayrollTab from "@/components/staff/WeekendPayrollTab";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

type ApprovedBatch = { id: number; start_date: string; end_date: string; total_net: number; total_employees: number; approved_by?: string | null; approved_at?: string | null; status?: string | null };

export default function WeekendPayroll() {
  const location = useLocation();
  const [showRunPayroll, setShowRunPayroll] = useState(false);
  const [approvedBatch, setApprovedBatch] = useState<ApprovedBatch | null>(null);

  useEffect(() => {
    const batch = (location.state as { approvedBatch?: ApprovedBatch } | null)?.approvedBatch;
    if (batch) {
      setApprovedBatch(batch);
      setShowRunPayroll(true);
    }
  }, [location.state]);

  const handleBack = () => { setShowRunPayroll(false); setApprovedBatch(null); };

  if (showRunPayroll) {
    return (
      <RunPayrollFlowWeekend
        onBack={handleBack}
        onComplete={handleBack}
        approvedBatch={approvedBatch ?? undefined}
      />
    );
  }

  return <WeekendPayrollTab onRunPayroll={() => setShowRunPayroll(true)} />;
}