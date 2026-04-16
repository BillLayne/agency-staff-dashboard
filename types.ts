
export type SearchMode = 'agency' | 'web' | 'realestate' | 'people' | 'onedrive';

export interface Portal {
  id: string;
  name: string;
  url: string;
  icon: string;
  description: string;
  custom?: boolean;
  image?: string;
  color?: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

export interface CustomContext {
  id: string;
  name: string;
  text: string;
}

// FIX: Add and export the Favorite type.
export interface Favorite {
  id: string;
  name: string;
  url: string;
  description: string;
}

export interface ImageLink {
  id: string;
  name: string;
  url: string;
}

export interface Communication {
  id: string;
  type: 'call' | 'email' | 'note';
  text: string;
  timestamp: number;
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  data: string; // Base64 string
}

export interface Task {
  id: string;
  text: string; // This will act as the main title of the task
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: number;
  lastModified?: number; // Track for stale tasks

  // Detailed Task Fields
  customerName?: string;
  phone?: string;
  email?: string;
  emailDeepLink?: string; // Direct link to Gmail/Outlook thread
  agencyMatrixLink?: string; // Direct link to Agency Matrix Customer Profile
  customerValue?: number; // Premium
  taskType?: string; // e.g., 'Policy Change', 'New Quote', 'Follow-up'
  followUpDate?: string | null;
  carrier?: string;
  policyNumber?: string;
  description?: string; // More detailed description
  internalNotes?: string;
  isRecurring?: boolean;
  
  // Communication Log & Extras
  communications?: Communication[];
  subtasks?: Subtask[];
  attachments?: TaskAttachment[];
}

export interface HistoryItem {
  id: string;
  link: string;
  deletehash: string;
  name: string;
  createdAt: number;
  groups: string[];
  base64?: string; // Store base64 for AI editing
}

export interface ImgurUploadResponse {
    success: boolean;
    status: number;
    data: {
        id: string;
        link: string;
        deletehash: string;
        error?: string;
        type?: string;
    };
}

// FIX: Added EmailState interface to resolve import error in emailEngine.ts
export interface EmailState {
  agencyName: string;
  agencyPhone: string;
  totalInvestment?: string;
  monthlyPayment?: string;
  sixMonthPayment?: string;
  annualPayment?: string;
  paymentNote?: string;
  customHeroImage?: string;
  preheaderText?: string;
  carrierLogoUrl?: string;
  templateType?: 'proof' | 'payment' | 'cancellation' | 'quote' | 'welcome' | 'renewal' | string;
}
