import React, { forwardRef } from 'react';

export type InputProps = {
  label?: string;
  id?: string;
  name?: string;
  type?: React.HTMLInputTypeAttribute;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** كلاس للغلاف الخارجي */
  className?: string;
  /** كلاس لحقل الإدخال نفسه */
  inputClassName?: string;
  /** خصائص إضافية تُمرَّر للـ <input> (dir, autoComplete, inputMode, min, max, ...إلخ) */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    id,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
    required,
    disabled,
    error,
    className,
    inputClassName,
    inputProps,
  },
  ref
) {
  const inputId = id || name || `input-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className={`w-full ${className || ''}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={[
          'block w-full rounded-xl border border-gray-200 bg-white px-3 py-2',
          'text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-600',
          'disabled:cursor-not-allowed disabled:bg-gray-50',
          error ? 'border-red-300 focus:ring-red-400' : '',
          inputClassName || '',
        ].join(' ')}
        {...inputProps} // ← هنا نمرّر كل الخصائص الإضافية مثل dir, autoComplete, inputMode, min, max ...
      />

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
