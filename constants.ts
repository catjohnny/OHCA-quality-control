


// UNIT_OPTIONS removed as requested for manual input
export const UNIT_OPTIONS = [];

export const BATTALION_OPTIONS = [
  "第一大隊",
  "第二大隊",
  "第三大隊",
  "第四大隊",
  "測試大隊"
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
  "1. SGA(LMA)",
  "2. SGA(i-gel)",
  "3. 傳統式喉頭鏡",
  "4. 影像式喉頭鏡",
  "5. 已有氣切道"
];

export const ENDO_ATTEMPTS_OPTIONS = [0, 1, 2, 3, 4, 5];

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
  airway: '呼吸道建立時間',
  aedOff: 'AED 關機',
  rosc: 'ROSC 時間',
  firstShock: '首次電擊'
};

export const REQUIRED_TIME_FIELDS = [
  'found', 'contact', 'ohcaJudgment', 'cprStart', 'powerOn',
  'padsOn', 'firstVentilation', 'mcprSetup', 'firstMed', 'aedOff'
];

export const HOSPITAL_OPTIONS = [
  "國仁醫院", "國軍屏醫", "大新醫院", "安泰醫院", "寶建醫院",
  "屏基", "屏東榮總", "屏東醫院", "枋寮醫院", "潮州安泰",
  "琉球衛生所", "署恆分院", "義大醫院", "輔英附醫", "龍泉分院"
];

export const QA_CHECKLIST_OPTIONS = {
  recordForm: [
    "主訴欄位未依規定填寫",
    "沒有檔案",
    "生命徵象欄位應填項目未填寫",
    "生命徵象欄位未依規定填寫",
    "處置項目填寫有誤"
  ],
  aedRecord: ["沒有檔案"],
  dashcam: ["檔案缺漏(接觸前到交接後)", "沒有檔案"],
  bodycam: [
    "檔案缺漏(接觸前到交接後)",
    "沒有兩份以上檔案",
    "沒有檔案",
    "沒有現場急救畫面"
  ],
  askWillingness: [
    "沒有影像畫面",
    "沒有邊急救邊詢問",
    "詢問時未優先詢問dnr"
  ],
  assessmentError: [
    "沒有(重新)評估",
    "沒有影像畫面",
    "評估時間超過10秒"
  ],
  incorrectTreatment: [
    "IV 現場一針為限(BLS)",
    "SGA 未照流程建立"
  ],
  cprRateError: [
    "低於15秒",
    "沒有影像畫面",
    "高於18秒"
  ],
  postureError: [
    "按壓位置不正確",
    "按壓深度不足",
    "沒有影像畫面",
    "胸部未回彈"
  ],
  airwayTreatment: [
    "固定不確實",
    "放置不確實",
    "沒有先朔型/測試CUFF",
    "沒有影像畫面",
    "沒有通氣測試",
    "沒有降階處置"
  ],
  ventilationRate: [
    "未6秒給一口氣",
    "未執行30比2",
    "沒有影像畫面"
  ],
  no100PercentOxygen: [
    "沒有影像畫面",
    "現場沒有100%氧氣治療",
    "車上沒有100%氧氣治療"
  ],
  treatmentLevel: [
    "其他(有疑義的案件)",
    "完整處置",
    "完整處置+IV",
    "處置不完整(有缺漏或延遲)"
  ]
};

