import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import {
  CATEGORY_STYLES, DEFAULT_PINNED, PINNED_PROGRAMS_KEY, PROGRAMS, RECENT_PROGRAMS_KEY,
  readStoredProgramIds, recordProgramLaunch, resolveProgramDestination,
} from './ProgramLauncher';
import type { ProgramEntry } from './ProgramLauncher';
import { useCompanyContacts } from '../hooks/useCompanyContacts';
import type { CompanyContact, ContactDetail } from '../data/carrierContacts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onClientSearch: (query: string) => void;
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

type PaletteRow =
  | { kind: 'tool'; program: ProgramEntry }
  | { kind: 'client'; query: string }
  | { kind: 'contact'; company: CompanyContact; detail: ContactDetail };

const rowKey = (row: PaletteRow) => row.kind === 'tool' ? `tool-${row.program.id}`
  : row.kind === 'client' ? 'client-search'
    : JSON.stringify([row.company.id, row.detail.kind, row.detail.label, row.detail.value]);

const contactIcons: Record<ContactDetail['kind'], string> = {
  phone: 'fa-phone', fax: 'fa-fax', email: 'fa-envelope', website: 'fa-globe',
};

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onClientSearch, addToast }) => {
  const { directory } = useCompanyContacts();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (isOpen) { setQuery(''); setSelectedIndex(0); }
  }, [isOpen]);

  const rows = useMemo<PaletteRow[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      const programs = Object.fromEntries(PROGRAMS.map((program) => [program.id, program]));
      const ids = [...new Set([
        ...readStoredProgramIds(RECENT_PROGRAMS_KEY),
        ...readStoredProgramIds(PINNED_PROGRAMS_KEY, DEFAULT_PINNED),
      ])];
      return ids.filter((id) => programs[id]).slice(0, 8).map((id) => ({ kind: 'tool', program: programs[id] }));
    }

    const terms = trimmed.toLowerCase().split(/\s+/);
    const rank = (program: ProgramEntry) => {
      const title = program.title.toLowerCase();
      return title.startsWith(terms[0]) ? 0 : title.includes(terms[0]) ? 1 : 2;
    };
    const tools: PaletteRow[] = PROGRAMS.filter((program) => {
      const text = [program.title, program.description, program.category, program.note].join(' ').toLowerCase();
      return terms.every((term) => text.includes(term));
    }).sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))
      .slice(0, 6).map((program) => ({ kind: 'tool', program }));

    // Match every detail type, including saved corrections, by name, label, or value.
    const contacts: PaletteRow[] = directory.flatMap((company) => company.details.filter((detail) => {
      const text = [company.company, ...company.aliases, detail.label, detail.kind, detail.value].join(' ').toLowerCase();
      return terms.every((term) => text.includes(term));
    }).map((detail): PaletteRow => ({ kind: 'contact', company, detail })));

    const client: PaletteRow = { kind: 'client', query: trimmed };
    return [...tools, client, ...contacts];
  }, [directory, isOpen, query]);

  const activeIndex = Math.min(selectedIndex, Math.max(0, rows.length - 1));
  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, rows, isOpen]);

  const copyContact = async (row: Extract<PaletteRow, { kind: 'contact' }>) => {
    onClose();
    try {
      await navigator.clipboard.writeText(row.detail.value);
      addToast(`${row.company.company}: ${row.detail.label} copied.`);
    } catch {
      addToast(`Could not copy. ${row.company.company}, ${row.detail.label}: ${row.detail.value}`, 'danger');
    }
  };

  const renderRow = (row: PaletteRow, index: number) => {
    const shared = {
      id: `${listId}-${index}`,
      role: 'option',
      'aria-selected': index === activeIndex,
      'data-row-index': index,
      tabIndex: -1,
      className: 'palette-row',
      onMouseMove: () => setSelectedIndex(index),
    };

    if (row.kind === 'tool') {
      const styles = CATEGORY_STYLES[row.program.category];
      const destination = resolveProgramDestination(row.program);
      const content = <>
        <span className={`palette-icon ${styles.iconBg} ${styles.iconText}`}><i className={row.program.icon} aria-hidden="true" /></span>
        <span className="palette-row-copy">
          <span className="palette-title">{row.program.title}</span>
          <span className="palette-detail">{row.program.category}</span>
          <span className="palette-description">{row.program.description}</span>
        </span>
        <i className="fa-solid fa-arrow-up-right-from-square palette-action-icon" aria-hidden="true" />
      </>;
      return destination ? (
        <a key={rowKey(row)} {...shared} href={destination} target="_blank" rel="noopener noreferrer"
          aria-label={`Open ${row.program.title} in a new tab`}
          onClick={() => { recordProgramLaunch(row.program.id); onClose(); }}
          onAuxClick={(event) => { if (event.button === 1) recordProgramLaunch(row.program.id); }}>
          {content}
        </a>
      ) : (
        <button key={rowKey(row)} {...shared} type="button" aria-label={`${row.program.title}, local-only tool`}
          onClick={() => addToast(`${row.program.title} is a local-only tool. Open it from the local dashboard on this computer.`, 'warning')}>
          {content}
        </button>
      );
    }
    if (row.kind === 'client') {
      return (
        <button key={rowKey(row)} {...shared} type="button"
          onClick={() => { onClientSearch(row.query); onClose(); }}>
          <span className="palette-icon palette-client-icon"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /></span>
          <span className="palette-row-copy">
            <span className="palette-title">Search Agency Matrix for "{row.query}"</span>
            <span className="palette-detail">Client {/\d/.test(row.query) ? 'address' : 'name'}</span>
          </span>
          <i className="fa-solid fa-arrow-up-right-from-square palette-action-icon" aria-hidden="true" />
        </button>
      );
    }
    return (
      <button key={rowKey(row)} {...shared} type="button"
        aria-label={`Copy ${row.company.company}, ${row.detail.label}, ${row.detail.kind}: ${row.detail.value}`}
        onClick={() => void copyContact(row)}>
        <span className="palette-icon palette-contact-icon"><i className={`fa-solid ${contactIcons[row.detail.kind]}`} aria-hidden="true" /></span>
        <span className="palette-row-copy">
          <span className="palette-title">{row.company.company} - {row.detail.label}</span>
          <span className="palette-detail">{row.detail.kind}: {row.detail.value}</span>
        </span>
        <i className="fa-regular fa-copy palette-action-icon" aria-hidden="true" />
      </button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Command Palette" maxWidthClass="max-w-2xl" initialFocusRef={inputRef}>
      <div className="palette-search">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input ref={inputRef} type="text" role="combobox" aria-label="Search tools, clients, and contacts"
          aria-autocomplete="list" aria-controls={listId} aria-expanded={true}
          aria-activedescendant={rows.length ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off" spellCheck={false} value={query}
          onChange={(event) => setQuery(event.target.value)} placeholder="Tools, clients, contacts"
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const delta = event.key === 'ArrowDown' ? 1 : -1;
              setSelectedIndex(rows.length ? (activeIndex + delta + rows.length) % rows.length : 0);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              listRef.current?.querySelector<HTMLElement>(`[data-row-index="${activeIndex}"]`)?.click();
            }
          }} />
        {query && <button type="button" className="shell-icon-button" aria-label="Clear command search" title="Clear command search"
          onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>}
      </div>
      <div className="palette-result-count" role="status">{query.trim() ? `${rows.length} results` : 'Recent and pinned tools'}</div>
      <div ref={listRef} id={listId} role="listbox" aria-label="Commands and contacts" className="palette-results custom-scrollbar">
        {rows.map(renderRow)}
      </div>
      {rows.length === 0 && <p className="launcher-empty">No recent or pinned tools.</p>}
    </Modal>
  );
};

export default CommandPalette;
