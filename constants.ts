import { User, UserRole } from './types';

export const ADMIN_EMAIL = 'nutan123@gmail.com';
export const ADMIN_PASS = 'Admin@123';

export const INITIAL_ADMIN: User = {
  id: 'admin-001',
  name: 'System Admin',
  email: ADMIN_EMAIL,
  role: UserRole.ADMIN,
  createdAt: Date.now(),
};

export const MOCK_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'English Literature',
  'Computer Science',
  'History'
];
