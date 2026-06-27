import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from './Icon';

interface UserProfileDropdownProps {
  userName: string;
  userRole: 'user' | 'admin';
}

export default function UserProfileDropdown({ userName, userRole }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    const menuItems = getMenuItems();
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => (prev + 1) % menuItems.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => prev <= 0 ? menuItems.length - 1 : prev - 1);
        break;
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < menuItems.length) {
          menuItems[focusedIndex].onClick();
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/signin');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleProfileClick = () => {
    navigate('/user/main');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleAdminClick = () => {
    navigate('/Admin');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const getMenuItems = () => {
    const items = [];
    
    if (userRole === 'admin') {
      items.push({
        label: 'لوحة التحكم',
        icon: 'LayoutDashboard',
        onClick: handleAdminClick
      });
    }
    
    items.push(
      {
        label: 'صفحتي',
        icon: 'User',
        onClick: handleProfileClick
      },
      {
        label: 'تسجيل الخروج',
        icon: 'LogOut',
        onClick: handleLogout,
        isDestructive: true
      }
    );
    
    return items;
  };

  const menuItems = getMenuItems();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Welcome Chip */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 focus-visible:ring-2 ring-brand-600 ring-offset-2 flex items-center gap-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`مرحبًا، ${userName}`}
      >
        <span>مرحبًا، {userName}</span>
        <Icon 
          name="ChevronDown" 
          size={14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`w-full text-right px-3 py-2 text-sm transition-colors duration-200 flex items-center gap-2 ${
                  focusedIndex === index 
                    ? 'bg-gray-100' 
                    : item.isDestructive 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
