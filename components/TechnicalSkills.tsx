
import React from 'react';
import { TechnicalInfo, BasicInfo } from '../types';
import { InputGroup } from './InputGroup';
import { PULSE_CHECK_OPTIONS, RHYTHM_OPTIONS, AIRWAY_OPTIONS, ENDO_ATTEMPTS_OPTIONS } from '../constants';

interface Props {
  info: TechnicalInfo;
  basicInfo: BasicInfo;
  onChange: (field: keyof TechnicalInfo, value: any) => void;
  onBasicChange: (field: keyof BasicInfo, value: any) => void;
  crewMembers: string[];
}

export const TechnicalSkills: React.FC<Props> = ({ info, basicInfo, onChange, onBasicChange, crewMembers }) => {
  
  // Helper to render a select with specific styling for 'No' values or specific negative answers
  const renderStyledSelect = (
    label: string, 
    field: keyof TechnicalInfo, 
    options: string[]
  ) => {
    const value = info[field] as string;
    const isNo = value === 'No' || 
                 value.startsWith('2. 無確認') || 
                 value.startsWith('0. 沒有建立進階呼吸道');
    
    return (
      <div className="mb-4 w-full">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label} <span className="text-red-500">*</span>
        </label>
        <select
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors
            ${isNo 
                ? 'bg-pink-100 border-red-300 text-red-600 font-bold focus:ring-red-200' 
                : 'bg-white border-slate-300 text-slate-800 focus:ring-medical-500'
            }`}
        >
          <option value="" disabled>請選擇</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-fadeIn space-y-6">
      
      {/* Clinical Assessment Section */}
      <div>
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">處置認列</h3>
        <div className="space-y-4">
            {renderStyledSelect('AED 貼片位置是否正確', 'aedPadCorrect', ['Yes', 'No'])}
            {renderStyledSelect('是否檢查頸動脈', 'checkPulse', PULSE_CHECK_OPTIONS)}
            {renderStyledSelect('壓胸機有無使用', 'useCompressor', ['Yes', 'No'])}
            
            <InputGroup
                label="AED 初始心律"
                as="select"
                options={RHYTHM_OPTIONS}
                value={info.initialRhythm}
                onChange={(e) => onChange('initialRhythm', e.target.value)}
                required
            />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4 w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        插管嘗試次數 <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={info.endoAttempts}
                        onChange={(e) => onChange('endoAttempts', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 transition-colors bg-white text-slate-800"
                    >
                        {ENDO_ATTEMPTS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                
                {/* Use renderStyledSelect for conditional styling */}
                {renderStyledSelect('進階呼吸道器材', 'airwayDevice', AIRWAY_OPTIONS)}
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4 w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        ETCO2 有無放置
                    </label>
                    <select
                        value={info.etco2Used}
                        onChange={(e) => onChange('etco2Used', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 transition-colors bg-white text-slate-800"
                    >
                        <option value="">請選擇</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="N/A">N/A</option>
                    </select>
                </div>
                <InputGroup
                label="ETCO2 數值 (mmHg)"
                type="number"
                value={info.etco2Value}
                onChange={(e) => onChange('etco2Value', e.target.value)}
                disabled={info.etco2Used !== 'Yes'}
                />
            </div>
        </div>
      </div>

      {/* Operators Section */}
      <div>
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">技術執行者</h3>
        <div className="grid grid-cols-2 gap-4">
            <InputGroup 
                label="靜脈注射者" 
                as="select" 
                options={crewMembers}
                value={info.ivOperator} 
                onChange={(e) => onChange('ivOperator', e.target.value)} 
            />
            <InputGroup 
                label="IO 執行者" 
                as="select" 
                options={crewMembers}
                value={info.ioOperator} 
                onChange={(e) => onChange('ioOperator', e.target.value)} 
            />
            <InputGroup 
                label="Endo 插管者" 
                as="select" 
                options={crewMembers}
                value={info.endoOperator} 
                onChange={(e) => onChange('endoOperator', e.target.value)} 
            />
            <InputGroup 
                label="Leader" 
                as="select" 
                options={crewMembers}
                value={info.teamLeader} 
                onChange={(e) => onChange('teamLeader', e.target.value)} 
            />
        </div>
      </div>

      {/* Memo / Quality Control Review Section */}
      <div>
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">品管點評</h3>
        <InputGroup
          label="點評內容"
          as="textarea"
          value={basicInfo.memo}
          onChange={(e) => onBasicChange('memo', e.target.value)}
          placeholder="輸入備註、缺失或相關連結..."
        />
        {basicInfo.memo && (
          <div className="mt-2 p-3 bg-slate-50 rounded text-sm break-all">
            {basicInfo.memo.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
              part.match(/^https?:\/\//) ? (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  🔗 開啟連結
                </a>
              ) : part
            )}
          </div>
        )}
      </div>
    </div>
  );
};
