
import React from 'react';
import { BasicInfo as BasicInfoType } from '../types';
import { InputGroup } from './InputGroup';
import { UNIT_OPTIONS, OHCA_TYPE_OPTIONS, NOTIFICATION_TIME_OPTIONS } from '../constants';

interface Props {
  info: BasicInfoType;
  onChange: (field: keyof BasicInfoType, value: any) => void;
}

export const BasicInfo: React.FC<Props> = ({ info, onChange }) => {
  const handleCaseIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('caseId', e.target.value);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Administrative Data */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-2">案件資料</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputGroup
            label="審核者姓名"
            value={info.reviewer}
            onChange={(e) => onChange('reviewer', e.target.value)}
            required
          />
          <InputGroup
            label="分隊"
            as="select"
            options={UNIT_OPTIONS}
            value={info.unit}
            onChange={(e) => onChange('unit', e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup
                label="案件發生日期"
                type="date"
                value={info.date}
                onChange={(e) => onChange('date', e.target.value)}
                required
            />
            <InputGroup
                label="案件編號 (12碼-1碼-1碼)"
                placeholder="251202199862-1-1"
                value={info.caseId}
                onChange={handleCaseIdChange}
                required
                pattern="\d{12}-\d{1}-\d{1}"
                error={info.caseId && !/^\d{12}-\d{1}-\d{1}$/.test(info.caseId) ? "格式錯誤" : undefined}
            />
        </div>
      </div>

      {/* Scenario Data (Moved from Personnel) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-2">案件情境</h3>
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

      {/* Personnel Data (Moved from Personnel) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-2">出勤人員</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="人員 1" value={info.member1} onChange={(e) => onChange('member1', e.target.value)} required />
          <InputGroup label="人員 2" value={info.member2} onChange={(e) => onChange('member2', e.target.value)} required />
          <InputGroup label="人員 3" value={info.member3} onChange={(e) => onChange('member3', e.target.value)} />
          <InputGroup label="人員 4" value={info.member4} onChange={(e) => onChange('member4', e.target.value)} />
          <InputGroup label="人員 5" value={info.member5} onChange={(e) => onChange('member5', e.target.value)} />
          <InputGroup label="人員 6" value={info.member6} onChange={(e) => onChange('member6', e.target.value)} />
        </div>
      </div>
    </div>
  );
};
