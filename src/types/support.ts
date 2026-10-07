/** متادیتای یک رژیم آپلودشده توسط کارشناس (PDF در IndexedDB) */
export interface DietPlan {
  id: string;
  clientNationalId: string;
  titleFa: string;
  titleEn: string;
  noteFa: string;
  noteEn: string;
  uploadedBy: string; // کد ملی کارشناس
  uploadedAt: string; // ISO
  fileName: string;
  sizeKb: number;
  storageKey: string; // کلید IndexedDB
  version: number;
}

export type TicketStatus = 'open' | 'answered' | 'closed';

export interface TicketMessage {
  id: string;
  authorRole: 'user' | 'coach';
  authorId: string;
  text: string;
  at: string;
}

export interface Ticket {
  id: string;
  clientNationalId: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}