import React, { useMemo } from 'react';
import { AppState, TimeRecord, SingleTimeRecord } from '../types';
import { calculateCorrectedAedTime, formatTimeDisplay } from '../services/timeUtils';
import { REQUIRED_TIME_FIELDS, TIME_FIELD_LABELS } from '../constants';
import { DateTimeInput } from './DateTimeInput';

interface Props {
  data: AppState;
  onChange: (category: keyof TimeRecord, subField: string | null, value: string) => void;
}

export const TimeRecording: React.FC<Props> = ({ data, onChange }) => {
  
  const handleTimeChange = (
    category: keyof TimeRecord,
    subField: 'time' | 'source' | null,
    newValue: string
  ) => {
    onChange(category, subField, newValue);
  };

  const handleToggleNA = (category: keyof TimeRecord, currentValue: string) => {
      const isNA = currentValue === 'N/A';
      handleTimeChange(category, 'time', isNA ? '' : 'N/A');
      if (!isNA) handleTimeChange(category, 'source', '');
  };

  // 取得可以選擇的來源
  const getAvailableSources = () => {
    const sources = [{ value: '', label: '請選擇來源' }, { value: 'aed', label: 'AED' }];
    if (data.calibration.emt1.keyTime) sources.push({ value: 'emt1', label: 'EMT1' });
    if (data.calibration.emt2.keyTime) sources.push({ value: 'emt2', label: 'EMT2' });
    if (data.calibration.emt3.keyTime) sources.push({ value: 'emt3', label: 'EMT3' });
    return sources;
  };

  const availableSources = getAvailableSources();

  const correctedTimes = useMemo(() => {
    const times: Record<string, Date | null> = {};
    (Object.keys(data.timeRecords) as Array<keyof TimeRecord>).forEach((key) => {
        times[key] = calculateCorrectedAedTime(key, data.timeRecords[key], data.calibration);
    });
    return times;
  }, [data.timeRecords, data.calibration]);

  const getValidationError = (
    fieldKey: keyof TimeRecord, 
    specificValue: string, 
    source: string | null 
  ): boolean => {
    if (!specificValue || specificValue === 'N/A') return false;

    let currentCorrected: Date | null = null;
    
    if (source === null || source === '' || source === 'aed') {
        currentCorrected = new Date(specificValue);
    } else {
        const offset = data.calibration[source as 'emt1'|'emt2'|'emt3'];
        if (offset && offset.keyTime && offset.aedTime) {
            const diff = new Date(offset.keyTime).getTime() - new Date(offset.aedTime).getTime();
            currentCorrected = new Date(new Date(specificValue).getTime() - diff);
        } else {
            return false;
        }
    }

    if (!currentCorrected || isNaN(currentCorrected.getTime())) return false;

    const t = correctedTimes;
    const isAfter = (predecessorKey: keyof TimeRecord) => {
        const pred = t[predecessorKey];
        if (!pred) return true; 
        return currentCorrected!.getTime() > pred.getTime();
    };

    const isBefore = (successorKey: keyof TimeRecord) => {
        const succ = t[successorKey];
        if (!succ) return true;
        return currentCorrected!.getTime() < succ.getTime();
    };
    
    const isEqual = (targetKey: keyof TimeRecord) => {
        const target = t[targetKey];
        if (!target) return true;
        return Math.abs(currentCorrected!.getTime() - target.getTime()) < 1000;
    };

    switch (fieldKey) {
        case 'contact': return !isAfter('found');
        case 'ohcaJudgment': return !isAfter('contact');
        case 'cprStart': return !isAfter('ohcaJudgment');
        case 'powerOn': return !isAfter('ohcaJudgment');
        case 'padsOn': return !isAfter('powerOn');
        case 'firstVentilation': return !isAfter('ohcaJudgment');
        case 'mcprSetup': return !isAfter('cprStart');
        case 'firstMed': return !isAfter('ohcaJudgment');
        case 'airway': return !isAfter('ohcaJudgment');
        case 'aedOff': 
            if (t.mcprSetup) return !isAfter('mcprSetup');
            return !isAfter('padsOn');
        case 'rosc': return !isEqual('aedOff');
        case 'firstShock': 
            return !(isAfter('padsOn') && isBefore('aedOff'));
        default: return false;
    }
  };

  const renderRow = (
    fieldKey: keyof TimeRecord, 
    isDirectAed: boolean = false,
    allowNA: boolean = false
  ) => {
    const recordData = data.timeRecords[fieldKey];
    const correctedTime = calculateCorrectedAedTime(fieldKey, recordData, data.calibration);
    const isRequired = (REQUIRED_TIME_FIELDS as string[]).includes(fieldKey);
    const label = TIME_FIELD_LABELS[fieldKey] || fieldKey;
    const isNoCalibration = ['powerOn', 'aedOff', 'firstShock'].includes(fieldKey);
    
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-4 transition-colors">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors">
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm transition-colors">
            {label} {isNoCalibration && <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(免校正)</span>} {isRequired && !allowNA && <span className="text-red-500">*</span>}
          </span>
          {!isDirectAed && (
            <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase transition-colors">校正後 AED</span>
                <span className="bg-medical-600 text-white text-xs font-mono py-1 px-2 rounded min-w-[60px] text-center shadow-sm">
                {correctedTime ? formatTimeDisplay(correctedTime.toISOString()) : '--:--:--'}
                </span>
            </div>
          )}
        </div>

        <div className="p-3">
          {isDirectAed ? (
             <DateTimeInput
               value={recordData as string}
               onChange={(val) => handleTimeChange(fieldKey, null, val)}
               className={`w-full text-xs p-1 h-10 border rounded focus:ring-1 focus:ring-medical-500 outline-none text-center transition-colors ${getValidationError(fieldKey, recordData as string, null) ? 'bg-pink-100 dark:bg-pink-900/30 border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400 font-bold focus:ring-red-200' : 'bg-white dark:bg-slate-700 border-medical-200 dark:border-slate-600 text-slate-800 dark:text-slate-100'}`}
               defaultDate={data.basicInfo.date}
             />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-2">
                {((recordData as SingleTimeRecord).time === 'N/A') ? (
                   <div className="w-full text-xs p-1 h-10 border border-slate-200 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold transition-colors">
                       未執行 / 不適用
                   </div>
                ) : (
                   <>
                     <DateTimeInput
                       value={(recordData as SingleTimeRecord).time}
                       onChange={(newVal) => handleTimeChange(fieldKey, 'time', newVal)}
                       className={`flex-1 text-xs p-1 h-10 border rounded focus:ring-1 outline-none text-center transition-colors ${getValidationError(fieldKey, (recordData as SingleTimeRecord).time, (recordData as SingleTimeRecord).source) ? 'bg-pink-100 dark:bg-pink-900/30 border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400 font-bold focus:ring-red-200' : 'bg-white dark:bg-slate-700 border-medical-200 dark:border-slate-600 text-slate-800 dark:text-slate-100'}`}
                       defaultDate={data.basicInfo.date}
                     />
                     <select
                       value={(recordData as SingleTimeRecord).source}
                       onChange={(e) => handleTimeChange(fieldKey, 'source', e.target.value)}
                       className="w-24 text-xs border border-medical-200 dark:border-slate-600 rounded px-1 h-10 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-medical-500 transition-colors"
                     >
                       {availableSources.map(s => (
                         <option key={s.value} value={s.value}>{s.label}</option>
                       ))}
                     </select>
                   </>
                )}
                
                {allowNA && (
                    <button 
                        onClick={() => handleToggleNA(fieldKey, (recordData as SingleTimeRecord).time)}
                        className={`px-2 rounded border text-[10px] font-bold transition-colors w-14 shrink-0
                            ${((recordData as SingleTimeRecord).time === 'N/A')
                                ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' 
                                : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                    >
                        {((recordData as SingleTimeRecord).time === 'N/A') ? '取消' : 'N/a'}
                    </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 animate-fadeIn pb-24">
      <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-100 dark:border-yellow-700/50 text-yellow-800 dark:text-yellow-200 text-xs mb-4 transition-colors">
        <i className="fas fa-exclamation-triangle mr-1"></i>
        標示 * 為必填。輸入時間將自動帶入案件日期。可選擇時間來源(如密錄器或AED)，系統會自動校正。<br/>
        若無校正資料，時間預設為 AED 標準時間。
      </div>
      {renderRow('found')}
      {renderRow('contact')}
      {renderRow('ohcaJudgment')}
      {renderRow('cprStart')}
      {renderRow('powerOn', true)}
      {renderRow('padsOn', true)}
      {renderRow('firstVentilation', false, true)}
      {renderRow('mcprSetup', false, true)}
      {renderRow('firstMed')}
      {renderRow('airway', false, true)}
      {renderRow('aedOff', true)}
      {renderRow('rosc')}
      {renderRow('firstShock', true)}
    </div>
  );
};
