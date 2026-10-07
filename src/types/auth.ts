export type Role =
  | 'super_admin' | 'it_admin' | 'org_owner' | 'org_admin'
  | 'nutritionist' | 'coach'
  | 'doctor_internal' | 'doctor_sports' | 'doctor_radiology' | 'doctor_cardiology'
  | 'nurse' | 'rad_assistant' | 'cardio_assistant'
  | 'hr_admin' | 'hr_viewer' | 'reception' | 'event_manager' | 'data_analyst'
  | 'user';

export interface Session {
  nationalId: string;
  role: Role;
  issuedAt: number;
  expiresAt: number;
  lastActivityAt: number;
}

export interface UserAccount {
  nationalId: string;
  role: Role;
  active: boolean;
  passwordSalt: string | null;
  passwordHash: string | null;
  pinSalt: string | null;
  pinHash: string | null;
  permissions?: string[];
  deniedPermissions?: string[];
  orgId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AuditType = string;

export interface AuditEvent {
  id: string;
  type: AuditType;
  actorId: string;
  targetId?: string;
  at: number;
  meta?: string;
}

export const roleLabelsFa: Record<Role, string> = {
  super_admin: 'مدیر ارشد سیستم',
  it_admin: 'مدیر فناوری اطلاعات',
  org_owner: 'مالک سازمان',
  org_admin: 'مدیر سازمان',
  nutritionist: 'متخصص تغذیه',
  coach: 'مربی',
  doctor_internal: 'پزشک داخلی',
  doctor_sports: 'پزشک ورزشی',
  doctor_radiology: 'پزشک رادیولوژی',
  doctor_cardiology: 'پزشک قلب',
  nurse: 'پرستار',
  rad_assistant: 'دستیار رادیولوژی',
  cardio_assistant: 'دستیار قلب',
  hr_admin: 'مدیر منابع انسانی',
  hr_viewer: 'مشاهده‌گر منابع انسانی',
  reception: 'پذیرش',
  event_manager: 'مدیر رویداد',
  data_analyst: 'تحلیلگر داده',
  user: 'کاربر',
};

export const roleLabelsEn: Record<Role, string> = {
  super_admin: 'Super Admin',
  it_admin: 'IT Admin',
  org_owner: 'Organization Owner',
  org_admin: 'Organization Admin',
  nutritionist: 'Nutritionist',
  coach: 'Coach',
  doctor_internal: 'Internal Doctor',
  doctor_sports: 'Sports Doctor',
  doctor_radiology: 'Radiologist',
  doctor_cardiology: 'Cardiologist',
  nurse: 'Nurse',
  rad_assistant: 'Radiology Assistant',
  cardio_assistant: 'Cardiology Assistant',
  hr_admin: 'HR Admin',
  hr_viewer: 'HR Viewer',
  reception: 'Reception',
  event_manager: 'Event Manager',
  data_analyst: 'Data Analyst',
  user: 'User',
};