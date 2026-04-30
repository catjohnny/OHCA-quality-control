import React from 'react';
import { PingtungChecklist } from '../types';
import { QA_CHECKLIST_OPTIONS } from '../constants';
import { InputGroup } from './InputGroup';

interface Props {
  data: PingtungChecklist;
  onChange: (field: keyof PingtungChecklist, value: any) => void;
}

export const Checklist: React.FC<Props> = ({ data, onChange }) => {
  
  const handleCheckboxListChange = (field: keyof PingtungChecklist, option: string, checked: boolean) => {
    const currentList = (data[field] as string[]) || [];
    if (checked) {
      onChange(field, [...currentList, option]);
    } else {
      onChange(field, currentList.filter(item => item !== option));
    }
  };

  const renderCheckboxList = (label: string, field: keyof PingtungChecklist, options: string[]) => (
    <div className="mb-4">
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
        {options.map(option => {
          const checked = ((data[field] as string[]) || []).includes(option);
          return (
            <label key={option} className="flex items-start space-x-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={checked}
                onChange={(e) => handleCheckboxListChange(field, option, e.target.checked)}
                className="mt-1 w-4 h-4 text-medical-600 rounded border-slate-300 focus:ring-medical-500 transition-colors"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">
                {option}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const renderBooleanToggle = (label: string, field: keyof PingtungChecklist) => (
    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg mb-2 shadow-sm">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        onClick={() => onChange(field, !data[field])}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-medical-500 focus:ring-offset-2 ${
          data[field] ? 'bg-medical-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            data[field] ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4 flex items-center">
          <i className="fas fa-clipboard-list text-medical-500 mr-2"></i> 現場急救流程建議
        </h3>
        {renderCheckboxList("急救意願詢問", "askWillingness", QA_CHECKLIST_OPTIONS.askWillingness)}
        {renderCheckboxList("評估有誤", "assessmentError", QA_CHECKLIST_OPTIONS.assessmentError)}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
          {renderBooleanToggle("辨識成功無立即壓胸(有多餘動作)", "recognizeSuccessNoImmediateCpr")}
          {renderBooleanToggle("按壓後1分鐘內AED尚未介入", "aedNotIntervenedWithin1Min")}
          {renderBooleanToggle("AED後1分鐘內AMBU尚未介入", "ambuNotIntervenedWithin1Min")}
          {renderBooleanToggle("MCPR未在搬運前才上", "mcprNotPlacedBeforeMoving")}
        </div>
        {renderCheckboxList("不正確處置", "incorrectTreatment", QA_CHECKLIST_OPTIONS.incorrectTreatment)}
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4 flex items-center">
          <i className="fas fa-heartbeat text-medical-500 mr-2"></i> 壓胸流程建議
        </h3>
        {renderBooleanToggle("沒有換手", "cprNoSwap")}
        {renderBooleanToggle("AED分析時無檢查脈搏", "aedNoPulseCheck")}
        {renderCheckboxList("按壓速率過快或過慢 (30下幾秒)", "cprRateError", QA_CHECKLIST_OPTIONS.cprRateError)}
        {renderCheckboxList("姿勢有誤", "postureError", QA_CHECKLIST_OPTIONS.postureError)}
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4 flex items-center">
          <i className="fas fa-lungs text-medical-500 mr-2"></i> 呼吸道處置
        </h3>
        {renderCheckboxList("呼吸道處置缺失", "airwayTreatment", QA_CHECKLIST_OPTIONS.airwayTreatment)}
        {renderCheckboxList("給氧速率 (SGA前後)", "ventilationRate", QA_CHECKLIST_OPTIONS.ventilationRate)}
        {renderCheckboxList("沒有給100%氧氣治療", "no100PercentOxygen", QA_CHECKLIST_OPTIONS.no100PercentOxygen)}
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4 flex items-center">
          <i className="fas fa-bolt text-medical-500 mr-2"></i> AED/MCPR 操作
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {renderBooleanToggle("AED操作時間超過1分鐘", "aedOpOver1Min")}
          {renderBooleanToggle("分析時未停止手動壓胸", "noStopCprDuringAnalysis")}
          {renderBooleanToggle("分析時移動患者", "movedPatientDuringAnalysis")}
          {renderBooleanToggle("未依AED指示電擊", "noShockAsInstructed")}
          {renderBooleanToggle("MCPR器材熟悉度不足", "mcprFamiliarityInsufficient")}
          {renderBooleanToggle("按壓位置偏移", "cprPositionShifted")}
          {renderBooleanToggle("按壓模式錯誤", "cprModeError")}
          {renderBooleanToggle("AED分析未停止機器", "mcprNotStoppedDuringAnalysis")}
          {renderBooleanToggle("未即時調整機器位置", "mcprNotAdjustedImmediately")}
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4 flex items-center">
          <i className="fas fa-star text-medical-500 mr-2"></i> 總評與計分
        </h3>
        <div className="space-y-4">
          <InputGroup
            label="處置程度 (標準詳見查核表)"
            as="select"
            options={["請選擇", ...QA_CHECKLIST_OPTIONS.treatmentLevel]}
            value={data.treatmentLevel}
            onChange={(e) => onChange('treatmentLevel', e.target.value)}
          />
          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-700 mb-2">其他建議事項_重大缺失</label>
            <textarea
              value={data.majorFlaws}
              onChange={(e) => onChange('majorFlaws', e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent resize-y min-h-[100px]"
              placeholder="請填寫重大缺失..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-700 mb-2">建議項目</label>
            <textarea
              value={data.suggestions}
              onChange={(e) => onChange('suggestions', e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent resize-y min-h-[100px]"
              placeholder="請填寫建議項目..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <InputGroup
              label="設定列_救護紀錄表未填寫"
              type="number"
              value={data.setting_recordFormUnfilled}
              onChange={(e) => onChange('setting_recordFormUnfilled', e.target.value === '' ? '' : Number(e.target.value))}
            />
            <InputGroup
              label="設定列_是否沒有檔案"
              type="number"
              value={data.setting_noFiles}
              onChange={(e) => onChange('setting_noFiles', e.target.value === '' ? '' : Number(e.target.value))}
            />
            <InputGroup
              label="設定列_現場流程3勾勾"
              type="number"
              value={data.setting_scene3Checks}
              onChange={(e) => onChange('setting_scene3Checks', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
