import React, { useMemo, useState } from 'react';
import { AppState, TimeRecord, InterruptionItem, SingleTimeRecord } from '../types';
import { calculateCorrectedAedTime, formatTimeDisplay } from '../services/timeUtils';

const GOOGLE_SCRIPT_URL: string = import.meta.env.VITE_GOOGLE_SCRIPT_URL || ""; 
const GOOGLE_SHEET_URL: string = import.meta.env.VITE_GOOGLE_SHEET_URL || "";

interface Props {
  data: AppState;
  onClose: () => void;
  onSubmit: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const PreviewModal: React.FC<Props> = ({ data, onClose, onSubmit, onToast }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // --- Calculations for Times ---
  const times = useMemo(() => {
    const getT = (key: keyof TimeRecord) => 
      calculateCorrectedAedTime(key, data.timeRecords[key], data.calibration);
    
    return {
      found: getT('found'),
      contact: getT('contact'),
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

  // --- Validation Logic ---
  const { missingFields, logicErrors } = useMemo(() => {
    const missing: string[] = [];
    const logic: string[] = [];
    const { basicInfo, checklist, timeRecords } = data;

    // 1. Basic Info Validation
    if (!basicInfo.reviewer) missing.push("案件資料: 審核者姓名");
    if (!basicInfo.battalion) missing.push("案件資料: 大隊別");
    if (!basicInfo.unit) missing.push("案件資料: 分隊");
    if (!basicInfo.caseId) missing.push("案件資料: 輸入TEMSISD");
    if (!basicInfo.date) missing.push("案件資料: 案件發生日期");
    if (!basicInfo.member1) missing.push("出勤人員: 人員 1");
    if (!basicInfo.member2) missing.push("出勤人員: 人員 2");

    // 2. Checklist Validation
    if (!checklist.treatmentLevel) missing.push("總評與計分: 處置程度");

    // 3. Time Records Required Check
    const checkTime = (key: keyof TimeRecord, label: string) => {
        const val = timeRecords[key];
        if (typeof val === 'string') {
            if (!val) missing.push(`時間紀錄: ${label}`);
        } else {
            if (!(val as SingleTimeRecord).time) missing.push(`時間紀錄: ${label}`);
        }
    };

    const checkConditionalTime = (key: keyof TimeRecord, label: string) => {
        const val = timeRecords[key] as SingleTimeRecord;
        if (val.time !== 'N/A' && !val.time) {
            missing.push(`時間紀錄: ${label}`);
        }
    };

    checkTime('found', '發現患者');
    checkTime('contact', '接觸患者');
    checkTime('ohcaJudgment', '判斷 OHCA');
    checkTime('cprStart', 'CPR 開始');
    checkTime('powerOn', 'Power ON');
    checkTime('padsOn', '貼上貼片');
    checkTime('firstMed', '第一次給藥');
    checkTime('aedOff', 'AED 關機');

    checkConditionalTime('firstVentilation', '第一次給氣');
    checkConditionalTime('mcprSetup', 'MCPR 架設');
    checkConditionalTime('airway', '呼吸道建立時間');

    // 4. Time Logic Validation
    const checkOrder = (earlier: Date | null, later: Date | null, labelEarlier: string, labelLater: string) => {
        if (earlier && later) {
            if (later.getTime() < earlier.getTime()) {
                 logic.push(`時間順序錯誤：[${labelLater}] 不能早於 [${labelEarlier}]`);
            }
        }
    };

    checkOrder(times.found, times.contact, '發現患者', '接觸患者');
    checkOrder(times.contact, times.ohca, '接觸患者', '判斷OHCA');
    checkOrder(times.ohca, times.cpr, '判斷OHCA', 'CPR開始');
    checkOrder(times.ohca, times.aedOn, '判斷OHCA', 'Power ON');
    checkOrder(times.aedOn, times.pads, 'Power ON', '貼上貼片');
    checkOrder(times.ohca, times.vent, '判斷OHCA', '第一次給氣');
    checkOrder(times.cpr, times.mcpr, 'CPR開始', 'MCPR架設');
    checkOrder(times.ohca, times.med, '判斷OHCA', '第一次給藥');
    checkOrder(times.ohca, times.airway, '判斷OHCA', '呼吸道建立');
    
    if (times.mcpr) {
        checkOrder(times.mcpr, times.aedOff, 'MCPR架設', 'AED關機');
    } else {
        checkOrder(times.pads, times.aedOff, '貼上貼片', 'AED關機');
    }

    return { missingFields: missing, logicErrors: logic };
  }, [data, times]);

  const isValid = missingFields.length === 0 && logicErrors.length === 0;

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

  const getSafeDuration = (start: Date | null, end: Date | null): number | null => {
    if (!start || !end) return null;
    let diff = (end.getTime() - start.getTime()) / 1000;
    if (diff < -43200) {
        diff += 86400;
    }
    return Math.floor(diff);
  };

  const isMcprNA = (data.timeRecords.mcprSetup as SingleTimeRecord).time === 'N/A';
  const isVentNA = (data.timeRecords.firstVentilation as SingleTimeRecord).time === 'N/A';
  const isAirwayNA = (data.timeRecords.airway as SingleTimeRecord).time === 'N/A';

  const cprDelay = getSafeDuration(times.ohca, times.cpr);
  const padsDelay = getSafeDuration(times.ohca, times.pads);
  const bvmTime = isVentNA ? null : getSafeDuration(times.ohca, times.vent); 
  const medDelay = getSafeDuration(times.ohca, times.med);
  const airwayTime = isAirwayNA ? null : getSafeDuration(times.ohca, times.airway);

  let overallCCF = 'N/A';
  const totalDurationForCCF = getSafeDuration(times.ohca, times.aedOff);

  if (totalDurationForCCF !== null && totalDurationForCCF > 0) {
      let totalCompSeconds = 0;
      if (isMcprNA) {
          totalCompSeconds = totalDurationForCCF - interruptionPads;
      } else {
          totalCompSeconds = totalDurationForCCF - interruptionPads - interruptionMcpr;
      }
      overallCCF = ((totalCompSeconds / totalDurationForCCF) * 100).toFixed(1) + '%';
  } else if (totalDurationForCCF !== null && totalDurationForCCF <= 0) {
      overallCCF = '時間錯誤';
  }

  const formatDurationDisplay = (val: number | string | null): string => {
      if (val === null) return '--';
      if (typeof val === 'string') return val;
      const absVal = Math.abs(val);
      if (absVal < 60) return `${Math.floor(val)}秒`;
      const mins = Math.floor(absVal / 60);
      const secs = Math.floor(absVal % 60);
      return `${mins}分${secs}秒`;
  };

  const bvmText = isVentNA ? '未執行 BVM' : formatDurationDisplay(bvmTime);
  const airwayText = isAirwayNA ? '未建立輔助呼吸道' : formatDurationDisplay(airwayTime);

    const handleSubmit = async () => {
        if (!isValid) return;
        setIsSubmitting(true);
        
        // Payload based on Pingtung Schema mapping
        const payload = {
            "案件編號": data.basicInfo.caseId,
            "案件時間": data.basicInfo.date,
            "出勤單位": data.basicInfo.unit,
            "出勤人員": [data.basicInfo.member1, data.basicInfo.member2, data.basicInfo.member3, data.basicInfo.member4, data.basicInfo.member5, data.basicInfo.member6].filter(Boolean).join(" "),
            "患者姓名": data.basicInfo.patientName,
            "患者年齡": data.basicInfo.patientAge,
            "後送醫院": data.basicInfo.hospital,
            "備查資料_救護紀錄表": data.basicInfo.recordForm.join(", "),
            "aed紀錄": data.basicInfo.aedRecord.join(", "),
            "行車紀錄器": data.basicInfo.dashcam.join(", "),
            "密錄器": data.basicInfo.bodycam.join(", "),
            "現場急救流程建議_急救意願 詢問": data.checklist.askWillingness.join(", "),
            "評估有誤": data.checklist.assessmentError.join(", "),
            "辨識成功無立即壓胸 (有多餘動作)": data.checklist.recognizeSuccessNoImmediateCpr,
            "按壓後1分鐘內AED尚未介入": data.checklist.aedNotIntervenedWithin1Min,
            "AED後1分鐘內AMBU尚未介入": data.checklist.ambuNotIntervenedWithin1Min,
            "MCPR未在搬運前才上": data.checklist.mcprNotPlacedBeforeMoving,
            "不正確 處置": data.checklist.incorrectTreatment.join(", "),
            "壓胸流程建議_沒有換手": data.checklist.cprNoSwap,
            "AED分析時無檢查脈搏 (可以看心律取代)": data.checklist.aedNoPulseCheck,
            "按壓速率過快或過慢 (30下幾秒)": data.checklist.cprRateError.join(", "),
            "姿勢有誤": data.checklist.postureError.join(", "),
            "呼吸道處置_呼吸道處置": data.checklist.airwayTreatment.join(", "),
            "給氧速率 (SGA前後都要抓)": data.checklist.ventilationRate.join(", "),
            "沒有給100%氧氣治療": data.checklist.no100PercentOxygen.join(", "),
            "AED操作_操作時間超過1分鐘": data.checklist.aedOpOver1Min,
            "分析時未停止手動壓胸": data.checklist.noStopCprDuringAnalysis,
            "分析時 移動患者": data.checklist.movedPatientDuringAnalysis,
            "未依AED 指示電擊": data.checklist.noShockAsInstructed,
            "MCPR操作_器材熟悉度不足": data.checklist.mcprFamiliarityInsufficient,
            "按壓位置 偏移": data.checklist.cprPositionShifted,
            "按壓模式錯誤": data.checklist.cprModeError,
            "AED分析未停止機器": data.checklist.mcprNotStoppedDuringAnalysis,
            "未即時調整機器位置": data.checklist.mcprNotAdjustedImmediately,
            "處置程度_標準詳見 查核表": data.checklist.treatmentLevel,
            "其他建議事項_重大缺失": data.checklist.majorFlaws,
            "建議項目": data.checklist.suggestions,
            "設定列_救護紀錄表應填項目未填寫": data.checklist.setting_recordFormUnfilled,
            "設定列_是否沒有檔案": data.checklist.setting_noFiles,
            "設定列_現場流程3勾勾": data.checklist.setting_scene3Checks
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
            onSubmit();
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

    const text = `📋 【屏東 OHCA 品管成果】

單位：${data.basicInfo.battalion} ${data.basicInfo.unit}
👤 出勤人員：${members}
🏥 後送醫院：${data.basicInfo.hospital || '未記錄'}

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

🛠️ 品管查核結果：
處置程度：${data.checklist.treatmentLevel || '--'}
${data.checklist.majorFlaws ? '重大缺失：' + data.checklist.majorFlaws : ''}
${data.checklist.suggestions ? '建議項目：' + data.checklist.suggestions : ''}`;

    try {
        await navigator.clipboard.writeText(text);
        onToast('已複製到剪貼簿！', 'success');
    } catch (err) {
        console.error('Copy failed', err);
        onToast('複製失敗，請手動選取文字', 'error');
    }
  };

  const renderSectionHeader = (title: string, icon: string) => (
    <div className="bg-slate-100 px-3 py-2 rounded-lg font-bold text-slate-700 text-sm flex items-center mt-6 mb-2 first:mt-0">
      <i className={`fas ${icon} mr-2 w-5 text-center text-medical-600`}></i>
      {title}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-medical-600 to-medical-700 p-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <i className="fas fa-check-circle mr-2"></i> 審核資料預覽
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
            {isSubmitting && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-600 mb-4"></div>
                    <p className="text-medical-800 font-bold">資料傳送中...</p>
                </div>
            )}
            
            {isSuccess && (
                <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center animate-fadeIn">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-500">
                        <i className="fas fa-check text-3xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">上傳成功！</h3>
                    <p className="text-slate-500 mb-6">您的品管資料已送出至資料庫</p>
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                    >
                        關閉視窗
                    </button>
                </div>
            )}

          {(!isValid && !isSuccess) ? (
            <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
              <div className="flex items-center text-red-600 mb-4">
                <i className="fas fa-exclamation-triangle text-2xl mr-3"></i>
                <h3 className="text-lg font-bold">資料尚未齊全或有邏輯錯誤</h3>
              </div>
              
              {missingFields.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-bold text-slate-700 mb-2">請補齊以下必填欄位：</p>
                    <ul className="list-disc pl-5 text-sm text-red-500 space-y-1">
                        {missingFields.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
              )}

              {logicErrors.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-slate-700 mb-2">請修正以下時間邏輯錯誤：</p>
                    <ul className="list-disc pl-5 text-sm text-red-500 space-y-1">
                        {logicErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
              )}
            </div>
          ) : !isSuccess ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                
                {renderSectionHeader('基本資料', 'fa-file-alt')}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-slate-500">審核者: <span className="text-slate-800 font-bold">{data.basicInfo.reviewer}</span></div>
                  <div className="text-slate-500">單位: <span className="text-slate-800 font-bold">{data.basicInfo.battalion} {data.basicInfo.unit}</span></div>
                  <div className="text-slate-500 col-span-2">患者: <span className="text-slate-800 font-bold">{data.basicInfo.patientName || '--'} ({data.basicInfo.patientAge || '--'}歲)</span></div>
                  <div className="text-slate-500 col-span-2">案件編號: <span className="text-slate-800 font-mono">{data.basicInfo.caseId}</span></div>
                </div>

                {renderSectionHeader('關鍵時間點 (校正後)', 'fa-clock')}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-slate-50 p-3 rounded border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">判斷OHCA:</span>
                    <span className="font-mono font-bold text-slate-800">{times.ohca ? formatTimeDisplay(times.ohca.toISOString()) : '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CPR開始:</span>
                    <span className="font-mono font-bold text-slate-800">{times.cpr ? formatTimeDisplay(times.cpr.toISOString()) : '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">貼上貼片:</span>
                    <span className="font-mono font-bold text-slate-800">{times.pads ? formatTimeDisplay(times.pads.toISOString()) : '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">首次給氣:</span>
                    <span className="font-mono font-bold text-slate-800">{isVentNA ? 'N/A' : (times.vent ? formatTimeDisplay(times.vent.toISOString()) : '--')}</span>
                  </div>
                </div>

                {renderSectionHeader('品管指標', 'fa-chart-pie')}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-center items-center">
                    <span className="text-xs text-slate-500 mb-1">整體 CCF</span>
                    <span className="text-2xl font-bold text-medical-600">{overallCCF}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-center items-center">
                    <span className="text-xs text-slate-500 mb-1">處置程度</span>
                    <span className="text-base font-bold text-slate-800 text-center">{data.checklist.treatmentLevel || '--'}</span>
                  </div>
                </div>

              </div>
              {errorMessage && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                      <i className="fas fa-info-circle mr-2"></i> {errorMessage}
                  </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {(!isSuccess) && (
            <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center">
            {isValid ? (
                <>
                <button
                    onClick={handleCopyResult}
                    className="flex items-center text-slate-600 hover:text-medical-600 font-medium transition-colors"
                >
                    <i className="far fa-copy mr-2"></i> 複製純文字報告
                </button>
                <div className="flex space-x-3">
                    <button
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                    >
                    返回修改
                    </button>
                    <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !GOOGLE_SCRIPT_URL}
                    className="px-6 py-2 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors font-medium flex items-center disabled:opacity-50"
                    title={!GOOGLE_SCRIPT_URL ? "未設定 GOOGLE_SCRIPT_URL 環境變數" : ""}
                    >
                    {isSubmitting ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i> 傳送中</>
                    ) : (
                        <><i className="fas fa-paper-plane mr-2"></i> 確認送出</>
                    )}
                    </button>
                </div>
                </>
            ) : (
                <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                返回修改資料
                </button>
            )}
            </div>
        )}
      </div>
    </div>
  );
};
