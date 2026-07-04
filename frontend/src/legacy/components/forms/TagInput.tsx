import React, { useState, type KeyboardEvent } from 'react';

type TagInputProps = {
  label?: string;
  error?: string;
  helperText?: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  /** لتلوين كل وسم (مثلاً ألوان الباستيل) */
  getTagClassName?: (tag: string, index: number) => string;
  /** خصائص إضافية للـ input (dir, inputMode, autoComplete, ...إلخ) */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

export default function TagInput({
  label,
  error,
  helperText,
  tags,
  onTagsChange,
  placeholder = 'اضغط Enter لإضافة مهارة',
  className = '',
  getTagClassName,
  inputProps,
}: TagInputProps) {
  const [value, setValue] = useState('');
  const hasError = !!error;
  const inputId = `taginput-${Math.random().toString(36).slice(2, 9)}`;

  const addTag = (t: string) => {
    const clean = t.trim();
    if (!clean) return;
    if (tags.includes(clean)) return;
    onTagsChange([...tags, clean]);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && value.trim()) {
      e.preventDefault();
      addTag(value);
    }
    if (e.key === 'Backspace' && !value && tags.length > 0) {
      e.preventDefault();
      onTagsChange(tags.slice(0, -1));
    }
  };

  const removeTag = (idx: number) => {
    const copy = [...tags];
    copy.splice(idx, 1);
    onTagsChange(copy);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div
        className={`
          w-full min-h-[48px] px-4 py-3 border rounded-xl bg-white
          transition-colors duration-200
          focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-600
          ${hasError ? 'border-red-300' : 'border-gray-200'}
        `}
      >
        {/* ✅ الوسوم في سطر مستقل */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full shadow-sm ${
                  getTagClassName ? getTagClassName(tag, i) : 'bg-gray-100 text-gray-800'
                }`}
              >
                {tag}
                <button
                  type="button"
                  aria-label={`إزالة ${tag}`}
                  onClick={() => removeTag(i)}
                  className="grid place-items-center w-5 h-5 rounded-full bg-white/60 text-gray-600 hover:bg-white/90 hover:text-gray-800 transition"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ✅ الـ input تحت الوسوم وبعرض كامل */}
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="w-full border-none outline-none bg-transparent text-sm text-gray-900 placeholder-gray-500"
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...inputProps}
        />
      </div>

      {hasError && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}

      {!hasError && helperText && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
