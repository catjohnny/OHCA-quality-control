import React, { useEffect, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css'; // 引入 flatpickr 的基礎樣式
import { MandarinTraditional } from 'flatpickr/dist/l10n/zh-tw.js'; // 引入繁體中文語系

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

    if (!newDate) {
      onChange('');
      return;
    }

    let finalTime = timeVal;
    if (!finalTime) {
      finalTime = '00:00:00';
      setTimeVal(finalTime);
    } else if (finalTime.length === 5) {
       finalTime = `${finalTime}:00`;
    }

    onChange(`${newDate}T${finalTime}`);
  };

  // 處理 Flatpickr 的時間變更
  const handleTimeChange = (selectedDates: Date[], dateStr: string) => {
    const newTime = dateStr; // Flatpickr 會直接回傳我們設定的 H:i:S 格式字串
    setTimeVal(newTime);

    if (!newTime) {
      onChange('');
      return;
    }

    let finalDate = dateVal;
    if (!finalDate) {
      finalDate = defaultDate || getTodayStr();
      setDateVal(finalDate);
    }

    onChange(`${finalDate}T${newTime}`);
  };

  const inputBaseClass = className?.replace('w-full', '') || '';

  return (
    <div className={`flex gap-1 w-full ${disabled ? 'opacity-75' : ''}`}>
      {/* 日期保持原生：因為手機原生的日曆選擇器通常體驗很好 */}
      <input
        type="date"
        value={dateVal}
        onChange={handleDateChange}
        disabled={disabled}
        className={`${inputBaseClass} flex-[4] min-w-0`} 
      />
      
      {/* 時間改用 Flatpickr：完美解決 iPhone 無法選秒數的問題 */}
      <Flatpickr
        value={timeVal}
        onChange={handleTimeChange}
        disabled={disabled}
        className={`${inputBaseClass} flex-[3] min-w-0 bg-white`}
        placeholder="--:--:--"
        options={{
          enableTime: true,
          noCalendar: true,
          dateFormat: "H:i:S", // 24小時制 + 秒數
          enableSeconds: true, // 啟用秒數選擇
          time_24hr: true,
          disableMobile: true, // 【關鍵設定】：強制 iPhone 停用原生滾輪，改用 Flatpickr 介面
          locale: MandarinTraditional, // 使用繁體中文
        }}
      />
    </div>
  );
};
