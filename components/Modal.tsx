import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const openLayers: HTMLElement[] = [];
const originalInert = new Map<HTMLElement, boolean>();
let originalOverflow = '';
let originalPaddingRight = '';

// One lock for the whole stack, including a confirmation over another dialog.
const syncModalBackground = () => {
  originalInert.forEach((inert, element) => { element.inert = inert; });
  originalInert.clear();
  const top = openLayers[openLayers.length - 1];
  if (!top) return;
  for (const child of Array.from(document.body.children)) {
    if (child instanceof HTMLElement && child !== top) {
      originalInert.set(child, child.inert);
      child.inert = true;
    }
  }
};

const canFocus = (element: HTMLElement) =>
  !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 &&
  window.getComputedStyle(element).visibility !== 'hidden';

const focusableElements = (dialog: HTMLElement) =>
  Array.from(dialog.querySelectorAll<HTMLElement>(
    'a[href], button, input, textarea, select, [tabindex], [contenteditable="true"]'
  )).filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && canFocus(element));

const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, children, maxWidthClass = 'max-w-md', initialFocusRef,
}) => {
  const titleId = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !layerRef.current || !dialogRef.current) return;
    const layer = layerRef.current;
    const dialog = dialogRef.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (openLayers.length === 0) {
      originalOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;
      const gutter = window.innerWidth - document.documentElement.clientWidth;
      if (gutter > 0) {
        document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gutter}px`;
      }
      document.body.style.overflow = 'hidden';
    }
    openLayers.push(layer);
    syncModalBackground();

    const focusInside = () => {
      const preferred = initialFocusRef?.current ?? dialog.querySelector<HTMLElement>(
        '[data-autofocus], input:not([type="hidden"]):not(:disabled), textarea:not(:disabled)'
      );
      (preferred && canFocus(preferred) ? preferred : focusableElements(dialog)[0] ?? dialog).focus({ preventScroll: true });
    };
    focusInside();
    const containFocus = (event: FocusEvent) => {
      if (openLayers[openLayers.length - 1] === layer && !dialog.contains(event.target as Node)) focusInside();
    };
    document.addEventListener('focusin', containFocus);

    return () => {
      document.removeEventListener('focusin', containFocus);
      const index = openLayers.indexOf(layer);
      if (index !== -1) openLayers.splice(index, 1);
      syncModalBackground();
      if (openLayers.length === 0) {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
      if (trigger?.isConnected && canFocus(trigger)) trigger.focus({ preventScroll: true });
      else {
        const fallback = openLayers[openLayers.length - 1]?.querySelector<HTMLElement>('[role="dialog"]') ??
          document.querySelector<HTMLElement>('[data-modal-focus-fallback]');
        fallback?.focus({ preventScroll: true });
      }
    };
  }, [isOpen, initialFocusRef]);

  if (!isOpen) return null;

  return createPortal(
    <div ref={layerRef} className="modal-layer fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-3 sm:p-4" onClick={(event) => {
      event.stopPropagation();
      if (event.target === event.currentTarget && openLayers[openLayers.length - 1] === layerRef.current) closeRef.current();
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-dialog flex max-h-[calc(100dvh-2rem)] w-full min-w-0 flex-col rounded-lg border border-neutral-200 bg-white text-neutral-900 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 ${maxWidthClass}`}
        onKeyDown={(event) => {
          // Stop native document/window hotkeys without swallowing input handlers.
          event.stopPropagation();
          if (openLayers[openLayers.length - 1] !== layerRef.current) return;
          if (event.key === 'Escape') {
            if (!event.defaultPrevented && !event.nativeEvent.isComposing) {
              event.preventDefault();
              closeRef.current();
            }
          } else if (event.key === 'Tab') {
            const items = focusableElements(event.currentTarget);
            const current = items.indexOf(document.activeElement as HTMLElement);
            const next = event.shiftKey
              ? (current <= 0 ? items.length - 1 : current - 1)
              : (current + 1) % items.length;
            event.preventDefault();
            (items[next] ?? event.currentTarget).focus();
          }
        }}
      >
        <div className="modal-heading flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2 dark:border-neutral-700">
          <h2 id={titleId} className="min-w-0 break-words text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`} title={`Close ${title}`} className="shell-icon-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-neutral-300 dark:hover:bg-neutral-800">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <div className="modal-content custom-scrollbar min-h-0 min-w-0 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
