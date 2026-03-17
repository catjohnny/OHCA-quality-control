import React, { useEffect, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { MandarinTraditional } from 'flatpickr/dist/l10n/zh-tw.js';

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

  const getTodayStr = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDateVal(newDate);

    // 1. If Date is cleared, clear the whole entry
    if (!newDate) {
      onChange('');
      return;
    }

    // 2. If Date is entered but Time is empty, default Time to 00:00:00
    // This creates a valid ISO string immediately
    let finalTime = timeVal;
    if (!finalTime) {
      finalTime = '00:00:00';
      setTimeVal(finalTime);
    } else if (finalTime.length === 5) {
       finalTime = `${finalTime}:00`;
    }

    onChange(`${newDate}T${finalTime}`);
  };

  const handleTimeChange = (selectedDates: Date[], dateStr: string) => {
    const newTime = dateStr;
    setTimeVal(newTime);

    // 1. If Time is cleared, clear the whole entry (since partial timestamp is invalid for app)
    if (!newTime) {
      onChange('');
      return;
    }

    // 2. If Time is entered but Date is empty, Auto-fill Date
    let finalDate = dateVal;
    if (!finalDate) {
      finalDate = defaultDate || getTodayStr();
      setDateVal(finalDate);
    }

    onChange(`${finalDate}T${newTime}`);
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
      <Flatpickr
        value={timeVal}
        onChange={handleTimeChange}
        disabled={disabled}
        className={`${inputBaseClass} flex-[3] min-w-0 bg-white`}
        placeholder="--:--:--"
        options={{
          enableTime: true,
          noCalendar: true,
          dateFormat: "H:i:S",
          enableSeconds: true,
          time_24hr: true,
          disableMobile: true,
          locale: MandarinTraditional,
        }}
      />
    </div>
  );
};
