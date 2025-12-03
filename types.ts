
export interface TimeCalibration {
  keyTime: string; // ISO string
  aedTime: string; // ISO string
}

export interface PersonnelCalibration {
  emt1: TimeCalibration;
  emt2: TimeCalibration;
  emt3: TimeCalibration;
}

export interface TimeRecord {
  found: { emt1: string; emt2: string; emt3: string };
  contact: { emt1: string; emt2: string; emt3: string };
  ohcaJudgment: { emt1: string; emt2: string; emt3: string };
  cprStart: { emt1: string; emt2: string; emt3: string };
  powerOn: string; // Direct AED time
  padsOn: { emt1: string; emt2: string; emt3: string };
  firstVentilation: { emt1: string; emt2: string; emt3: string };
  mcprSetup: { emt1: string; emt2: string; emt3: string };
  firstMed: { emt1: string; emt2: string; emt3: string };
  airway: { emt1: string; emt2: string; emt3: string }; // New field
  aedOff: string; // Direct AED time
  rosc: { emt1: string; emt2: string; emt3: string };
  firstShock: string; // Direct AED time
}

export interface BasicInfo {
  reviewer: string;
  battalion: string; // New field
  caseId: string;
  date: string; // Incident Date
  unit: string;
  // Moved from CrewInfo
  ohcaType: string;
  notificationTime: string;
  member1: string;
  member2: string;
  member3: string;
  member4: string;
  member5: string;
  member6: string;
  memo: string;
}

export interface TechnicalInfo {
  // Moved from BasicInfo
  checkPulse: string;
  useCompressor: string;
  initialRhythm: string;
  endoAttempts: number;
  airwayDevice: string;
  
  // Existing TechnicalInfo
  etco2Used: string;
  etco2Value: string;
  ivOperator: string;
  ioOperator: string;
  endoOperator: string;
  teamLeader: string;
  aedPadCorrect: string;
}

export interface InterruptionItem {
  id: string;
  start: string;
  end: string;
  reason: string;
}

export interface InterruptionRecords {
  beforePads: InterruptionItem[]; // Fixed 5 slots
  beforeMcpr: InterruptionItem[]; // Fixed 10 slots
}

export interface AppState {
  calibration: PersonnelCalibration;
  timeRecords: TimeRecord;
  basicInfo: BasicInfo;
  technicalInfo: TechnicalInfo;
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
    found: { emt1: '', emt2: '', emt3: '' },
    contact: { emt1: '', emt2: '', emt3: '' },
    ohcaJudgment: { emt1: '', emt2: '', emt3: '' },
    cprStart: { emt1: '', emt2: '', emt3: '' },
    powerOn: '',
    padsOn: { emt1: '', emt2: '', emt3: '' },
    firstVentilation: { emt1: '', emt2: '', emt3: '' },
    mcprSetup: { emt1: '', emt2: '', emt3: '' },
    firstMed: { emt1: '', emt2: '', emt3: '' },
    airway: { emt1: '', emt2: '', emt3: '' },
    aedOff: '',
    rosc: { emt1: '', emt2: '', emt3: '' },
    firstShock: '',
  },
  basicInfo: {
    reviewer: '',
    battalion: '',
    caseId: '',
    date: new Date().toISOString().split('T')[0],
    unit: '',
    ohcaType: '',
    notificationTime: '',
    member1: '',
    member2: '',
    member3: '',
    member4: '',
    member5: '',
    member6: '',
    memo: '',
  },
  technicalInfo: {
    checkPulse: '',
    useCompressor: '',
    initialRhythm: '',
    endoAttempts: 0,
    airwayDevice: '',
    etco2Used: '',
    etco2Value: '',
    ivOperator: '',
    ioOperator: '',
    endoOperator: '',
    teamLeader: '',
    aedPadCorrect: '',
  },
  interruptionRecords: {
    beforePads: createEmptyInterruptions(5),
    beforeMcpr: createEmptyInterruptions(10),
  }
};
