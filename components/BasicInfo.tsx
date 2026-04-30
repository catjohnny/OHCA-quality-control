import React from 'react';
import { BasicInfo as BasicInfoType } from '../types';
import { InputGroup } from './InputGroup';
import { OHCA_TYPE_OPTIONS, NOTIFICATION_TIME_OPTIONS, BATTALION_OPTIONS, HOSPITAL_OPTIONS, QA_CHECKLIST_OPTIONS } from '../constants';

interface Props {
  info: BasicInfoType;
  onChange: (field: keyof BasicInfoType, value: any) => void;
}

export const BasicInfo: React.FC<Props> = ({ info, onChange }) => {
  const handleCaseIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('caseId', e.target.value);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('unit', e.target.value);
  };

  const isUnitValid = !info.unit || /^[\u4e00-\u9fa5]{1,3}$/.test(info.unit);

  const handleCheckboxChange = (field: keyof BasicInfoType, option: string, checked: boolean) => {
    const currentList = (info[field] as string[]) || [];
    if (checked) {
      onChange(field, [...currentList, option]);
    } else {
      onChange(field, currentList.filter(item => item !== option));
    }
  };

  const renderCheckboxGroup = (label: string, field: keyof BasicInfoType, options: string[]) => (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider transition-colors">{label}</label>
      <div className="space-y-2">
        {options.map(option => {
          const checked = ((info[field] as string[]) || []).includes(option);
          return (
            <label key={option} className="flex items-start space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => handleCheckboxChange(field, option, e.target.checked)}
                className="mt-1 w-4 h-4 text-medical-600 rounded border-slate-300 focus:ring-medical-500 transition-colors"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-tight transition-colors">
                {option}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Administrative Data */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 transition-colors">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 transition-colors">案件資料</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputGroup
            label="審核者姓名"
            value={info.reviewer}
            onChange={(e) => onChange('reviewer', e.target.value)}
            required
          />
          <InputGroup
            label="大隊別"
            as="select"
            options={BATTALION_OPTIONS}
            value={info.battalion}
            onChange={(e) => onChange('battalion', e.target.value)}
            required
          />
          <InputGroup
            label="分隊 (限3個中文字以內)"
            type="text"
            placeholder="例如：里港"
            value={info.unit}
            onChange={handleUnitChange}
            required
            error={!isUnitValid ? "格式錯誤：請輸入 1 至 3 個中文字" : undefined}
            pattern="[\u4e00-\u9fa5]{1,3}"
            className="md:col-span-2"
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
            label="輸入TEMSISD"
            placeholder="251202199862-1-1"
            value={info.caseId}
            onChange={handleCaseIdChange}
            required
            pattern="\d{12}-\d{1}-\d{1}"
            error={info.caseId && !/^\d{12}-\d{1}-\d{1}$/.test(info.caseId) ? "格式錯誤" : undefined}
          />
        </div>
      </div>

      {/* Patient Data */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 transition-colors">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 transition-colors">患者與後送資訊</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputGroup
            label="患者姓名"
            value={info.patientName}
            onChange={(e) => onChange('patientName', e.target.value)}
          />
          <InputGroup
            label="患者年齡"
            type="number"
            value={info.patientAge}
            onChange={(e) => onChange('patientAge', e.target.value ? Number(e.target.value) : '')}
          />
          <InputGroup
            label="後送醫院"
            as="select"
            options={HOSPITAL_OPTIONS}
            value={info.hospital}
            onChange={(e) => onChange('hospital', e.target.value)}
            className="md:col-span-2"
          />
        </div>
      </div>

      {/* Personnel Data */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 transition-colors">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 transition-colors">出勤人員</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="人員 1" value={info.member1} onChange={(e) => onChange('member1', e.target.value)} required />
          <InputGroup label="人員 2" value={info.member2} onChange={(e) => onChange('member2', e.target.value)} required />
          <InputGroup label="人員 3" value={info.member3} onChange={(e) => onChange('member3', e.target.value)} />
          <InputGroup label="人員 4" value={info.member4} onChange={(e) => onChange('member4', e.target.value)} />
          <InputGroup label="人員 5" value={info.member5} onChange={(e) => onChange('member5', e.target.value)} />
          <InputGroup label="人員 6" value={info.member6} onChange={(e) => onChange('member6', e.target.value)} />
        </div>
      </div>

      {/* Verification Data (備查資料) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 transition-colors">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 transition-colors">備查資料 (有缺漏再勾選)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderCheckboxGroup("救護紀錄表", "recordForm", QA_CHECKLIST_OPTIONS.recordForm)}
          {renderCheckboxGroup("AED 紀錄", "aedRecord", QA_CHECKLIST_OPTIONS.aedRecord)}
          {renderCheckboxGroup("行車紀錄器", "dashcam", QA_CHECKLIST_OPTIONS.dashcam)}
          {renderCheckboxGroup("密錄器", "bodycam", QA_CHECKLIST_OPTIONS.bodycam)}
        </div>
      </div>

      {/* Scenario Data (Keep for backward compatibility or extra context if needed) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 transition-colors">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 transition-colors">案件情境 (選填)</h3>
        <InputGroup
          label="OHCA 類型"
          as="select"
          options={OHCA_TYPE_OPTIONS}
          value={info.ohcaType}
          onChange={(e) => onChange('ohcaType', e.target.value)}
        />
        <InputGroup
          label="OHCA 發現/通報時機"
          as="select"
          options={NOTIFICATION_TIME_OPTIONS}
          value={info.notificationTime}
          onChange={(e) => onChange('notificationTime', e.target.value)}
        />
      </div>
    </div>
  );
};
