import React from 'react';

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  as?: 'input' | 'select' | 'textarea';
  options?: string[];
  error?: string;
  fullWidth?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({
  label,
  as = 'input',
  options,
  error,
  className,
  fullWidth = true,
  ...props
}) => {
  const baseClasses = `
    w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 transition-colors
    ${error ? 'border-red-500 focus:ring-red-200' : 'border-slate-300'}
    ${props.disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}
  `;

  return (
    <div className={`mb-4 ${fullWidth ? 'w-full' : ''} ${className || ''}`}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {as === 'select' ? (
        <select className={baseClasses} {...(props as any)}>
          <option value="" disabled>請選擇</option>
          {options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : as === 'textarea' ? (
         <textarea className={baseClasses} {...(props as any)} rows={4} />
      ) : (
        <input className={baseClasses} {...props} />
      )}
      
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};
