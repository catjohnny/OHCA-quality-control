import React, { useMemo, useState } from 'react';
import { AppState, InterruptionItem } from '../types';
import { formatTimeDisplay } from '../services/timeUtils';
import { buildOrderedRecord, getCorrectedTimes, validateRecord } from '../services/recordExport';

const GOOGLE_SCRIPT_URL: string = "https://script.google.com/macros/s/AKfycbzv9kcBgsUSHvZHebd_DjL4Qnt7dFOUTPx1kmF4d2Rufe2BzTE6CuQxjHXpG_ZWRX6YaQ/exec"; 
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

  // --- Calculations for Times (Moved up for validation) ---
  const times = useMemo(() => {
    return getCorrectedTimes(data);
  }, [data]);

  // --- Validation Logic ---
  const { missingFields, logicErrors } = useMemo(() => {
    return validateRecord(data, times);
  }, [data, times]);

  const isValid = missingFields.length === 0 && logicErrors.length === 0;

  // --- Calculations (Rest of them) ---

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
  // 1. 計算 OHCA -> Pads 的總時間 (保留給 Google Sheet 原始欄位計算)
  const durationOhcaToPads = getSafeDuration(times.ohca, times.pads);
  const timeInCompPreAed = (durationOhcaToPads !== null) 
    ? durationOhcaToPads - interruptionPads 
    : null;

  // 2. 計算 Pads -> MCPR (或 AED Off) 的總時間 (保留給 Google Sheet 原始欄位計算)
  const durationPadsToMcpr = isMcprNA 
     ? getSafeDuration(times.pads, times.aedOff) 
     : getSafeDuration(times.pads, times.mcpr);

  const timeInCompPreMcpr = (durationPadsToMcpr !== null)
    ? durationPadsToMcpr - interruptionMcpr
    : null;

  // 3. 計算整體 CCF (依據新公式修正)
  let overallCCF = 'N/A';

  // 分母：總持續時間 (AED Off - OHCA)，無論有無 MCPR，皆以 AED 關機為終點
  const totalDurationForCCF = getSafeDuration(times.ohca, times.aedOff);

  if (totalDurationForCCF !== null && totalDurationForCCF > 0) {
      let totalCompSeconds = 0;

      if (isMcprNA) {
          // 無 MCPR：分子 = (AED Off - OHCA) - interruptionPads
          totalCompSeconds = totalDurationForCCF - interruptionPads;
      } else {
          // 有 MCPR：分子 = (AED Off - OHCA) - interruptionPads - interruptionMcpr
          totalCompSeconds = totalDurationForCCF - interruptionPads - interruptionMcpr;
      }

      overallCCF = ((totalCompSeconds / totalDurationForCCF) * 100).toFixed(1) + '%';
  } else if (totalDurationForCCF !== null && totalDurationForCCF <= 0) {
      overallCCF = '時間錯誤'; // 分母非正數
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
        const formatDateTime = (d: Date | null) => {
            if (!d || isNaN(d.getTime())) return '';
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };
        const fmt = (d: Date | null) => formatDateTime(d);
        const rawFmt = (t: string | object) => {
            let val = '';
            if (typeof t === 'string') val = t;
            else {
                const vals = Object.values(t);
                val = vals.find(v => v && v !== 'N/A') as string || '';
            }
            if (!val) return '';
            const d = new Date(val);
            return isNaN(d.getTime()) ? val : formatDateTime(d);
        };

        // Prepare detailed interruptions list (Reason 1, Duration 1, Reason 2, Duration 2...)
        const flatInterruptions = [
            ...data.interruptionRecords.beforePads,
            ...data.interruptionRecords.beforeMcpr
        ];

        const detailedInterruptions: Record<string, string> = {};
        flatInterruptions.forEach((item, index) => {
            const num = index + 1; // 1-based index (1 to 15)
            const start = calculateMMSSSeconds(item.start);
            const end = calculateMMSSSeconds(item.end);
            const duration = (end > start) ? end - start : 0;
            
            detailedInterruptions[`reason${num}`] = item.reason || '';
            detailedInterruptions[`duration${num}`] = duration > 0 ? duration.toString() : '';
        });

        // Construct payload to match the structure expected by your Google Apps Script
        const payload = {
            basicInfo: {
                ...data.basicInfo,
                battalion: data.basicInfo.battalion || ''
            },
            rawTimes: {
                found: rawFmt(data.timeRecords.found),
                contact: rawFmt(data.timeRecords.contact),
                ohca: rawFmt(data.timeRecords.ohcaJudgment),
                cpr: rawFmt(data.timeRecords.cprStart),
                pads: rawFmt(data.timeRecords.padsOn),
                vent: rawFmt(data.timeRecords.firstVentilation),
                airway: rawFmt(data.timeRecords.airway),
                mcpr: rawFmt(data.timeRecords.mcprSetup),
                med: rawFmt(data.timeRecords.firstMed),
                rosc: rawFmt(data.timeRecords.rosc),
            },
            correctedTimes: {
                ohca: fmt(times.ohca),
                cpr: fmt(times.cpr),
                pads: fmt(times.pads),
                vent: fmt(times.vent),
                airway: fmt(times.airway),
                mcpr: fmt(times.mcpr),
                med: fmt(times.med),
                aedOff: fmt(times.aedOff),
                rosc: fmt(times.rosc),
            },
            metrics: {
                cprDelay: cprDelay !== null ? cprDelay : '',
                padsDelay: padsDelay !== null ? padsDelay : '',
                bvmTime: bvmTime !== null ? bvmTime : (isVentNA ? '未執行 BVM' : ''),
                airwayTime: airwayTime !== null ? airwayTime : (isAirwayNA ? '未建立輔助呼吸道' : ''),
                medDelay: medDelay !== null ? medDelay : '',
                ccf: overallCCF,
                preAedComp: timeInCompPreAed !== null ? timeInCompPreAed : '',
                preMcprComp: timeInCompPreMcpr !== null ? timeInCompPreMcpr : '',
            },
            interruptions: {
                pads: interruptionPads,
                mcpr: interruptionMcpr
            },
            technical: {
                ...data.technicalInfo
            },
            feedbackPatch: {
                ...data.feedbackPatchInfo
            },
            orderedRecord: buildOrderedRecord(data),
            detailedInterruptions
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

單位：${data.basicInfo.battalion} ${data.basicInfo.unit}
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
整體 CCF：${overallCCF}

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
    <div className="bg-medical-50 px-3 py-2 rounded-lg font-bold text-medical-600 text-sm flex items-center mt-6 mb-2 first:mt-0 border border-medical-100">
      <i className={`fas ${icon} mr-2 w-5 text-center text-accent-600`}></i>
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
                  <div className="w-16 h-16 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-accent-200">
                      <i className="fas fa-check text-2xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-medical-600 mb-2">上傳成功</h2>
                  <p className="text-slate-500 mb-6">資料已成功傳送至 Google Sheet</p>
                  
                  <div className="space-y-3">
                    <button 
                        onClick={handleCopyResult}
                        className="w-full py-3 bg-medical-600 text-white rounded-lg font-bold hover:bg-medical-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-copy"></i> 複製品管成果文字
                    </button>
                    <a 
                        href={GOOGLE_SHEET_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-accent-500 text-medical-900 rounded-lg font-bold hover:bg-accent-600 transition-colors shadow-lg flex items-center justify-center gap-2"
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
      */}
      <div className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header: Fixed at top (static flex item) */}
        <div className="bg-white border-b border-slate-100 p-4 flex justify-between items-center shrink-0 z-10">
            <h2 className="text-lg font-bold text-medical-600 flex items-center">
                <i className="fas fa-clipboard-check text-accent-600 mr-2"></i>
                品管成果預覽
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 -mr-2">
                <i className="fas fa-times text-xl"></i>
            </button>
        </div>

        {/* Body: Scrollable area */}
        <div className="p-6 space-y-2 overflow-y-auto flex-1 scroll-smooth">
            
            {/* Missing Fields or Logic Errors Warning */}
            {!isValid && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center text-red-800 font-bold mb-2">
                        <i className="fas fa-exclamation-triangle mr-2"></i>
                        請修正以下錯誤以繼續
                    </div>
                    {missingFields.length > 0 && (
                        <div className="mb-2">
                            <p className="text-xs font-bold text-red-700 mb-1">未填寫項目：</p>
                            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                                {missingFields.map((field, idx) => (
                                    <li key={`missing-${idx}`}>{field}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {logicErrors.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-red-700 mb-1">時間邏輯錯誤：</p>
                            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                                {logicErrors.map((err, idx) => (
                                    <li key={`logic-${idx}`}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Basic Info Preview */}
            {renderSectionHeader('基本資料', 'fa-info-circle')}
            <div className="bg-white rounded-lg border border-medical-100 px-4 py-1">
                {renderSimpleRow('案件編號', data.basicInfo.caseId)}
                {renderSimpleRow('日期', data.basicInfo.date)}
                {renderSimpleRow('大隊別', data.basicInfo.battalion)}
                {renderSimpleRow('分隊', data.basicInfo.unit)}
                {renderSimpleRow('審核者', data.basicInfo.reviewer)}
            </div>

            {/* Time Metrics */}
            {renderSectionHeader('時間指標', 'fa-stopwatch')}
            <div className="bg-white rounded-lg border border-medical-100 px-4 py-1">
                {renderSimpleRow('判斷OHCA ⮕ CPR開始', formatDurationDisplay(cprDelay))}
                {renderSimpleRow('判斷OHCA ⮕ 貼片貼上', formatDurationDisplay(padsDelay))}
                {renderSimpleRow('第一次BVM所需時間', bvmText)}
                {renderSimpleRow('建立呼吸道時間', airwayText)}
                {renderSimpleRow('給藥速率', formatDurationDisplay(medDelay))}
            </div>

            {/* Interruptions */}
            {renderSectionHeader('CPR 中斷', 'fa-pause-circle')}
            <div className="bg-white rounded-lg border border-medical-100 px-4 py-1">
                {renderSimpleRow('貼片前中斷', formatDurationDisplay(interruptionPads))}
                {renderSimpleRow('MCPR前中斷', formatDurationDisplay(interruptionMcpr))}
            </div>

            {/* CCF */}
            {renderSectionHeader('CCF 數據', 'fa-chart-pie')}
            <div className="bg-white rounded-lg border border-medical-100 px-4 py-1">
                {renderSimpleRow('整體 CCF', overallCCF)}
            </div>

            {/* Technical */}
            {renderSectionHeader('處置認列', 'fa-stethoscope')}
            <div className="bg-white rounded-lg border border-medical-100 px-4 py-1">
                {renderSimpleRow('AED 貼片位置是否正確', data.technicalInfo.aedPadCorrect || '--')}
                {renderSimpleRow('是否檢查頸動脈', data.technicalInfo.checkPulse || '--')}
                {renderSimpleRow('壓胸機有無使用', data.technicalInfo.useCompressor || '--')}
                {renderSimpleRow('AED 初始心律', data.technicalInfo.initialRhythm || '--')}
                {renderSimpleRow('首次電擊後心律', data.technicalInfo.postShockRhythm || '--')}
                {renderSimpleRow('插管嘗試次數', data.technicalInfo.endoAttempts.toString())}
                {renderSimpleRow('進階呼吸道器材', data.technicalInfo.airwayDevice || '--')}
                {renderSimpleRow('建立呼吸道中斷(秒)', data.technicalInfo.airwayInterruptionSeconds || '--')}
                {renderSimpleRow('ETCO2 有無放置', data.technicalInfo.etco2Used || '--')}
                {renderSimpleRow('ETCO2 數值 (mmHg)', data.technicalInfo.etco2Value || '--')}
                {renderSimpleRow('到院前啟動ECMO', data.technicalInfo.prehospitalEcmo || '--')}
            </div>

            {renderSectionHeader('回饋貼片', 'fa-wave-square')}
            <div className="bg-white rounded-lg border border-medical-100 px-4 py-1">
                {renderSimpleRow('架設MCPR前平均徒手按壓深度(cm)', data.feedbackPatchInfo.manualDepthBeforeMcpr || '--')}
                {renderSimpleRow('架設MCPR前平均徒手按壓速率(cpm)', data.feedbackPatchInfo.manualRateBeforeMcpr || '--')}
                {renderSimpleRow('架設MCPR前平均徒手釋放速度(mm/s)', data.feedbackPatchInfo.manualReleaseVelocityBeforeMcpr || '--')}
                {renderSimpleRow('目標中 - 徒手深度(%)', data.feedbackPatchInfo.targetManualDepthPercent || '--')}
                {renderSimpleRow('目標中 - 徒手速率(%)', data.feedbackPatchInfo.targetManualRatePercent || '--')}
                {renderSimpleRow('目標中 - 徒手按壓(%)', data.feedbackPatchInfo.targetManualCompressionPercent || '--')}
                {renderSimpleRow('去顫前停滯時間(未電擊=N/A)', data.feedbackPatchInfo.preShockPauseTime || '--')}
                {renderSimpleRow('去顫後停滯時間(未電擊=N/A)', data.feedbackPatchInfo.postShockPauseTime || '--')}
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
                className={`flex-[2] py-3 rounded-xl font-bold shadow-lg transition-all transform flex justify-center items-center
                    ${(isSubmitting || !isValid)
                        ? 'bg-slate-400 text-white cursor-not-allowed shadow-none transform-none' 
                        : 'bg-accent-500 text-medical-900 hover:bg-accent-600 hover:shadow-accent-500/20 active:scale-95'}`}
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
