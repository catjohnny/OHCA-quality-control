import React from 'react';
import { PersonnelCalibration } from '../types';
import { getOffsetMs } from '../services/timeUtils';
import { DateTimeInput } from './DateTimeInput';

interface Props {
  calibration: PersonnelCalibration;
  onChange: (key: keyof PersonnelCalibration, field: 'keyTime' | 'aedTime', value: string) => void;
  defaultDate?: string;
}

export const TimeCalibration: React.FC<Props> = ({ calibration, onChange, defaultDate }) => {
  
  const getStyle = (val: string) => {
    // Note: removed w-full here as DateTimeInput handles width via flex
    return `text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-medical-500 outline-none transition-colors
    ${val ? 'bg-white border-medical-300' : 'bg-slate-50'}`;
  };

  const renderRow = (label: string, emtKey: keyof PersonnelCalibration) => {
    const data = calibration[emtKey];
    const offset = getOffsetMs(data.keyTime, data.aedTime);
    const offsetSeconds = offset / 1000;
    
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
        <h3 className="font-bold text-lg text-medical-800 mb-3 border-b pb-2">{label}</h3>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              關鍵時間點 (密錄器)
            </label>
            <DateTimeInput
              value={data.keyTime}
              onChange={(val) => onChange(emtKey, 'keyTime', val)}
              className={getStyle(data.keyTime)}
              defaultDate={defaultDate}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              AED 顯示時間
            </label>
            <DateTimeInput
              value={data.aedTime}
              onChange={(val) => onChange(emtKey, 'aedTime', val)}
              className={getStyle(data.aedTime)}
              defaultDate={defaultDate}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-between items-center bg-slate-50 p-2 rounded">
          <span className="text-sm text-slate-600">時間差 (Key - AED)</span>
          <span className={`font-mono font-bold ${offsetSeconds === 0 ? 'text-slate-400' : 'text-medical-600'}`}>
             {offsetSeconds > 0 ? '+' : ''}{offsetSeconds} 秒
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 animate-fadeIn">
      <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800 border border-blue-100">
        <i className="fas fa-info-circle mr-2"></i>
        請輸入各人員手錶上的「關鍵時間點」與對應的「AED時間」以進行校正。填寫任一欄位會自動帶入案件日期。
      </div>
      {renderRow('EMT 1 人員', 'emt1')}
      {renderRow('EMT 2 人員', 'emt2')}
      {renderRow('EMT 3 人員', 'emt3')}
    </div>
  );
};