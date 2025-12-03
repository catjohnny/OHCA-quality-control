
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
  const bvmTime = isVentNA ? null : getSafeDuration(times.ohca, times.vent); 
  const medDelay = getSafeDuration(times.ohca, times.med);
  const airwayTime = isAirwayNA ? null : getSafeDuration(times.ohca, times.airway);

  // New Metrics Calculations
  // 1. 計算 OHCA -> Pads 的總時間
  const durationOhcaToPads = getSafeDuration(times.ohca, times.pads);
  const timeInCompPreAed = (durationOhcaToPads !== null) 
    ? durationOhcaToPads - interruptionPads 
    : null;

  // 2. 計算 Pads -> MCPR (或 AED Off 如果 MCPR 未執行) 的總時間
  const durationPadsToMcpr = isMcprNA 
     ? getSafeDuration(times.pads, times.aedOff) 
     : getSafeDuration(times.pads, times.mcpr);

  const timeInCompPreMcpr = (durationPadsToMcpr !== null)
    ? durationPadsToMcpr - interruptionMcpr
    : null;

  // 3. 計算 MCPR -> AED Off 的總時間 (若 MCPR N/A 則為 null)
  const timeInCompPostMcpr = isMcprNA
     ? null 
     : getSafeDuration(times.mcpr, times.aedOff);

  // 計算徒手 CCF
  let manualCCF = 'N/A';
  // 分母邏輯：正常為 OHCA->MCPR。若 MCPR 未執行，則為 OHCA -> AED Off
  const totalDurationManual = isMcprNA
     ? getSafeDuration(times.ohca, times.aedOff)
     : getSafeDuration(times.ohca, times.mcpr);

  // 分子：PreAED + PreMCPR
  if (timeInCompPreAed !== null && timeInCompPreMcpr !== null && totalDurationManual !== null) {
    const totalComp = timeInCompPreAed + timeInCompPreMcpr; 
    if (totalDurationManual > 0) {
        manualCCF = ((totalComp / totalDurationManual) * 100).toFixed(1) + '%';
    }
  }

  // 計算整體 CCF
  let overallCCF = 'N/A';
  const totalDurationOverall = getSafeDuration(times.pads, times.aedOff);

  if (totalDurationOverall !== null && timeInCompPreMcpr !== null) {
      let totalComp = timeInCompPreMcpr;
      if (timeInCompPostMcpr !== null) {
          totalComp += timeInCompPostMcpr;
      }
      
      if (totalDurationOverall > 0) {
        overallCCF = ((totalComp / totalDurationOverall) * 100).toFixed(1) + '%';
      }
  }

  const formatDiff = (seconds: number | null, isNA: boolean = false, naText: string = 'N/A') => {
    if (isNA) return naText;
    if (seconds === null) return 'N/A';
    const absS = Math.abs(seconds);
    const m = Math.floor(absS / 60);
    const s = absS % 60;
    const sign = seconds < 0 ? '-' : '';
    if (m === 0) return `${sign}${s}秒`;
    return `${sign}${m}分${s}秒`;
  };

  // Validations
  const roscMismatch = (times.rosc && times.aedOff) 
    ? Math.abs(times.rosc.getTime() - times.aedOff.getTime()) > 1000
    : false;
  
  const hasNegativeValues = [cprDelay, padsDelay, bvmTime, medDelay, airwayTime, timeInCompPreAed, timeInCompPreMcpr, timeInCompPostMcpr]
    .some(v => v !== null && v < 0);

  const missingFields = REQUIRED_TIME_FIELDS.filter(k => {
      const key = k as keyof TimeRecord;
      if (key === 'mcprSetup' && isMcprNA) return false;
      if (key === 'firstVentilation' && isVentNA) return false;
      if (key === 'airway' && isAirwayNA) return false;

      const raw = data.timeRecords[key];
      return !calculateCorrectedAedTime(key, raw, data.calibration);
  });

  const missingFieldNames = missingFields.map(k => TIME_FIELD_LABELS[k] || k).join('、');
  const canSubmit = !roscMismatch && !hasNegativeValues && missingFields.length === 0;

  const handleConfirm = async () => {
    if (GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_URL_HERE" || !GOOGLE_SCRIPT_URL) {
        alert("尚未設定 Google Script 網址，請聯繫管理員更新程式碼。");
        return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Prepare Payload
    const crew = [data.basicInfo.member1, data.basicInfo.member2, data.basicInfo.member3, data.basicInfo.member4, data.basicInfo.member5, data.basicInfo.member6]
        .filter(Boolean).join('、');
    
    const fmtT = (d: Date | null) => d ? formatTimeDisplay(d.toISOString()) : '';

    const payload = {
        date: data.basicInfo.date,
        caseId: data.basicInfo.caseId,
        unit: data.basicInfo.unit,
        reviewer: data.basicInfo.reviewer,
        crew: crew,
        ohcaType: data.basicInfo.ohcaType,
        notification: data.basicInfo.notificationTime,
        rhythm: data.technicalInfo.initialRhythm,
        compressor: data.technicalInfo.useCompressor,
        endoAttempts: data.technicalInfo.endoAttempts,
        airway: data.technicalInfo.airwayDevice,
        etco2: data.technicalInfo.etco2Used === 'Yes' ? data.technicalInfo.etco2Value : data.technicalInfo.etco2Used,
        pulse: data.technicalInfo.checkPulse,
        padsCorrect: data.technicalInfo.aedPadCorrect,
        ivOp: data.technicalInfo.ivOperator,
        ioOp: data.technicalInfo.ioOperator,
        endoOp: data.technicalInfo.endoOperator,
        leader: data.technicalInfo.teamLeader,
        
        // Times
        t_ohca: fmtT(times.ohca),
        t_cpr: fmtT(times.cpr),
        t_pads: fmtT(times.pads),
        t_vent: isVentNA ? 'N/A' : fmtT(times.vent),
        t_mcpr: isMcprNA ? 'N/A' : fmtT(times.mcpr),
        t_med: fmtT(times.med),
        t_airway: isAirwayNA ? 'N/A' : fmtT(times.airway),
        t_off: fmtT(times.aedOff),
        t_rosc: fmtT(times.rosc),
        
        // Metrics
        int_pads: interruptionPads,
        int_mcpr: interruptionMcpr,
        ccf_manual: manualCCF,
        ccf_overall: overallCCF,
        
        memo: data.basicInfo.memo
    };

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        setIsSubmitting(false);
        setIsSuccess(true);
        if (onSubmit) onSubmit();

    } catch (error) {
        console.error("Submission Error:", error);
        setErrorMessage("連線失敗，請檢查網路或稍後再試。");
        setIsSubmitting(false);
    }
  };

  const getCopyText = () => {
    const crew = [data.basicInfo.member1, data.basicInfo.member2, data.basicInfo.member3]
        .filter(Boolean).join('、');
        
    return `📋 【新北 OHCA 品管成果】

👤 出勤人員：${crew}

💓 AED 初始心律：${data.technicalInfo.initialRhythm}

⏱️ 時間指標：
判斷OHCA ⮕ CPR開始：${formatDiff(cprDelay)}
判斷OHCA ⮕ 貼片貼上：${formatDiff(padsDelay)}
第一次BVM所需時間：${formatDiff(bvmTime, isVentNA, '未執行BVM')}
建立呼吸道時間：${formatDiff(airwayTime, isAirwayNA, '未建立輔助呼吸道')}
給藥速率：${formatDiff(medDelay)}

⚠️ CPR 中斷：
貼片前中斷：${interruptionPads}秒
MCPR前中斷：${interruptionMcpr}秒

📊 CCF 數據：
徒手 CCF：${manualCCF}
整體 CCF：${overallCCF}

🛠️ 處置認列：
AED 貼片位置是否正確：${data.technicalInfo.aedPadCorrect}
是否檢查頸動脈：${data.technicalInfo.checkPulse}
壓胸機有無使用：${data.technicalInfo.useCompressor}
插管嘗試次數：${data.technicalInfo.endoAttempts}
進階呼吸道器材：${data.technicalInfo.airwayDevice}
ETCO2 有無放置：${data.technicalInfo.etco2Used}

📝 品管點評：
${data.basicInfo.memo || '無'}
`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getCopyText()).then(() => {
      alert("複製成功！");
    });
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl animate-fadeIn">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check text-2xl text-green-600"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">品管資料已上傳完成</h2>
          <p className="text-slate-500 text-sm mb-6">資料已傳送至 Google Sheet。</p>
          
          <button 
            onClick={copyToClipboard}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all mb-3 flex items-center justify-center"
          >
            <i className="fas fa-copy mr-2"></i> 複製品管成果 (LINE)
          </button>
          
          <button 
            onClick={onClose}
            className="w-full text-slate-500 py-2 hover:text-slate-700"
          >
            關閉視窗
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-medical-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-medical-800">品管成果檢視</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          
          <div className="space-y-3">
             <ResultRow label="判斷OHCA ⮕ CPR開始" value={formatDiff(cprDelay)} isNegative={cprDelay !== null && cprDelay < 0} />
             <ResultRow label="判斷OHCA ⮕ 貼片" value={formatDiff(padsDelay)} isNegative={padsDelay !== null && padsDelay < 0} />
             <ResultRow label="第一次BVM所需時間" value={formatDiff(bvmTime, isVentNA, '未執行BVM')} isNegative={bvmTime !== null && bvmTime < 0} />
             <ResultRow label="建立呼吸道時間" value={formatDiff(airwayTime, isAirwayNA, '未建立輔助呼吸道')} isNegative={airwayTime !== null && airwayTime < 0} />
             <ResultRow label="給藥速率" value={formatDiff(medDelay)} isNegative={medDelay !== null && medDelay < 0} />
             
             <div className="border-t border-slate-100 my-4"></div>
             
             <ResultRow label="貼片前中斷" value={`${interruptionPads} 秒`} />
             <ResultRow label="MCPR前中斷" value={`${interruptionMcpr} 秒`} />
             <ResultRow label="Time in Comp (AED前)" value={`${timeInCompPreAed?.toFixed(0) ?? 'N/A'} 秒`} isNegative={timeInCompPreAed !== null && timeInCompPreAed < 0} />
             <ResultRow label="Time in Comp (MCPR前)" value={`${timeInCompPreMcpr?.toFixed(0) ?? 'N/A'} 秒`} isNegative={timeInCompPreMcpr !== null && timeInCompPreMcpr < 0} />
             <ResultRow label="Time in Comp (MCPR後)" value={isMcprNA ? 'N/A (未架設MCPR)' : `${timeInCompPostMcpr?.toFixed(0) ?? 'N/A'} 秒`} isNegative={timeInCompPostMcpr !== null && timeInCompPostMcpr < 0} />

             <div className="border-t border-slate-100 my-4"></div>
             
             <ResultRow label="徒手 CCF" value={manualCCF} highlight />
             <ResultRow label="整體 CCF" value={overallCCF} highlight />
          </div>

          <div className="space-y-2 mt-4">
            {roscMismatch && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    ROSC 時間 (校正後) 必須等於 AED 關機時間 (直接時間)。
                </div>
            )}
            {hasNegativeValues && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    偵測到負值時間差，請檢查輸入時間順序。
                </div>
            )}
            {missingFields.length > 0 && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    <strong>請填寫以下必填欄位：</strong><br/>
                    {missingFieldNames}
                </div>
            )}
            {errorMessage && (
                 <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    {errorMessage}
                </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            返回修改
          </button>
          <button 
            onClick={handleConfirm}
            disabled={isSubmitting || !canSubmit}
            className={`flex-1 py-3 px-4 rounded-xl text-white font-semibold shadow-lg transition-all flex justify-center items-center
                ${!canSubmit 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-medical-600 shadow-medical-200 hover:bg-medical-700 active:scale-95'
                }`}
          >
            {isSubmitting ? (
                <>
                <i className="fas fa-spinner fa-spin mr-2"></i> 資料上傳中...
                </>
            ) : (
                '確認無誤送出'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ResultRow = ({ label, value, highlight = false, isNegative = false }: { label: string, value: string, highlight?: boolean, isNegative?: boolean }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-600 text-xs">{label}</span>
    <span className={`font-mono font-bold ${isNegative ? 'text-red-500' : highlight ? 'text-xl text-medical-600' : 'text-slate-800'}`}>
      {value}
    </span>
  </div>
);
