import React from 'react';
import { BasicInfo } from '../types';
import { InputGroup } from './InputGroup';
import { OHCA_TYPE_OPTIONS, NOTIFICATION_TIME_OPTIONS } from '../constants';

interface Props {
  info: BasicInfo;
  onChange: (field: keyof BasicInfo, value: string) => void;
}

export const Personnel: React.FC<Props> = ({ info, onChange }) => {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">案件情境</h3>
        <InputGroup
          label="OHCA 類型"
          as="select"
          options={OHCA_TYPE_OPTIONS}
          value={info.ohcaType}
          onChange={(e) => onChange('ohcaType', e.target.value)}
          required
        />
        <InputGroup
          label="OHCA 發現/通報時機"
          as="select"
          options={NOTIFICATION_TIME_OPTIONS}
          value={info.notificationTime}
          onChange={(e) => onChange('notificationTime', e.target.value)}
          required
        />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">出勤人員</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="人員 1" value={info.member1} onChange={(e) => onChange('member1', e.target.value)} required />
          <InputGroup label="人員 2" value={info.member2} onChange={(e) => onChange('member2', e.target.value)} required />
          <InputGroup label="人員 3" value={info.member3} onChange={(e) => onChange('member3', e.target.value)} />
          <InputGroup label="人員 4" value={info.member4} onChange={(e) => onChange('member4', e.target.value)} />
          <InputGroup label="人員 5" value={info.member5} onChange={(e) => onChange('member5', e.target.value)} />
          <InputGroup label="人員 6" value={info.member6} onChange={(e) => onChange('member6', e.target.value)} />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">個人備忘錄</h3>
        <InputGroup
          label="備忘錄 (網址將自動轉換)"
          as="textarea"
          value={info.memo}
          onChange={(e) => onChange('memo', e.target.value)}
          placeholder="輸入備註或相關連結..."
        />
        {info.memo && (
          <div className="mt-2 p-3 bg-slate-50 rounded text-sm break-all">
            {info.memo.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
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