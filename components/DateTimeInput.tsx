import React, { useEffect, useState } from 'react';

interface Props {
  value: string; // ISO string YYYY-MM-DDTHH:mm:ss
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string; // CSS classes for styling
  defaultDate?: string; // YYYY-MM-DD to use when only time is picked
}

export const DateTimeInput: React.FC<Props> = ({ value, onChange, disabled, className, defaultDate }) => {
  const [dateVal, setDateVal] = useState('');
  const [timeVal, setTimeVal] = useState('');

  // Sync internal state with props
  useEffect(() => {
    if (value && value.includes('T')) {
      const [d, t] = value.split('T');
      setDateVal(d || '');
      // Ensure time format HH:mm:ss (take first 8 chars if longer)
      setTimeVal(t ? t.substring(0, 8) : '');
    } else {
      setDateVal('');
      setTimeVal('');
    }
  }, [value]);

  const emitChange = (d: string, t: string) => {
    // If we have a time but no date, try to use defaultDate or today
    let finalDate = d;
    if (!finalDate) {
      if (defaultDate) {
        finalDate = defaultDate;
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        finalDate = `${year}-${month}-${day}`;
      }
      setDateVal(finalDate); // Update UI immediately for better UX
    }

    // If we have a date but no time, default to 00:00:00
    let finalTime = t;
    if (!finalTime) {
      finalTime = '00:00:00';
    } else if (finalTime.length === 5) {
      // If browser returns HH:mm, append seconds
      finalTime = `${finalTime}:00`;
    }

    onChange(`${finalDate}T${finalTime}`);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value;
    setDateVal(d);
    // Only emit if we already have a time, or if we want to default time to 00:00:00
    // To allow user to type date first without jumping state, we can wait for valid time?
    // But requirement is to be snappy.
    // If there is existing value, update it. If empty, wait for time? 
    // Usually easier to update immediately with default time if empty.
    emitChange(d, timeVal);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    setTimeVal(t);
    emitChange(dateVal, t);
  };

  // Extract relevant style classes to apply to children, handling width manually
  const inputBaseClass = className?.replace('w-full', '') || '';

  return (
    <div className={`flex gap-1 w-full ${disabled ? 'opacity-75' : ''}`}>
      <input
        type="date"
        value={dateVal}
        onChange={handleDateChange}
        disabled={disabled}
        className={`${inputBaseClass} flex-[4] min-w-0`} // Date needs a bit more space
      />
      <input
        type="time"
        step="1" // CRITICAL: Enables seconds selection on mobile
        value={timeVal}
        onChange={handleTimeChange}
        disabled={disabled}
        className={`${inputBaseClass} flex-[3] min-w-0`}
      />
    </div>
  );
};