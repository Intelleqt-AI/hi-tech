import RunPayrollFlowWeekend from "@/components/RunPayrollFlowWeekend";
import WeekendPayrollTab from "@/components/staff/WeekendPayrollTab";
import { useState } from "react";

export default function WeekendPayroll() {
      const [showRunPayroll, setShowRunPayroll] = useState(false);
      
     if (showRunPayroll) {
    return (
      <RunPayrollFlowWeekend
        onBack={() => setShowRunPayroll(false)}
        onComplete={() => {
          setShowRunPayroll(false);
        //   setActiveTab('payroll');
        }}
      />
    );
  }
      
    return <WeekendPayrollTab onRunPayroll={() => setShowRunPayroll(true)} />;
}