
import React, { useState, useRef, useEffect } from 'react';
import type { SearchMode } from '../types';
import { MODE_META, NC_COUNTY_GIS_DATA, DEFAULT_INSURANCE_PORTALS } from '../constants';
import Modal from './Modal';
import { GoogleGenAI } from "@google/genai";

interface SearchCardProps {
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
  searchCount: number;
  onSearch: () => void;
}

const SEARCH_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown Gemini error';
};

const shouldRetryOnFallback = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: number }).status) : undefined;
  return status === 429 || status === 503 || message.includes('quota') || message.includes('high demand') || message.includes('resource_exhausted') || message.includes('unavailable');
};

const generateWithFallback = async (ai: GoogleGenAI, request: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>) => {
  let lastError: unknown;
  for (const model of SEARCH_MODELS) {
    try {
      return await ai.models.generateContent({ ...request, model });
    } catch (error) {
      lastError = error;
      if (!shouldRetryOnFallback(error) || model === SEARCH_MODELS[SEARCH_MODELS.length - 1]) {
        throw error;
      }
    }
  }
  throw lastError;
};

const parseJsonFromText = <T,>(text: string): T => {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI did not return valid JSON.');
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as T;
};

const SearchCard: React.FC<SearchCardProps> = ({ addToast, searchCount, onSearch }) => {
  const [mode, setMode] = useState<SearchMode>('agency');
  const [query, setQuery] = useState('');
  const [isGisModalOpen, setIsGisModalOpen] = useState(false);
  const [gisInfo, setGisInfo] = useState<{ county: string; url: string; note?: string } | null>(null);
  const [isGisSearching, setIsGisSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportHtml, setReportHtml] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  
  // Real Estate Files State
  const [propertyFiles, setPropertyFiles] = useState<File[]>([]);
  const propertyFileInputRef = useRef<HTMLInputElement>(null);

  // Notes Modal State
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isNotesMinimized, setIsNotesMinimized] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isOrganizingNotes, setIsOrganizingNotes] = useState(false);
  
  // Notes File Staging State
  const [isProcessingNotesFile, setIsProcessingNotesFile] = useState(false);
  const [stagedNotesFile, setStagedNotesFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);
  const notesFileInputRef = useRef<HTMLInputElement>(null);

  const GOOGLE_DRIVE_CONSTANTS = {
      agencyEmail: 'docs@billlayneinsurance.com',
      clientsFolderId: '11O0Cm9gOdgXp_j8OXMO4Pm5tqh18uXd5'
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      
      // Audit Memo Shortcuts: 
      // 1. Alt + N (Legacy)
      // 2. Ctrl + Shift + M (Memo/Compliance Studio) - Matches Ctrl+M pattern
      if ((e.altKey && e.key.toLowerCase() === 'n') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm')) {
          e.preventDefault();
          if (query.trim()) {
            setCustomerName(query.trim());
          }
          setIsNotesModalOpen(true);
          setIsNotesMinimized(false);
          addToast('Audit Memo Studio Opened', 'info');
          return;
      }

      if (e.altKey) {
          const key = e.key.toLowerCase();
          let newMode: SearchMode | null = null;
          let modeName = '';
          switch(key) {
              case 'w': newMode = 'web'; modeName = 'Web Search'; break;
              case 'h': newMode = 'realestate'; modeName = 'Real Estate'; break;
              case 'p': newMode = 'people'; modeName = 'People Search'; break;
              case 'f': newMode = 'onedrive'; modeName = 'Client Folder'; break;
          }
          if (newMode) {
              e.preventDefault();
              setMode(newMode);
              inputRef.current?.focus();
              addToast(`Switched to ${modeName}`, 'info');
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addToast, query]);

  const handleSearch = () => {
    if (!query.trim()) {
      addToast('Please enter a search term', 'warning');
      inputRef.current?.focus();
      return;
    }
    onSearch();
    let url = '';
    switch (mode) {
      case 'agency':
        const selection = /\d+/.test(query) ? "Address" : "Name";
        url = `https://agents.agencymatrix.com/#/customer/search?selection=${selection}&query=${encodeURIComponent(query)}`;
        break;
      case 'web':
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'realestate':
        url = `https://www.zillow.com/homes/${encodeURIComponent(query)}_rb/`;
        break;
      case 'people':
        url = `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(query)}`;
        break;
      case 'onedrive': {
        const clientName = query.trim();
        url = `https://drive.google.com/drive/u/1/search?q=${encodeURIComponent(clientName)}`;
        break;
      }
    }
    window.open(url, '_blank');
    addToast(`Searching ${mode}...`, 'info');
    setQuery('');
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
          };
          reader.onerror = (error) => reject(error);
      });
  };

  const handlePropertyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const newFiles = Array.from(e.target.files);
          setPropertyFiles(prev => [...prev, ...newFiles]);
          addToast(`${newFiles.length} file(s) attached for analysis.`, 'info');
      }
  };

  const removePropertyFile = (index: number) => {
      setPropertyFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getCountyFromAddress = (address: string): string | null => {
    const lowerAddress = address.toLowerCase();
    for (const countyKey in NC_COUNTY_GIS_DATA) {
      if (lowerAddress.includes(countyKey)) return countyKey;
    }
    return null;
  };

  const handleGisSearch = async () => {
    if (!query.trim()) {
      addToast('Please enter an address for GIS search.', 'warning');
      inputRef.current?.focus();
      return;
    }
    setIsGisSearching(true);
    try {
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) throw new Error("API key not found.");
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const prompt = `Analyze this North Carolina property address: "${query}".
Find the official county GIS or county tax parcel viewer for this address.
Return ONLY a JSON object in this shape and no extra text:
{"county":"...","url":"...","note":"..."}
If you are uncertain, still provide the most likely official county source and explain briefly in note.`;
        const response = await generateWithFallback(ai, {
            contents: prompt,
            config: { tools: [{googleSearch: {}}] }
        });
        if (!response.text) throw new Error("AI returned empty response.");
        const data = parseJsonFromText<{ county?: string; url: string; note?: string }>(response.text);
        setGisInfo({ county: data.county || 'Unknown County', url: data.url, note: data.note });
        setIsGisModalOpen(true);
        addToast(`Found GIS for ${data.county}`, 'success');
    } catch (error) {
        const countyKey = getCountyFromAddress(query);
        if (countyKey && NC_COUNTY_GIS_DATA[countyKey]) {
            const countyData = NC_COUNTY_GIS_DATA[countyKey];
            setGisInfo({ county: countyData.name, url: countyData.url.replace('{query}', encodeURIComponent(query)), note: countyData.note });
            setIsGisModalOpen(true);
            addToast('Using local database.', 'info');
        } else {
            addToast(`GIS Search failed: ${getErrorMessage(error)}`, 'danger');
        }
    } finally {
        setIsGisSearching(false);
    }
  };
  
  const handleGenerateReport = async () => {
    if (!query.trim()) {
        addToast('Please enter an address.', 'warning');
        return;
    }
    setIsGeneratingReport(true);
    setIsReportModalOpen(true);
    setReportHtml('');
    setReportSubject('');

    try {
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) throw new Error("API key not found.");
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const researchPrompt = `
You are a Senior Property Risk Underwriter & Agent Strategist at Bill Layne Insurance Agency.
Research this property using search and attached evidence:
"${query.trim()}"

Return concise factual research notes only. Include:
1. Year built, square footage, lot size, property type, likely construction.
2. Roof, plumbing, HVAC, basement/crawlspace, and any visible underwriting concerns.
3. Estimated replacement cost range using rough NC rebuild assumptions.
4. Flood information, protection class clues, hydrant/station proximity if available.
5. Carrier fit notes for NC Grange, Alamance, Nationwide, Travelers, Progressive, National General, and Foremost.
6. 3 short client talking points.
7. Direct links for Zillow, Realtor, and the official county GIS/tax viewer.

Keep it factual and compact. No HTML.`;

        const parts: any[] = [{ text: researchPrompt }];
        for (const file of propertyFiles) {
            const base64 = await fileToBase64(file);
            parts.push({ inlineData: { mimeType: file.type, data: base64 } });
        }

        const researchResponse = await generateWithFallback(ai, {
            contents: { parts },
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        if (!researchResponse.text) throw new Error("Property research failed.");

        const reportPrompt = `
You are building a polished HTML property intelligence report for Bill Layne Insurance Agency.

PROPERTY ADDRESS:
${query.trim()}

RESEARCH NOTES:
${researchResponse.text}

Create a compact HTML report with:
- subject
- htmlBody

Report requirements:
- Use clean table-based HTML only.
- Black or dark navy header with Bill Layne logo: https://i.imgur.com/lxu9nfT.png
- Alternating row colors (#F9FAFB and #FFFFFF)
- Include sections for Master Specifications, Replacement Cost Estimate, Systems & Risk Exposure, Carrier Appetite Scoring, Environmental & FEMA, Client Talking Points, and Quick Links.
- Quick Links must include Zillow, Realtor, and County GIS as clickable links/buttons.
- Keep it dense, readable, and useful for an agent talking to a client.

Return ONLY a JSON object in this exact shape:
{"subject":"...","htmlBody":"..."}
`;

        const response = await generateWithFallback(ai, {
            contents: reportPrompt,
        });

        if (!response.text) throw new Error("Content generation failed.");
        const data = parseJsonFromText<{ subject: string; htmlBody: string }>(response.text);
        setReportHtml(data.htmlBody);
        setReportSubject(data.subject);
        addToast('High-Intelligence Report Generated!', 'success');
    } catch (error) {
        console.error(error);
        addToast(`Report generation failed: ${getErrorMessage(error)}`, 'danger');
        setIsReportModalOpen(false);
    } finally {
        setIsGeneratingReport(false);
    }
  };

  const handleReportDownload = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportSubject.replace(/ /g, '_').replace(/[^a-z0-9_]/gi, '') || 'property_report'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReportPrint = () => {
      if (!reportHtml) return;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(reportHtml);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
      }
  };

  const handleReportEmail = async () => {
      if (!reportHtml) return;
      let contentToCopy = reportHtml;
      const bodyContentMatch = reportHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyContentMatch && bodyContentMatch[1]) contentToCopy = bodyContentMatch[1];
      try {
          const blob = new Blob([contentToCopy], { type: 'text/html' });
          // @ts-ignore
          const clipboardItem = new ClipboardItem({ 'text/html': blob });
          // @ts-ignore
          await navigator.clipboard.write([clipboardItem]);
          addToast('Ready for Gmail! Paste now.', 'success');
      } catch (error) {
          addToast('Direct copy failed. Code copied to clipboard.', 'info');
          await navigator.clipboard.writeText(reportHtml);
      }
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(reportSubject)}`, '_blank');
  };

  const handleNewFolder = () => {
    if (query.trim()) {
        const clientName = query.trim();
        window.open(`https://drive.google.com/drive/u/1/search?q=${encodeURIComponent(clientName)}`, '_blank');
    } else {
        window.open(`https://drive.google.com/drive/u/1/folders/1lqq_4WpQgydfChWVKZRB-PBNWTZy8ulz`, '_blank');
    }
  };

  const handleNotesOpen = () => {
    if (query.trim()) setCustomerName(query.trim());
    setIsNotesModalOpen(true);
    setIsNotesMinimized(false);
  };

  const handleOrganizeNotes = async () => {
    if (!customerNotes.trim()) return;
    setIsOrganizingNotes(true);
    try {
        const estTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
        const prompt = `
        Act as a Senior E&O (Errors & Omissions) Risk Compliance Officer for Bill Layne Insurance Agency. 
        Your task is to transform the following raw agent notes and pasted email content into a professional, high-density, audit-proof CRM memo.

        **MISSION:** 
        Protect the agency by meticulously documenting what was requested and exactly what was done.

        **CURRENT AGENT FULFILLMENT TIME (EST):** ${estTime}

        **INPUT TEXT:**
        ---
        ${customerNotes}
        ---

        **STRICT AUDIT FORMAT:**
        1. **REQUEST SUMMARY:** Clearly state what the client requested by parsing any pasted email headers or thread content. Identify WHO requested WHAT and WHEN (from the email metadata).
        2. **ACTION TAKEN:** Precisely document the agent's performance based on the manual remarks provided. If the agent says "I sent it" or "I processed it", use the **CURRENT AGENT FULFILLMENT TIME** provided above to document the exact timestamp of fulfillment.
        3. **CHRONOLOGY:** Create a clear timeline: [Request Received Timestamp] -> [Agent Action Timestamp].
        4. **STATUS:** (e.g., COMPLETED, PENDING UW, VOIDED).
        
        Keep it concise, professional, and clear of jargon. Return ONLY the bulleted memo text.
        `;
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) throw new Error("API key not found.");
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const response = await generateWithFallback(ai, {
          contents: prompt,
          config: {
            systemInstruction: 'You are a senior E&O compliance assistant for an independent insurance agency. Return concise, audit-ready CRM memo text only.',
          },
        });
        if (response.text) setCustomerNotes(response.text);
        addToast('E&O Smart Memo Generated!', 'success');
    } catch (e) {
        addToast(`Failed to build memo`, 'danger');
    } finally {
        setIsOrganizingNotes(false);
    }
  };

  const handleNotesFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
          const base64 = await fileToBase64(file);
          setStagedNotesFile({ data: base64, mimeType: file.type, name: file.name });
          addToast(`Document "${file.name}" staged. Add your context and process.`, 'info');
      } catch (error) {
          addToast('Failed to stage file.', 'danger');
      } finally {
          if (e.target) e.target.value = '';
      }
  };

  const handleProcessNotesAi = async () => {
      if (!stagedNotesFile) return;
      
      setIsProcessingNotesFile(true);
      try {
          const estTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
          const API_KEY = process.env.API_KEY;
          if (!API_KEY) throw new Error("API key not found.");
          const ai = new GoogleGenAI({ apiKey: API_KEY });

          const prompt = `
            Act as a Senior E&O (Errors & Omissions) Compliance Expert at Bill Layne Insurance Agency.
            
            **CURRENT FULFILLMENT TIMESTAMP (EST):** ${estTime}

            **SOURCE:**
            The agent has provided these manual remarks/context:
            ---
            ${customerNotes || 'No manual remarks provided.'}
            ---

            **YOUR TASK:**
            1. Parse the attached document (PDF or Image) for specific change requests, dates of loss, or carrier confirmations.
            2. Merge this with the agent's remarks above.
            3. Generate an "Audit-Ready CRM Memo" that protects the agent and agency.
            
            **MEMO REQUIREMENTS:**
            - **REQUEST:** Summarize the client/third-party request found in the doc or notes.
            - **ACTION:** Summarize the agent's work. If the agent indicates they fulfilled the request "now" or "today", use the **CURRENT FULFILLMENT TIMESTAMP** (${estTime}) for the log.
            - **TIMESTAMPS:** Extract any specific dates/times found in the communication history.
            - **DETAILS:** Carrier, Policy #, and specific endorsement/change details.
            
            Return ONLY a concise bulleted summary suitable for a CRM memo field.
          `;

          const response = await generateWithFallback(ai, {
              contents: {
                  parts: [
                      { text: prompt },
                      { inlineData: { mimeType: stagedNotesFile.mimeType, data: stagedNotesFile.data } }
                  ]
              }
          });

          if (!response.text) throw new Error("AI returned empty response.");
          
          const summary = response.text.trim();
          setCustomerNotes(prev => prev ? `${prev}\n\n--- AUDIT MEMO (${stagedNotesFile.name}) ---\n${summary}` : summary);
          setStagedNotesFile(null);
          addToast('Document audit completed!', 'success');

      } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          addToast(`Audit failed: ${msg}`, 'danger');
      } finally {
          setIsProcessingNotesFile(false);
      }
  };

  const handleNotesSave = async () => {
      if (!customerName.trim() || !customerNotes.trim()) return;
      const estTs = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
      const timestampedNotes = `[CRM MEMO LOGGED: ${estTs}]\n${customerNotes}`;
      try { await navigator.clipboard.writeText(timestampedNotes); } catch (e) {}
      window.open(`https://agents.agencymatrix.com/#/customer/search?selection=${/\d+/.test(customerName) ? "Address" : "Name"}&query=${encodeURIComponent(customerName)}`, '_blank');
      handleNotesClose();
  };

  const handleNotesClose = () => {
    setIsNotesModalOpen(false);
    setIsNotesMinimized(false);
    setCustomerName('');
    setCustomerNotes('');
    setStagedNotesFile(null);
  };

  const modeButtons: { mode: SearchMode, icon: string, label: string, shortcut: string }[] = [
    { mode: 'agency', icon: 'fa-shield-halved', label: 'Agency Matrix', shortcut: 'Ctrl + M' },
    { mode: 'web', icon: 'fa-brands fa-google', label: 'Web Search', shortcut: 'Alt + W' },
    { mode: 'realestate', icon: 'fa-solid fa-house', label: 'Real Estate', shortcut: 'Alt + H' },
    { mode: 'people', icon: 'fa-solid fa-user', label: 'People', shortcut: 'Alt + P' },
    { mode: 'onedrive', icon: 'fa-brands fa-google-drive', label: 'Client Folder', shortcut: 'Alt + F' },
  ];

  return (
    <>
      <div className="bg-white/90 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[26px] p-4 shadow-2xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-button-glow/20 sm:rounded-[32px] sm:p-6 md:p-7 relative overflow-hidden group">
        
        {/* Dynamic Background Mesh */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 mb-5 flex flex-col gap-3 sm:mb-7 md:flex-row md:items-end md:justify-between md:gap-4">
            <div>
                <h2 className="font-outfit text-[1.65rem] font-black tracking-tight text-slate-800 dark:text-text-dark sm:text-3xl md:text-4xl flex items-center gap-3 sm:gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-black/20 dark:from-white dark:to-slate-200 dark:text-slate-900 dark:shadow-white/10 sm:h-12 sm:w-12 sm:rounded-[16px]">
                        <i className="fa-solid fa-magnifying-glass-dollar text-lg sm:text-xl md:text-2xl"></i>
                    </span>
                    Unified Search
                </h2>
                <p className="mt-2 max-w-xl pl-1 text-[13px] font-medium leading-5 text-slate-500 dark:text-slate-300 sm:mt-3 sm:text-sm">
                    Access policies, property records, and document twins instantly.
                </p>
            </div>
            <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">System Online</span>
                 </div>
            </div>
        </div>

        <div className="relative z-10 mb-6 sm:mb-8">
          <div className="relative group/input transform hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-6 pointer-events-none">
                <i className={`fa-solid fa-magnifying-glass text-xl transition-colors duration-300 sm:text-2xl ${query ? 'text-primary dark:text-accent' : 'text-slate-300 dark:text-slate-600'}`}></i>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={MODE_META[mode].placeholder}
                className="w-full rounded-[24px] border-4 border-slate-100 bg-white py-4 pl-12 pr-16 text-lg font-black text-slate-800 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] outline-none transition-all placeholder:text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-700 dark:shadow-black/50 sm:rounded-[28px] sm:py-5 sm:pl-16 sm:pr-20 sm:text-xl md:text-2xl focus:border-primary/50 dark:focus:border-accent/50 backdrop-blur-xl"
              />
              <div className="absolute inset-y-0 right-2 flex items-center sm:right-3">
                  <button 
                    onClick={handleSearch}
                    className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-gradient-to-br from-primary to-primary-light text-white shadow-lg transition-all hover:scale-105 hover:shadow-primary/40 active:scale-95 sm:h-12 sm:w-12"
                  >
                      <i className="fa-solid fa-arrow-right text-base"></i>
                  </button>
              </div>
          </div>


          {/* REAL ESTATE MODE: Additional File Upload UI */}
          {mode === 'realestate' && (
              <div className="mt-4 animate-slide-down">
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-[24px] border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-lg">
                      <div className="flex-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-300 block mb-3 tracking-[2px]">Optional: Attach Evidence (Inspection/Appraisal/Photos)</label>
                          <div className="flex gap-3 items-center">
                              <button 
                                  onClick={() => propertyFileInputRef.current?.click()}
                                  className="px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-black text-primary dark:text-accent uppercase tracking-[2px] hover:shadow-md transition-all flex items-center gap-2 group/btn"
                              >
                                  <i className="fa-solid fa-paperclip text-base group-hover/btn:scale-110 transition-transform"></i> Attach Staging
                              </button>
                              <input type="file" multiple ref={propertyFileInputRef} onChange={handlePropertyFileChange} accept=".pdf,image/*" className="hidden" />
                              
                              <div className="flex flex-wrap gap-2">
                                  {propertyFiles.map((f, i) => (
                                      <div key={i} className="bg-primary/10 text-primary dark:text-accent px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center gap-2 border border-primary/20">
                                          <span className="truncate max-w-[120px]">{f.name}</span>
                                          <button onClick={() => removePropertyFile(i)} className="hover:text-red-500"><i className="fa-solid fa-times"></i></button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-300 font-black uppercase tracking-[2px] italic max-w-[200px] opacity-60 text-right">
                          AI will merge physical evidence with live data.
                      </div>
                  </div>
              </div>
          )}
          
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
             {modeButtons.map(btn => (
                <button 
                  key={btn.mode}
                  onClick={() => setMode(btn.mode)}
                  className={`shrink-0 rounded-xl border-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[2px] transition-all duration-300 flex items-center gap-2 whitespace-nowrap relative overflow-hidden group ${
                    mode === btn.mode 
                      ? 'bg-slate-900 dark:bg-primary border-slate-900 dark:border-primary text-white shadow-glow scale-105' 
                      : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary dark:hover:text-white'
                  }`}
                >
                  <i className={`fa-solid ${btn.icon} ${mode === btn.mode ? '' : 'text-slate-300 group-hover:text-primary dark:group-hover:text-white transition-colors'}`}></i> 
                  {btn.label}
                </button>
              ))}
          </div>
        </div>
        
        <div className={`relative z-10 grid grid-cols-2 gap-3 md:grid-cols-4 ${mode === 'realestate' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
          <button onClick={handleSearch} className="col-span-2 w-full rounded-[22px] bg-gradient-to-br from-slate-900 to-slate-800 py-4 text-white shadow-2xl transition-all hover:scale-[1.01] hover:shadow-button-glow active:scale-95 dark:from-primary dark:to-primary-light md:col-span-4 lg:col-span-1 font-black flex flex-col items-center justify-center gap-2 group min-h-[86px] sm:min-h-24">
              <i className="fa-solid fa-bolt text-xl group-hover:animate-pulse text-amber-300"></i>
              <span className="text-xs uppercase tracking-[2px]">Execute</span>
          </button>
          
          <button onClick={() => window.open("https://agents.agencymatrix.com/#/", "_blank")} className="bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 p-3 rounded-[22px] hover:border-primary/50 dark:hover:border-accent/50 hover:shadow-xl transition-all flex flex-col items-center justify-center gap-2 group text-center min-h-[86px] sm:min-h-24 backdrop-blur-md">
              <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/10 dark:group-hover:bg-accent/10 transition-colors">
                <i className="fa-solid fa-building-shield text-slate-400 group-hover:text-primary dark:group-hover:text-accent text-lg"></i>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-accent">Matrix Home</span>
          </button>

          <button onClick={() => window.open("https://agents.agencymatrix.com/customerEdit.php?id=0", "_blank")} className="bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 p-3 rounded-[22px] hover:border-primary/50 dark:hover:border-accent/50 hover:shadow-xl transition-all flex flex-col items-center justify-center gap-2 group text-center min-h-[86px] sm:min-h-24 backdrop-blur-md">
              <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/10 dark:group-hover:bg-accent/10 transition-colors">
                <i className="fa-solid fa-user-plus text-slate-400 group-hover:text-primary dark:group-hover:text-accent text-lg"></i>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-accent">New Prospect</span>
          </button>

          <button onClick={handleNewFolder} className="bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 p-3 rounded-[22px] hover:border-primary/50 dark:hover:border-accent/50 hover:shadow-xl transition-all flex flex-col items-center justify-center gap-2 group text-center min-h-[86px] sm:min-h-24 backdrop-blur-md">
              <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/10 dark:group-hover:bg-accent/10 transition-colors">
                <i className="fa-brands fa-google-drive text-slate-400 group-hover:text-primary dark:group-hover:text-accent text-lg"></i>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-accent">Cloud Folder</span>
          </button>

          <button onClick={handleNotesOpen} className="bg-gradient-to-br from-orange-50 to-white dark:from-white/5 dark:to-white/10 border-2 border-orange-100 dark:border-white/10 p-3 rounded-[22px] hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/10 transition-all flex flex-col items-center justify-center gap-2 group text-center min-h-[86px] sm:min-h-24 backdrop-blur-md">
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-note-sticky text-orange-500 text-lg"></i>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[2px] text-orange-600/70 dark:text-orange-400">Audit Memo</span>
          </button>

          {mode === 'realestate' && (
              <>
                <button onClick={handleGisSearch} disabled={isGisSearching} className="bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 p-3 rounded-[22px] hover:border-green-400/50 hover:shadow-xl transition-all flex flex-col items-center justify-center gap-2 group text-center min-h-[86px] sm:min-h-24 backdrop-blur-md">
                    <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                        {isGisSearching ? <i className="fa-solid fa-spinner fa-spin text-green-500"></i> : <i className="fa-solid fa-map-location-dot text-green-500 text-lg"></i>}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 dark:text-slate-300 group-hover:text-green-600">Tax GIS</span>
                </button>
                <button onClick={handleGenerateReport} disabled={isGeneratingReport || !query.trim()} className="bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 p-3 rounded-[22px] hover:border-purple-400/50 hover:shadow-xl transition-all flex flex-col items-center justify-center gap-2 group text-center min-h-[86px] sm:min-h-24 backdrop-blur-md">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        {isGeneratingReport ? <i className="fa-solid fa-spinner fa-spin text-purple-500"></i> : <i className="fa-solid fa-wand-magic-sparkles text-purple-500 text-lg"></i>}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[2px] text-slate-500 dark:text-slate-300 group-hover:text-purple-600">Risk Intel</span>
                </button>
              </>
          )}
        </div>


        <div className="mt-8 pt-5 border-t border-slate-100 dark:border-white/10">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-[2px] mb-4 pl-1">Master Carrier Gateway</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {DEFAULT_INSURANCE_PORTALS.map(portal => (
                    <a 
                        key={portal.id} 
                        href={portal.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="relative flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:shadow-glow transition-all duration-300 group/portal text-center min-h-24 overflow-hidden backdrop-blur-md bg-white/5"
                        style={{ 
                            backgroundColor: portal.color ? `${portal.color}1A` : undefined,
                            borderColor: portal.color ? `${portal.color}33` : undefined
                        }}
                    >

                        {/* Hover Background Fill */}
                        <div 
                            className="absolute inset-0 opacity-0 group-hover/portal:opacity-100 transition-opacity duration-300"
                            style={{ backgroundColor: portal.color }}
                        ></div>

                        {/* Icon / Image Container */}
                        <div className="relative z-10 mb-3 transition-transform duration-300 group-hover/portal:scale-110 flex items-center justify-center h-12 w-full">
                            {portal.image ? (
                                <img 
                                    src={portal.image} 
                                    alt={portal.name} 
                                    className="h-full w-auto object-contain group-hover/portal:brightness-0 group-hover/portal:invert transition-all duration-300" 
                                />
                            ) : (
                                <i 
                                    className={`${portal.icon} text-2xl transition-colors duration-300 group-hover/portal:text-white`}
                                    style={{ color: !portal.image ? (portal.color || '#94a3b8') : undefined }}
                                ></i>
                            )}
                        </div>

                        {/* Text */}
                        <span 
                            className="relative z-10 text-[9px] font-black uppercase tracking-widest leading-tight transition-colors duration-300 text-slate-600 dark:text-slate-400 group-hover/portal:text-white"
                        >
                            {portal.name}
                        </span>
                    </a>
                ))}
            </div>
        </div>
      </div>

      <Modal isOpen={isGisModalOpen} onClose={() => setIsGisModalOpen(false)} title="County GIS Architecture">
          {gisInfo && (
              <div className="text-center p-4">
                  <p className="mb-8 text-xl font-medium">GIS mapping identified for <span className="font-black text-[#2080a0] uppercase">{gisInfo.county}</span>.</p>
                  <a href={gisInfo.url} target="_blank" rel="noopener noreferrer" className="inline-block w-full bg-[#000000] text-white font-black py-5 px-8 rounded-[20px] shadow-2xl hover:bg-[#2080a0] transition-all uppercase tracking-widest text-xs">Access Official Map <i className="fa-solid fa-arrow-up-right-from-square ml-2"></i></a>
              </div>
          )}
      </Modal>

      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title={reportSubject || 'Engineering Risk Intel...'}>
        {isGeneratingReport && !reportHtml ? (
            <div className="flex flex-col items-center justify-center h-96 text-text-secondary-light">
                <div className="relative w-28 h-28 mb-8">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-[#2080a0] rounded-full border-t-transparent animate-spin"></div>
                    <i className="fa-solid fa-home absolute inset-0 flex items-center justify-center text-4xl text-[#2080a0]"></i>
                </div>
                <p className="font-black text-2xl text-[#000000] uppercase tracking-tighter">Parsing Property DNA...</p>
                <p className="text-[10px] mt-3 text-slate-400 uppercase tracking-[0.3em] font-black">Merging Zillow, GIS & FEMA Vectors</p>
            </div>
        ) : (
            <div>
                <div className="w-full h-[650px] bg-white border border-slate-100 rounded-[32px] overflow-hidden mb-8 shadow-inner">
                    <iframe srcDoc={reportHtml} title="AI Property Report" className="w-full h-full border-0" sandbox="allow-same-origin" />
                </div>
                <div className="flex items-center justify-end gap-4">
                    <button onClick={handleReportDownload} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-2 rounded-2xl hover:bg-gray-50 flex items-center gap-2"><i className="fa-solid fa-download"></i> Save HTML</button>
                    <button onClick={handleReportPrint} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-2 rounded-2xl hover:bg-gray-50 flex items-center gap-2"><i className="fa-solid fa-print"></i> Print</button>
                    <button onClick={handleReportEmail} className="px-8 py-3 text-xs font-black uppercase tracking-widest bg-[#000000] text-white rounded-2xl shadow-2xl hover:bg-[#2080a0] flex items-center gap-2"><i className="fa-solid fa-paper-plane"></i> Finalize for Gmail</button>
                </div>
            </div>
        )}
      </Modal>

      {isNotesModalOpen && !isNotesMinimized && (
        <Modal isOpen={true} onClose={handleNotesClose} title="Audit-Safe Compliance Memo">
            <div className="space-y-5">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={() => setIsNotesMinimized(true)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#2080a0] transition-colors flex items-center gap-2"><i className="fa-solid fa-window-minimize"></i> Minimize Studio</button>
                    <span className="text-[9px] font-black uppercase text-white bg-rose-500 px-3 py-1 rounded-full shadow-lg">Retina Audit Active</span>
                </div>
                <div className="relative group">
                    <i className="fa-solid fa-user absolute left-5 top-1/2 -translate-y-1/2 text-[#2080a0] text-sm"></i>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Client Primary Key" className="w-full bg-[#f8fafc] dark:bg-bg-dark border-2 border-transparent focus:border-[#2080a0] rounded-2xl py-4 pl-12 pr-4 font-black uppercase text-sm tracking-widest outline-none transition-all shadow-inner" />
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Interaction Source / Context</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => notesFileInputRef.current?.click()} 
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 rounded-xl flex items-center gap-2 transition-all ${stagedNotesFile ? 'bg-[#2080a0] text-white border-transparent shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-[#2080a0]'}`}
                                title="Attach doc twin"
                            >
                                <i className={`fa-solid ${stagedNotesFile ? 'fa-file-circle-check' : 'fa-paperclip'}`}></i>
                                {stagedNotesFile ? 'Source Ready' : 'Stage Doc'}
                            </button>
                            <input type="file" ref={notesFileInputRef} onChange={handleNotesFileChange} accept=".pdf,image/*" className="hidden" />
                            
                            <button onClick={handleOrganizeNotes} disabled={isOrganizingNotes} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-[#000000] text-white border-none rounded-xl flex items-center gap-2 hover:bg-[#2080a0] transition-all shadow-lg">
                                {isOrganizingNotes ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                                Build Audit
                            </button>
                        </div>
                    </div>
                    
                    {stagedNotesFile && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between animate-fade-in">
                            <div className="flex items-center gap-3">
                                <i className="fa-solid fa-file-invoice text-[#2080a0] text-lg"></i>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#2080a0] truncate max-w-[200px]">{stagedNotesFile.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleProcessNotesAi} 
                                    disabled={isProcessingNotesFile}
                                    className="px-4 py-1.5 bg-[#2080a0] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1a6882] transition-all flex items-center gap-2 shadow-md"
                                >
                                    {isProcessingNotesFile ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-shield-halved"></i>}
                                    Parse DNA
                                </button>
                                <button onClick={() => setStagedNotesFile(null)} className="text-slate-400 hover:text-rose-500 px-1 transition-colors"><i className="fa-solid fa-times"></i></button>
                            </div>
                        </div>
                    )}

                    <textarea 
                        value={customerNotes} 
                        onChange={(e) => setCustomerNotes(e.target.value)} 
                        placeholder="Paste email thread or raw action notes..." 
                        rows={10} 
                        className="w-full bg-[#f8fafc] dark:bg-bg-dark border-2 border-transparent focus:border-[#2080a0] rounded-[24px] py-5 px-6 font-bold text-sm outline-none transition-all resize-none shadow-inner custom-scrollbar" 
                    />
                </div>
                <div className="flex items-center gap-4 pt-3">
                    <button onClick={handleNotesSave} className="flex-1 bg-[#000000] text-white font-black py-4 rounded-[20px] shadow-2xl hover:bg-[#2080a0] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs">
                        <i className="fa-solid fa-share-from-square"></i>
                        Execute Sync & Matrix
                    </button>
                    <button onClick={handleNotesClose} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest border-2 rounded-[20px] hover:bg-gray-50 transition-colors">Discard</button>
                </div>
            </div>
        </Modal>
      )}
    </>
  );
};

export default SearchCard;
