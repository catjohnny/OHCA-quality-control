import React from 'react';
import { FeedbackPatchInfo } from '../types';
import { InputGroup } from './InputGroup';

interface Props {
  info: FeedbackPatchInfo;
  onChange: (field: keyof FeedbackPatchInfo, value: string) => void;
}

const fields: Array<{ key: keyof FeedbackPatchInfo; label: string; placeholder?: string }> = [
  { key: 'manualDepthBeforeMcpr', label: '架設MCPR前平均徒手按壓深度(cm)' },
  { key: 'manualRateBeforeMcpr', label: '架設MCPR前平均徒手按壓速率(cpm)' },
  { key: 'manualReleaseVelocityBeforeMcpr', label: '架設MCPR前平均徒手釋放速度(mm/s)' },
  { key: 'targetManualDepthPercent', label: '目標中 - 徒手深度(%)' },
  { key: 'targetManualRatePercent', label: '目標中 - 徒手速率(%)' },
  { key: 'targetManualCompressionPercent', label: '目標中 - 徒手按壓(%)' },
  { key: 'preShockPauseTime', label: '去顫前停滯時間(未電擊=N/A)', placeholder: '未電擊可留空或輸入 N/A' },
  { key: 'postShockPauseTime', label: '去顫後停滯時間(未電擊=N/A)', placeholder: '未電擊可留空或輸入 N/A' },
];

export const FeedbackPatch: React.FC<Props> = ({ info, onChange }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-medical-100 animate-fadeIn">
      <h3 className="font-bold text-lg text-medical-600 border-b border-medical-100 pb-2 mb-4">回饋貼片</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <InputGroup
            key={field.key}
            label={field.label}
            type={field.key.includes('PauseTime') ? 'text' : 'number'}
            step="any"
            min="0"
            placeholder={field.placeholder}
            value={info[field.key]}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        ))}
      </div>
    </div>
  );
};
