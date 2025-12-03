
import React, { useMemo, useRef } from 'react';
import { InterruptionItem, InterruptionRecords } from '../types';
import { INTERRUPTION_REASONS } from '../constants';

interface Props {
  records: InterruptionRecords;
  onChange: (section: keyof InterruptionRecords, index: number, field: keyof InterruptionItem, value: string) => void;
}

export const Interruption: React.FC<Props> = ({ records, onChange }) => {
  // Use refs to manage focus flow
  const startRefs = useRef<(HTMLInputElement | null)[]>([]);
  const endRefs = useRef<(HTMLInputElement | null)[]>([]);
  const reasonRefs = useRef<(HTMLSelectElement | null)[]>([]);

  // Calculate total seconds from 4-digit format (MMSS)
  const calculateSeconds = (mmss: string) => {
    if (!mmss || mmss.length !== 4) return 0;
    const mins = parseInt(mmss.substring(0, 2), 10);
    const secs = parseInt(mmss.substring(2, 4), 10);
    if (isNaN(mins) || isNaN(secs)) return 0;
    return (mins * 60) + secs;
  };

  const calculateTotal = (items: InterruptionItem[]) => {
    return items.reduce((acc, item) => {
      const startSec = calculateSeconds(item.start);
      const endSec = calculateSeconds(item.end);
      if (endSec > startSec) {
        return acc + (endSec - startSec);
      }
      return acc;
    }, 0);
  };

  const totalBeforePads = useMemo(() => calculateTotal(records.beforePads), [records.beforePads]);
  const totalBeforeMcpr = useMemo(() => calculateTotal(records.beforeMcpr), [records.beforeMcpr]);

  const handleTimeInput = (
    sectionKey: keyof InterruptionRecords, 
    index: number, 
    field: 'start' | 'end', 
    value: string,
    globalIndex: number
  ) => {
    // Allow only digits and max 4 chars
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    onChange(sectionKey, index, field, numericValue);

    // Auto focus logic
    if (numericValue.length === 4) {
      if (field === 'start') {
        endRefs.current[globalIndex]?.focus();
      } else if (field === 'end') {
        reasonRefs.current[globalIndex]?.focus();
      }
    }
  };

  const renderSection = (
    title: string, 
    sectionKey: keyof InterruptionRecords, 
    items: InterruptionItem[],
    total: number,
    offsetIndex: number
  ) => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded font-mono font-bold">
          總和: {total} 秒
        </span>
      </div>
      
      <div className="space-y-3">
        {items.map((item, index) => {
          const globalIndex = offsetIndex + index;
          const startSec = calculateSeconds(item.start);
          const endSec = calculateSeconds(item.end);
          const duration = (endSec > startSec) ? endSec - startSec : 0;
          const isFilled = item.start.length === 4 && item.end.length === 4;
          const isReasonMissing = isFilled && !item.reason;

          return (
            <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
              <div className="flex justify-between items-center mb-2">
                 <span className="font-semibold text-slate-500 text-xs">紀錄 {index + 1}</span>
                 {duration > 0 && <span className="text-xs font-mono text-medical-600">{duration}秒</span>}
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                   <label className="text-[10px] text-slate-400 block mb-1">開始 (MMSS)</label>
                   <input
                      ref={(el) => { startRefs.current[globalIndex] = el }}
                      type="tel"
                      placeholder="例如 1106"
                      value={item.start}
                      onChange={(e) => handleTimeInput(sectionKey, index, 'start', e.target.value, globalIndex)}
                      className={`w-full text-xs p-1 border rounded focus:ring-1 focus:ring-medical-500 outline-none transition-colors tracking-widest text-center ${item.start ? 'bg-white border-medical-200' : 'bg-slate-50 border-slate-200'}`}
                   />
                </div>
                <div>
                   <label className="text-[10px] text-slate-400 block mb-1">結束 (MMSS)</label>
                   <input
                      ref={(el) => { endRefs.current[globalIndex] = el }}
                      type="tel"
                      placeholder="例如 1130"
                      value={item.end}
                      onChange={(e) => handleTimeInput(sectionKey, index, 'end', e.target.value, globalIndex)}
                      className={`w-full text-xs p-1 border rounded focus:ring-1 focus:ring-medical-500 outline-none transition-colors tracking-widest text-center ${item.end ? 'bg-white border-medical-200' : 'bg-slate-50 border-slate-200'}`}
                   />
                </div>
              </div>
              
              <div className="relative">
                <select
                    ref={(el) => { reasonRefs.current[globalIndex] = el }}
                    value={item.reason}
                    onChange={(e) => onChange(sectionKey, index, 'reason', e.target.value)}
                    className={`w-full text-xs p-2 border rounded appearance-none ${isReasonMissing ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'bg-slate-50 focus:bg-white'}`}
                >
                    <option value="">選擇中斷原因 {isFilled ? '(必填)' : ''}</option>
                    {INTERRUPTION_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <i className="fas fa-chevron-down text-xs"></i>
                </div>
              </div>
              {isReasonMissing && <p className="text-[10px] text-red-500 mt-1">請選擇原因</p>}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="animate-fadeIn pb-24">
       <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800 text-xs mb-4">
        <i className="fas fa-info-circle mr-1"></i>
        請輸入 4 位數時間 (MMSS)，例如 1106 代表 11分06秒。填寫開始後會自動跳轉。
      </div>
      
      {renderSection('貼上貼片前 (5筆)', 'beforePads', records.beforePads, totalBeforePads, 0)}
      {renderSection('架設 MCPR 前 (10筆)', 'beforeMcpr', records.beforeMcpr, totalBeforeMcpr, 5)}
    </div>
  );
};
