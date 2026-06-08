import { AppState, InterruptionItem, TimeRecord } from '../types';
import { calculateCorrectedAedTime } from './timeUtils';

export const EXPORT_HEADERS = [
  'Reviewer',
  'OHCA 發現/通報時機',
];

export const getCorrectedTimes = (data: AppState) => {
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
    firstShock: getT('firstShock'),
  };
};

export const formatDateTime = (d: Date | null) => {
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const getSafeDuration = (start: Date | null, end: Date | null): number | null => {
  if (!start || !end) return null;
  let diff = (end.getTime() - start.getTime()) / 1000;
  if (diff < -43200) diff += 86400;
  return Math.floor(diff);
};

export const calculateMMSSSeconds = (mmss: string) => {
  if (!mmss || mmss.length !== 4) return 0;
  const mins = parseInt(mmss.substring(0, 2), 10);
  const secs = parseInt(mmss.substring(2, 4), 10);
  if (isNaN(mins) || isNaN(secs)) return 0;
  return (mins * 60) + secs;
};

export const calculateInterruption = (items: InterruptionItem[]) => {
  return items.reduce((acc, item) => {
    const startSec = calculateMMSSSeconds(item.start);
    const endSec = calculateMMSSSeconds(item.end);
    const diff = endSec > startSec ? endSec - startSec : 0;
    return acc + diff;
  }, 0);
};

export const validateRecord = (data: AppState, times = getCorrectedTimes(data)) => {
  const missingFields: string[] = [];
  const logicErrors: string[] = [];
  const { basicInfo, technicalInfo, timeRecords } = data;

  if (!basicInfo.reviewer) missingFields.push('基本資料: 審核者姓名');
  if (!basicInfo.battalion) missingFields.push('基本資料: 大隊別');
  if (!basicInfo.unit) missingFields.push('基本資料: 分隊');
  if (!basicInfo.caseId) missingFields.push('基本資料: 案件編號');
  if (!basicInfo.date) missingFields.push('基本資料: 案件發生日期');
  if (!basicInfo.ohcaType) missingFields.push('基本資料: OHCA 類型');
  if (!basicInfo.notificationTime) missingFields.push('基本資料: 發現/通報時機');
  if (!basicInfo.member1) missingFields.push('基本資料: 人員 1');
  if (!basicInfo.member2) missingFields.push('基本資料: 人員 2');

  if (!technicalInfo.aedPadCorrect) missingFields.push('處置認列: AED 貼片位置');
  if (!technicalInfo.checkPulse) missingFields.push('處置認列: 檢查頸動脈');
  if (!technicalInfo.useCompressor) missingFields.push('處置認列: 壓胸機有無使用');
  if (!technicalInfo.initialRhythm) missingFields.push('處置認列: AED 初始心律');
  if (!technicalInfo.postShockRhythm) missingFields.push('處置認列: AED初始心律首次電擊之後的心律');
  if (!technicalInfo.airwayDevice) missingFields.push('處置認列: 進階呼吸道器材');
  if (!technicalInfo.airwayInterruptionSeconds) missingFields.push('處置認列: 建立呼吸道中斷(秒)');
  if (technicalInfo.airwayInterruptionSeconds && !/^\d+(\.\d+)?$/.test(technicalInfo.airwayInterruptionSeconds)) {
    logicErrors.push('處置認列：[建立呼吸道中斷(秒)] 請輸入數字');
  }

  const checkTime = (key: keyof TimeRecord, label: string) => {
    const val = timeRecords[key];
    if (typeof val === 'string') {
      if (!val) missingFields.push(`時間紀錄: ${label}`);
    } else if (!val.emt1 && !val.emt2 && !val.emt3) {
      missingFields.push(`時間紀錄: ${label}`);
    }
  };

  const checkConditionalTime = (key: keyof TimeRecord, label: string) => {
    const val = timeRecords[key] as any;
    const isNA = val.emt1 === 'N/A' || val.emt2 === 'N/A' || val.emt3 === 'N/A';
    const hasValue = val.emt1 || val.emt2 || val.emt3;
    if (!isNA && !hasValue) missingFields.push(`時間紀錄: ${label}`);
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

  const checkOrder = (earlier: Date | null, later: Date | null, labelEarlier: string, labelLater: string) => {
    if (earlier && later && later.getTime() < earlier.getTime()) {
      logicErrors.push(`時間順序錯誤：[${labelLater}] 不能早於 [${labelEarlier}]`);
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
  if (times.mcpr) checkOrder(times.mcpr, times.aedOff, 'MCPR架設', 'AED關機');
  else checkOrder(times.pads, times.aedOff, '貼上貼片', 'AED關機');

  return { missingFields, logicErrors, isValid: missingFields.length === 0 && logicErrors.length === 0 };
};

export const buildOrderedRecord = (data: AppState) => {
  return {
    'Reviewer': [data.basicInfo.reviewer, data.basicInfo.caseId].filter(Boolean).join('_'),
    'OHCA 發現/通報時機': data.basicInfo.notificationTime,
  };
};

const downloadTextFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const csvEscape = (value: unknown) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export const exportRecordCsv = (data: AppState) => {
  const record = buildOrderedRecord(data) as Record<string, unknown>;
  const rows = [
    EXPORT_HEADERS.map(csvEscape).join(','),
    EXPORT_HEADERS.map((header) => csvEscape(record[header])).join(','),
  ];
  downloadTextFile('\uFEFF' + rows.join('\r\n'), `OHCA-${data.basicInfo.caseId || 'record'}-Ver5.csv`, 'text/csv;charset=utf-8');
};

export const exportRecordExcel = (data: AppState) => {
  const record = buildOrderedRecord(data) as Record<string, unknown>;
  const cells = EXPORT_HEADERS.map((header) => `<td>${String(record[header] ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('');
  const headers = EXPORT_HEADERS.map((header) => `<th>${header}</th>`).join('');
  const html = `\uFEFF<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers}</tr></thead><tbody><tr>${cells}</tr></tbody></table></body></html>`;
  downloadTextFile(html, `OHCA-${data.basicInfo.caseId || 'record'}-Ver5.xls`, 'application/vnd.ms-excel;charset=utf-8');
};
