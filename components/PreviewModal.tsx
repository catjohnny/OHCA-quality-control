
import React, { useMemo, useState } from 'react';
import { AppState, TimeRecord, InterruptionItem } from '../types';
import { calculateCorrectedAedTime, formatTimeDisplay } from '../services/timeUtils';

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
  // let totalCompTimeStr = '無法計算'; // Unused

  // 分母：總持續時間 (OHCA -> MCPR 或 OHCA -> AED Off)
  const totalDuration = isMcprNA
    ? getSafeDuration(times.ohca, times.aedOff)
    : getSafeDuration(times.ohca, times.mcpr);

  if (timeInCompPreAed !== null && timeInCompPreMcpr !== null && totalDuration !== null && totalDuration > 0) {
      const totalComp = timeInCompPreAed + timeInCompPreMcpr;
      // totalCompTimeStr = `${Math.floor(totalComp)} 秒`;
      manualCCF = ((totalComp / totalDuration) * 100).toFixed(1) + '%';
  } else if (totalDuration !== null && totalDuration <= 0) {
      manualCCF = '時間錯誤'; // 分母非正數
  }

  // Format Helper for Display (MM:SS)
  const formatDurationDisplay = (val: number | string | null): string => {
      if (val === null) return '--';
      if (typeof val === 'string') return val;
      
      const absVal = Math.abs(val);
      if (absVal < 60) {
          return `${Math.floor(val)}秒`;
      }
      
      const mins = Math.floor(absVal / 60);
      const secs = Math.floor(absVal % 60);
      // Use original sign if needed, though mostly durations are positive
      return `${mins}分${secs}秒`;
  };

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
        rawTimes: {
            found: rawFmt(data.timeRecords.found),
            contact: rawFmt(data.timeRecords.contact),
            ohca: rawFmt(data.timeRecords.ohcaJudgment),
            cpr: rawFmt(data.timeRecords.cprStart),
            pads: rawFmt(data.timeRecords.padsOn),
            vent: rawFmt(data.timeRecords.firstVentilation),
            mcpr: rawFmt(data.timeRecords.mcprSetup),
            airway: rawFmt(data.timeRecords.airway),
            med: rawFmt(data.timeRecords.firstMed),
            rosc: rawFmt(data.timeRecords.rosc),
        },
        correctedTimes: {
            ohca: fmt(times.ohca),
            cpr: fmt(times.cpr),
            pads: fmt(times.pads),
            vent: fmt(times.vent),
            mcpr: fmt(times.mcpr),
            airway: fmt(times.airway),
            med: fmt(times.med),
            aedOff: fmt(times.aedOff),
        },
        metrics: {
            cprDelay: cprDelay !== null ? cprDelay : '',
            padsDelay: padsDelay !== null ? padsDelay : '',
            bvmTime: bvmTime !== null ? bvmTime : (isVentNA ? '未執行 BVM' : ''),
            airwayTime: airwayTime !== null ? airwayTime : (isAirwayNA ? '未建立輔助呼吸道' : ''),
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
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        setIsSubmitting(false);
        setIsSuccess(true);
        // Do not close immediately, wait for user choice
    } catch (error) {
        setIsSubmitting(false);
        setErrorMessage('上傳失敗，請檢查網路連線');
    }
  };

  const handleCopyResult = async () => {
    const members = [
        data.basicInfo.member1, data.basicInfo.member2, data.basicInfo.member3,
        data.basicInfo.member4, data.basicInfo.member5, data.basicInfo.member6
    ].filter(Boolean).join('、');

    const bvmText = isVentNA ? '未執行 BVM' : formatDurationDisplay(bvmTime);
    const airwayText = isAirwayNA ? '未建立輔助呼吸道' : formatDurationDisplay(airwayTime);
    
    // Construct the text template
    const text = `📋 【新北 OHCA 品管成果】

👤 出勤人員：${members}

💓 AED 初始心律：${data.technicalInfo.initialRhythm || '未記錄'}

⏱️ 時間指標：
判斷OHCA ⮕ CPR開始：${formatDurationDisplay(cprDelay)}
判斷OHCA ⮕ 貼片貼上：${formatDurationDisplay(padsDelay)}
第一次BVM所需時間：${bvmText}
建立呼吸道時間：${airwayText}
給藥速率：${formatDurationDisplay(medDelay)}

⚠️ CPR 中斷：
貼片前中斷：${formatDurationDisplay(interruptionPads)}
MCPR前中斷：${formatDurationDisplay(interruptionMcpr)}

📊 CCF 數據：
徒手 CCF：${manualCCF}
整體 CCF：${manualCCF}

🛠️ 處置認列：
AED 貼片位置是否正確：${data.technicalInfo.aedPadCorrect || '--'}
是否檢查頸動脈：${data.technicalInfo.checkPulse || '--'}
壓胸機有無使用：${data.technicalInfo.useCompressor || '--'}
插管嘗試次數：${data.technicalInfo.endoAttempts}
進階呼吸道器材：${data.technicalInfo.airwayDevice || '--'}
ETCO2 有無放置：${data.technicalInfo.etco2Used || '--'}

📝 品管點評：
${data.basicInfo.memo || '無'}`;

    try {
        await navigator.clipboard.writeText(text);
        alert('已複製到剪貼簿！');
    } catch (err) {
        console.error('Copy failed', err);
        alert('複製失敗，請手動選取文字');
    }
  };

  const renderMetricRow = (label: string, value: string | number | null, unit: string = '秒', subText: string = '') => {
      let displayValue = '--';
      let textClass = "text-slate-800";

      // Use the new formatter for numeric values (metrics)
      // Check if it's a numeric metric that needs duration formatting
      const isDurationMetric = (typeof value === 'number');

      if (typeof value === 'string') {
          displayValue = value; 
          if (value.includes('未') || value.includes('N/A')) textClass = "text-slate-400 font-normal";
      } else if (value !== null) {
          // If it's a duration metric, format it. If it's pure count/percentage (like CCF logic above already converts to string), handle accordingly.
          // In this component context, numeric values passed to this function are mostly durations.
          // Note: unit is passed as '秒' but formatting might change it.
          displayValue = formatDurationDisplay(value);
          if (value < 0) {
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
                {displayValue} 
                {/* Only show unit if it wasn't formatted to XX分XX秒 (which contains unit) AND is a number. 
                    However, formatDurationDisplay returns string with units. So we hide this extra unit if formatted. */}
                {typeof value === 'number' && !displayValue.includes('分') && !displayValue.includes('秒') && <span className="text-xs text-slate-400 font-sans">{unit}</span>}
            </span>
        </div>
      );
  };

  if (isSuccess) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-xl p-8 text-center shadow-xl max-w-sm w-full">
                  <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-check text-2xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">上傳成功</h2>
                  <p className="text-slate-500 mb-6">資料已成功傳送至 Google Sheet</p>
                  
                  <div className="space-y-3">
                    <button 
                        onClick={handleCopyResult}
                        className="w-full py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-copy"></i> 複製品管成果文字
                    </button>
                    <button 
                        onClick={() => { onClose(); onSubmit(); }}
                        className="w-full py-3 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                    >
                        關閉視窗
                    </button>
                  </div>
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
                        <span className="font-mono">{formatDurationDisplay(timeInCompPreAed)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">壓胸時間 (MCPR/Off 前)</span>
                        <span className="font-mono">
                            {isMcprNA ? 'N/A' : formatDurationDisplay(timeInCompPreMcpr)}
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

        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3">
            <button 
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
                返回修正
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex justify-center items-center
                    ${isSubmitting ? 'bg-slate-400 cursor-wait' : 'bg-gradient-to-r from-medical-600 to-medical-500 hover:shadow-medical-200'}`}
            >
                {isSubmitting ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i> 上傳中...</>
                ) : (
                    <><i className="fas fa-cloud-upload-alt mr-2"></i> 確認並上傳</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
