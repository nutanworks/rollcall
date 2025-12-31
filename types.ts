
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT'
}

export interface StudentCIE {
  cie1?: number;
  cie2?: number;
  assignment?: number;
  assignmentSubmitted?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for security in frontend display
  role: UserRole;
  createdAt: number;
  subjects?: string[]; // For Teachers
  teacherIds?: string[]; // For Students: IDs of teachers they are assigned to
  cie?: StudentCIE; // Detailed CIE Marks structure
  allowInvite?: boolean; // Admin permission for teachers to invite students
  totalClasses?: number; // Total number of classes conducted by the teacher
}

export interface JoinRequest {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  subject: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface NoticeAttachment {
  name: string;
  data: string; // Base64 string
  size: number; // bytes
}

export interface Notice {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  content: string;
  attachments: NoticeAttachment[];
  timestamp: number;
}

export interface QuestionPaper {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  year: string;
  title: string;
  fileName: string;
  fileData: string; // Base64
  uploadedAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface Subject {
  id: string;
  name: string;
}

export type NotificationType = 'info' | 'warning' | 'critical';

export interface SystemSettings {
  schoolName: string;
  academicYear: string;
  systemNotification: string;
  notificationType?: NotificationType;
}
