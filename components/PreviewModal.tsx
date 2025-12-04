import React, { useMemo, useState } from 'react';
import { AppState, TimeRecord, InterruptionItem } from '../types';
import { calculateCorrectedAedTime, formatTimeDisplay } from '../services/timeUtils';

const GOOGLE_SCRIPT_URL: string = "https://script.google.com/macros/s/AKfycbzWOoHHess2wCn32DOSR_2EchBjVFKkWtd0XrnO-M_jNmzgvRJVWG0PWLO_GshdWCGiGA/exec"; 
const GOOGLE_SHEET_URL: string = "https://docs.google.com/spreadsheets/d/1DxjxcX5eklxkuXsQwRphw1z_eT8AOgD9OJavBCpjfcM/edit?gid=0#gid=0";

interface Props {
  data: AppState;
  onClose: () => void;
  onSubmit: () => void;
}

export const PreviewModal: React.FC<Props> = ({ data, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // --- Validation Logic ---
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    const { basicInfo, technicalInfo, timeRecords } = data;

    // 1. Basic Info Validation
    if (!basicInfo.reviewer) missing.push("基本資料: 審核者姓名");
    if (!basicInfo.battalion) missing.push("基本資料: 大隊別");
    if (!basicInfo.unit) missing.push("基本資料: 分隊");
    if (!basicInfo.caseId) missing.push("基本資料: 案件編號");
    if (!basicInfo.date) missing.push("基本資料: 案件發生日期");
    if (!basicInfo.ohcaType) missing.push("基本資料: OHCA 類型");
    if (!basicInfo.notificationTime) missing.push("基本資料: 發現/通報時機");
    if (!basicInfo.member1) missing.push("基本資料: 人員 1");
    if (!basicInfo.member2) missing.push("基本資料: 人員 2");

    // 2. Technical Info Validation
    if (!technicalInfo.aedPadCorrect) missing.push("處置認列: AED 貼片位置");
    if (!technicalInfo.checkPulse) missing.push("處置認列: 檢查頸動脈");
    if (!technicalInfo.useCompressor) missing.push("處置認列: 壓胸機有無使用");
    if (!technicalInfo.initialRhythm) missing.push("處置認列: AED 初始心律");
    // endoAttempts is number (0-5), default is 0 so it's always present
    
    // 3. Time Records Validation
    const checkTime = (key: keyof TimeRecord, label: string) => {
        const val = timeRecords[key];
        if (typeof val === 'string') {
            if (!val) missing.push(`時間紀錄: ${label}`);
        } else {
            // For EMT objects, check if at least one EMT has a value
            if (!val.emt1 && !val.emt2 && !val.emt3) missing.push(`時間紀錄: ${label}`);
        }
    };

    const checkConditionalTime = (key: keyof TimeRecord, label: string) => {
        const val = timeRecords[key] as any;
        // Check if N/A is selected OR if any value is present
        const isNA = val.emt1 === 'N/A' || val.emt2 === 'N/A' || val.emt3 === 'N/A';
        const hasValue = val.emt1 || val.emt2 || val.emt3;
        
        if (!isNA && !hasValue) {
            missing.push(`時間紀錄: ${label}`);
        }
    };

    // Required fields
    checkTime('found', '發現患者');
    checkTime('contact', '接觸患者');
    checkTime('ohcaJudgment', '判斷 OHCA');
    checkTime('cprStart', 'CPR 開始');
    checkTime('powerOn', 'Power ON');
    checkTime('padsOn', '貼上貼片');
    checkTime('firstMed', '第一次給藥');
    checkTime('aedOff', 'AED 關機');

    // Conditional fields (Can be N/A)
    checkConditionalTime('firstVentilation', '第一次給氣');
    checkConditionalTime('mcprSetup', 'MCPR 架設');
    checkConditionalTime('airway', '呼吸道建立時間');

    return missing;
  }, [data]);

  const isValid = missingFields.length === 0;

  // --- Calculations ---

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

  // Pre-calculate display strings for consistency
  const bvmText = isVentNA ? '未執行 BVM' : formatDurationDisplay(bvmTime);
  const airwayText = isAirwayNA ? '未建立輔助呼吸道' : formatDurationDisplay(airwayTime);

  // Generate payload for Google Sheet
  const handleSubmit = async () => {
    if (!isValid) return;

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
        // Debug: Ensure payload is correct (battalion should be in basicInfo)
        console.log("Submitting payload to Google Sheet:", payload);

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

  const renderSectionHeader = (title: string, icon: string) => (
    <div className="bg-slate-100 px-3 py-2 rounded-lg font-bold text-slate-700 text-sm flex items-center mt-6 mb-2 first:mt-0">
      <i className={`fas ${icon} mr-2 w-5 text-center text-medical-600`}></i>
      {title}
    </div>
  );

  const renderSimpleRow = (label: string, value: string) => (
    <div className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0 text-sm">
        <span className="text-slate-600 font-medium shrink-0 mr-4">{label}</span>
        <span className="text-slate-800 text-right font-mono break-words max-w-[60%]">{value}</span>
    </div>
  );

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
                    <a 
                        href={GOOGLE_SHEET_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-table"></i> 前往資料庫
                    </a>
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
      {/* 
         Revised Modal Container: Flex Column with independent scrolling body.
         max-h-[90vh] ensures it doesn't overflow screen.
         flex-col + overflow-hidden on parent contains the layout.
      */}
      <div className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header: Fixed at top (static flex item) */}
        <div className="bg-white border-b border-slate-100 p-4 flex justify-between items-center shrink-0 z-10">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <i className="fas fa-clipboard-check text-medical-600 mr-2"></i>
                品管成果預覽
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 -mr-2">
                <i className="fas fa-times text-xl"></i>
            </button>
        </div>

        {/* Body: Scrollable area */}
        <div className="p-6 space-y-2 overflow-y-auto flex-1 scroll-smooth">
            
            {/* Missing Fields Warning */}
            {!isValid && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center text-red-800 font-bold mb-2">
                        <i className="fas fa-exclamation-circle mr-2"></i>
                        尚有必填欄位未完成
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                        {missingFields.map((field, idx) => (
                            <li key={idx}>{field}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Time Metrics */}
            {renderSectionHeader('時間指標', 'fa-stopwatch')}
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-1">
                {renderSimpleRow('判斷OHCA ⮕ CPR開始', formatDurationDisplay(cprDelay))}
                {renderSimpleRow('判斷OHCA ⮕ 貼片貼上', formatDurationDisplay(padsDelay))}
                {renderSimpleRow('第一次BVM所需時間', bvmText)}
                {renderSimpleRow('建立呼吸道時間', airwayText)}
                {renderSimpleRow('給藥速率', formatDurationDisplay(medDelay))}
            </div>

            {/* Interruptions */}
            {renderSectionHeader('CPR 中斷', 'fa-pause-circle')}
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-1">
                {renderSimpleRow('貼片前中斷', formatDurationDisplay(interruptionPads))}
                {renderSimpleRow('MCPR前中斷', formatDurationDisplay(interruptionMcpr))}
            </div>

            {/* CCF */}
            {renderSectionHeader('CCF 數據', 'fa-chart-pie')}
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-1">
                {renderSimpleRow('徒手 CCF', manualCCF)}
                {renderSimpleRow('整體 CCF', manualCCF)}
            </div>

            {/* Technical */}
            {renderSectionHeader('處置認列', 'fa-stethoscope')}
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-1">
                {renderSimpleRow('AED 貼片位置是否正確', data.technicalInfo.aedPadCorrect || '--')}
                {renderSimpleRow('是否檢查頸動脈', data.technicalInfo.checkPulse || '--')}
                {renderSimpleRow('壓胸機有無使用', data.technicalInfo.useCompressor || '--')}
                {renderSimpleRow('插管嘗試次數', data.technicalInfo.endoAttempts.toString())}
                {renderSimpleRow('進階呼吸道器材', data.technicalInfo.airwayDevice || '--')}
                {renderSimpleRow('ETCO2 有無放置', data.technicalInfo.etco2Used || '--')}
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mt-4">
                    {errorMessage}
                </div>
            )}
        </div>

        {/* Footer: Fixed at bottom (static flex item) */}
        <div className="bg-white border-t border-slate-100 p-4 flex gap-3 shrink-0 z-10">
            <button 
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
                返回修正
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !isValid}
                className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg transition-all transform flex justify-center items-center
                    ${(isSubmitting || !isValid)
                        ? 'bg-slate-300 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-medical-600 to-medical-500 hover:shadow-medical-200 active:scale-95'}`}
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
