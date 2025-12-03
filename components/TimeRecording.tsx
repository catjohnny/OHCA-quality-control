
import React, { useMemo } from 'react';
import { AppState, TimeRecord } from '../types';
import { calculateCorrectedAedTime, formatTimeDisplay } from '../services/timeUtils';
import { REQUIRED_TIME_FIELDS, TIME_FIELD_LABELS } from '../constants';

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

  // Helper to check if calibration exists for an EMT
  const isEmtEnabled = (emt: string) => {
    if (emt === 'emt1') return true; 
    const cal = data.calibration[emt as 'emt1'|'emt2'|'emt3'];
    return cal && cal.keyTime && cal.keyTime.length > 0;
  };

  // 1. Calculate all corrected times first for referencing in validation
  // We need to calculate for every potential EMT/Direct field to get a "representative" time
  // For validation purposes, we can try to get the 'best' time available for a key 
  // (using the same logic as calculateCorrectedAedTime which prioritizes EMT1 > 2 > 3)
  const correctedTimes = useMemo(() => {
    const times: Record<string, Date | null> = {};
    (Object.keys(data.timeRecords) as Array<keyof TimeRecord>).forEach((key) => {
        times[key] = calculateCorrectedAedTime(key, data.timeRecords[key], data.calibration);
    });
    return times;
  }, [data.timeRecords, data.calibration]);

  // Validation function
  const getValidationError = (
    fieldKey: keyof TimeRecord, 
    specificValue: string, // The raw input value
    subField: string | null // 'emt1', 'emt2', etc, or null for direct
  ): boolean => {
    if (!specificValue) return false;

    // Calculate the corrected time for *this specific input*
    let currentCorrected: Date | null = null;
    
    if (subField === null) {
        currentCorrected = new Date(specificValue);
    } else {
        const offset = data.calibration[subField as 'emt1'|'emt2'|'emt3'];
        if (offset && offset.keyTime && offset.aedTime) {
            const diff = new Date(offset.keyTime).getTime() - new Date(offset.aedTime).getTime();
            currentCorrected = new Date(new Date(specificValue).getTime() - diff);
        } else {
            // Fallback if no calibration (should likely act as if valid or ignore)
            // But EMT2/3 are disabled without cal, so usually this path is taken by EMT1 default
            if (subField === 'emt1' && !offset.keyTime) {
                 // Assume offset 0 if EMT1 has no cal? Or strict? 
                 // Assuming offset 0 for EMT1 base if not calibrated is risky, 
                 // but let's assume valid logic relies on calibration.
                 // If no cal, we can't strictly validate, so return false (no error).
                 return false;
            }
             return false;
        }
    }

    if (!currentCorrected || isNaN(currentCorrected.getTime())) return false;

    const t = correctedTimes;
    // Helper for comparisons
    const isAfter = (predecessorKey: keyof TimeRecord) => {
        const pred = t[predecessorKey];
        if (!pred) return true; // Cannot validate if predecessor missing
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

    // Rules
    switch (fieldKey) {
        case 'contact': return !isAfter('found'); // 2. Contact > Found
        case 'ohcaJudgment': return !isAfter('contact'); // 3. Judgment > Contact
        case 'cprStart': return !isAfter('ohcaJudgment'); // 4. CPR > Judgment
        case 'powerOn': return !isAfter('ohcaJudgment'); // 5. PowerOn > Judgment
        case 'padsOn': return !isAfter('powerOn'); // 6. Pads > PowerOn
        case 'firstVentilation': return !isAfter('ohcaJudgment'); // 7. Vent > Judgment
        case 'mcprSetup': return !isAfter('cprStart'); // 8. MCPR > CPR
        case 'firstMed': return !isAfter('ohcaJudgment'); // 9. Med > Judgment
        case 'aedOff': return !isAfter('mcprSetup'); // 10. AED Off > MCPR
        case 'rosc': return !isEqual('aedOff'); // 11. ROSC == AED Off
        case 'firstShock': 
            // 12. Pads < Shock < AED Off
            // Note: padsOn is mult-field. 't.padsOn' gets the priority one.
            // Strict check: current > t.padsOn AND current < t.aedOff
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
             <input
               type="datetime-local"
               step="1"
               value={recordData as string}
               onChange={(e) => handleTimeChange(fieldKey, null, e.target.value)}
               className={getStyle(
                   recordData as string, 
                   false, 
                   getValidationError(fieldKey, recordData as string, null)
               )}
             />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(['emt1', 'emt2', 'emt3'] as const).map((emt) => {
                const disabled = !isEmtEnabled(emt);
                const val = (recordData as any)[emt];
                const isError = !disabled && getValidationError(fieldKey, val, emt);
                
                return (
                  <div key={emt}>
                     <label className={`block text-[10px] uppercase text-center mb-1 ${disabled ? 'text-slate-300' : 'text-slate-400'}`}>
                        {emt.toUpperCase()}
                     </label>
                     <input
                      type="datetime-local"
                      step="1"
                      value={val}
                      onChange={(e) => handleTimeChange(fieldKey, emt, e.target.value)}
                      disabled={disabled}
                      className={getStyle(val, disabled, isError)}
                    />
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
        標示 * 為必填。時間順序錯誤將顯示紅字。
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
