import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledById?: string;
  lockTargetSelector?: string;
}

export default function Modal({ open, onClose, children, labelledById, lockTargetSelector }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const wheelListenerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const touchMoveListenerRef = useRef<((e: TouchEvent) => void) | null>(null);

  const ensureNoScrollStyle = () => {
    if (typeof document === 'undefined') return;
    const styleId = 'cm-no-scroll-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .cm-no-scroll{overflow:hidden!important;overscroll-behavior:none!important;position:fixed!important;width:100%!important}
        body.cm-no-scroll{overflow:hidden!important;overscroll-behavior:none!important;position:fixed!important;width:100%!important;height:100%!important}
      `;
      document.head.appendChild(style);
    }
  };

  const getScrollContainer = (): Element | null => {
    if (typeof document === 'undefined') return null;
    // Always lock body and html to prevent scrolling
    return document.body;
  };

  useEffect(() => {
    if (!open) {
      // Cleanup and focus restore when closing
      const body = document.body;
      const html = document.documentElement;
      
      if (body.classList.contains('cm-no-scroll')) {
        body.classList.remove('cm-no-scroll');
      }
      if (html.classList.contains('cm-no-scroll')) {
        html.classList.remove('cm-no-scroll');
      }
      
      if (wheelListenerRef.current) {
        document.removeEventListener('wheel', wheelListenerRef.current, { capture: true } as any);
      }
      if (touchMoveListenerRef.current) {
        document.removeEventListener('touchmove', touchMoveListenerRef.current, { capture: true } as any);
      }
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      return;
    }

    // Opening
    ensureNoScrollStyle();

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Lock both body and html to prevent scrolling
    const body = document.body;
    const html = document.documentElement;
    body.classList.add('cm-no-scroll');
    html.classList.add('cm-no-scroll');

    // Prevent wheel/touch scrolling outside the dialog panel
    const blockIfOutside = (target: EventTarget | null) => {
      const panel = dialogRef.current;
      if (!panel) return true;
      if (!(target instanceof Node)) return true;
      return !panel.contains(target);
    };

    const onWheel = (e: WheelEvent) => {
      if (blockIfOutside(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (blockIfOutside(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    wheelListenerRef.current = onWheel;
    touchMoveListenerRef.current = onTouchMove;

    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });

    // Focus the dialog
    if (dialogRef.current) {
      dialogRef.current.focus();
    }

    // Cleanup on unmount/close
    return () => {
      const body2 = document.body;
      const html2 = document.documentElement;
      
      if (body2.classList.contains('cm-no-scroll')) {
        body2.classList.remove('cm-no-scroll');
      }
      if (html2.classList.contains('cm-no-scroll')) {
        html2.classList.remove('cm-no-scroll');
      }
      
      document.removeEventListener('wheel', onWheel, { capture: true } as any);
      document.removeEventListener('touchmove', onTouchMove, { capture: true } as any);
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/50 opacity-0 animate-fadeIn overscroll-none"
      style={{ animation: 'fadeIn 200ms ease-out forwards', touchAction: 'none' }}
      onClick={handleOverlayClick}
      onTouchMove={(e) => {
        // Prevent touch move on overlay
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ touchAction: 'none' }}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledById}
          dir="rtl"
          className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl outline-none overflow-y-auto overscroll-contain max-h-[85vh] scale-95 opacity-0 animate-slideUp [-webkit-overflow-scrolling:touch]"
          style={{ animation: 'slideUp 250ms ease-out forwards', touchAction: 'pan-y' }}
          tabIndex={-1}
          onTouchMove={(e) => {
            // Allow scrolling inside dialog
            e.stopPropagation();
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
