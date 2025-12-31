
import { User, AttendanceRecord, UserRole, SystemSettings, Notice, JoinRequest, QuestionPaper } from '../types';
import { INITIAL_ADMIN, ADMIN_EMAIL, ADMIN_PASS } from '../constants';

const API_URL = '/api';

// --- MOCK STORAGE IMPLEMENTATION (Fallback) ---
// This allows the app to work even if the backend server is not running
const STORAGE_KEY_USERS = 'sa_users';
const STORAGE_KEY_ATTENDANCE = 'sa_attendance';
const STORAGE_KEY_SETTINGS = 'sa_settings';
const STORAGE_KEY_NOTICES = 'sa_notices';
const STORAGE_KEY_REQUESTS = 'sa_join_requests';
const STORAGE_KEY_PAPERS = 'sa_question_papers';

const DEFAULT_SETTINGS: SystemSettings = {
    schoolName: 'RollCall',
    academicYear: '2024-2025',
    systemNotification: '',
    notificationType: 'info'
};

const getLocalUsers = (): User[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_USERS);
        const users = stored ? JSON.parse(stored) : [];
        // Ensure admin exists in local storage for fallback login
        if (!users.find((u: User) => u.email === ADMIN_EMAIL)) {
            users.push(INITIAL_ADMIN);
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        }
        return users;
    } catch (e) {
        return [INITIAL_ADMIN];
    }
};

const getLocalAttendance = (): AttendanceRecord[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

const getLocalNotices = (): Notice[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_NOTICES);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

const getLocalRequests = (): JoinRequest[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_REQUESTS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

const getLocalPapers = (): QuestionPaper[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_PAPERS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

// Simulate network delay for realistic feel
const mockDelay = () => new Promise(resolve => setTimeout(resolve, 600));

const mockApi = {
    login: async (email: string, password: string, role: UserRole) => {
        await mockDelay();

        const normalizedEmail = email.toLowerCase().trim();
        const adminEmail = ADMIN_EMAIL.toLowerCase();

        // 1. Check Hardcoded Admin
        if (role === UserRole.ADMIN && normalizedEmail === adminEmail && password === ADMIN_PASS) {
            return INITIAL_ADMIN;
        }

        // 2. Check Local Storage Users
        const users = getLocalUsers();
        // Check case-insensitive email matching
        const user = users.find(u => u.email.toLowerCase().trim() === normalizedEmail && u.role === role);

        if (user && (user.password === password || !user.password)) {
            return user;
        }
        throw new Error('Invalid credentials (Offline Mode)');
    },

    resetPassword: async (email: string) => {
        await mockDelay();
        // Check Admin
        if (email === ADMIN_EMAIL) {
            return { message: 'Reset link sent' };
        }

        const users = getLocalUsers();
        const user = users.find(u => u.email === email);
        if (!user) {
            throw new Error('No account found with this email address.');
        }
        return { message: 'Reset link sent' };
    },

    getUsers: async (role?: UserRole) => {
        await mockDelay();
        const users = getLocalUsers();
        return role ? users.filter(u => u.role === role) : users;
    },

    saveUser: async (user: User & { password?: string }) => {
        await mockDelay();
        const users = getLocalUsers();
        if (users.find(u => u.email === user.email)) {
            throw new Error('User with this email already exists');
        }
        users.push(user);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        return user;
    },

    updateUser: async (user: User & { password?: string }) => {
        await mockDelay();
        const users = getLocalUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index === -1) {
            throw new Error('User not found');
        }

        // Check for email collision if email changed
        if (users[index].email !== user.email && users.find(u => u.email === user.email)) {
            throw new Error('User with this email already exists');
        }

        users[index] = { ...users[index], ...user };
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        return users[index];
    },

    deleteUser: async (userId: string) => {
        await mockDelay();
        let users = getLocalUsers();
        const initialLength = users.length;
        users = users.filter(u => u.id !== userId);

        if (users.length === initialLength) {
            throw new Error('User not found');
        }
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        return { message: 'Deleted' };
    },

    bulkAssignTeachers: async (studentIds: string[], teacherIds: string[]) => {
        await mockDelay();
        const users = getLocalUsers();
        let updatedCount = 0;

        // Update local storage
        const updatedUsers = users.map(u => {
            if (studentIds.includes(u.id) && u.role === UserRole.STUDENT) {
                const currentTeachers = u.teacherIds || [];
                const newTeachers = [...new Set([...currentTeachers, ...teacherIds])];
                if (newTeachers.length !== currentTeachers.length) {
                    updatedCount++;
                }
                return { ...u, teacherIds: newTeachers };
            }
            return u;
        });

        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
        // Return only the updated students
        return updatedUsers.filter(u => studentIds.includes(u.id));
    },

    getAttendance: async (params: any) => {
        await mockDelay();
        let records = getLocalAttendance();

        const { studentId, startDate, endDate, subject } = params;

        if (studentId) {
            records = records.filter(r => r.studentId === studentId);
        }
        if (subject && subject !== 'All') {
            records = records.filter(r => r.subject === subject);
        }
        if (startDate) {
            records = records.filter(r => r.date >= startDate);
        }
        if (endDate) {
            records = records.filter(r => r.date <= endDate);
        }

        return records.sort((a, b) => b.timestamp - a.timestamp);
    },

    markAttendance: async (record: AttendanceRecord) => {
        await mockDelay();
        const records = getLocalAttendance();

        // Check duplicate
        const exists = records.find(r =>
            r.studentId === record.studentId &&
            r.subject === record.subject &&
            r.date === record.date
        );

        if (exists) {
            throw new Error('Attendance already marked for this subject today (Offline Mode).');
        }

        records.push(record);
        localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(records));
        return record;
    },

    getNotices: async (params: any) => {
        await mockDelay();
        let notices = getLocalNotices();
        const { teacherId, studentId } = params;

        if (teacherId) {
            notices = notices.filter(n => n.teacherId === teacherId);
        } else if (studentId) {
            const users = getLocalUsers();
            const student = users.find(u => u.id === studentId);
            if (student && student.teacherIds) {
                notices = notices.filter(n => student.teacherIds?.includes(n.teacherId));
            } else {
                return [];
            }
        }

        return notices.sort((a, b) => b.timestamp - a.timestamp);
    },

    createNotice: async (notice: Notice) => {
        await mockDelay();
        const notices = getLocalNotices();
        notices.push(notice);
        localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(notices));
        return notice;
    },

    updateNotice: async (notice: Notice) => {
        await mockDelay();
        const notices = getLocalNotices();
        const index = notices.findIndex(n => n.id === notice.id);
        if (index === -1) throw new Error('Notice not found');
        notices[index] = { ...notices[index], ...notice };
        localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(notices));
        return notices[index];
    },

    deleteNotice: async (id: string) => {
        await mockDelay();
        let notices = getLocalNotices();
        notices = notices.filter(n => n.id !== id);
        localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(notices));
        return { message: 'Deleted' };
    },

    // Question Papers
    getQuestionPapers: async (params: any) => {
        await mockDelay();
        let papers = getLocalPapers();
        const { teacherId, studentId } = params;

        if (teacherId) {
            papers = papers.filter(p => p.teacherId === teacherId);
        } else if (studentId) {
            const users = getLocalUsers();
            const student = users.find(u => u.id === studentId);
            if (student && student.teacherIds) {
                papers = papers.filter(p => student.teacherIds?.includes(p.teacherId));
            } else {
                return [];
            }
        }
        return papers.sort((a, b) => b.uploadedAt - a.uploadedAt);
    },

    uploadQuestionPaper: async (paper: QuestionPaper) => {
        await mockDelay();
        const papers = getLocalPapers();
        papers.push(paper);
        localStorage.setItem(STORAGE_KEY_PAPERS, JSON.stringify(papers));
        return paper;
    },

    deleteQuestionPaper: async (id: string) => {
        await mockDelay();
        let papers = getLocalPapers();
        papers = papers.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY_PAPERS, JSON.stringify(papers));
        return { message: 'Deleted' };
    },

    getSettings: async () => {
        await mockDelay();
        try {
            const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
            return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    },

    saveSettings: async (settings: SystemSettings) => {
        await mockDelay();
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        return settings;
    },

    // Join Requests
    getJoinRequests: async (teacherId: string) => {
        await mockDelay();
        const requests = getLocalRequests();
        return requests.filter(r => r.teacherId === teacherId && r.status === 'PENDING');
    },

    createJoinRequest: async (request: JoinRequest) => {
        await mockDelay();
        const requests = getLocalRequests();
        const users = getLocalUsers();

        // Verify teacher exists
        const teacher = users.find(u => u.id === request.teacherId && u.role === UserRole.TEACHER);
        if (!teacher) throw new Error('Teacher ID not found.');

        // Verify Student
        const student = users.find(u => u.id === request.studentId);
        if (!student) throw new Error('Student profile not found.');

        // Check already assigned
        if (student.teacherIds?.includes(request.teacherId)) {
            throw new Error('You are already assigned to this teacher.');
        }

        // Check already pending
        if (requests.find(r => r.studentId === request.studentId && r.teacherId === request.teacherId && r.status === 'PENDING')) {
            throw new Error('Request already pending approval.');
        }

        request.teacherName = teacher.name;
        requests.push(request);
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
        return request;
    },

    respondJoinRequest: async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
        await mockDelay();
        const requests = getLocalRequests();
        const reqIndex = requests.findIndex(r => r.id === requestId);
        if (reqIndex === -1) throw new Error('Request not found');

        requests[reqIndex].status = status;

        if (status === 'ACCEPTED') {
            const users = getLocalUsers();
            const studentIndex = users.findIndex(u => u.id === requests[reqIndex].studentId);

            if (studentIndex !== -1) {
                const student = users[studentIndex];
                const currentTeachers = student.teacherIds || [];
                if (!currentTeachers.includes(requests[reqIndex].teacherId)) {
                    student.teacherIds = [...currentTeachers, requests[reqIndex].teacherId];
                    users[studentIndex] = student;
                    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
                }
            }
        }

        // Remove processed request or keep history? Let's keep history but API filters PENDING
        // Actually for simplicity in mock, let's remove it if rejected, keep if accepted? 
        // Standard pattern: update status.
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
        return requests[reqIndex];
    }
};

const handleMockRoute = async (method: string, endpoint: string, data?: any) => {
    // Parse the endpoint to separate path and query params
    // We use a dummy base URL because URL constructor requires it for relative paths
    const url = new URL(endpoint, 'http://localhost');
    const path = url.pathname;
    const params = Object.fromEntries(url.searchParams.entries());

    console.log(`[Mock API] ${method} ${path}`, data || params);

    if (path === '/login' && method === 'POST') {
        return mockApi.login(data.email, data.password, data.role);
    }

    if (path === '/forgot-password' && method === 'POST') {
        return mockApi.resetPassword(data.email);
    }

    if (path === '/users') {
        if (method === 'GET') return mockApi.getUsers(params.role as UserRole);
        if (method === 'POST') return mockApi.saveUser(data);
    }

    if (path === '/users/bulk-assign' && method === 'POST') {
        return mockApi.bulkAssignTeachers(data.studentIds, data.teacherIds);
    }

    if (path.startsWith('/users/') && method === 'PUT') {
        const id = path.split('/').pop();
        if (id) {
            return mockApi.updateUser({ ...data, id });
        }
    }

    if (path.startsWith('/users/') && method === 'DELETE') {
        const id = path.split('/').pop();
        if (id) {
            return mockApi.deleteUser(id);
        }
    }

    if (path === '/attendance') {
        if (method === 'GET') return mockApi.getAttendance(params);
        if (method === 'POST') return mockApi.markAttendance(data);
    }

    if (path === '/notices') {
        if (method === 'GET') return mockApi.getNotices(params);
        if (method === 'POST') return mockApi.createNotice(data);
    }

    if (path.startsWith('/notices/') && method === 'PUT') {
        const id = path.split('/').pop();
        if (id) return mockApi.updateNotice({ ...data, id });
    }

    if (path.startsWith('/notices/') && method === 'DELETE') {
        const id = path.split('/').pop();
        if (id) return mockApi.deleteNotice(id);
    }

    // Question Papers
    if (path === '/papers') {
        if (method === 'GET') return mockApi.getQuestionPapers(params);
        if (method === 'POST') return mockApi.uploadQuestionPaper(data);
    }

    if (path.startsWith('/papers/') && method === 'DELETE') {
        const id = path.split('/').pop();
        if (id) return mockApi.deleteQuestionPaper(id);
    }

    if (path === '/settings') {
        if (method === 'GET') return mockApi.getSettings();
        if (method === 'POST') return mockApi.saveSettings(data);
    }

    if (path === '/requests') {
        if (method === 'GET') return mockApi.getJoinRequests(params.teacherId);
        if (method === 'POST') return mockApi.createJoinRequest(data);
    }

    if (path.startsWith('/requests/respond') && method === 'POST') {
        return mockApi.respondJoinRequest(data.requestId, data.status);
    }

    throw new Error(`Mock endpoint not implemented: ${endpoint}`);
};

// Helper for HTTP requests with Fallback
const api = {
    get: async (endpoint: string) => {
        try {
            const res = await fetch(`${API_URL}${endpoint}`);
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        } catch (err: any) {
            // Fallback if backend is down
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.name === 'TypeError') {
                console.warn('Backend unavailable. Switching to localStorage fallback.');
                return handleMockRoute('GET', endpoint);
            }
            throw err;
        }
    },
    post: async (endpoint: string, data: any) => {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'API Error');
            }
            return res.json();
        } catch (err: any) {
            // Fallback if backend is down
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.name === 'TypeError') {
                console.warn('Backend unavailable. Switching to localStorage fallback.');
                return handleMockRoute('POST', endpoint, data);
            }
            throw err;
        }
    },
    put: async (endpoint: string, data: any) => {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'API Error');
            }
            return res.json();
        } catch (err: any) {
            // Fallback if backend is down
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.name === 'TypeError') {
                console.warn('Backend unavailable. Switching to localStorage fallback.');
                return handleMockRoute('PUT', endpoint, data);
            }
            throw err;
        }
    },
    delete: async (endpoint: string) => {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'API Error');
            }
            return res.json();
        } catch (err: any) {
            // Fallback if backend is down
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.name === 'TypeError') {
                console.warn('Backend unavailable. Switching to localStorage fallback.');
                return handleMockRoute('DELETE', endpoint);
            }
            throw err;
        }
    }
};

export const checkBackendConnection = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
        const res = await fetch(`${API_URL}/users?role=ADMIN`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res.ok;
    } catch (err) {
        return false;
    }
};

export const loginUser = async (email: string, password: string, role: UserRole): Promise<User> => {
    return api.post('/login', { email, password, role });
};

export const resetPassword = async (email: string): Promise<{ message: string }> => {
    return api.post('/forgot-password', { email });
};

export const getUsers = async (): Promise<User[]> => {
    return api.get('/users');
};

export const getStudents = async (): Promise<User[]> => {
    return api.get(`/users?role=${UserRole.STUDENT}`);
};

export const getTeachers = async (): Promise<User[]> => {
    return api.get(`/users?role=${UserRole.TEACHER}`);
};

export const saveUser = async (user: User & { password?: string }): Promise<User> => {
    return api.post('/users', user);
};

export const updateUser = async (user: User & { password?: string }): Promise<User> => {
    return api.put(`/users/${user.id}`, user);
};

export const deleteUser = async (userId: string): Promise<void> => {
    return api.delete(`/users/${userId}`);
};

export const bulkAssignTeachers = async (studentIds: string[], teacherIds: string[]): Promise<User[]> => {
    return api.post('/users/bulk-assign', { studentIds, teacherIds });
};

export const markAttendance = async (record: AttendanceRecord): Promise<AttendanceRecord> => {
    return api.post('/attendance', record);
};

export const getStudentAttendance = async (studentId: string): Promise<AttendanceRecord[]> => {
    return api.get(`/attendance?studentId=${studentId}`);
};

export const getAttendanceReport = async (filters: { startDate?: string, endDate?: string, subject?: string }): Promise<AttendanceRecord[]> => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.subject) params.append('subject', filters.subject);

    return api.get(`/attendance?${params.toString()}`);
};

export const getNotices = async (params: { teacherId?: string, studentId?: string }): Promise<Notice[]> => {
    const searchParams = new URLSearchParams();
    if (params.teacherId) searchParams.append('teacherId', params.teacherId);
    if (params.studentId) searchParams.append('studentId', params.studentId);
    return api.get(`/notices?${searchParams.toString()}`);
};

export const createNotice = async (notice: Notice): Promise<Notice> => {
    return api.post('/notices', notice);
};

export const updateNotice = async (notice: Notice): Promise<Notice> => {
    return api.put(`/notices/${notice.id}`, notice);
};

export const deleteNotice = async (id: string): Promise<void> => {
    return api.delete(`/notices/${id}`);
};

// Question Papers
export const getQuestionPapers = async (params: { teacherId?: string, studentId?: string }): Promise<QuestionPaper[]> => {
    const searchParams = new URLSearchParams();
    if (params.teacherId) searchParams.append('teacherId', params.teacherId);
    if (params.studentId) searchParams.append('studentId', params.studentId);
    return api.get(`/papers?${searchParams.toString()}`);
};

export const uploadQuestionPaper = async (paper: QuestionPaper): Promise<QuestionPaper> => {
    return api.post('/papers', paper);
};

export const deleteQuestionPaper = async (id: string): Promise<void> => {
    return api.delete(`/papers/${id}`);
};

export const getSystemSettings = async (): Promise<SystemSettings> => {
    return api.get('/settings');
};

export const saveSystemSettings = async (settings: SystemSettings): Promise<SystemSettings> => {
    return api.post('/settings', settings);
};

export const getJoinRequests = async (teacherId: string): Promise<JoinRequest[]> => {
    return api.get(`/requests?teacherId=${teacherId}`);
};

export const createJoinRequest = async (request: JoinRequest): Promise<JoinRequest> => {
    return api.post('/requests', request);
};

export const respondJoinRequest = async (requestId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<JoinRequest> => {
    return api.post('/requests/respond', { requestId, status });
};
