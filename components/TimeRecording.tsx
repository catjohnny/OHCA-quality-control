import React, { useMemo } from 'react';
import { AppState, TimeRecord } from '../types';
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
    subField: string | null,
    newValue: string
  ) => {
    onChange(category, subField, newValue);
  };

  const isEmtEnabled = (emt: string) => {
    if (emt === 'emt1') return true; 
    const cal = data.calibration[emt as 'emt1'|'emt2'|'emt3'];
    return cal && cal.keyTime && cal.keyTime.length > 0;
  };

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
    subField: string | null 
  ): boolean => {
    if (!specificValue) return false;

    let currentCorrected: Date | null = null;
    
    if (subField === null) {
        currentCorrected = new Date(specificValue);
    } else {
        const offset = data.calibration[subField as 'emt1'|'emt2'|'emt3'];
        if (offset && offset.keyTime && offset.aedTime) {
            const diff = new Date(offset.keyTime).getTime() - new Date(offset.aedTime).getTime();
            currentCorrected = new Date(new Date(specificValue).getTime() - diff);
        } else {
            if (subField === 'emt1' && !offset.keyTime) {
                 return false;
            }
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
        case 'aedOff': return !isAfter('mcprSetup');
        case 'rosc': return !isEqual('aedOff');
        case 'firstShock': 
            return !(isAfter('padsOn') && isBefore('aedOff'));
        default: return false;
    }
  };


  const getStyle = (val: string, disabled: boolean, isError: boolean) => {
    if (disabled) {
        return `w-full text-xs p-1 h-10 border rounded outline-none text-center transition-colors bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed`;
    }
    const hasValue = val && val.length > 0;
    
    if (isError) {
        return `w-full text-xs p-1 h-10 border rounded outline-none text-center transition-colors bg-pink-100 border-red-300 text-red-600 font-bold focus:ring-1 focus:ring-red-200`;
    }

    return `w-full text-xs p-1 h-10 border rounded focus:ring-1 focus:ring-medical-500 outline-none text-center transition-colors
      ${hasValue ? 'bg-white border-medical-200' : 'bg-slate-50 border-slate-200'}`;
  };

  const renderRow = (
    fieldKey: keyof TimeRecord, 
    isDirectAed: boolean = false
  ) => {
    const recordData = data.timeRecords[fieldKey];
    const correctedTime = calculateCorrectedAedTime(fieldKey, recordData, data.calibration);
    const isRequired = (REQUIRED_TIME_FIELDS as string[]).includes(fieldKey);
    const label = TIME_FIELD_LABELS[fieldKey] || fieldKey;
    const isNoCalibration = ['powerOn', 'aedOff', 'firstShock'].includes(fieldKey);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
          <span className="font-bold text-slate-800 text-sm">
            {label} {isNoCalibration && <span className="text-xs font-normal text-slate-400">(免校正)</span>} {isRequired && <span className="text-red-500">*</span>}
          </span>
          <div className="flex items-center space-x-2">
             <span className="text-[10px] text-slate-500 uppercase">校正後 AED</span>
             <span className="bg-medical-600 text-white text-xs font-mono py-1 px-2 rounded min-w-[60px] text-center">
               {correctedTime ? formatTimeDisplay(correctedTime.toISOString()) : '--:--:--'}
             </span>
          </div>
        </div>

        <div className="p-3">
          {isDirectAed ? (
             <DateTimeInput
               value={recordData as string}
               onChange={(val) => handleTimeChange(fieldKey, null, val)}
               className={getStyle(
                   recordData as string, 
                   false, 
                   getValidationError(fieldKey, recordData as string, null)
               )}
               defaultDate={data.basicInfo.date}
             />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {(['emt1', 'emt2', 'emt3'] as const).map((emt) => {
                const disabled = !isEmtEnabled(emt);
                const val = (recordData as any)[emt];
                const isError = !disabled && getValidationError(fieldKey, val, emt);
                
                return (
                  <div key={emt} className="flex items-center gap-2">
                     <label className={`w-10 text-[10px] uppercase text-right font-bold ${disabled ? 'text-slate-300' : 'text-slate-500'}`}>
                        {emt.toUpperCase()}
                     </label>
                     <div className="flex-1">
                        <DateTimeInput
                          value={val}
                          onChange={(newVal) => handleTimeChange(fieldKey, emt, newVal)}
                          disabled={disabled}
                          className={getStyle(val, disabled, isError)}
                          defaultDate={data.basicInfo.date}
                        />
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 animate-fadeIn pb-24">
      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-yellow-800 text-xs mb-4">
        <i className="fas fa-exclamation-triangle mr-1"></i>
        標示 * 為必填。輸入時間將自動帶入案件日期。時間順序錯誤將顯示紅字。
      </div>
      {renderRow('found')}
      {renderRow('contact')}
      {renderRow('ohcaJudgment')}
      {renderRow('cprStart')}
      {renderRow('powerOn', true)}
      {renderRow('padsOn')}
      {renderRow('firstVentilation')}
      {renderRow('mcprSetup')}
      {renderRow('firstMed')}
      {renderRow('aedOff', true)}
      {renderRow('rosc')}
      {renderRow('firstShock', true)}
    </div>
  );
};