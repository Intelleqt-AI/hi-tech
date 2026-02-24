import React, { useState } from 'react';
import PayrollTab from '@/components/staff/PayrollTab';
import RunPayrollFlow from '@/components/staff/RunPayrollFlow';

const GeneralPayroll = () => {
  const [showRunPayroll, setShowRunPayroll] = useState(false);

  if (showRunPayroll) {
    return (
      <RunPayrollFlow
        onBack={() => setShowRunPayroll(false)}
        onComplete={() => setShowRunPayroll(false)}
      />
    );
  }

  return <PayrollTab onRunPayroll={() => setShowRunPayroll(true)} />;
};

export default GeneralPayroll;
