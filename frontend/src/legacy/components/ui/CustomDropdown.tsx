import { useEffect, useRef, useState } from 'react';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  name: string;
  value: string;
  options: DropdownOption[];
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLSelectElement>) => void;
  hasError?: boolean;
  isDisabled?: boolean;
  dir?: 'ltr' | 'rtl';
}

export default function CustomDropdown({
  name,
  value,
  options,
  placeholder = 'اختر خيار',
  onChange,
  onBlur,
  hasError = false,
  isDisabled = false,
  dir = 'rtl',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get display label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close dropdown when pressing Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!isDisabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    // Create a change event that mimics the native select behavior
    const event = {
      target: {
        name,
        value: optionValue,
      },
    } as React.ChangeEvent<HTMLSelectElement>;

    onChange(event);
    setIsOpen(false);
  };

  const handleBlurButton = () => {
    // Trigger blur after a small delay to allow click handlers to fire
    setTimeout(() => {
      const event = {
        target: {
          name,
        },
      } as React.FocusEvent<HTMLSelectElement>;
      onBlur(event);
    }, 100);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      dir={dir}
    >
      {/* Button */}
      <button
        type="button"
        onClick={handleToggle}
        onBlur={handleBlurButton}
        disabled={isDisabled}
        className={`w-full px-4 py-3 pl-10 rounded-xl border bg-white shadow-sm transition-all duration-200 text-right flex items-center justify-between ${
          hasError
            ? 'border-red-400 focus:ring-2 focus:ring-red-200'
            : 'border-gray-200 focus:ring-2 focus:ring-[#711F2C] focus:ring-opacity-20 focus:border-[#711F2C]'
        } ${isOpen ? 'border-[#711F2C] ring-2 ring-[#711F2C] ring-opacity-20' : ''} ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'
        }`}
      >
        <span
          className={`flex-1 text-right ${
            value ? 'text-gray-900 font-medium' : 'text-gray-500'
          }`}
        >
          {displayLabel}
        </span>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <ul className="max-h-64 overflow-y-auto">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-3 text-right transition-colors duration-150 text-sm font-medium ${
                    value === option.value
                      ? 'bg-brand-50 text-brand-700 border-l-4 pl-2'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  dir={dir}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
