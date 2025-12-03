
import React, { useMemo, useState } from 'react';
import { AppState, TimeRecord, InterruptionItem } from '../types';
import { calculateCorrectedAedTime, formatTimeDisplay } from '../services/timeUtils';
import { REQUIRED_TIME_FIELDS, TIME_FIELD_LABELS } from '../constants';

const GOOGLE_SCRIPT_URL: string = "https://script.google.com/macros/s/AKfycbwb0A9Qu0nH47yxFHFouO7rS09SaBHhOurQT4GUj65hacafPmjkou2UAstpbbnzcukisg/exec"; 

interface Props {
  data: AppState;
  onClose: () => void;
  onSubmit: () => void;
}

export const PreviewModal: React.FC<Props> = ({ data, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Helper for 4-digit MMSS time calc
  const calculateMMSSSeconds = (mmss: string) => {
    if (!mmss || mmss.length !== 4) return 0;
    const mins = parseInt(mmss.substring(0, 2), 10);
    const secs = parseInt(mmss.substring(2, 4), 10);
    if (isNaN(mins) || isNaN(secs)) return 0;
    return (mins * 60) + secs;
  };

  const calculateInterruption = (items: InterruptionItem[]) => {
    return items.reduce((acc, item) => {
      const startSec = calculateMMSSSeconds(item.start);
      const endSec = calculateMMSSSeconds(item.end);
      const diff = endSec > startSec ? endSec - startSec : 0;
      return acc + diff;
    }, 0);
  };

  const times = useMemo(() => {
    const getT = (key: keyof TimeRecord) => 
      calculateCorrectedAedTime(key, data.timeRecords[key], data.calibration);
    
    return {
      ohca: getT('ohcaJudgment'),
      cpr: getT('cprStart'),
      pads: getT('padsOn'),
      vent: getT('firstVentilation'),
      mcpr: getT('mcprSetup'),
      med: getT('firstMed'),
      airway: getT('airway'),
      aedOff: getT('aedOff'),
      aedOn: getT('powerOn'), 
      rosc: getT('rosc'),
    };
  }, [data]);

  const interruptionPads = calculateInterruption(data.interruptionRecords.beforePads);
  const interruptionMcpr = calculateInterruption(data.interruptionRecords.beforeMcpr);

  // 智慧型時間差計算：處理跨日問題
  const getSafeDuration = (start: Date | null, end: Date | null): number | null => {
    if (!start || !end) return null;
    let diff = (end.getTime() - start.getTime()) / 1000;
    
    // 若時間差小於 -12 小時 (-43200秒)，極大機率為跨日案件但未調整日期 (例如 23:59 -> 00:01)
    // 此時自動補正 +24 小時 (+86400秒)
    if (diff < -43200) {
        diff += 86400;
    }
    
    return Math.floor(diff);
  };

  // 檢查是否為 N/A 狀態
  const isMcprNA = data.timeRecords.mcprSetup.emt1 === 'N/A';
  const isVentNA = data.timeRecords.firstVentilation.emt1 === 'N/A';
  const isAirwayNA = data.timeRecords.airway.emt1 === 'N/A';

  // Base metrics
  const cprDelay = getSafeDuration(times.ohca, times.cpr);
  const padsDelay = getSafeDuration(times.ohca, times.pads);
  // 若給氣未執行，時間差計算為 null，後續顯示邏輯會處理文字
  const bvmTime = isVentNA ? null : getSafeDuration(times.ohca, times.vent); 
  const medDelay = getSafeDuration(times.ohca, times.med);
  // 若呼吸道未建立，時間差計算為 null
  const airwayTime = isAirwayNA ? null : getSafeDuration(times.ohca, times.airway);

  // CCF 計算邏輯
  
  // 1. 計算 OHCA -> Pads 的總時間
  const durationOhcaToPads = getSafeDuration(times.ohca, times.pads);
  // Time in Comp (Pre-AED): OHCA->Pads時間 - 貼片前中斷
  const timeInCompPreAed = (durationOhcaToPads !== null) 
    ? durationOhcaToPads - interruptionPads 
    : null;

  // 2. 計算 Pads -> MCPR (或 AED Off) 的總時間
  // 若 MCPR 未執行(N/A)，則計算至 AED 關機
  const durationPadsToMcpr = isMcprNA 
     ? getSafeDuration(times.pads, times.aedOff) 
     : getSafeDuration(times.pads, times.mcpr);

  // Time in Comp (Pre-MCPR): Pads->MCPR(or Off)時間 - MCPR前中斷
  const timeInCompPreMcpr = (durationPadsToMcpr !== null)
    ? durationPadsToMcpr - interruptionMcpr
    : null;

  // 3. 計算總 CCF
  let manualCCF = 'N/A';
  let totalCompTimeStr = '無法計算';

  // 分母：總持續時間 (OHCA -> MCPR 或 OHCA -> AED Off)
  const totalDuration = isMcprNA
    ? getSafeDuration(times.ohca, times.aedOff)
    : getSafeDuration(times.ohca, times.mcpr);

  if (timeInCompPreAed !== null && timeInCompPreMcpr !== null && totalDuration !== null && totalDuration > 0) {
      const totalComp = timeInCompPreAed + timeInCompPreMcpr;
      totalCompTimeStr = `${Math.floor(totalComp)} 秒`;
      manualCCF = ((totalComp / totalDuration) * 100).toFixed(1) + '%';
  } else if (totalDuration !== null && totalDuration <= 0) {
      manualCCF = '時間錯誤'; // 分母非正數
  }

  // Generate payload for Google Sheet
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Formatting helper
    const fmt = (d: Date | null) => d ? formatTimeDisplay(d.toISOString()) : '';
    const rawFmt = (t: string | object) => {
        if (typeof t === 'string') return t;
        const vals = Object.values(t);
        return vals.find(v => v && v !== 'N/A') || ''; // Return first non-empty, non-NA
    };

    const payload = {
        basicInfo: data.basicInfo,
        // Send raw inputs (first non-empty) for reference
        rawTimes: {
            found: rawFmt(data.timeRecords.found),
            contact: rawFmt(data.timeRecords.contact),
            ohca: rawFmt(data.timeRecords.ohcaJudgment),
            cpr: rawFmt(data.timeRecords.cprStart),
            pads: rawFmt(data.timeRecords.padsOn),
            vent: rawFmt(data.timeRecords.firstVentilation),
            mcpr: rawFmt(data.timeRecords.mcprSetup),
            airway: rawFmt(data.timeRecords.airway), // New field
            med: rawFmt(data.timeRecords.firstMed),
            rosc: rawFmt(data.timeRecords.rosc),
        },
        // Send Corrected Times (HH:mm:ss)
        correctedTimes: {
            ohca: fmt(times.ohca),
            cpr: fmt(times.cpr),
            pads: fmt(times.pads),
            vent: fmt(times.vent),
            mcpr: fmt(times.mcpr),
            airway: fmt(times.airway), // New field
            med: fmt(times.med),
            aedOff: fmt(times.aedOff),
        },
        // QC Metrics
        metrics: {
            cprDelay: cprDelay !== null ? cprDelay : '',
            padsDelay: padsDelay !== null ? padsDelay : '',
            bvmTime: bvmTime !== null ? bvmTime : (isVentNA ? '未執行 BVM' : ''),
            airwayTime: airwayTime !== null ? airwayTime : (isAirwayNA ? '未建立輔助呼吸道' : ''), // New metric
            medDelay: medDelay !== null ? medDelay : '',
            ccf: manualCCF,
            preAedComp: timeInCompPreAed,
            preMcprComp: timeInCompPreMcpr,
            isMcprNA: isMcprNA,
            isVentNA: isVentNA,
            isAirwayNA: isAirwayNA
        },
        technical: data.technicalInfo,
        interruptions: {
            pads: interruptionPads,
            mcpr: interruptionMcpr
        }
    };

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for GS script
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        setIsSubmitting(false);
        setIsSuccess(true);
        setTimeout(() => {
            onClose();
            onSubmit(); 
        }, 2000);
    } catch (error) {
        setIsSubmitting(false);
        setErrorMessage('上傳失敗，請檢查網路連線');
    }
  };

  const renderMetricRow = (label: string, value: string | number | null, unit: string = '秒', subText: string = '') => {
      let displayValue = '--';
      let isError = false;
      let textClass = "text-slate-800";

      if (typeof value === 'string') {
          displayValue = value; // Handle "N/A" or error messages
          if (value.includes('未') || value.includes('N/A')) textClass = "text-slate-400 font-normal";
      } else if (value !== null) {
          displayValue = value.toString();
          if (value < 0) {
              isError = true;
              textClass = "text-red-600 font-bold";
          }
      }

      return (
        <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
            <div>
                <span className="text-slate-600 font-medium block">{label}</span>
                {subText && <span className="text-[10px] text-slate-400">{subText}</span>}
            </div>
            <span className={`font-mono text-lg ${textClass}`}>
                {displayValue} <span className="text-xs text-slate-400 font-sans">{typeof value === 'number' ? unit : ''}</span>
            </span>
        </div>
      );
  };

  if (isSuccess) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl p-8 text-center shadow-xl">
                  <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-check text-2xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">上傳成功</h2>
                  <p className="text-slate-500">資料已傳送至 Google Sheet</p>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center z-10">
            <h2 className="text-lg font-bold text-slate-800">
                <i className="fas fa-clipboard-check text-medical-600 mr-2"></i>
                品管成果預覽
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fas fa-times text-xl"></i>
            </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* Time Metrics */}
            <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">時效指標</h3>
                {renderMetricRow('OHCA -> CPR', cprDelay, '秒', '判斷 OHCA 到 開始壓胸')}
                {renderMetricRow('OHCA -> 貼片', padsDelay, '秒', '判斷 OHCA 到 貼上貼片')}
                {renderMetricRow('第一次 BVM 所需時間', bvmTime, '秒', '判斷 OHCA 到 第一次給氣')}
                {renderMetricRow('建立呼吸道時間', airwayTime, '秒', '判斷 OHCA 到 呼吸道建立')}
                {renderMetricRow('OHCA -> 給藥', medDelay, '秒', '判斷 OHCA 到 第一次給藥')}
            </div>

            {/* CCF Metrics */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">徒手 CCF 計算</h3>
                 
                 <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">壓胸時間 (貼片前)</span>
                        <span className="font-mono">{timeInCompPreAed !== null ? Math.floor(timeInCompPreAed) : '--'} 秒</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">壓胸時間 (MCPR/Off 前)</span>
                        <span className="font-mono">
                            {timeInCompPreMcpr !== null ? Math.floor(timeInCompPreMcpr) : (isMcprNA ? 'N/A' : '--')} 秒
                        </span>
                    </div>
                    {isMcprNA && (
                        <div className="text-[10px] text-blue-500 text-right mt-1">
                            * MCPR 未執行，計算至 AED 關機
                        </div>
                    )}
                 </div>

                 <div className="flex justify-between items-end border-t border-slate-200 pt-3">
                    <span className="font-bold text-slate-700">徒手 CCF</span>
                    <span className={`text-3xl font-bold font-mono ${manualCCF === 'N/A' ? 'text-slate-400' : 'text-medical-600'}`}>
                        {manualCCF}
                    </span>
                 </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                    {errorMessage}
                </div>
            )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4">
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex justify-center items-center
                    ${isSubmitting ? 'bg-slate-400 cursor-wait' : 'bg-gradient-to-r from-medical-600 to-medical-500 hover:shadow-medical-200'}`}
            >
                {isSubmitting ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i> 上傳中...</>
                ) : (
                    <><i className="fas fa-cloud-upload-alt mr-2"></i> 確認並上傳 Google Sheet</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
