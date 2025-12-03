import React, { useState, useEffect } from 'react';
import { TimeCalibration } from './components/TimeCalibration';
import { TimeRecording } from './components/TimeRecording';
import { BasicInfo } from './components/BasicInfo';
import { TechnicalSkills } from './components/TechnicalSkills';
import { Interruption } from './components/Interruption';
import { PreviewModal } from './components/PreviewModal';
import { AppState, INITIAL_STATE, InterruptionItem, InterruptionRecords } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<AppState>(INITIAL_STATE);
  const [showPreview, setShowPreview] = useState(false);

  // Load from local storage for persistence on refresh
  useEffect(() => {
    const saved = localStorage.getItem('ohca-app-state-v3'); // Updated version key for new state structure
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with initial state to ensure new fields exist
        setData({
            ...INITIAL_STATE,
            ...parsed,
            interruptionRecords: parsed.interruptionRecords || INITIAL_STATE.interruptionRecords,
            basicInfo: { ...INITIAL_STATE.basicInfo, ...parsed.basicInfo },
            technicalInfo: { ...INITIAL_STATE.technicalInfo, ...parsed.technicalInfo }
        });
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ohca-app-state-v3', JSON.stringify(data));
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

  const handleSubmitToGoogleSheet = () => {
      // Just a stub for parent callback, logic handled in PreviewModal now
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
        basicInfo={data.basicInfo} // Pass basicInfo
        onChange={updateTechnical} 
        onBasicChange={updateBasic} // Pass basic update handler
        crewMembers={crewMembers} 
      /> 
    },
  ];

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md shadow-sm z-40 px-4 py-2 flex justify-between items-center border-b border-slate-200">
        <div className="flex items-center gap-3">
            <img 
                src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col">
                <h1 className="font-bold text-lg text-slate-900">新北 OHCA 品管系統</h1>
                <span className="text-[10px] text-slate-400 font-mono">Ver.20251202</span>
            </div>
        </div>
        <button 
            onClick={() => setShowPreview(true)}
            className="bg-medical-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-medical-700 transition-colors shadow-medical-200 shadow-md flex items-center"
        >
            送出 <i className="fas fa-paper-plane ml-2"></i>
        </button>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-4 max-w-3xl mx-auto">
        <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{tabs[activeTab].title}</h2>
            <p className="text-slate-500 text-xs">
                {activeTab === 0 && "請優先填寫基本資料"}
                {activeTab === 1 && "請校正密錄器與 AED 時間"}
                {activeTab === 2 && "輸入時間，系統將自動套用校正"}
                {activeTab === 3 && "紀錄 CPR 中斷原因與時間"}
            </p>
        </div>
        
        {tabs[activeTab].component}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 z-40 pb-safe overflow-x-auto">
        <div className="flex justify-between min-w-full md:justify-center md:gap-8">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex flex-col items-center justify-center p-2 min-w-[60px] flex-1 rounded-lg transition-colors ${
                activeTab === index ? 'text-medical-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'
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