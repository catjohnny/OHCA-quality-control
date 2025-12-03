

export const UNIT_OPTIONS = [
  "新店", "安康", "安和", "直潭", "烏來", "深坑", "石碇", "坪林", "雪山"
];

export const PULSE_CHECK_OPTIONS = [
  "1. 有確認脈搏",
  "2. 無確認脈搏",
  "3. 其他（如已貼上貼片目擊改變心律：sinus rhythm變成VF）"
];

export const RHYTHM_OPTIONS = [
  "0. 無電擊",
  "1. VF",
  "2. VT",
  "3. ASYSTOLE",
  "4. PEA",
  "5. bradycardia (≦50下/分鐘)",
  "6. 其他"
];

export const AIRWAY_OPTIONS = [
  "0. 沒有建立進階呼吸道",
  "1. SGA",
  "2. 傳統式喉頭鏡",
  "3. 影像式喉頭鏡",
  "4. 已有氣切道"
];

export const OHCA_TYPE_OPTIONS = [
  "內科-一般(含居室內、養護中心)",
  "內科-(戶外)運動中",
  "外科-車禍",
  "外科-外力因素(切割、鈍傷)",
  "外科-跳樓",
  "外科-火警",
  "外科-電擊傷",
  "特殊-上吊",
  "特殊-跳水、溺水(溪河、游泳池)",
  "特殊-燒炭",
  "特殊-中毒(含農藥)"
];

export const NOTIFICATION_TIME_OPTIONS = [
  "1、離開分隊前通知",
  "2、出勤中通知",
  "3、抵達現場後得知患者OHCA",
  "4、到場後發生目擊OHCA"
];

export const INTERRUPTION_REASONS = [
  "1. 確認脈搏",
  "2. AED 架設",
  "3. AED 分析",
  "4. AED 分析(誤判)",
  "5. LUCAS 架設",
  "6. LUCAS 故障排除",
  "7. 搬運",
  "8. 建立呼吸道",
  "9. 建立給藥途徑",
  "10. 解釋病情 (含勸退)",
  "11. N/A (無法判斷)",
  "12. 其他 (請到成果分頁手動改寫)",
  "13. 給氧"
];

export const TIME_FIELD_LABELS: Record<string, string> = {
  found: '發現患者',
  contact: '接觸患者',
  ohcaJudgment: '判斷 OHCA',
  cprStart: 'CPR 開始',
  powerOn: 'Power ON',
  padsOn: '貼上貼片',
  firstVentilation: '第一次給氣',
  mcprSetup: 'MCPR 架設',
  firstMed: '第一次給藥',
  aedOff: 'AED 關機',
  rosc: 'ROSC 時間',
  firstShock: '首次電擊'
};

export const REQUIRED_TIME_FIELDS = [
  'found', 'contact', 'ohcaJudgment', 'cprStart', 'powerOn',
  'padsOn', 'firstVentilation', 'mcprSetup', 'firstMed', 'aedOff'
];
