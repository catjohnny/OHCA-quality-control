
import React, { useState, useEffect } from 'react';
import { TimeCalibration } from './components/TimeCalibration';
import { TimeRecording } from './components/TimeRecording';
import { BasicInfo } from './components/BasicInfo';
import { Checklist } from './components/Checklist';
import { Interruption } from './components/Interruption';
import { PreviewModal } from './components/PreviewModal';
import { AppState, INITIAL_STATE, InterruptionItem, InterruptionRecords, PingtungChecklist } from './types';
import { Toast, ConfirmModal, ToastType } from './components/UI';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [data, setData] = useState<AppState>(INITIAL_STATE);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
  const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  // Load from local storage for persistence on refresh
  useEffect(() => {
    const saved = localStorage.getItem('ohca-app-state-v3'); // Updated version key for new state structure
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
          checklist: parsed.checklist ? { ...INITIAL_STATE.checklist, ...parsed.checklist } : INITIAL_STATE.checklist
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

  const updateChecklist = (field: keyof PingtungChecklist, value: any) => {
    setData(prev => ({ ...prev, checklist: { ...prev.checklist, [field]: value } }));
  };

  const handleSubmitToGoogleSheet = () => {
    // Logic handled in PreviewModal
  };

  const handleReset = () => {
    setConfirmConfig({
      isOpen: true,
      title: '確定要建立新案件嗎？',
      message: '這將會清除目前所有已輸入的資料，但保留審核者、大隊別與分隊資料。',
      onConfirm: () => {
        const freshState: AppState = {
          ...INITIAL_STATE,
          basicInfo: {
            ...INITIAL_STATE.basicInfo,
            date: new Date().toISOString().split('T')[0],
            reviewer: data.basicInfo.reviewer,
            battalion: data.basicInfo.battalion,
            unit: data.basicInfo.unit,
          },
          interruptionRecords: {
            beforePads: Array(5).fill(null).map((_, i) => ({ id: i.toString(), start: '', end: '', reason: '' })),
            beforeMcpr: Array(10).fill(null).map((_, i) => ({ id: i.toString(), start: '', end: '', reason: '' })),
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
          calibration: {
            emt1: { keyTime: '', aedTime: '' },
            emt2: { keyTime: '', aedTime: '' },
            emt3: { keyTime: '', aedTime: '' },
          },
          checklist: INITIAL_STATE.checklist
        };
        setData(freshState);
        setActiveTab(0);
        window.scrollTo(0, 0);
        showToast('已建立新案件', 'success');
      }
    });
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
      title: '屏東品管',
      icon: 'fa-clipboard-check',
      component: <Checklist data={data.checklist} onChange={updateChecklist} />
    },
  ];

  return (
    <div className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm z-40 px-4 py-2 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-3">
          <img
            src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png"
            alt="Logo"
            className="w-8 h-8 object-contain"
          />
          <div className="flex flex-col">
            <h1 className="font-bold text-lg text-slate-900 dark:text-white leading-tight transition-colors">
              <div>屏東 OHCA</div>
              <div>品管系統</div>
            </h1>
            <span className="text-[10px] text-slate-400 font-mono">Ver.20260430.1</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            title="切換深色模式"
          >
            {isDarkMode ? <i className="fas fa-sun text-lg"></i> : <i className="fas fa-moon text-lg"></i>}
          </button>
          <button
            onClick={handleReset}
            className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center"
          >
            <i className="fas fa-plus mr-1"></i> <span className="inline">新案件</span>
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="bg-medical-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-medical-700 transition-colors shadow-medical-200 shadow-md flex items-center"
          >
            送出 <i className="fas fa-paper-plane ml-2"></i>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-4 max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1 transition-colors">{tabs[activeTab].title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs transition-colors">
            {activeTab === 0 && "請優先填寫基本資料"}
            {activeTab === 1 && "請校正密錄器與 AED 時間"}
            {activeTab === 2 && "輸入時間，系統將自動套用校正"}
            {activeTab === 3 && "紀錄 CPR 中斷原因與時間"}
          </p>
        </div>

        {tabs[activeTab].component}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-1 z-40 pb-safe overflow-x-auto transition-colors">
        <div className="flex justify-between min-w-full md:justify-center md:gap-8">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex flex-col items-center justify-center p-2 min-w-[60px] flex-1 rounded-lg transition-colors ${activeTab === index ? 'text-medical-600 dark:text-medical-400 bg-blue-50 dark:bg-slate-800 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
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
          onSubmit={() => {
            setShowPreview(false);
            showToast('資料已成功送出！', 'success');
          }}
          onToast={showToast}
        />
      )}
    </div>
  );
};

export default App;
