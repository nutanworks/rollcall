import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { User, UserRole, AttendanceRecord, SystemSettings, NotificationType } from '../types';
import { getUsers, saveUser, updateUser, deleteUser, getAttendanceReport, checkBackendConnection, getSystemSettings, saveSystemSettings, bulkAssignTeachers } from '../services/storage';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { MOCK_SUBJECTS } from '../constants';
import { Plus, UserPlus, Users, Loader, Database, Eye, EyeOff, Shield, FileText, Download, Filter, Wifi, WifiOff, ChevronRight, Clock, Calendar, BookOpen, Check, Settings as SettingsIcon, Save, Bell, School, Search, Pencil, X, QrCode, GraduationCap, Megaphone, ShieldAlert, AlertTriangle, XCircle, Share2, ArrowRight, Trash2, BarChart, PieChart } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);

    // QR Code Modal State
    const [selectedQrUser, setSelectedQrUser] = useState<User | null>(null);

    // Bulk Assignment State
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [bulkStudentIds, setBulkStudentIds] = useState<string[]>([]);
    const [bulkTeacherIds, setBulkTeacherIds] = useState<string[]>([]);
    const [bulkSearchStudent, setBulkSearchStudent] = useState('');
    const [bulkSearchTeacher, setBulkSearchTeacher] = useState('');
    const [isBulkAssigning, setIsBulkAssigning] = useState(false);

    const [newUser, setNewUser] = useState<{
        id: string;
        name: string;
        email: string;
        password: string;
        role: UserRole;
        subjects: string[];
        teacherIds: string[];
        allowInvite: boolean;
    }>({
        id: '',
        name: '',
        email: '',
        password: '',
        role: UserRole.TEACHER,
        subjects: [],
        teacherIds: [],
        allowInvite: false
    });

    // Custom subject input state
    const [subjectInput, setSubjectInput] = useState('');

    const [error, setError] = useState('');
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'settings' | 'analytics'>('users');
    const [isConnected, setIsConnected] = useState(false);

    // User Filter & Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

    // Advanced Filters State
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterSubject, setFilterSubject] = useState('');

    // Report State
    const [reportFilters, setReportFilters] = useState({
        startDate: '',
        endDate: '',
        subject: 'All'
    });
    const [reportResults, setReportResults] = useState<AttendanceRecord[]>([]);
    const [generatingReport, setGeneratingReport] = useState(false);

    // Export Configuration State
    const [exportColumns, setExportColumns] = useState({
        date: true,
        studentName: true,
        subject: true,
        status: true,
        time: true
    });
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Settings State
    const [settings, setSettings] = useState<SystemSettings>({
        schoolName: '',
        academicYear: '',
        systemNotification: '',
        notificationType: 'info'
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState('');

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        checkBackendConnection().then(setIsConnected);
        getSystemSettings().then(setSettings).catch(console.error);
    }, []);

    const generateNextTeacherId = (currentUsers: User[]) => {
        const teacherIds = currentUsers
            .filter(u => u.role === UserRole.TEACHER && u.id.startsWith('TC'))
            .map(u => {
                const numStr = u.id.replace('TC', '');
                const num = parseInt(numStr);
                return isNaN(num) ? 0 : num;
            });

        const maxId = teacherIds.length > 0 ? Math.max(...teacherIds) : 0;
        return `TC${maxId + 1}`;
    };

    const handleEditClick = (user: User) => {
        setEditingUserId(user.id);
        setNewUser({
            id: user.id,
            name: user.name,
            email: user.email,
            password: '', // Clear password field for security/edit mode
            role: user.role,
            subjects: user.subjects || [],
            teacherIds: user.teacherIds || [],
            allowInvite: user.allowInvite || false
        });
        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = async (user: User) => {
        if (confirm(`Are you sure you want to delete user ${user.name} (${user.id})? This action cannot be undone.`)) {
            try {
                await deleteUser(user.id);
                setUsers(prev => prev.filter(u => u.id !== user.id));
            } catch (err: any) {
                alert(err.message || 'Failed to delete user');
            }
        }
    };

    const cancelEdit = () => {
        setShowAddForm(false);
        setEditingUserId(null);
        setNewUser({ id: '', name: '', email: '', password: '', role: UserRole.TEACHER, subjects: [], teacherIds: [], allowInvite: false });
        setSubjectInput('');
        setError('');
    };

    const handleAddNewClick = () => {
        if (showAddForm) {
            cancelEdit();
        } else {
            const nextId = generateNextTeacherId(users);
            setNewUser(prev => ({ ...prev, role: UserRole.TEACHER, id: nextId }));
            setShowAddForm(true);
        }
    };

    const handleRoleChange = (role: UserRole) => {
        if (editingUserId) {
            // If editing, allows role change without resetting ID
            setNewUser(prev => ({ ...prev, role }));
        } else {
            // If creating new, auto-generate ID logic
            if (role === UserRole.TEACHER) {
                const nextId = generateNextTeacherId(users);
                setNewUser(prev => ({ ...prev, role, id: nextId, subjects: [], teacherIds: [] }));
            } else {
                setNewUser(prev => ({ ...prev, role, id: '', subjects: [], teacherIds: [] }));
            }
        }
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Allow empty password if editing (means keep existing)
            if (!newUser.name || !newUser.email || (!editingUserId && !newUser.password) || !newUser.id) {
                setError("All fields are required" + (!editingUserId ? ", including Password" : ""));
                return;
            }

            // Check for duplicate ID if creating new user
            if (!editingUserId) {
                const idExists = users.some(u => u.id === newUser.id);
                if (idExists) {
                    setError(`User ID "${newUser.id}" already exists. Please use a unique ID.`);
                    return;
                }
            }

            const userData: User & { password?: string } = {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                subjects: newUser.role === UserRole.TEACHER ? newUser.subjects : [],
                teacherIds: newUser.role === UserRole.STUDENT ? newUser.teacherIds : [],
                allowInvite: newUser.role === UserRole.TEACHER ? newUser.allowInvite : undefined,
                createdAt: editingUserId ? users.find(u => u.id === editingUserId)?.createdAt || Date.now() : Date.now()
            };

            // Only include password if explicitly provided
            if (newUser.password) {
                userData.password = newUser.password;
            }

            if (editingUserId) {
                // Update
                if (editingUserId !== newUser.id) {
                    setError("Changing User ID is not allowed.");
                    return;
                }
                await updateUser(userData);
                setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...userData } : u));
            } else {
                // Create
                await saveUser(userData);
                // For local updates, we need the full user object. If saveUser returns it, great.
                setUsers(prev => [...prev, userData as User]);
            }

            cancelEdit();
        } catch (err: any) {
            setError(err.message || 'Failed to save user');
        }
    };

    const togglePassword = (id: string) => {
        setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAddSubject = () => {
        if (subjectInput.trim() && !newUser.subjects.includes(subjectInput.trim())) {
            setNewUser(prev => ({ ...prev, subjects: [...prev.subjects, subjectInput.trim()] }));
            setSubjectInput('');
        }
    };

    const handleRemoveSubject = (subjectToRemove: string) => {
        setNewUser(prev => ({ ...prev, subjects: prev.subjects.filter(s => s !== subjectToRemove) }));
    };

    const toggleTeacherAssignment = (teacherId: string) => {
        setNewUser(prev => {
            const currentIds = prev.teacherIds || [];
            const exists = currentIds.includes(teacherId);
            if (exists) {
                return { ...prev, teacherIds: currentIds.filter(id => id !== teacherId) };
            } else {
                return { ...prev, teacherIds: [...currentIds, teacherId] };
            }
        });
    };

    const handleGenerateReport = async () => {
        setGeneratingReport(true);
        try {
            const data = await getAttendanceReport({
                startDate: reportFilters.startDate || undefined,
                endDate: reportFilters.endDate || undefined,
                subject: reportFilters.subject,
            });
            setReportResults(data);
        } catch (err) {
            console.error(err);
            alert("Failed to generate report");
        } finally {
            setGeneratingReport(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setSavingSettings(true);
        setSettingsMessage('');
        try {
            await saveSystemSettings(settings);
            setSettingsMessage('Configuration saved successfully.');
            setTimeout(() => setSettingsMessage(''), 3000);
        } catch (err) {
            setSettingsMessage('Failed to save configuration.');
        } finally {
            setSavingSettings(false);
        }
    };

    const clearAnnouncement = () => {
        setSettings({ ...settings, systemNotification: '' });
        // Trigger save automatically for better UX
        setTimeout(() => handleSaveSettings(null as any), 100);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Attendance Report", 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Filters: ${reportFilters.subject} | ${reportFilters.startDate || 'Start'} to ${reportFilters.endDate || 'Now'}`, 14, 35);

        // Configure Columns based on state
        const headRow = [];
        if (exportColumns.date) headRow.push('Date');
        if (exportColumns.studentName) headRow.push('Student');
        if (exportColumns.subject) headRow.push('Subject');
        if (exportColumns.status) headRow.push('Status');
        if (exportColumns.time) headRow.push('Time');

        const tableData = reportResults.map(r => {
            const row = [];
            if (exportColumns.date) row.push(r.date);
            if (exportColumns.studentName) row.push(r.studentName);
            if (exportColumns.subject) row.push(r.subject);
            if (exportColumns.status) row.push(r.status);
            if (exportColumns.time) row.push(new Date(r.timestamp).toLocaleTimeString());
            return row;
        });

        autoTable(doc, {
            head: [headRow],
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        });
        doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowExportMenu(false);
    };

    const getProcessedUsers = () => {
        let result = users.filter(u => u.role !== UserRole.ADMIN);

        // 1. Text Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(u =>
                u.name.toLowerCase().includes(lower) ||
                u.email.toLowerCase().includes(lower) ||
                u.id.toLowerCase().includes(lower)
            );
        }

        // 2. Role Filter
        if (filterRole !== 'ALL') {
            result = result.filter(u => u.role === filterRole);
        }

        // 3. Date Range Filter
        if (filterDateStart) {
            const startTime = new Date(filterDateStart).getTime();
            result = result.filter(u => u.createdAt >= startTime);
        }
        if (filterDateEnd) {
            // Set to end of the day
            const endTime = new Date(filterDateEnd).setHours(23, 59, 59, 999);
            result = result.filter(u => u.createdAt <= endTime);
        }

        // 4. Subject Filter (Teachers Only)
        if (filterSubject) {
            const subLower = filterSubject.toLowerCase();
            result = result.filter(u =>
                u.role === UserRole.TEACHER &&
                u.subjects?.some(s => s.toLowerCase().includes(subLower))
            );
        }

        // 5. Sorting
        result.sort((a, b) => {
            if (sortOrder === 'newest') return b.createdAt - a.createdAt;
            if (sortOrder === 'oldest') return a.createdAt - b.createdAt;
            if (sortOrder === 'name') return a.name.localeCompare(b.name);
            return 0;
        });
        return result;
    };

    const filteredUsers = getProcessedUsers();
    const teachersList = users.filter(u => u.role === UserRole.TEACHER);

    // Bulk Assign Utils
    const executeBulkAssign = async () => {
        if (bulkStudentIds.length === 0 || bulkTeacherIds.length === 0) return;
        setIsBulkAssigning(true);
        try {
            const updatedStudents = await bulkAssignTeachers(bulkStudentIds, bulkTeacherIds);

            // Update local state
            setUsers(prev => prev.map(u => {
                const updated = updatedStudents.find(upd => upd.id === u.id);
                return updated || u;
            }));

            setShowBulkAssignModal(false);
            setBulkStudentIds([]);
            setBulkTeacherIds([]);
            alert(`Successfully assigned ${bulkTeacherIds.length} teachers to ${bulkStudentIds.length} students.`);
        } catch (e: any) {
            alert("Error during bulk assignment: " + e.message);
        } finally {
            setIsBulkAssigning(false);
        }
    };

    const toggleBulkId = (id: string, listType: 'student' | 'teacher') => {
        if (listType === 'student') {
            setBulkStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setBulkTeacherIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    const selectAll = (listType: 'student' | 'teacher', items: User[]) => {
        const ids = items.map(u => u.id);
        if (listType === 'student') {
            setBulkStudentIds(prev => Array.from(new Set([...prev, ...ids])));
        } else {
            setBulkTeacherIds(prev => Array.from(new Set([...prev, ...ids])));
        }
    };

    const clearSelection = (listType: 'student' | 'teacher') => {
        if (listType === 'student') {
            setBulkStudentIds([]);
        } else {
            setBulkTeacherIds([]);
        }
    };

    const clearAdvancedFilters = () => {
        setFilterDateStart('');
        setFilterDateEnd('');
        setFilterSubject('');
    };

    const downloadUserListPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("User Directory", 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        let subtitle = "All Users";
        if (filterRole === UserRole.STUDENT) subtitle = "Student List";
        else if (filterRole === UserRole.TEACHER) subtitle = "Teacher List";
        if (searchTerm) subtitle += ` (Filtered: "${searchTerm}")`;
        doc.text(subtitle, 14, 35);
        const tableData = filteredUsers.map(u => [u.id, u.name, u.email, u.role]);
        autoTable(doc, {
            head: [['ID', 'Full Name', 'Email', 'Role']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        });
        doc.save(`user_directory_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6">
            {/* Mobile-Friendly Tabs */}
            <div className="flex p-1 space-x-1 bg-gray-100/80 dark:bg-gray-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm ${activeTab === 'users' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-none'
                        }`}
                >
                    <div className="flex items-center justify-center">
                        <Database className="h-4 w-4 mr-2" />
                        Users
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm ${activeTab === 'reports' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-none'
                        }`}
                >
                    <div className="flex items-center justify-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Reports
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm ${activeTab === 'settings' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-none'
                        }`}
                >
                    <div className="flex items-center justify-center">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Settings
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm ${activeTab === 'analytics' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-none'
                        }`}
                >
                    <div className="flex items-center justify-center">
                        <BarChart className="h-4 w-4 mr-2" />
                        Analytics
                    </div>
                </button>
            </div>

            {activeTab === 'users' && (
                <>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="animated-border p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                            <div className="relative">
                                <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Total Records</h3>
                                <div className="flex items-end mt-2">
                                    <p className="text-4xl font-extrabold text-gray-900 dark:text-white leading-none">{users.length}</p>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 mb-1">entries</span>
                                </div>
                                <div className={`mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isConnected ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400'}`}>
                                    {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                                    {isConnected ? 'MongoDB Connected' : 'Local Storage Mode'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-indigo-100 dark:border-gray-700 flex flex-col justify-center items-start shadow-sm subtle-shimmer">
                            <h3 className="text-indigo-900 dark:text-indigo-300 font-bold text-lg mb-1">{editingUserId ? 'Edit Mode Active' : 'User Management'}</h3>
                            <p className="text-indigo-600/80 dark:text-indigo-400/80 text-sm mb-4">{editingUserId ? 'Currently modifying existing user details.' : 'Add Teachers, assign subjects, or enroll Students and assign to classes.'}</p>
                            <div className="flex flex-col sm:flex-row gap-2 w-full relative z-10">
                                <Button onClick={handleAddNewClick} fullWidth className="sm:w-auto flex-1 vibrant-glow">
                                    {showAddForm ? 'Cancel Operation' : 'Add New User'}
                                </Button>
                                {!showAddForm && (
                                    <Button onClick={() => setShowBulkAssignModal(true)} fullWidth className="sm:w-auto flex-1 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                                        <UserPlus className="h-4 w-4 mr-2" /> Bulk Assign
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {showAddForm && (
                        <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl animate-fade-in ring-4 ring-indigo-50 dark:ring-indigo-900/30">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                                <UserPlus className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                                {editingUserId ? 'Update User Details' : 'Register New User'}
                            </h3>
                            <form onSubmit={handleSaveUser} className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 items-start">
                                <Input
                                    label="User ID / Roll No"
                                    value={newUser.id}
                                    onChange={e => setNewUser({ ...newUser, id: e.target.value })}
                                    placeholder={newUser.role === UserRole.TEACHER ? "Auto-generated (e.g. TC1)" : "e.g. STU001"}
                                    disabled={!!editingUserId || (newUser.role === UserRole.TEACHER && !editingUserId)}
                                    className="mb-0"
                                />
                                <Input
                                    label="Full Name"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="e.g. Mr. Smith"
                                    className="mb-0"
                                />
                                <Input
                                    label="Email ID"
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="user@school.com"
                                    className="mb-0"
                                />
                                <Input
                                    label="Password"
                                    type="text"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder={editingUserId ? "Leave blank to keep current" : "********"}
                                    className="mb-0"
                                />
                                <div className="w-full">
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300 mb-2">Role</label>
                                    <select
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        value={newUser.role}
                                        onChange={e => handleRoleChange(e.target.value as UserRole)}
                                    >
                                        <option value={UserRole.TEACHER}>Teacher</option>
                                        <option value={UserRole.STUDENT}>Student</option>
                                    </select>
                                </div>

                                {newUser.role === UserRole.TEACHER && (
                                    <div className="md:col-span-2 lg:col-span-4 grid gap-4">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                                <BookOpen className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                                                Assign Class Subjects
                                            </label>
                                            <div className="flex gap-2 mb-4 max-w-md">
                                                <input
                                                    type="text"
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Type subject name..."
                                                    value={subjectInput}
                                                    onChange={(e) => setSubjectInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddSubject();
                                                        }
                                                    }}
                                                />
                                                <Button type="button" onClick={handleAddSubject} className="py-2">Add</Button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {newUser.subjects.map(subject => (
                                                    <span key={subject} className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium text-sm flex items-center shadow-sm">
                                                        {subject}
                                                        <button type="button" onClick={() => handleRemoveSubject(subject)} className="ml-2 p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Invite Permission Toggle */}
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center"><Share2 className="h-4 w-4 mr-2" /> Student Invites</h4>
                                                <p className="text-xs text-indigo-700 dark:text-indigo-400">Allow this teacher to share an invite link via WhatsApp.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={newUser.allowInvite}
                                                    onChange={e => setNewUser({ ...newUser, allowInvite: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {newUser.role === UserRole.STUDENT && (
                                    <div className="md:col-span-2 lg:col-span-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                            <School className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                                            Assign to Teachers (Classes)
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {teachersList.length > 0 ? teachersList.map(teacher => {
                                                const isSelected = newUser.teacherIds.includes(teacher.id);
                                                return (
                                                    <div key={teacher.id} onClick={() => toggleTeacherAssignment(teacher.id)} className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition-all ${isSelected ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-md' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold">{teacher.name}</span>
                                                        </div>
                                                        {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                                                    </div>
                                                )
                                            }) : <p className="text-gray-500 text-sm italic col-span-3">No teachers available.</p>}
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-2 lg:col-span-4 mt-2 flex gap-3">
                                    <Button type="submit" fullWidth className="py-3 text-base">
                                        {editingUserId ? 'Update User' : 'Save to Database'}
                                    </Button>
                                </div>
                            </form>
                            {error && <p className="mt-4 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg flex items-center"><Shield className="h-4 w-4 mr-2" /> {error}</p>}
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="relative w-full md:flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or ID..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <select
                                    className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none text-gray-900 dark:text-white"
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value as any)}
                                >
                                    <option value="ALL">All Roles</option>
                                    <option value={UserRole.TEACHER}>Teachers</option>
                                    <option value={UserRole.STUDENT}>Students</option>
                                </select>
                                <button
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={`p-2.5 rounded-xl border transition-all ${showAdvancedFilters ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                    title="Advanced Filters"
                                >
                                    <Filter className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Advanced Filters Section */}
                        {showAdvancedFilters && (
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Created After</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                                        value={filterDateStart}
                                        onChange={e => setFilterDateStart(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Created Before</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                                        value={filterDateEnd}
                                        onChange={e => setFilterDateEnd(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Subject (Teachers)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Math"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                        value={filterSubject}
                                        onChange={e => setFilterSubject(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={clearAdvancedFilters}
                                        className="w-full py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="h-4 w-4" /> Clear Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>



                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                                <Users className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                                Database Entries
                            </h2>
                        </div>
                        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Name / Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Email</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                                        <tr key={u.id} className="even:bg-gray-50/50 dark:even:bg-gray-700/30 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 transition-colors duration-150 ease-in-out group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${u.role === UserRole.TEACHER ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                                                        {u.role === UserRole.TEACHER ? <Shield className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">{u.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{u.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500 font-mono">{u.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {u.role !== UserRole.TEACHER && (
                                                        <button onClick={() => setSelectedQrUser(u)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg" title="View QR Code"><QrCode className="h-4 w-4" /></button>
                                                    )}
                                                    <button onClick={() => handleEditClick(u)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 rounded-lg" title="Edit User"><Pencil className="h-4 w-4" /></button>
                                                    <button onClick={() => handleDeleteClick(u)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg" title="Delete User"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                                No users match your search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'analytics' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Students</h3>
                            <div className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                                {users.filter(u => u.role === UserRole.STUDENT).length}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Teachers</h3>
                            <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                {users.filter(u => u.role === UserRole.TEACHER).length}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Active Users</h3>
                            <div className="text-4xl font-extrabold text-amber-600 dark:text-amber-400">
                                {users.length}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                            <PieChart className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                            Demographics
                        </h3>
                        <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                            {/* Simple Gender Distribution Visualization */}
                            <div className="flex flex-col items-center">
                                <div className="h-32 w-32 rounded-full border-8 border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center relative">
                                    <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                                        {Math.round((users.filter(u => u.role === UserRole.STUDENT).length / (users.length || 1)) * 100)}%
                                    </span>
                                    <span className="absolute -bottom-8 text-sm font-bold text-gray-500">Students</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="h-32 w-32 rounded-full border-8 border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center relative">
                                    <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                                        {Math.round((users.filter(u => u.role === UserRole.TEACHER).length / (users.length || 1)) * 100)}%
                                    </span>
                                    <span className="absolute -bottom-8 text-sm font-bold text-gray-500">Teachers</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports Tab Content */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col lg:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                            <select
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white"
                                value={reportFilters.subject}
                                onChange={e => setReportFilters({ ...reportFilters, subject: e.target.value })}
                            >
                                <option value="All">All Subjects</option>
                                {MOCK_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">From</label>
                            <input type="date" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white" value={reportFilters.startDate} onChange={e => setReportFilters({ ...reportFilters, startDate: e.target.value })} />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">To</label>
                            <input type="date" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white" value={reportFilters.endDate} onChange={e => setReportFilters({ ...reportFilters, endDate: e.target.value })} />
                        </div>
                        <Button onClick={handleGenerateReport} disabled={generatingReport} className="h-11 px-8 rounded-xl font-bold vibrant-glow">
                            {generatingReport ? 'Generating...' : 'Generate Report'}
                        </Button>
                    </div>

                    {reportResults.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-fade-in relative">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 dark:text-white">Historical Records ({reportResults.length})</h3>

                                {/* Export Menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowExportMenu(!showExportMenu)}
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg flex items-center border border-indigo-100 dark:border-indigo-800"
                                    >
                                        <Download className="h-4 w-4 mr-2" /> Export PDF
                                    </button>

                                    {showExportMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-30 animate-fade-in">
                                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">Include Columns</h4>
                                            <div className="space-y-2 mb-4">
                                                {Object.keys(exportColumns).map(key => (
                                                    <label key={key} className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={exportColumns[key as keyof typeof exportColumns]}
                                                            onChange={e => setExportColumns({ ...exportColumns, [key]: e.target.checked })}
                                                            className="rounded text-indigo-600 focus:ring-indigo-500 mr-2"
                                                        />
                                                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <Button onClick={exportToPDF} fullWidth className="text-xs py-2">Download</Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                        {reportResults.map(r => (
                                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{r.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{r.studentName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{r.subject}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${r.status === 'PRESENT' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Settings Tab Content */}
            {activeTab === 'settings' && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="md:col-span-2 space-y-6">
                        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                    <SettingsIcon className="h-6 w-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                                    System Configuration
                                </h2>
                                {settingsMessage && (
                                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${settingsMessage.includes('Failed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {settingsMessage}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-8">
                                {/* Institution Details Section */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                                        <School className="h-5 w-5 mr-2 text-indigo-500" />
                                        Institution Details
                                    </h3>
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <Input
                                            label="School / Institute Name"
                                            placeholder="e.g. Springfield High School"
                                            value={settings.schoolName}
                                            onChange={e => setSettings({ ...settings, schoolName: e.target.value })}
                                        />
                                        <Input
                                            label="Current Academic Year"
                                            placeholder="e.g. 2024-2025"
                                            value={settings.academicYear}
                                            onChange={e => setSettings({ ...settings, academicYear: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Announcement Section */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                                        <Megaphone className="h-5 w-5 mr-2 text-indigo-500" />
                                        Broadcast Announcement
                                    </h3>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-600 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                                Banner Message
                                            </label>
                                            <button type="button" onClick={clearAnnouncement} className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline">Clear</button>
                                        </div>

                                        <div>
                                            <textarea
                                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px]"
                                                placeholder="Enter message to display as a top-level banner..."
                                                value={settings.systemNotification}
                                                onChange={e => setSettings({ ...settings, systemNotification: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <label className="flex-1 cursor-pointer group">
                                                <input
                                                    type="radio" name="priority" className="hidden"
                                                    checked={settings.notificationType === 'info'}
                                                    onChange={() => setSettings({ ...settings, notificationType: 'info' })}
                                                />
                                                <div className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${settings.notificationType === 'info' ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-400 grayscale hover:grayscale-0'}`}>
                                                    <Megaphone className="h-4 w-4" /> <span className="text-xs font-bold">INFO</span>
                                                </div>
                                            </label>
                                            <label className="flex-1 cursor-pointer group">
                                                <input
                                                    type="radio" name="priority" className="hidden"
                                                    checked={settings.notificationType === 'warning'}
                                                    onChange={() => setSettings({ ...settings, notificationType: 'warning' })}
                                                />
                                                <div className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${settings.notificationType === 'warning' ? 'bg-amber-50 dark:bg-amber-900/40 border-amber-500 text-amber-700 dark:text-amber-300' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-400 grayscale hover:grayscale-0'}`}>
                                                    <AlertTriangle className="h-4 w-4" /> <span className="text-xs font-bold">WARNING</span>
                                                </div>
                                            </label>
                                            <label className="flex-1 cursor-pointer group">
                                                <input
                                                    type="radio" name="priority" className="hidden"
                                                    checked={settings.notificationType === 'critical'}
                                                    onChange={() => setSettings({ ...settings, notificationType: 'critical' })}
                                                />
                                                <div className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${settings.notificationType === 'critical' ? 'bg-red-50 dark:bg-red-900/40 border-red-500 text-red-700 dark:text-red-300' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-400 grayscale hover:grayscale-0'}`}>
                                                    <ShieldAlert className="h-4 w-4" /> <span className="text-xs font-bold">CRITICAL</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" disabled={savingSettings} className="py-3 px-8 shadow-lg vibrant-glow flex items-center">
                                        <Save className="h-4 w-4 mr-2" />
                                        {savingSettings ? 'Saving Changes...' : 'Save Configuration'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="space-y-6">
                        {/* Live Preview Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg subtle-shimmer">
                            <h3 className="text-lg font-bold mb-4">Live Preview</h3>

                            <div className="mb-4">
                                <p className="text-xs text-indigo-200 uppercase tracking-wide font-bold mb-1">Navbar Display</p>
                                <div className="bg-white/10 p-3 rounded-lg border border-white/20">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-indigo-500 p-1 rounded shadow-sm">
                                            <QrCode className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="leading-none">
                                            <div className="font-bold text-sm">{settings.schoolName || 'RollCall'}</div>
                                            {settings.academicYear && <div className="text-[10px] text-white/70 mt-0.5">{settings.academicYear}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-2">
                                <p className="text-xs text-indigo-200 uppercase tracking-wide font-bold mb-1">Announcement Banner</p>
                                {settings.systemNotification ? (
                                    <div className={`p-3 rounded-xl text-white text-xs font-bold animate-fade-in flex items-start ${settings.notificationType === 'critical' ? 'bg-red-500 shadow-lg shadow-red-500/20' :
                                        settings.notificationType === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
                                        }`}>
                                        {settings.notificationType === 'critical' ? <ShieldAlert className="h-4 w-4 mr-2 flex-shrink-0" /> : <Megaphone className="h-4 w-4 mr-2 flex-shrink-0" />}
                                        <p className="leading-tight">{settings.systemNotification}</p>
                                    </div>
                                ) : (
                                    <div className="border border-white/20 rounded-xl p-4 text-center text-white/50 text-xs italic">
                                        No active banner
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedQrUser && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedQrUser(null)}>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animated-border" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{selectedQrUser.name}</h3>
                        <div className="bg-white p-4 rounded-xl inline-block mb-6"><QRCode value={selectedQrUser.id} size={220} /></div>
                        <Button onClick={() => setSelectedQrUser(null)} fullWidth>Close</Button>
                    </div>
                </div>
            )}

            {/* Bulk Assign Modal */}
            {showBulkAssignModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bulk Teacher Assignment</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Select students and the teachers you want to assign to them.</p>
                            </div>
                            <button onClick={() => setShowBulkAssignModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700">
                            {/* Students Column */}
                            <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-800">
                                <div className="p-4 border-b border-gray-50 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex justify-between items-center">
                                        <span>Select Students</span>
                                        <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded-full">{bulkStudentIds.length} selected</span>
                                    </h4>
                                    <input
                                        type="text"
                                        placeholder="Search students..."
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                                        value={bulkSearchStudent}
                                        onChange={e => setBulkSearchStudent(e.target.value)}
                                    />
                                    <div className="mt-2 flex justify-between">
                                        <button onClick={() => selectAll('student', users.filter(u => u.role === UserRole.STUDENT && u.name.toLowerCase().includes(bulkSearchStudent.toLowerCase())))} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Select All</button>
                                        <button onClick={() => clearSelection('student')} className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Clear</button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {users.filter(u => u.role === UserRole.STUDENT && u.name.toLowerCase().includes(bulkSearchStudent.toLowerCase())).map(student => (
                                        <div
                                            key={student.id}
                                            onClick={() => toggleBulkId(student.id, 'student')}
                                            className={`p-3 rounded-lg flex items-center cursor-pointer transition-all border ${bulkStudentIds.includes(student.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent'}`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${bulkStudentIds.includes(student.id) ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                                {bulkStudentIds.includes(student.id) && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${bulkStudentIds.includes(student.id) ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>{student.name}</p>
                                                <p className="text-xs text-gray-400">{student.id}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Arrow Divider */}
                            <div className="hidden md:flex items-center justify-center w-12 bg-gray-50 dark:bg-gray-800 border-x border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600">
                                <ArrowRight className="h-6 w-6" />
                            </div>

                            {/* Teachers Column */}
                            <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-800">
                                <div className="p-4 border-b border-gray-50 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex justify-between items-center">
                                        <span>Assign Teachers</span>
                                        <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">{bulkTeacherIds.length} selected</span>
                                    </h4>
                                    <input
                                        type="text"
                                        placeholder="Search teachers..."
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 dark:text-white"
                                        value={bulkSearchTeacher}
                                        onChange={e => setBulkSearchTeacher(e.target.value)}
                                    />
                                    <div className="mt-2 flex justify-between">
                                        <button onClick={() => selectAll('teacher', users.filter(u => u.role === UserRole.TEACHER && u.name.toLowerCase().includes(bulkSearchTeacher.toLowerCase())))} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Select All</button>
                                        <button onClick={() => clearSelection('teacher')} className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Clear</button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {users.filter(u => u.role === UserRole.TEACHER && u.name.toLowerCase().includes(bulkSearchTeacher.toLowerCase())).map(teacher => (
                                        <div
                                            key={teacher.id}
                                            onClick={() => toggleBulkId(teacher.id, 'teacher')}
                                            className={`p-3 rounded-lg flex items-center cursor-pointer transition-all border ${bulkTeacherIds.includes(teacher.id) ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent'}`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${bulkTeacherIds.includes(teacher.id) ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                                {bulkTeacherIds.includes(teacher.id) && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${bulkTeacherIds.includes(teacher.id) ? 'text-emerald-900 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>{teacher.name}</p>
                                                <p className="text-xs text-gray-400">{teacher.id}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowBulkAssignModal(false)}>Cancel</Button>
                            <Button
                                onClick={executeBulkAssign}
                                disabled={isBulkAssigning || bulkStudentIds.length === 0 || bulkTeacherIds.length === 0}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 vibrant-glow"
                            >
                                {isBulkAssigning ? 'Processing...' : `Assign Teachers to ${bulkStudentIds.length} Students`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};