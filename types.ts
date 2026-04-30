export interface TimeCalibration {
  keyTime: string; // ISO string
  aedTime: string; // ISO string
}

export interface PersonnelCalibration {
  emt1: TimeCalibration;
  emt2: TimeCalibration;
  emt3: TimeCalibration;
}

export interface SingleTimeRecord {
  time: string;
  source: 'emt1' | 'emt2' | 'emt3' | 'aed' | '';
}

export interface TimeRecord {
  found: SingleTimeRecord;
  contact: SingleTimeRecord;
  ohcaJudgment: SingleTimeRecord;
  cprStart: SingleTimeRecord;
  powerOn: string; // Direct AED time
  padsOn: string; // Direct AED time
  firstVentilation: SingleTimeRecord;
  mcprSetup: SingleTimeRecord;
  firstMed: SingleTimeRecord;
  airway: SingleTimeRecord;
  aedOff: string; // Direct AED time
  rosc: SingleTimeRecord;
  firstShock: string; // Direct AED time
}

export interface BasicInfo {
  reviewer: string;
  battalion: string; 
  caseId: string;
  date: string; 
  unit: string;
  patientName: string;
  patientAge: number | '';
  hospital: string;
  ohcaType: string;
  notificationTime: string;
  member1: string;
  member2: string;
  member3: string;
  member4: string;
  member5: string;
  member6: string;
  
  // 備查資料 (Checkboxes -> array of strings)
  recordForm: string[];
  aedRecord: string[];
  dashcam: string[];
  bodycam: string[];
}

export interface PingtungChecklist {
  // 現場急救流程建議
  askWillingness: string[];
  assessmentError: string[];
  recognizeSuccessNoImmediateCpr: boolean;
  aedNotIntervenedWithin1Min: boolean;
  ambuNotIntervenedWithin1Min: boolean;
  mcprNotPlacedBeforeMoving: boolean;
  incorrectTreatment: string[];
  
  // 壓胸流程建議
  cprNoSwap: boolean;
  aedNoPulseCheck: boolean;
  cprRateError: string[];
  postureError: string[];
  
  // 呼吸道處置
  airwayTreatment: string[];
  ventilationRate: string[];
  no100PercentOxygen: string[];
  
  // AED/MCPR 操作
  aedOpOver1Min: boolean;
  noStopCprDuringAnalysis: boolean;
  movedPatientDuringAnalysis: boolean;
  noShockAsInstructed: boolean;
  mcprFamiliarityInsufficient: boolean;
  cprPositionShifted: boolean;
  cprModeError: boolean;
  mcprNotStoppedDuringAnalysis: boolean;
  mcprNotAdjustedImmediately: boolean;
  
  // 總評
  treatmentLevel: string;
  majorFlaws: string;
  suggestions: string;
  
  // 設定列 (計分)
  setting_recordFormUnfilled: number | '';
  setting_noFiles: number | '';
  setting_scene3Checks: number | '';
}

export interface InterruptionItem {
  id: string;
  start: string;
  end: string;
  reason: string;
}

export interface InterruptionRecords {
  beforePads: InterruptionItem[]; 
  beforeMcpr: InterruptionItem[]; 
}

export interface AppState {
  calibration: PersonnelCalibration;
  timeRecords: TimeRecord;
  basicInfo: BasicInfo;
  checklist: PingtungChecklist;
  interruptionRecords: InterruptionRecords;
}

const createEmptyInterruptions = (count: number) => 
  Array(count).fill(null).map((_, i) => ({ id: i.toString(), start: '', end: '', reason: '' }));

export const INITIAL_STATE: AppState = {
  calibration: {
    emt1: { keyTime: '', aedTime: '' },
    emt2: { keyTime: '', aedTime: '' },
    emt3: { keyTime: '', aedTime: '' },
  },
  timeRecords: {
    found: { time: '', source: '' },
    contact: { time: '', source: '' },
    ohcaJudgment: { time: '', source: '' },
    cprStart: { time: '', source: '' },
    powerOn: '',
    padsOn: '',
    firstVentilation: { time: '', source: '' },
    mcprSetup: { time: '', source: '' },
    firstMed: { time: '', source: '' },
    airway: { time: '', source: '' },
    aedOff: '',
    rosc: { time: '', source: '' },
    firstShock: '',
  },
  basicInfo: {
    reviewer: '',
    battalion: '',
    caseId: '',
    date: new Date().toISOString().split('T')[0],
    unit: '',
    patientName: '',
    patientAge: '',
    hospital: '',
    ohcaType: '',
    notificationTime: '',
    member1: '',
    member2: '',
    member3: '',
    member4: '',
    member5: '',
    member6: '',
    recordForm: [],
    aedRecord: [],
    dashcam: [],
    bodycam: [],
  },
  checklist: {
    askWillingness: [],
    assessmentError: [],
    recognizeSuccessNoImmediateCpr: false,
    aedNotIntervenedWithin1Min: false,
    ambuNotIntervenedWithin1Min: false,
    mcprNotPlacedBeforeMoving: false,
    incorrectTreatment: [],
    cprNoSwap: false,
    aedNoPulseCheck: false,
    cprRateError: [],
    postureError: [],
    airwayTreatment: [],
    ventilationRate: [],
    no100PercentOxygen: [],
    aedOpOver1Min: false,
    noStopCprDuringAnalysis: false,
    movedPatientDuringAnalysis: false,
    noShockAsInstructed: false,
    mcprFamiliarityInsufficient: false,
    cprPositionShifted: false,
    cprModeError: false,
    mcprNotStoppedDuringAnalysis: false,
    mcprNotAdjustedImmediately: false,
    treatmentLevel: '',
    majorFlaws: '',
    suggestions: '',
    setting_recordFormUnfilled: '',
    setting_noFiles: '',
    setting_scene3Checks: '',
  },
  interruptionRecords: {
    beforePads: createEmptyInterruptions(5),
    beforeMcpr: createEmptyInterruptions(10),
  }
};
