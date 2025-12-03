
import React from 'react';
import { AppState, PersonnelCalibration } from '../types';
import { getOffsetMs } from '../services/timeUtils';

interface Props {
  calibration: PersonnelCalibration;
  onChange: (key: keyof PersonnelCalibration, field: 'keyTime' | 'aedTime', value: string) => void;
}

export const TimeCalibration: React.FC<Props> = ({ calibration, onChange }) => {
  
  const getStyle = (val: string) => {
    return `w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-medical-500 outline-none transition-colors
    ${val ? 'bg-white border-medical-300' : 'bg-slate-50'}`;
  };

  const renderRow = (label: string, emtKey: keyof PersonnelCalibration) => {
    const data = calibration[emtKey];
    const offset = getOffsetMs(data.keyTime, data.aedTime);
    const offsetSeconds = offset / 1000;
    
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
        <h3 className="font-bold text-lg text-medical-800 mb-3 border-b pb-2">{label}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              關鍵時間點 (密錄器)
            </label>
            <input
              type="datetime-local"
              step="1"
              value={data.keyTime}
              onChange={(e) => onChange(emtKey, 'keyTime', e.target.value)}
              className={getStyle(data.keyTime)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              AED 顯示時間
            </label>
            <input
              type="datetime-local"
              step="1"
              value={data.aedTime}
              onChange={(e) => onChange(emtKey, 'aedTime', e.target.value)}
              className={getStyle(data.aedTime)}
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
        請輸入各人員手錶上的「關鍵時間點」與對應的「AED時間」以進行校正。填寫後欄位將變為白色。
      </div>
      {renderRow('EMT 1 人員', 'emt1')}
      {renderRow('EMT 2 人員', 'emt2')}
      {renderRow('EMT 3 人員', 'emt3')}
    </div>
  );
};
