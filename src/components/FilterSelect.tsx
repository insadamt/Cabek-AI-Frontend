/**
 * App-styled, select-only filter control with keyboard navigation and native popover dismissal.
 * Depends on React, the browser Popover API and collection-filters.css; its top-layer menu escapes scrolling panels.
 */
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = options.findIndex((option) => option.value === value);

  useEffect(() => {
    const menu = menuRef.current;
    const details = triggerRef.current?.closest('details');
    function dismiss(event: Event) {
      if (event.target instanceof Node && menu?.contains(event.target)) return;
      menu?.hidePopover();
    }
    function dismissWithPanel() {
      if (!details?.open) menu?.hidePopover();
    }

    // A top-layer menu must close when its scrolling anchor moves or its parent disclosure closes.

    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    details?.addEventListener('toggle', dismissWithPanel);
    return () => {
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
      details?.removeEventListener('toggle', dismissWithPanel);
    };
  }, []);

  useEffect(() => {
    if (open) {
      menuRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  function showOptions(index = selectedIndex) {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const bounds = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(bounds.width, 240), window.innerWidth - 24);
    const spaceBelow = window.innerHeight - bounds.bottom - 20;
    const spaceAbove = bounds.top - 20;
    const above = spaceBelow < 220 && spaceAbove > spaceBelow;
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12))}px`;
    menu.style.maxHeight = `${Math.min(320, Math.max(0, above ? spaceAbove : spaceBelow))}px`;
    menu.style.top = above ? 'auto' : `${bounds.bottom + 6}px`;
    menu.style.bottom = above ? `${window.innerHeight - bounds.top + 6}px` : 'auto';
    setActiveIndex(
      index >= 0 && !options[index]?.disabled
        ? index
        : options.findIndex((option) => !option.disabled),
    );
    menu.showPopover();
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    menuRef.current?.hidePopover();
    triggerRef.current?.focus({ preventScroll: true });
    if (option.value !== value) onChange(option.value);
  }

  // Capture keyboard events before the parent details listener so Escape dismisses only the open select.

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const enabledIndices = options.flatMap((option, index) => (option.disabled ? [] : [index]));
    const current = enabledIndices.indexOf(open ? activeIndex : selectedIndex);
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown')
      nextIndex = enabledIndices[Math.min(current + 1, enabledIndices.length - 1)];
    if (event.key === 'ArrowUp') nextIndex = enabledIndices[Math.max(current - 1, 0)];
    if (event.key === 'Home') nextIndex = enabledIndices[0];
    if (event.key === 'End') nextIndex = enabledIndices.at(-1);
    if (nextIndex !== undefined) {
      event.preventDefault();
      if (open) setActiveIndex(nextIndex);
      else showOptions(nextIndex);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      menuRef.current?.hidePopover();
      return;
    }
    if (event.key === 'Tab') menuRef.current?.hidePopover();
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      selectOption(activeIndex);
      return;
    }
    if (
      event.key.length !== 1 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.key === ' '
    )
      return;
    event.preventDefault();
    const now = Date.now();
    const previous = now - searchRef.current.time < 700 ? searchRef.current.text : '';
    const query = previous === event.key ? event.key : previous + event.key;
    searchRef.current = { text: query, time: now };
    const start = open ? activeIndex : selectedIndex;
    const match = options.findIndex((_, offset) => {
      const option = options[(Math.max(start, 0) + offset + 1) % options.length];
      return (
        !option.disabled &&
        option.label.toLocaleLowerCase('fr').startsWith(query.toLocaleLowerCase('fr'))
      );
    });
    if (match >= 0) {
      const index = (Math.max(start, 0) + match + 1) % options.length;
      if (open) setActiveIndex(index);
      else showOptions(index);
    }
  }

  return (
    <div className="filter-select-field">
      <span id={`${id}-label`} className="filter-field-label">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className="filter-select-trigger"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-options`}
        aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => (open ? menuRef.current?.hidePopover() : showOptions())}
        onKeyDownCapture={handleKeyDown}
      >
        <span id={`${id}-value`}>{options[selectedIndex]?.label ?? 'Choisir'}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <div
        ref={menuRef}
        id={`${id}-options`}
        role="listbox"
        aria-labelledby={`${id}-label`}
        popover="auto"
        className="filter-select-menu"
        onBeforeToggle={(event) => setOpen(event.newState === 'open')}
        onPointerDown={(event) => event.preventDefault()}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={option.value === value}
            aria-disabled={option.disabled || undefined}
            data-active={index === activeIndex}
            className="filter-select-option"
            onPointerMove={() => !option.disabled && setActiveIndex(index)}
            onClick={() => selectOption(index)}
          >
            <span>{option.label}</span>
            {option.value === value && <Check size={15} aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}
