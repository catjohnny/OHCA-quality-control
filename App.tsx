
import React, { useState, useEffect } from 'react';
import { TimeCalibration } from './components/TimeCalibration';
import { TimeRecording } from './components/TimeRecording';
import { BasicInfo } from './components/BasicInfo';
import { TechnicalSkills } from './components/TechnicalSkills';
import { FeedbackPatch } from './components/FeedbackPatch';
import { Interruption } from './components/Interruption';
import { PreviewModal } from './components/PreviewModal';
import { AppState, FeedbackPatchInfo, INITIAL_STATE, InterruptionItem, InterruptionRecords } from './types';
import { exportRecordCsv, exportRecordExcel, validateRecord } from './services/recordExport';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<AppState>(INITIAL_STATE);
  const [showPreview, setShowPreview] = useState(false);

  // Load from local storage for persistence on refresh
  useEffect(() => {
    const saved = localStorage.getItem('ohca-app-state-v4') || localStorage.getItem('ohca-app-state-v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Safety check for padsOn type migration (object -> string)
        let safePadsOn = '';
        if (parsed.timeRecords && typeof parsed.timeRecords.padsOn === 'string') {
            safePadsOn = parsed.timeRecords.padsOn;
        }

        // Merge with initial state to ensure new fields exist
        setData({
            ...INITIAL_STATE,
            ...parsed,
            timeRecords: {
                ...INITIAL_STATE.timeRecords,
                ...parsed.timeRecords,
                padsOn: safePadsOn // Ensure string type
            },
            interruptionRecords: parsed.interruptionRecords || INITIAL_STATE.interruptionRecords,
            basicInfo: { ...INITIAL_STATE.basicInfo, ...parsed.basicInfo },
            technicalInfo: { ...INITIAL_STATE.technicalInfo, ...parsed.technicalInfo },
            feedbackPatchInfo: { ...INITIAL_STATE.feedbackPatchInfo, ...parsed.feedbackPatchInfo }
        });
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ohca-app-state-v4', JSON.stringify(data));
  }, [data]);

  const updateCalibration = (key: any, field: any, value: string) => {
    setData(prev => ({
      ...prev,
      calibration: {
        ...prev.calibration,
        [key]: { ...prev.calibration[key as keyof typeof prev.calibration], [field]: value }
      }
    }));
  };

  const updateTimeRecord = (category: keyof typeof data.timeRecords, subField: string | null, value: string) => {
    setData(prev => {
        const currentCategory = prev.timeRecords[category];
        let newValue;
        
        if (subField && typeof currentCategory === 'object') {
            newValue = { ...currentCategory, [subField]: value };
        } else {
            newValue = value;
        }

        return {
            ...prev,
            timeRecords: {
                ...prev.timeRecords,
                [category]: newValue
            }
        };
    });
  };

  const updateInterruption = (section: keyof InterruptionRecords, index: number, field: keyof InterruptionItem, value: string) => {
    setData(prev => {
        const list = [...prev.interruptionRecords[section]];
        list[index] = { ...list[index], [field]: value };
        return {
            ...prev,
            interruptionRecords: {
                ...prev.interruptionRecords,
                [section]: list
            }
        };
    });
  };

  const updateBasic = (field: any, value: any) => {
    setData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, [field]: value } }));
  };

  const updateTechnical = (field: any, value: any) => {
    setData(prev => ({ ...prev, technicalInfo: { ...prev.technicalInfo, [field]: value } }));
  };

  const updateFeedbackPatch = (field: keyof FeedbackPatchInfo, value: string) => {
    setData(prev => ({ ...prev, feedbackPatchInfo: { ...prev.feedbackPatchInfo, [field]: value } }));
  };

  const handleExport = () => {
    const validation = validateRecord(data);
    if (!validation.isValid) {
      setShowPreview(true);
      return;
    }

    const format = window.confirm("按「確定」匯出 Excel，按「取消」匯出 CSV。");
    if (format) {
      exportRecordExcel(data);
    } else {
      exportRecordCsv(data);
    }
  };

  const handleSubmitToGoogleSheet = () => {
      // Logic handled in PreviewModal
  };

  const handleReset = () => {
    if (window.confirm("確定要建立新案件嗎？\n\n這將會清除目前所有已輸入的資料，但保留審核者、大隊別與分隊資料。")) {
      // Reset to initial state, but ensure date is today and preserve specific fields
      const freshState: AppState = {
        ...INITIAL_STATE,
        basicInfo: {
          ...INITIAL_STATE.basicInfo,
          date: new Date().toISOString().split('T')[0],
          // Preserve these fields
          reviewer: data.basicInfo.reviewer,
          battalion: data.basicInfo.battalion,
          unit: data.basicInfo.unit,
        },
        // Re-create interruption arrays to ensure clean state
        interruptionRecords: {
          beforePads: Array(5).fill(null).map((_, i) => ({ id: i.toString(), start: '', end: '', reason: '' })),
          beforeMcpr: Array(10).fill(null).map((_, i) => ({ id: i.toString(), start: '', end: '', reason: '' })),
        },
        timeRecords: {
            found: { emt1: '', emt2: '', emt3: '' },
            contact: { emt1: '', emt2: '', emt3: '' },
            ohcaJudgment: { emt1: '', emt2: '', emt3: '' },
            cprStart: { emt1: '', emt2: '', emt3: '' },
            powerOn: '',
            padsOn: '',
            firstVentilation: { emt1: '', emt2: '', emt3: '' },
            mcprSetup: { emt1: '', emt2: '', emt3: '' },
            firstMed: { emt1: '', emt2: '', emt3: '' },
            airway: { emt1: '', emt2: '', emt3: '' }, // Reset new field
            aedOff: '',
            rosc: { emt1: '', emt2: '', emt3: '' },
            firstShock: '',
        },
        calibration: {
            emt1: { keyTime: '', aedTime: '' },
            emt2: { keyTime: '', aedTime: '' },
            emt3: { keyTime: '', aedTime: '' },
        },
        technicalInfo: {
            ...INITIAL_STATE.technicalInfo,
            checkPulse: '',
            useCompressor: '',
            initialRhythm: '',
            postShockRhythm: '',
            endoAttempts: 0,
            airwayDevice: '',
            airwayInterruptionSeconds: '',
            etco2Used: '', // Reset to empty string (Please Select)
            etco2Value: '',
            prehospitalEcmo: '',
            ivOperator: '',
            ioOperator: '',
            endoOperator: '',
            teamLeader: '',
            aedPadCorrect: '',
        },
        feedbackPatchInfo: INITIAL_STATE.feedbackPatchInfo
      };
      setData(freshState);
      setActiveTab(0);
      window.scrollTo(0, 0);
    }
  };

  // Extract crew members for dropdowns
  const crewMembers = [
    data.basicInfo.member1,
    data.basicInfo.member2,
    data.basicInfo.member3,
    data.basicInfo.member4,
    data.basicInfo.member5,
    data.basicInfo.member6
  ].filter(m => m && m.trim().length > 0);

  const tabs = [
    { title: '基本資料', icon: 'fa-file-medical', component: <BasicInfo info={data.basicInfo} onChange={updateBasic} /> },
    { 
        title: '時間校正', 
        icon: 'fa-clock', 
        component: <TimeCalibration 
            calibration={data.calibration} 
            onChange={updateCalibration} 
            defaultDate={data.basicInfo.date} 
        /> 
    },
    { title: '時間紀錄', icon: 'fa-stopwatch', component: <TimeRecording data={data} onChange={updateTimeRecord} /> },
    { title: '中斷時間', icon: 'fa-pause-circle', component: <Interruption records={data.interruptionRecords} onChange={updateInterruption} /> },
    { 
      title: '處置認列', 
      icon: 'fa-stethoscope', 
      component: <TechnicalSkills 
        info={data.technicalInfo} 
        basicInfo={data.basicInfo} 
        onChange={updateTechnical} 
        onBasicChange={updateBasic}
        crewMembers={crewMembers} 
      /> 
    },
    {
      title: '回饋貼片',
      icon: 'fa-wave-square',
      component: <FeedbackPatch info={data.feedbackPatchInfo} onChange={updateFeedbackPatch} />
    },
  ];

  return (
    <div className="min-h-screen pb-24 bg-[#F4F6F8] text-medical-600">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-medical-600/95 backdrop-blur-md shadow-lg shadow-medical-900/10 z-40 px-4 py-2 flex justify-between items-center border-b border-accent-500/70">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/95 border border-accent-500/40 flex items-center justify-center shadow-sm">
                <img 
                    src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" 
                    alt="Logo" 
                    className="w-6 h-6 object-contain"
                />
            </div>
            <div className="flex flex-col">
                <h1 className="font-bold text-lg text-white leading-tight">
                    <div>新北 OHCA</div>
                    <div>品管系統</div>
                </h1>
                <span className="text-[10px] text-accent-200 font-mono">Ver.4</span>
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleReset}
                className="bg-white/10 text-white border border-white/25 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors flex items-center"
            >
                <i className="fas fa-plus mr-1"></i> <span className="inline">新案件</span>
            </button>
            <button
                onClick={handleExport}
                className="bg-white text-medical-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-accent-50 transition-colors shadow-md flex items-center"
            >
                <i className="fas fa-file-export mr-1"></i> <span className="inline">匯出</span>
            </button>
            <button 
                onClick={() => setShowPreview(true)}
                className="bg-accent-500 text-medical-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-accent-600 transition-colors shadow-md shadow-accent-500/20 flex items-center"
            >
                送出 <i className="fas fa-paper-plane ml-2"></i>
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-4 max-w-3xl mx-auto">
        <div className="mb-6">
            <h2 className="text-xl font-bold text-medical-600 mb-1">{tabs[activeTab].title}</h2>
            <p className="text-slate-500 text-xs">
                {activeTab === 0 && "請優先填寫基本資料"}
                {activeTab === 1 && "請校正密錄器與 AED 時間"}
                {activeTab === 2 && "輸入時間，系統將自動套用校正"}
                {activeTab === 3 && "紀錄 CPR 中斷原因與時間"}
                {activeTab === 4 && "確認處置認列與技術執行紀錄"}
                {activeTab === 5 && "填寫回饋貼片數值，未取得可留空"}
            </p>
        </div>
        
        {tabs[activeTab].component}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-medical-100 px-2 py-1 z-40 pb-safe overflow-x-auto shadow-[0_-10px_30px_rgba(10,37,64,0.08)]">
        <div className="flex justify-between min-w-full md:justify-center md:gap-8">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex flex-col items-center justify-center p-2 min-w-[60px] flex-1 rounded-lg transition-colors ${
                activeTab === index ? 'text-medical-600 bg-accent-50 border border-accent-200' : 'text-slate-400 hover:text-medical-600'
              }`}
            >
              <i className={`fas ${tab.icon} text-lg mb-1`}></i>
              <span className="text-[10px] font-medium whitespace-nowrap">{tab.title.substring(0, 4)}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal 
            data={data} 
            onClose={() => setShowPreview(false)} 
            onSubmit={handleSubmitToGoogleSheet} 
        />
      )}
    </div>
  );
};

export default App;
