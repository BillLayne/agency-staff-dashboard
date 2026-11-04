import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ProgramLauncherProps {
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

export type ProgramCategory = 'Operations' | 'Documents & Forms' | 'AI' | 'Property & Coverage';

export interface ProgramEntry {
  id: string;
  title: string;
  category: ProgramCategory;
  description: string;
  target: string;
  hostedTarget?: string;
  icon: string;
  accent: string;
  note: string;
  targetType: 'local' | 'web';
}

export const PROGRAMS: ProgramEntry[] = [
  {
    id: 'send-docs',
    title: 'Send Documents',
    category: 'Operations',
    description: 'Create and open the live Send Bill Docs agent link generator.',
    target: 'https://www.sendbilldocs.com/agent.html',
    icon: 'fa-solid fa-file-arrow-up',
    accent: 'from-sky-700 to-cyan-500',
    note: 'Live agent portal',
    targetType: 'web',
  },
  {
    id: 'bli-auto-rater',
    title: 'BLI Auto Rater',
    category: 'Operations',
    description: 'Rate NC personal auto quotes and build quote packets for Progressive and National General.',
    target: 'https://rater.billlayneinsurance.com/',
    hostedTarget: 'https://rater.billlayneinsurance.com/',
    icon: 'fa-solid fa-car',
    accent: 'from-blue-900 to-cyan-500',
    note: 'Live rater app',
    targetType: 'web',
  },
  {
    id: 'quote-follow-up',
    title: 'Quote Drip Follow Up',
    category: 'Operations',
    description: 'Open the live quote follow-up manager for drip campaigns and sales follow-up.',
    target: 'https://quote-follow-up-manager-cloudflare.pages.dev/',
    icon: 'fa-solid fa-envelopes-bulk',
    accent: 'from-indigo-700 to-violet-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
  {
    id: 'ai-task-manager',
    title: 'AI Task Manager',
    category: 'Operations',
    description: 'Open your AI-powered task manager for agency follow-ups, reminders, and daily work tracking.',
    target: 'https://ai-task-manager.bill-7e3.workers.dev',
    icon: 'fa-solid fa-list-check',
    accent: 'from-blue-950 to-cyan-500',
    note: 'Live Workers app',
    targetType: 'web',
  },
  {
    id: 'sms-command-center',
    title: 'SMS Command Center',
    category: 'Operations',
    description: 'Open the central Twilio text line for sending documents, insurance cards, receipts, images, and customer SMS replies.',
    target: 'https://agency-sms-command-center.bill-7e3.workers.dev',
    icon: 'fa-solid fa-comments',
    accent: 'from-emerald-900 to-teal-500',
    note: 'Live text line',
    targetType: 'web',
  },
  {
    id: 'renewal-gmail-program',
    title: 'Renewal Gmail Program',
    category: 'Operations',
    description: 'Open the renewal Gmail workflow for renewal-focused customer messages.',
    target: 'https://renewal-gmail-program.pages.dev/',
    hostedTarget: 'https://renewal-gmail-program.pages.dev/',
    icon: 'fa-solid fa-envelope-circle-check',
    accent: 'from-blue-900 to-cyan-500',
    note: 'Live Pages app',
    targetType: 'web',
  },
  {
    id: 'bli-task-board',
    title: 'BLI Docs Task Board',
    category: 'Operations',
    description: 'Open the staff task board to claim, edit, and clear incoming document requests.',
    target: 'https://bli-task-board.bill-7e3.workers.dev/',
    hostedTarget: 'https://bli-task-board.bill-7e3.workers.dev/',
    icon: 'fa-solid fa-clipboard-check',
    accent: 'from-teal-800 to-emerald-500',
    note: 'Live staff board',
    targetType: 'web',
  },
  {
    id: 'agency-quote-link-host',
    title: 'Hosted Quote Links',
    category: 'Operations',
    description: 'Create hosted quote and customer links for sending clean cloud URLs to clients.',
    target: 'https://agency-quote-link-host.bill-7e3.workers.dev/',
    hostedTarget: 'https://agency-quote-link-host.bill-7e3.workers.dev/',
    icon: 'fa-solid fa-link',
    accent: 'from-cyan-800 to-blue-500',
    note: 'Hosted link builder',
    targetType: 'web',
  },
  {
    id: 'claude-designer',
    title: 'Claude Designer',
    category: 'AI',
    description: 'Open the Claude Designer home workspace for all design projects.',
    target: 'https://claude.ai/design',
    hostedTarget: 'https://claude.ai/design',
    icon: 'fa-solid fa-pen-nib',
    accent: 'from-violet-800 to-fuchsia-500',
    note: 'Design workspace',
    targetType: 'web',
  },
  {
    id: 'claude-quotes',
    title: 'Claude Quotes',
    category: 'AI',
    description: 'Open your Claude quotes design project for building customer quote pages.',
    target: 'https://claude.ai/design/p/d400fd7a-9a6e-4086-acb5-e0997ea223f5',
    hostedTarget: 'https://claude.ai/design/p/d400fd7a-9a6e-4086-acb5-e0997ea223f5',
    icon: 'fa-solid fa-file-invoice-dollar',
    accent: 'from-violet-800 to-indigo-500',
    note: 'Quote design project',
    targetType: 'web',
  },
  {
    id: 'claude-gmail',
    title: 'Claude Gmail',
    category: 'AI',
    description: 'Open your Claude Gmail design project for building branded agency emails.',
    target: 'https://claude.ai/design/p/2d67b336-76a7-40c8-803f-68a57c3d947c',
    hostedTarget: 'https://claude.ai/design/p/2d67b336-76a7-40c8-803f-68a57c3d947c',
    icon: 'fa-solid fa-envelope-open-text',
    accent: 'from-fuchsia-800 to-rose-500',
    note: 'Email design project',
    targetType: 'web',
  },
  {
    id: 'claude-blog',
    title: 'Claude Blog',
    category: 'AI',
    description: 'Open your Claude blog design workspace for blog drafts, layouts, and web content.',
    target: 'https://claude.ai/design/p/01ed6d4c-a132-45db-8a01-569b7805b332',
    hostedTarget: 'https://claude.ai/design/p/01ed6d4c-a132-45db-8a01-569b7805b332',
    icon: 'fa-solid fa-newspaper',
    accent: 'from-orange-800 to-amber-500',
    note: 'Blog design workspace',
    targetType: 'web',
  },
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    category: 'AI',
    description: 'Open ChatGPT for general agency writing, planning, analysis, and AI assistance.',
    target: 'https://chatgpt.com/',
    hostedTarget: 'https://chatgpt.com/',
    icon: 'fa-solid fa-comments',
    accent: 'from-emerald-800 to-teal-500',
    note: 'General AI assistant',
    targetType: 'web',
  },
  {
    id: 'chatgpt-images',
    title: 'ChatGPT Images',
    category: 'AI',
    description: 'Open your insurance hero photos project for AI image creation.',
    target: 'https://chatgpt.com/g/g-p-6a2c92d88a6c8191bf5fce312ac56b7a-insurance-hero-photos/project',
    hostedTarget: 'https://chatgpt.com/g/g-p-6a2c92d88a6c8191bf5fce312ac56b7a-insurance-hero-photos/project',
    icon: 'fa-solid fa-image',
    accent: 'from-pink-800 to-rose-500',
    note: 'Hero photo project',
    targetType: 'web',
  },
  {
    id: 'grok',
    title: 'Grok',
    category: 'AI',
    description: 'Open Grok for AI research, writing, and second-opinion work.',
    target: 'https://grok.com/',
    hostedTarget: 'https://grok.com/',
    icon: 'fa-solid fa-robot',
    accent: 'from-slate-900 to-slate-500',
    note: 'AI assistant',
    targetType: 'web',
  },
  {
    id: 'html-studio',
    title: 'HTML Studio',
    category: 'Operations',
    description: 'Paste HTML from AI, inspect it live, switch mobile or desktop widths, and export clean preview files.',
    target: '/html-studio.html',
    hostedTarget: '/html-studio.html',
    icon: 'fa-solid fa-code',
    accent: 'from-slate-900 to-blue-600',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'insurance-cards',
    title: 'Insurance Card Generator',
    category: 'Documents & Forms',
    description: 'Generate and print customer insurance cards with a clean issuance flow.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\insurance-card-generator-2026-color-edition\\index.html',
    hostedTarget: 'https://insurance-card-generator-2026-color-edition.pages.dev/',
    icon: 'fa-solid fa-id-card',
    accent: 'from-indigo-700 to-blue-500',
    note: 'Standalone HTML tool',
    targetType: 'local',
  },
  {
    id: 'carrier-contact-pages',
    title: 'Carrier & Agency Contacts',
    category: 'Documents & Forms',
    description: 'Open the carrier and agency contact page index from the insurance card tool.',
    target: 'https://insurance-card-generator-2026-color-edition.pages.dev/contact-page-index',
    hostedTarget: 'https://insurance-card-generator-2026-color-edition.pages.dev/contact-page-index',
    icon: 'fa-solid fa-address-book',
    accent: 'from-teal-800 to-cyan-500',
    note: 'Live contact index',
    targetType: 'web',
  },
  {
    id: 'customer-reference-card',
    title: 'Customer Reference Card',
    category: 'Documents & Forms',
    description: 'Build the insurance customer reference card with agency details loaded.',
    target: 'https://insurance-card-generator-2026-color-edition.pages.dev/?builder=policy-reference&agency=1',
    hostedTarget: 'https://insurance-card-generator-2026-color-edition.pages.dev/?builder=policy-reference&agency=1',
    icon: 'fa-solid fa-clipboard-list',
    accent: 'from-indigo-800 to-sky-500',
    note: 'Live card builder',
    targetType: 'web',
  },
  {
    id: 'poi-generator',
    title: 'POI Generator',
    category: 'Documents & Forms',
    description: 'Parse carrier applications and build polished proof-of-insurance PDFs with Gemini.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\bill-layne-insurance-poi-generator\\index.html',
    hostedTarget: 'https://bill-layne-insurance-poi-generator.pages.dev',
    icon: 'fa-solid fa-file-pdf',
    accent: 'from-blue-800 to-cyan-500',
    note: 'Live cloud app',
    targetType: 'local',
  },
  {
    id: 'certificate-generator',
    title: 'Certificates',
    category: 'Documents & Forms',
    description: 'Open the live certificate platform for COIs and certificate work.',
    target: 'https://coi-certificates-certguard-ai.pages.dev/',
    icon: 'fa-solid fa-certificate',
    accent: 'from-teal-700 to-emerald-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
  {
    id: 'envelope-maker',
    title: 'Envelope Maker',
    category: 'Documents & Forms',
    description: 'Open the envelope addressing program for fast document mailings.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Envelope-Maker\\index.html',
    hostedTarget: 'https://envelope-maker-cte.pages.dev',
    icon: 'fa-solid fa-envelope',
    accent: 'from-fuchsia-700 to-rose-500',
    note: 'Hosted cloud app',
    targetType: 'local',
  },
  {
    id: 'receipt-maker',
    title: 'Receipt Maker',
    category: 'Documents & Forms',
    description: 'Create clean customer receipts for payments, confirmations, and recordkeeping.',
    target: 'https://billlayne.github.io/Receipt-Maker/index.html',
    hostedTarget: 'https://billlayne.github.io/Receipt-Maker/index.html',
    icon: 'fa-solid fa-receipt',
    accent: 'from-amber-700 to-yellow-500',
    note: 'Live hosted tool',
    targetType: 'web',
  },
  {
    id: 'nc-grange-down-payment',
    title: 'NC Grange Down Payment',
    category: 'Documents & Forms',
    description: 'Calculate NC Grange Mutual down payments and payment plan breakdowns for home insurance quotes.',
    target: '/nc-grange-down-payment-calculator.html',
    hostedTarget: '/nc-grange-down-payment-calculator.html',
    icon: 'fa-solid fa-calculator',
    accent: 'from-blue-900 to-emerald-500',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'quote-template-studio',
    title: 'Quote Template Studio',
    category: 'Documents & Forms',
    description: 'Open the live PDF-to-quote studio for building polished quote templates and proposal layouts.',
    target: 'https://quote-template-studio.pages.dev/',
    hostedTarget: 'https://quote-template-studio.pages.dev/',
    icon: 'fa-solid fa-file-lines',
    accent: 'from-blue-800 to-violet-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
  {
    id: 'pdf-quote-creator',
    title: 'PDF Quote Creator',
    category: 'Documents & Forms',
    description: 'Open the live quote image creator for building polished PDF-style quote visuals and exports.',
    target: 'https://insurance-quote-image-creator.bill-7e3.workers.dev/',
    hostedTarget: 'https://insurance-quote-image-creator.bill-7e3.workers.dev/',
    icon: 'fa-solid fa-file-image',
    accent: 'from-sky-800 to-indigo-500',
    note: 'Live Workers app',
    targetType: 'web',
  },
  {
    id: 'pdf-studio',
    title: 'PDF Studio',
    category: 'Documents & Forms',
    description: 'Split, combine, and reorder PDF and image pages right in the browser — nothing leaves your computer.',
    target: 'https://www.billlayneinsurance.com/pdf-tools/',
    hostedTarget: 'https://www.billlayneinsurance.com/pdf-tools/',
    icon: 'fa-solid fa-file-pdf',
    accent: 'from-rose-800 to-orange-500',
    note: 'Live on agency site',
    targetType: 'web',
  },
  {
    id: 'hazard-collages',
    title: 'ChatGPT Hazard Collage',
    category: 'AI',
    description: 'Create observation and hazard photo collages for inspections, underwriting, and client documentation.',
    target: 'https://chatgpt.com/g/g-p-6a0c8997403c8191897c34fba8e553e7-observation-hazard-photo-collage-generator/project',
    hostedTarget: 'https://chatgpt.com/g/g-p-6a0c8997403c8191897c34fba8e553e7-observation-hazard-photo-collage-generator/project',
    icon: 'fa-solid fa-triangle-exclamation',
    accent: 'from-orange-700 to-amber-500',
    note: 'Photo collage GPT',
    targetType: 'web',
  },
  {
    id: 'agency-password-vault',
    title: 'Agency Password Vault',
    category: 'Operations',
    description: 'Open the agency password vault for protected internal login references.',
    target: 'https://agency-password-vault.bill-7e3.workers.dev/',
    hostedTarget: 'https://agency-password-vault.bill-7e3.workers.dev/',
    icon: 'fa-solid fa-key',
    accent: 'from-yellow-700 to-amber-500',
    note: 'Secure password vault',
    targetType: 'web',
  },
  {
    id: 'gemini',
    title: 'Gemini',
    category: 'AI',
    description: 'Open Gemini for AI writing, research, and planning work.',
    target: 'https://gemini.google.com/u/1/app',
    hostedTarget: 'https://gemini.google.com/u/1/app',
    icon: 'fa-solid fa-gem',
    accent: 'from-blue-800 to-cyan-500',
    note: 'Google Gemini',
    targetType: 'web',
  },
  {
    id: 'gemini-flow',
    title: 'Gemini Flow',
    category: 'AI',
    description: 'Open Google Flow for AI video and visual creation workflows.',
    target: 'https://labs.google/fx/tools/flow',
    hostedTarget: 'https://labs.google/fx/tools/flow',
    icon: 'fa-solid fa-film',
    accent: 'from-purple-800 to-indigo-500',
    note: 'Google Flow',
    targetType: 'web',
  },
  {
    id: 'gemini-notebook-videos',
    title: 'Gemini Notebook Videos',
    category: 'AI',
    description: 'Open your Gemini notebook video workspace.',
    target: 'https://gemini.google.com/u/1/app/afb7cf7d6d569713',
    hostedTarget: 'https://gemini.google.com/u/1/app/afb7cf7d6d569713',
    icon: 'fa-solid fa-video',
    accent: 'from-cyan-800 to-blue-500',
    note: 'Notebook video workspace',
    targetType: 'web',
  },
  {
    id: 'photo-guide-creator',
    title: 'Photo Guide Creator',
    category: 'Documents & Forms',
    description: 'Build branded photo guide emails and layouts from the hosted photo guide composer.',
    target: '/photo-guide-composer.html',
    hostedTarget: '/photo-guide-composer.html',
    icon: 'fa-solid fa-images',
    accent: 'from-fuchsia-700 to-indigo-500',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'dl123-generator',
    title: 'DL123 Generator',
    category: 'Documents & Forms',
    description: 'Open the hosted DL123 maker for North Carolina driver license liability insurance certifications.',
    target: '/dl123-generator/index.html',
    hostedTarget: '/dl123-generator/index.html',
    icon: 'fa-solid fa-file-shield',
    accent: 'from-blue-900 to-cyan-500',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'cancellation-form',
    title: 'Cancellation Link Generator',
    category: 'Documents & Forms',
    description: 'Generate live cancellation form links for customers and policy changes.',
    target: 'https://thecancellationform.com/link-generator.html',
    icon: 'fa-solid fa-ban',
    accent: 'from-rose-700 to-red-500',
    note: 'Live link generator',
    targetType: 'web',
  },
  {
    id: 'cancellation-request',
    title: 'Cancellation Request',
    category: 'Documents & Forms',
    description: 'Open the agency e-signature workflow to prepare and send cancellation requests.',
    target: 'https://esign.billlayneinsurance.com/agent',
    hostedTarget: 'https://esign.billlayneinsurance.com/agent',
    icon: 'fa-solid fa-file-circle-xmark',
    accent: 'from-rose-700 to-orange-500',
    note: 'Agency e-signature portal',
    targetType: 'web',
  },
  {
    id: 'no-loss',
    title: 'No Loss Form Generator',
    category: 'Documents & Forms',
    description: 'Build live no-loss statement links from the agent portal.',
    target: 'https://mynolossform.com/agent-portal.html',
    icon: 'fa-solid fa-file-signature',
    accent: 'from-slate-700 to-slate-500',
    note: 'Live agent portal',
    targetType: 'web',
  },
  {
    id: 'home-inventory',
    title: 'Home Inventory',
    category: 'Property & Coverage',
    description: 'Guide clients through room-by-room inventory capture for better coverage reviews.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\HOME-INVENTORY\\index.html',
    hostedTarget: 'https://billlayne.github.io/HOME-INVENTORY/',
    icon: 'fa-solid fa-box-open',
    accent: 'from-violet-700 to-indigo-500',
    note: 'Standalone HTML tool',
    targetType: 'local',
  },
  {
    id: 'home-rebuild',
    title: 'Home Rebuild Estimator',
    category: 'Property & Coverage',
    description: 'Open the rebuild-cost estimator for replacement-cost conversations.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\HOME-REBUILD-ESTIMATOR\\public\\index.html',
    hostedTarget: 'https://home-rebuild-estimator.pages.dev',
    icon: 'fa-solid fa-house-circle-exclamation',
    accent: 'from-amber-700 to-orange-500',
    note: 'Public HTML entry',
    targetType: 'local',
  },
  {
    id: 'condo-coverage',
    title: 'Condo Coverage Calculator',
    category: 'Property & Coverage',
    description: 'Estimate walls-in condo coverage needs for HO-6 discussions.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\CONDO-COVERAGE-CALCULATOR\\public\\index.html',
    hostedTarget: 'https://condo-coverage-calculator.pages.dev',
    icon: 'fa-solid fa-building-user',
    accent: 'from-cyan-700 to-sky-500',
    note: 'Public HTML entry',
    targetType: 'local',
  },
  {
    id: 'nc-tools-property',
    title: 'NC Tools Property Lookup',
    category: 'Property & Coverage',
    description: 'Open the live NC insurance tools property lookup workspace.',
    target: 'https://nc-insurance-tools-gemini.pages.dev/',
    hostedTarget: 'https://nc-insurance-tools-gemini.pages.dev/',
    icon: 'fa-solid fa-map-location-dot',
    accent: 'from-emerald-700 to-teal-500',
    note: 'Live cloud app',
    targetType: 'web',
  },
  {
    id: 'agency-site',
    title: 'Agency Website',
    category: 'Operations',
    description: 'Open the local site build when you want your public pages close at hand.',
    target: 'C:\\Users\\bill\\OneDrive\\Documents\\Playground\\Bill-Layne-Insurance-Agency\\index.html',
    hostedTarget: 'https://www.billlayneinsurance.com',
    icon: 'fa-solid fa-earth-americas',
    accent: 'from-blue-900 to-slate-700',
    note: 'Local site entry',
    targetType: 'local',
  },
  {
    id: 'nc-grange-new-business',
    title: 'NC Grange New Business App & Photo Link',
    category: 'Documents & Forms',
    description: 'Open the NC Grange agent workflow for new-business applications and customer photo links.',
    target: 'https://sign.billlayneinsurance.com/agent',
    hostedTarget: 'https://sign.billlayneinsurance.com/agent',
    icon: 'fa-solid fa-file-circle-plus',
    accent: 'from-emerald-800 to-teal-500',
    note: 'New business app and photo links',
    targetType: 'web',
  },
  {
    id: 'sign-forms',
    title: 'Sign Forms',
    category: 'Documents & Forms',
    description: 'Open the agency e-signature workflow for preparing and sending forms for signature.',
    target: 'https://esign.billlayneinsurance.com/agent',
    hostedTarget: 'https://esign.billlayneinsurance.com/agent',
    icon: 'fa-solid fa-file-signature',
    accent: 'from-blue-800 to-cyan-500',
    note: 'Agency e-signature portal',
    targetType: 'web',
  },
  {
    id: 'late-pay',
    title: 'Late Pay',
    category: 'Operations',
    description: 'Open the late-payment text manager for customer payment reminders and follow-up.',
    target: 'https://late-pay-text-manager-gemini.bill-7e3.workers.dev/',
    hostedTarget: 'https://late-pay-text-manager-gemini.bill-7e3.workers.dev/',
    icon: 'fa-solid fa-clock-rotate-left',
    accent: 'from-amber-700 to-orange-500',
    note: 'Payment follow-up',
    targetType: 'web',
  },
  {
    id: 'auto-id-cards',
    title: 'Auto ID Card Maker',
    category: 'Documents & Forms',
    description: 'Generate 1 to 4 printable North Carolina insurance cards in the hosted staff tool.',
    target: 'https://insurance-card-generator-2026-color-edition.pages.dev/',
    hostedTarget: 'https://insurance-card-generator-2026-color-edition.pages.dev/',
    icon: 'fa-solid fa-id-card',
    accent: 'from-indigo-700 to-blue-500',
    note: 'Hosted in dashboard',
    targetType: 'web',
  },
  {
    id: 'digital-cards',
    title: 'Digital Cards',
    category: 'Documents & Forms',
    description: 'Open the digital insurance card dashboard for creating and managing customer cards.',
    target: 'https://cards.billlayneinsurance.com/cards-dashboard',
    hostedTarget: 'https://cards.billlayneinsurance.com/cards-dashboard',
    icon: 'fa-solid fa-address-card',
    accent: 'from-indigo-700 to-cyan-500',
    note: 'Digital card dashboard',
    targetType: 'web',
  },
  {
    id: 'pdf-creator',
    title: 'PDF Creator',
    category: 'Documents & Forms',
    description: 'Open the agency PDF tools workspace for creating and editing PDF documents.',
    target: 'https://www.billlayneinsurance.com/pdf-tools/',
    hostedTarget: 'https://www.billlayneinsurance.com/pdf-tools/',
    icon: 'fa-solid fa-file-pdf',
    accent: 'from-red-700 to-rose-500',
    note: 'Agency PDF tools',
    targetType: 'web',
  },
];

const CATEGORY_ORDER: ProgramCategory[] = ['Operations', 'Documents & Forms', 'AI', 'Property & Coverage'];

const CATEGORY_ICONS: Record<ProgramCategory, string> = {
  Operations: 'fa-solid fa-bolt',
  'Documents & Forms': 'fa-solid fa-folder-open',
  AI: 'fa-solid fa-wand-magic-sparkles',
  'Property & Coverage': 'fa-solid fa-house-circle-check',
};

export const CATEGORY_STYLES: Record<ProgramCategory, { iconBg: string; iconText: string }> = {
  Operations: {
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    iconText: 'text-[#0069bd] dark:text-sky-300',
  },
  'Documents & Forms': {
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconText: 'text-emerald-700 dark:text-emerald-300',
  },
  AI: {
    iconBg: 'bg-violet-50 dark:bg-violet-500/15',
    iconText: 'text-violet-700 dark:text-violet-300',
  },
  'Property & Coverage': {
    iconBg: 'bg-amber-50 dark:bg-amber-500/15',
    iconText: 'text-amber-700 dark:text-amber-300',
  },
};

const byProgramTitle = (a: ProgramEntry, b: ProgramEntry) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

const sortProgramsByTitle = (programs: ProgramEntry[]) => [...programs].sort(byProgramTitle);

export const RECENT_PROGRAMS_KEY = 'matrix-pro-recent-programs';
export const PINNED_PROGRAMS_KEY = 'matrix-pro-pinned-programs';
const LAUNCHER_VERSION_KEY = 'matrix-pro-launcher-version';

/**
 * DEFAULT_PINNED only applies to a browser that has never opened the dashboard, so tools
 * added later would otherwise never surface for an existing user. Bump LAUNCHER_VERSION and
 * list the new ids here: on next load they are pinned once and badged NEW. Unpinning still
 * sticks, because the version has already been recorded by then.
 */
const LAUNCHER_VERSION = 7;
const NEW_IN_VERSION: Record<number, string[]> = {
  2: ['bli-task-board', 'bli-mail-gateway', 'claude-quotes', 'claude-gmail'],
  3: ['pdf-studio'],
  4: ['bli-auto-rater'],
  5: ['nc-grange-new-business'],
  6: ['sign-forms'],
  7: ['cancellation-request'],
};

export const DEFAULT_PINNED: string[] = [
  'send-docs',
  'bli-auto-rater',
  'sms-command-center',
  'bli-task-board',
  'bli-mail-gateway',
  'certificate-generator',
  'poi-generator',
  'insurance-cards',
  'dl123-generator',
  'pdf-quote-creator',
  'pdf-studio',
  'no-loss',
  'agency-quote-link-host',
  'claude-designer',
  'hazard-collages',
  'carrier-contact-pages',
];

const PINNED_PREVIEW_LIMIT = 8;

const toFileUrl = (windowsPath: string) => encodeURI(`file:///${windowsPath.replace(/\\/g, '/')}`);

const isHostedDashboard = () =>
  window.location.protocol.startsWith('http') &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

/**
 * Where a program actually opens right now — hosted target on the live site,
 * file:/// locally. Returns null for a local-only tool viewed on the hosted
 * dashboard. Shared with the command palette so both open tools identically.
 */
export const resolveProgramDestination = (program: ProgramEntry): string | null => {
  const hosted = isHostedDashboard();
  if (hosted && program.targetType === 'local' && !program.hostedTarget) return null;
  return hosted && program.hostedTarget
    ? program.hostedTarget
    : program.targetType === 'web'
      ? program.target
      : toFileUrl(program.target);
};

export const readStoredProgramIds = (key: string, fallback: string[] = []): string[] => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return fallback;
  }
};

const PROGRAM_LAUNCHED_EVENT = 'matrix-pro-program-launched';

export const recordProgramLaunch = (programId: string) => {
  const ids = [programId, ...readStoredProgramIds(RECENT_PROGRAMS_KEY).filter((id) => id !== programId)].slice(0, 8);
  try {
    window.localStorage.setItem(RECENT_PROGRAMS_KEY, JSON.stringify(ids));
  } catch (error) {
    window.dispatchEvent(new CustomEvent('local-storage-error', { detail: { key: RECENT_PROGRAMS_KEY, error } }));
  }
  // Storage events do not fire in the writing tab. Update the mounted launcher too.
  window.dispatchEvent(new CustomEvent(PROGRAM_LAUNCHED_EVENT, { detail: { programId, ids } }));
};

const ProgramLauncher: React.FC<ProgramLauncherProps> = ({ addToast }) => {
  const [recentProgramIds, setRecentProgramIds] = useState(() => readStoredProgramIds(RECENT_PROGRAMS_KEY));
  const [pinnedProgramIds, setPinnedProgramIds] = useLocalStorage<string[]>(PINNED_PROGRAMS_KEY, DEFAULT_PINNED);
  const [seenVersion, setSeenVersion] = useLocalStorage<number>(LAUNCHER_VERSION_KEY, 1);
  const [filterQuery, setFilterQuery] = useState('');
  const [pinnedPage, setPinnedPage] = useState(0);
  const [storedCategory, setActiveCategory] = useLocalStorage<ProgramCategory | 'All'>('matrix-pro-launcher-category', 'All');
  const activeCategory: ProgramCategory | 'All' =
    storedCategory === 'All' || CATEGORY_ORDER.includes(storedCategory) ? storedCategory : 'All';
  const [newProgramIds, setNewProgramIds] = useState<string[]>([]);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const filterResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seenVersion >= LAUNCHER_VERSION) return;
    const freshIds = Object.entries(NEW_IN_VERSION)
      .filter(([version]) => Number(version) > seenVersion)
      .flatMap(([, ids]) => ids)
      .filter((id) => PROGRAMS.some((program) => program.id === id));
    if (freshIds.length > 0) {
      setPinnedProgramIds((previous) => [...previous, ...freshIds.filter((id) => !previous.includes(id))]);
      setNewProgramIds(freshIds);
    }
    setSeenVersion(LAUNCHER_VERSION);
  }, [seenVersion, setPinnedProgramIds, setSeenVersion]);

  useEffect(() => {
    const handleLaunch = (event: Event) => {
      const { programId, ids } = (event as CustomEvent<{ programId: string; ids: string[] }>).detail;
      setRecentProgramIds(ids);
      setNewProgramIds((previous) => previous.filter((id) => id !== programId));
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === RECENT_PROGRAMS_KEY || event.key === null) setRecentProgramIds(readStoredProgramIds(RECENT_PROGRAMS_KEY));
    };
    window.addEventListener(PROGRAM_LAUNCHED_EVENT, handleLaunch);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(PROGRAM_LAUNCHED_EVENT, handleLaunch);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const programMap = useMemo(() => Object.fromEntries(PROGRAMS.map((program) => [program.id, program])), []);
  const pinnedPrograms = useMemo(
    () => pinnedProgramIds.map((id) => programMap[id]).filter((program): program is ProgramEntry => Boolean(program)),
    [programMap, pinnedProgramIds]
  );
  const pageCount = Math.max(1, Math.ceil(pinnedPrograms.length / PINNED_PREVIEW_LIMIT));
  const currentPage = Math.min(pinnedPage, pageCount - 1);
  const visiblePinnedPrograms = pinnedPrograms.slice(currentPage * PINNED_PREVIEW_LIMIT, (currentPage + 1) * PINNED_PREVIEW_LIMIT);
  const recentPrograms = useMemo(
    () => recentProgramIds.map((id) => programMap[id]).filter((program): program is ProgramEntry => Boolean(program)).slice(0, 6),
    [programMap, recentProgramIds]
  );
  const normalizedFilter = filterQuery.trim().toLowerCase();
  const filteredPrograms = useMemo(() => {
    if (!normalizedFilter) return [];
    const terms = normalizedFilter.split(/\s+/);
    return sortProgramsByTitle(PROGRAMS.filter((program) => {
      const text = [program.title, program.description, program.category, program.note].join(' ').toLowerCase();
      return terms.every((term) => text.includes(term));
    }));
  }, [normalizedFilter]);
  const groupedPrograms = useMemo(
    () => CATEGORY_ORDER.filter((category) => activeCategory === 'All' || activeCategory === category).map((category) => ({
      category, items: sortProgramsByTitle(PROGRAMS.filter((program) => program.category === category)),
    })),
    [activeCategory]
  );

  const togglePin = (program: ProgramEntry) => {
    const wasPinned = pinnedProgramIds.includes(program.id);
    setPinnedProgramIds((previous) => previous.includes(program.id)
      ? previous.filter((id) => id !== program.id) : [...previous, program.id]);
    addToast(`${program.title} ${wasPinned ? 'unpinned' : 'pinned'}.`, wasPinned ? 'info' : 'success');
  };

  const unavailable = (program: ProgramEntry) => addToast(
    `${program.title} is a local-only tool. Open it from the local dashboard on this computer.`, 'warning'
  );

  const renderTile = (program: ProgramEntry, compact = false) => {
    const destination = resolveProgramDestination(program);
    const isPinned = pinnedProgramIds.includes(program.id);
    const isNew = newProgramIds.includes(program.id);
    const styles = CATEGORY_STYLES[program.category];
    const content = <>
      <span className="program-meta">
        <span className={`program-icon ${styles.iconBg} ${styles.iconText}`}><i className={program.icon} aria-hidden="true" /></span>
        {!compact && <span>{program.category}</span>}
        {isNew && <span className="program-new">New</span>}
      </span>
      <span className="program-title">{program.title}</span>
      {!compact && <span className="program-description">{program.description}</span>}
    </>;
    return (
      <div key={program.id} className={`program-card${compact ? ' program-card-compact' : ''}`} data-program-id={program.id}>
        {destination ? (
          <a className="program-link" href={destination} target="_blank" rel="noopener noreferrer"
            aria-label={`Open ${program.title} in a new tab`} title={program.description}
            onClick={() => recordProgramLaunch(program.id)}
            onAuxClick={(event) => { if (event.button === 1) recordProgramLaunch(program.id); }}>
            {content}
          </a>
        ) : (
          <button type="button" className="program-link" onClick={() => unavailable(program)}>{content}</button>
        )}
        <button type="button" aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${program.title}`}
          aria-pressed={isPinned} onClick={() => togglePin(program)}
          className={`shell-icon-button program-pin${isPinned ? ' is-pinned' : ''}`}
          title={isPinned ? 'Unpin tool' : 'Pin tool'}>
          <i className={`${isPinned ? 'fa-solid' : 'fa-regular'} fa-star`} aria-hidden="true" />
        </button>
      </div>
    );
  };

  return (
    <div className="program-launcher">
      <div className="launcher-heading">
        <h2>Tools <span className="section-count">{PROGRAMS.length}</span></h2>
        <div className="launcher-filter">
          <i className="fa-solid fa-filter" aria-hidden="true" />
          <input ref={filterInputRef} type="search" aria-label="Filter all tools" value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Enter' && filteredPrograms.length > 0) {
                event.preventDefault();
                filterResultsRef.current?.querySelector<HTMLAnchorElement>('.program-link')?.click();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                setFilterQuery('');
              }
            }}
            placeholder="Filter tools" />
          {filterQuery && <button type="button" className="shell-icon-button" aria-label="Clear tool filter" title="Clear tool filter"
            onClick={() => { setFilterQuery(''); filterInputRef.current?.focus(); }}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>}
        </div>
      </div>

      {normalizedFilter ? (
        <section aria-label="Tool results">
          <p className="launcher-result-count" role="status">{filteredPrograms.length} {filteredPrograms.length === 1 ? 'tool' : 'tools'}</p>
          {filteredPrograms.length > 0
            ? <div ref={filterResultsRef} className="program-grid">{filteredPrograms.map((program) => renderTile(program))}</div>
            : <p className="launcher-empty">No tools match "{filterQuery}".</p>}
        </section>
      ) : (
        <>
          {pinnedPrograms.length > 0 && (
            <section className="launcher-section" aria-labelledby="pinned-tools-heading">
              <div className="launcher-section-heading">
                <h3 id="pinned-tools-heading"><i className="fa-solid fa-star" aria-hidden="true" /> Pinned</h3>
                <div className="pin-pagination">
                  <span>{currentPage * PINNED_PREVIEW_LIMIT + 1}-{Math.min((currentPage + 1) * PINNED_PREVIEW_LIMIT, pinnedPrograms.length)} of {pinnedPrograms.length}</span>
                  {pageCount > 1 && <>
                    <button type="button" className="shell-icon-button" disabled={currentPage === 0}
                      onClick={() => setPinnedPage(currentPage - 1)} aria-label="Previous pinned tools" title="Previous pinned tools">
                      <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                    </button>
                    <button type="button" className="shell-icon-button" disabled={currentPage >= pageCount - 1}
                      onClick={() => setPinnedPage(currentPage + 1)} aria-label="Next pinned tools" title="Next pinned tools">
                      <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    </button>
                  </>}
                </div>
              </div>
              <div className="program-grid">{visiblePinnedPrograms.map((program) => renderTile(program, true))}</div>
            </section>
          )}

          {recentPrograms.length > 0 && (
            <section className="launcher-section" aria-labelledby="recent-tools-heading">
              <div className="launcher-section-heading">
                <h3 id="recent-tools-heading"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Recent</h3>
              </div>
              <div className="recent-tools">
                {recentPrograms.map((program) => {
                  const destination = resolveProgramDestination(program);
                  return destination && <a key={program.id} href={destination} target="_blank" rel="noopener noreferrer"
                    aria-label={`Open ${program.title} in a new tab`}
                    onClick={() => recordProgramLaunch(program.id)}
                    onAuxClick={(event) => { if (event.button === 1) recordProgramLaunch(program.id); }}>
                    <i className={program.icon} aria-hidden="true" /><span>{program.title}</span>
                  </a>;
                })}
              </div>
            </section>
          )}

          <section className="launcher-section" aria-labelledby="all-tools-heading">
            <div className="launcher-categories">
              <h3 id="all-tools-heading">All Tools</h3>
              <div className="category-buttons" role="group" aria-label="Tool category">
                {(['All', ...CATEGORY_ORDER] as Array<ProgramCategory | 'All'>).map((category) => (
                  <button key={category} type="button" aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>
                    {category}<span>{category === 'All' ? PROGRAMS.length : PROGRAMS.filter((program) => program.category === category).length}</span>
                  </button>
                ))}
              </div>
              <select className="category-select" aria-label="Tool category" value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value as ProgramCategory | 'All')}>
                {(['All', ...CATEGORY_ORDER] as Array<ProgramCategory | 'All'>).map((category) => (
                  <option key={category} value={category}>{category} ({category === 'All' ? PROGRAMS.length : PROGRAMS.filter((program) => program.category === category).length})</option>
                ))}
              </select>
            </div>
            {groupedPrograms.map((group) => (
              <section key={group.category} className="program-category" aria-label={group.category}>
                <h4><i className={`${CATEGORY_ICONS[group.category]} ${CATEGORY_STYLES[group.category].iconText}`} aria-hidden="true" />{group.category}</h4>
                <div className="program-grid">{group.items.map((program) => renderTile(program))}</div>
              </section>
            ))}
          </section>
        </>
      )}
    </div>
  );
};

export default ProgramLauncher;
