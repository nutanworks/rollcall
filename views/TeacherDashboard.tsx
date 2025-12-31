
import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'react-qr-code';
import { User, UserRole, AttendanceRecord, AttendanceStatus, Notice, NoticeAttachment, JoinRequest, QuestionPaper } from '../types';
import { getStudents, saveUser, markAttendance, updateUser, deleteUser, getAttendanceReport, getNotices, createNotice, updateNotice, deleteNotice, getJoinRequests, respondJoinRequest, uploadQuestionPaper, deleteQuestionPaper, getQuestionPapers } from '../services/storage';
import { MOCK_SUBJECTS } from '../constants';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { QRScanner } from '../components/QRScanner';
import { Users, UserPlus, QrCode, Scan, CheckCircle, AlertCircle, X, ClipboardList, Loader, WifiOff, Eye, EyeOff, XCircle, Pencil, Search, Calendar, Trash2, Save, X as CloseIcon, Clock, FileText, Download, Filter, MessageSquare, Upload, File as FileIcon, Plus, PieChart, FileSpreadsheet, Settings, ArrowUpDown, ArrowUp, ArrowDown, History, Info, RotateCcw, Mail, Share2, UserCheck, Hash, Book, Eraser, ChevronRight, BarChart, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TeacherDashboardProps {
    currentUser: User;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'reports' | 'notices' | 'resources' | 'statistics'>('students');
    const [students, setStudents] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Total Classes State
    const [totalClassesInput, setTotalClassesInput] = useState(currentUser.totalClasses || 0);
    const [savingTotalClasses, setSavingTotalClasses] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'cie1' | 'cie2' | 'assignment', direction: 'asc' | 'desc' }>({
        key: 'name',
        direction: 'asc'
    });

    // Modal State for Add/Edit
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [newStudent, setNewStudent] = useState({ id: '', name: '', email: '', password: '' });

    // Attendance State
    const [isScanning, setIsScanning] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(currentUser.subjects?.[0] || '');

    // Manual Attendance Enhanced State
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [manualFeedback, setManualFeedback] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Marks Feedback State
    const [marksFeedback, setMarksFeedback] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Date and Time selection for Manual Attendance
    const todayDate = new Date().toISOString().split('T')[0];
    const currentTimeStr = new Date().toTimeString().slice(0, 5);
    const [manualDate, setManualDate] = useState(todayDate);
    const [manualTime, setManualTime] = useState(currentTimeStr);

    // Notices State
    const [notices, setNotices] = useState<Notice[]>([]);
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
    const [noticeForm, setNoticeForm] = useState({ title: '', content: '' });
    const [attachments, setAttachments] = useState<NoticeAttachment[]>([]);

    // Papers State
    const [papers, setPapers] = useState<QuestionPaper[]>([]);
    const [showPaperModal, setShowPaperModal] = useState(false);
    const [paperForm, setPaperForm] = useState({ title: '', subject: currentUser.subjects?.[0] || '', year: new Date().getFullYear().toString() });
    const [paperFile, setPaperFile] = useState<NoticeAttachment | null>(null);

    // Reports State
    const [reportFilters, setReportFilters] = useState({
        startDate: todayDate,
        endDate: todayDate,
        subject: 'All'
    });
    const [reportResults, setReportResults] = useState<AttendanceRecord[]>([]);

    // Statistics State
    const [statsSubject, setStatsSubject] = useState(currentUser.subjects?.[0] || '');
    const [statsData, setStatsData] = useState<{ date: string, present: number, absent: number }[]>([]);

    useEffect(() => {
        fetchData();
    }, [currentUser.id]);

    useEffect(() => {
        if (activeTab === 'statistics') {
            const fetchStats = async () => {
                try {
                    const data = await getAttendanceReport({ subject: statsSubject });
                    // Group by date
                    const grouped = data.reduce((acc, curr) => {
                        if (!acc[curr.date]) {
                            acc[curr.date] = { date: curr.date, present: 0, absent: 0 };
                        }
                        if (curr.status === AttendanceStatus.PRESENT || !curr.status) {
                            acc[curr.date].present++;
                        } else {
                            acc[curr.date].absent++;
                        }
                        return acc;
                    }, {} as Record<string, { date: string, present: number, absent: number }>);

                    // Sort by date (oldest to newest) and take last 14 entries for clean chart
                    const sorted = Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-14);
                    setStatsData(sorted);
                } catch (e) {
                    console.error(e);
                }
            };
            fetchStats();
        }
    }, [activeTab, statsSubject]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [studentsData, noticesData, requestsData, papersData] = await Promise.all([
                getStudents(),
                getNotices({ teacherId: currentUser.id }),
                getJoinRequests(currentUser.id),
                getQuestionPapers({ teacherId: currentUser.id })
            ]);
            // Only show students assigned to this teacher
            setStudents(studentsData.filter(s => s.teacherIds?.includes(currentUser.id)));
            setNotices(noticesData);
            setPendingRequests(requestsData);
            setPapers(papersData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTotalClasses = async () => {
        setSavingTotalClasses(true);
        try {
            await updateUser({ ...currentUser, totalClasses: Number(totalClassesInput) });
            alert("Total sessions updated successfully.");
        } catch (err) {
            console.error(err);
            alert("Failed to update total sessions.");
        } finally {
            setSavingTotalClasses(false);
        }
    };

    const handleQuickMark = async (student: User, status: AttendanceStatus) => {
        setManualFeedback(null);
        if (!selectedSubject) {
            setManualFeedback({ msg: 'Please select a subject first', type: 'error' });
            return;
        }

        try {
            // Construct timestamp from selected date and time
            const dateTime = new Date(`${manualDate}T${manualTime}`);

            await markAttendance({
                id: `att-${Date.now()}-${student.id}`,
                studentId: student.id,
                studentName: student.name,
                teacherId: currentUser.id,
                subject: selectedSubject,
                timestamp: dateTime.getTime(),
                date: manualDate,
                status: status
            });
            setManualFeedback({
                msg: `Marked ${student.name} as ${status === AttendanceStatus.PRESENT ? 'Present' : 'Absent'}`,
                type: 'success'
            });

            // Clear feedback after 3 seconds
            setTimeout(() => setManualFeedback(null), 3000);
        } catch (err: any) {
            setManualFeedback({ msg: err.message || 'Failed to mark attendance', type: 'error' });
        }
    };

    const handleScan = async (scannedId: string) => {
        setIsScanning(false);
        setManualFeedback(null);

        const student = students.find(s => s.id === scannedId);
        if (!student) {
            setManualFeedback({ msg: 'Scanned student is not assigned to your classes.', type: 'error' });
            return;
        }

        try {
            const now = new Date();
            await markAttendance({
                id: `att-${Date.now()}-${scannedId}`,
                studentId: student.id,
                studentName: student.name,
                teacherId: currentUser.id,
                subject: selectedSubject,
                timestamp: now.getTime(),
                date: now.toISOString().split('T')[0],
                status: AttendanceStatus.PRESENT
            });
            setManualFeedback({ msg: `Attendance recorded for ${student.name}`, type: 'success' });
        } catch (err: any) {
            setManualFeedback({ msg: err.message || 'Error recording attendance', type: 'error' });
        }
    };

    const handleResetDate = () => {
        setManualDate(todayDate);
        setManualTime(new Date().toTimeString().slice(0, 5));
    };

    const filteredStudents = useMemo(() => {
        const term = studentSearchTerm.toLowerCase();
        return students.filter(s => s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term));
    }, [students, studentSearchTerm]);

    const shareViaWhatsApp = () => {
        const message = `Hi students, join my class on Smart Attendance using my Teacher ID: *${currentUser.id}*`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const processRequest = async (reqId: string, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            await respondJoinRequest(reqId, status);
            fetchData(); // Refresh list
        } catch (e) {
            console.error(e);
            alert('Failed to process request');
        }
    };

    const handlePaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaperFile({
                    name: file.name,
                    data: reader.result as string,
                    size: file.size
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const savePaper = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paperFile) return alert("Please select a file");

        try {
            await uploadQuestionPaper({
                id: `qp-${Date.now()}`,
                teacherId: currentUser.id,
                teacherName: currentUser.name,
                title: paperForm.title,
                subject: paperForm.subject,
                year: paperForm.year,
                fileName: paperFile.name,
                fileData: paperFile.data,
                uploadedAt: Date.now()
            });
            setShowPaperModal(false);
            setPaperFile(null);
            setPaperForm({ title: '', subject: currentUser.subjects?.[0] || '', year: new Date().getFullYear().toString() });
            fetchData();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleEditNotice = (notice: Notice) => {
        setEditingNoticeId(notice.id);
        setNoticeForm({ title: notice.title, content: notice.content });
        setAttachments(notice.attachments || []);
        setShowNoticeModal(true);
    };

    const closeNoticeModal = () => {
        setShowNoticeModal(false);
        setEditingNoticeId(null);
        setNoticeForm({ title: '', content: '' });
        setAttachments([]);
    };

    const exportStudentsPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Assigned Students List", 14, 20);
        doc.setFontSize(10);
        doc.text(`Teacher: ${currentUser.name} (${currentUser.id})`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 35);

        const tableData = students.map(s => [s.name, s.id, s.email]);

        autoTable(doc, {
            head: [['Student Name', 'ID / Roll No', 'Email Address']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        });

        doc.save(`students_list_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const toggleAssignmentSubmission = (studentId: string) => {
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                return {
                    ...s,
                    cie: {
                        ...s.cie,
                        assignmentSubmitted: !s.cie?.assignmentSubmitted
                    }
                };
            }
            return s;
        }));
    };

    const handleMarkChange = (studentId: string, field: 'cie1' | 'cie2' | 'assignment', value: string) => {
        setMarksFeedback(null);

        // Handle empty string
        if (value === '') {
            setStudents(prev => prev.map(s => {
                if (s.id === studentId) {
                    return { ...s, cie: { ...s.cie, [field]: undefined } };
                }
                return s;
            }));
            return;
        }

        const numValue = parseFloat(value);

        // Validation Check
        if (isNaN(numValue) || numValue < 0) {
            setMarksFeedback({ msg: 'Marks cannot be negative', type: 'error' });
            setTimeout(() => setMarksFeedback(null), 3000);
            return;
        }

        let limit = 20;
        let label = 'CIE';

        if (field === 'assignment') {
            limit = 10;
            label = 'Assignment';
        }

        if (numValue > limit) {
            setMarksFeedback({ msg: `Maximum ${label} marks allowed is ${limit}`, type: 'error' });
            setTimeout(() => setMarksFeedback(null), 3000);
            return;
        }

        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                return {
                    ...s,
                    cie: {
                        ...s.cie,
                        [field]: numValue
                    }
                };
            }
            return s;
        }));
    };

    const saveMarks = async (student: User) => {
        setMarksFeedback(null);
        try {
            await updateUser(student);
            setMarksFeedback({ msg: `Marks saved successfully for ${student.name}`, type: 'success' });
            setTimeout(() => setMarksFeedback(null), 3000);
        } catch (e: any) {
            console.error(e);
            setMarksFeedback({ msg: "Failed to save marks: " + e.message, type: 'error' });
            setTimeout(() => setMarksFeedback(null), 3000);
        }
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const studentData = {
                ...newStudent,
                role: UserRole.STUDENT,
                teacherIds: [currentUser.id] // Auto-assign to current teacher
            };

            if (editingStudentId) {
                await updateUser({ ...studentData, id: editingStudentId });
            } else {
                // Validate ID uniqueness is handled by backend but good to check empty
                if (!studentData.id || !studentData.email || !studentData.name || !studentData.password) {
                    alert("All fields are required");
                    setLoading(false);
                    return;
                }
                await saveUser(studentData as User);
            }
            setShowStudentModal(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to save student');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Tab Navigation - Floating Pill Design */}
            <div className="flex justify-center">
                <div className="flex p-1.5 space-x-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 overflow-x-auto max-w-full">
                    {[
                        { id: 'students', icon: Users, label: 'Students' },
                        { id: 'attendance', icon: Scan, label: 'Attendance' },
                        { id: 'statistics', icon: BarChart, label: 'Statistics' },
                        { id: 'notices', icon: MessageSquare, label: 'Classroom' },
                        { id: 'resources', icon: Book, label: 'Resources' },
                        { id: 'reports', icon: FileText, label: 'Reports' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center justify-center px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <tab.icon className="h-4 w-4 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area with Animation */}
            <div className="animate-fade-in">

                {/* --- ATTENDANCE TAB --- */}
                {activeTab === 'attendance' && (
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Session Configuration Card - Gradient Feature */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden subtle-shimmer group">
                            <div className="absolute top-0 right-0 p-12 -mr-8 -mt-8 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-700"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <h3 className="font-display font-bold text-2xl flex items-center mb-2">
                                        <Hash className="h-6 w-6 mr-3 text-indigo-200" /> Total Sessions
                                    </h3>
                                    <p className="text-indigo-100 text-sm max-w-md leading-relaxed">
                                        Define the total number of classes conducted. This figure is crucial for calculating student attendance percentages accurately.
                                    </p>
                                </div>
                                <div className="flex gap-3 bg-white/10 p-2 rounded-2xl backdrop-blur-sm border border-white/20">
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-24 px-4 py-3 rounded-xl border-none bg-white text-indigo-900 font-bold text-center focus:ring-4 focus:ring-white/30 outline-none text-lg shadow-inner"
                                        value={totalClassesInput}
                                        onChange={e => setTotalClassesInput(parseInt(e.target.value) || 0)}
                                    />
                                    <button
                                        onClick={handleUpdateTotalClasses}
                                        disabled={savingTotalClasses}
                                        className="px-6 py-3 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {savingTotalClasses ? 'Updating...' : 'Set Total'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scan Section - Modern Card */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:shadow-2xl transition-shadow duration-300">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/50 to-transparent dark:from-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-indigo-50/50 dark:ring-indigo-900/10 group-hover:scale-110 transition-transform duration-500 ease-out">
                                <QrCode className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                            </div>

                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 relative z-10">Scan Mode</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-xs mx-auto leading-relaxed relative z-10">
                                Use your device camera to scan student QR codes for instant attendance logging.
                            </p>

                            <div className="w-full max-w-xs mb-6 relative z-10">
                                <div className="relative">
                                    <select
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/20 text-gray-900 dark:text-white font-bold appearance-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        value={selectedSubject}
                                        onChange={e => setSelectedSubject(e.target.value)}
                                    >
                                        {currentUser.subjects?.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <Button onClick={() => setIsScanning(true)} className="py-4 px-10 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-500/30 w-full max-w-xs vibrant-glow relative z-10">
                                Launch Scanner
                            </Button>
                        </div>

                        {/* Manual Entry Section - Enhanced */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col h-full relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                    <Pencil className="h-6 w-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                                    Manual Recording
                                </h3>
                            </div>

                            {/* Global Controls */}
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 mb-6 grid gap-4 border border-gray-100 dark:border-gray-700/50 relative z-10">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-gray-900 dark:text-white shadow-sm appearance-none"
                                            value={selectedSubject}
                                            onChange={e => setSelectedSubject(e.target.value)}
                                        >
                                            {currentUser.subjects?.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Date</label>
                                            <button type="button" onClick={handleResetDate} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">Today</button>
                                        </div>
                                        <input
                                            type="date"
                                            max={todayDate}
                                            className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-gray-900 dark:text-white shadow-sm"
                                            value={manualDate}
                                            onChange={e => setManualDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Time</label>
                                        <input
                                            type="time"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-gray-900 dark:text-white shadow-sm"
                                            value={manualTime}
                                            onChange={e => setManualTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Search & List */}
                            <div className="flex-1 flex flex-col min-h-0 relative z-10">
                                <div className="relative mb-4 group">
                                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search student by name or ID..."
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all shadow-inner"
                                        value={studentSearchTerm}
                                        onChange={e => setStudentSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar min-h-[250px] max-h-[350px]">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map(student => (
                                            <div key={student.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm shadow-inner">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{student.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{student.id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleQuickMark(student, AttendanceStatus.PRESENT)}
                                                        className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                        title="Mark Present"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleQuickMark(student, AttendanceStatus.ABSENT)}
                                                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                        title="Mark Absent"
                                                    >
                                                        <XCircle className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-gray-400">
                                            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                            <p className="text-sm font-medium">No students found</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {manualFeedback && (
                                <div className={`absolute bottom-6 left-6 right-6 p-4 rounded-xl text-sm flex items-center font-bold shadow-lg animate-fade-in-up z-20 ${manualFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                    {manualFeedback.type === 'success' ? <CheckCircle className="h-5 w-5 mr-3" /> : <AlertCircle className="h-5 w-5 mr-3" />}
                                    {manualFeedback.msg}
                                </div>
                            )}
                        </div>

                        <QRScanner isScanning={isScanning} onScan={handleScan} onClose={() => setIsScanning(false)} />
                    </div>
                )}

                {/* --- STUDENTS TAB --- */}
                {activeTab === 'students' && (
                    <>
                        {/* Invite Banner */}
                        {currentUser.allowInvite && (
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 subtle-shimmer relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                                <div className="relative z-10">
                                    <h3 className="font-bold text-xl mb-2 flex items-center"><Share2 className="h-6 w-6 mr-3" /> Digital Classroom Invite</h3>
                                    <p className="text-emerald-50 opacity-90 max-w-lg">Expand your class by sharing your unique Teacher ID directly via WhatsApp. Students can use this code to send join requests.</p>
                                </div>
                                <Button
                                    onClick={shareViaWhatsApp}
                                    className="bg-white text-emerald-700 border-none hover:bg-emerald-50 shadow-lg font-bold whitespace-nowrap relative z-10 px-6 py-3 rounded-xl"
                                >
                                    Share Invite Link
                                </Button>
                            </div>
                        )}

                        {/* Pending Requests Section */}
                        {pendingRequests.length > 0 && (
                            <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 rounded-3xl shadow-sm border border-amber-100 dark:border-amber-800/50 overflow-hidden animated-border">
                                <div className="px-8 py-4 border-b border-amber-100 dark:border-amber-800/50 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 mr-3">
                                            <UserCheck className="h-5 w-5" />
                                        </span>
                                        <h3 className="text-amber-900 dark:text-amber-100 font-bold">Pending Requests</h3>
                                    </div>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">{pendingRequests.length} New</span>
                                </div>
                                <div className="divide-y divide-amber-100 dark:divide-amber-800/50">
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-gray-800/50">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-lg">
                                                    {req.studentName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{req.studentName}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{req.studentId}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => processRequest(req.id, 'ACCEPTED')}
                                                    className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors flex items-center shadow-sm"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" /> Accept
                                                </button>
                                                <button
                                                    onClick={() => processRequest(req.id, 'REJECTED')}
                                                    className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center shadow-sm"
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px] flex flex-col">
                            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gray-50/30 dark:bg-gray-800/30 backdrop-blur-sm sticky top-0 z-20">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <Users className="h-6 w-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                                        Class Register
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage enrollments and internal assessment marks.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="hidden sm:inline-block text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">{students.length} Enrolled</span>
                                    <button
                                        onClick={exportStudentsPDF}
                                        disabled={students.length === 0}
                                        className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-4 py-2.5 rounded-xl flex items-center border border-indigo-200 dark:border-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                                    >
                                        <Download className="h-4 w-4 mr-2" /> PDF Export
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNewStudent({ id: '', name: '', email: '', password: '' });
                                            setEditingStudentId(null);
                                            setShowStudentModal(true);
                                        }}
                                        className="text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center transition-colors hover:shadow-md"
                                    >
                                        <UserPlus className="h-4 w-4 mr-2" /> Add Student
                                    </button>
                                </div>
                            </div>

                            {/* Marks Feedback Alert */}
                            {marksFeedback && (
                                <div className={`mx-8 mt-6 p-4 rounded-xl text-sm flex items-center font-bold animate-fade-in shadow-md ${marksFeedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'}`}>
                                    {marksFeedback.type === 'success' ? <CheckCircle className="h-5 w-5 mr-3" /> : <AlertCircle className="h-5 w-5 mr-3" />}
                                    {marksFeedback.msg}
                                </div>
                            )}

                            <div className="flex-1 overflow-x-auto">
                                {students.length === 0 ? (
                                    <div className="p-20 text-center text-gray-400 flex flex-col items-center">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-full mb-4">
                                            <Users className="h-10 w-10 opacity-50" />
                                        </div>
                                        <p className="text-lg font-medium">No students currently enrolled.</p>
                                        <p className="text-sm mt-2 max-w-xs mx-auto">Invite students using your ID or add them via the Admin panel.</p>
                                    </div>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/50 text-sm">
                                        <thead className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Student Profile</th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">CIE 1 <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded ml-1 text-gray-600 dark:text-gray-300">20</span></th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">CIE 2 <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded ml-1 text-gray-600 dark:text-gray-300">20</span></th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Assign <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded ml-1 text-gray-600 dark:text-gray-300">10</span></th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700/50">
                                            {students.map((student) => (
                                                <tr key={student.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors duration-200">
                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-white dark:from-indigo-900/50 dark:to-gray-800 border border-indigo-50 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shadow-sm group-hover:scale-105 transition-transform duration-300">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 dark:text-white text-base group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">{student.name}</div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{student.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <input
                                                            type="number"
                                                            min="0" max="20"
                                                            onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                                            className="w-20 px-3 py-2 border-none bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-900 dark:text-white font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm"
                                                            value={student.cie?.cie1 ?? ''}
                                                            onChange={(e) => handleMarkChange(student.id, 'cie1', e.target.value)}
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <input
                                                            type="number"
                                                            min="0" max="20"
                                                            onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                                            className="w-20 px-3 py-2 border-none bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-900 dark:text-white font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm"
                                                            value={student.cie?.cie2 ?? ''}
                                                            onChange={(e) => handleMarkChange(student.id, 'cie2', e.target.value)}
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                min="0" max="10"
                                                                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                                                className="w-16 px-3 py-2 border-none bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-900 dark:text-white font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm"
                                                                value={student.cie?.assignment ?? ''}
                                                                onChange={(e) => handleMarkChange(student.id, 'assignment', e.target.value)}
                                                                placeholder="-"
                                                            />
                                                            <button
                                                                onClick={() => toggleAssignmentSubmission(student.id)}
                                                                className={`p-2 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 ${student.cie?.assignmentSubmitted ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                                                title={student.cie?.assignmentSubmitted ? "Mark as Pending" : "Mark as Submitted"}
                                                            >
                                                                {student.cie?.assignmentSubmitted ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <button
                                                            onClick={() => saveMarks(student)}
                                                            className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-transparent dark:bg-gray-800 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white rounded-xl transition-all font-bold text-xs shadow-sm flex items-center vibrant-glow"
                                                        >
                                                            <Save className="h-3 w-3 mr-2" /> Save
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* --- STATISTICS TAB --- */}
                {activeTab === 'statistics' && (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                    <BarChart className="h-7 w-7 mr-3 text-indigo-600 dark:text-indigo-400" />
                                    Attendance Overview
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    Visualize class attendance trends over the last 14 sessions.
                                </p>
                            </div>

                            <div className="w-full md:w-auto">
                                <div className="relative">
                                    <select
                                        className="w-full md:w-72 px-5 py-3.5 bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/20 text-gray-900 dark:text-white font-bold shadow-sm appearance-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        value={statsSubject}
                                        onChange={e => setStatsSubject(e.target.value)}
                                    >
                                        {currentUser.subjects?.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {statsData.length === 0 ? (
                            <div className="h-80 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                                <BarChart className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-base font-medium">No attendance data available for {statsSubject}.</p>
                            </div>
                        ) : (
                            <div className="mt-8">
                                <div className="flex items-end justify-between h-96 gap-3 md:gap-6 overflow-x-auto pb-2 pt-16 custom-scrollbar px-2">
                                    {/* Calculate max for scaling */}
                                    {(() => {
                                        const maxCount = Math.max(...statsData.map(d => d.present + d.absent), 1);
                                        return statsData.map((d, i) => {
                                            const total = d.present + d.absent;
                                            // Scale height to max 100%
                                            const presentHeight = (d.present / maxCount) * 100;
                                            const absentHeight = (d.absent / maxCount) * 100;

                                            return (
                                                <div key={i} className="flex flex-col items-center group relative min-w-[60px] md:min-w-[80px] h-full justify-end">
                                                    {/* Enhanced Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 bg-gray-900/95 backdrop-blur-sm text-white text-xs p-3 rounded-xl pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-gray-700/50">
                                                        <div className="font-bold mb-2 border-b border-gray-700/50 pb-2 text-center text-indigo-300">
                                                            {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                                            <span className="text-gray-400 text-left">Present:</span>
                                                            <span className="text-emerald-400 font-bold text-right">{d.present}</span>

                                                            <span className="text-gray-400 text-left">Absent:</span>
                                                            <span className="text-red-400 font-bold text-right">{d.absent}</span>

                                                            <div className="col-span-2 border-t border-gray-700/50 my-1"></div>

                                                            <span className="text-gray-300 font-bold text-left">Total:</span>
                                                            <span className="text-white font-bold text-right">{total}</span>
                                                        </div>
                                                        {/* Triangle Arrow */}
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-8 border-transparent border-t-gray-900/95"></div>
                                                    </div>

                                                    <div className="w-full flex justify-center items-end gap-1.5 h-full">
                                                        {/* Present Bar */}
                                                        <div
                                                            className="w-3 md:w-6 bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 transition-all duration-500 rounded-t-lg shadow-lg hover:shadow-emerald-500/30 animate-fade-in-up"
                                                            style={{ height: `${Math.max(presentHeight, 4)}%`, animationDelay: `${i * 50}ms` }}
                                                        ></div>

                                                        {/* Absent Bar */}
                                                        <div
                                                            className="w-3 md:w-6 bg-gradient-to-t from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 transition-all duration-500 rounded-t-lg shadow-lg hover:shadow-red-500/30 animate-fade-in-up"
                                                            style={{ height: `${Math.max(absentHeight, 4)}%`, animationDelay: `${i * 50 + 25}ms` }}
                                                        ></div>
                                                    </div>

                                                    <div className="mt-4 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-bold tracking-wider truncate w-full text-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                </div>
                                            )
                                        });
                                    })()}
                                </div>

                                {/* Legend */}
                                <div className="flex justify-center gap-8 mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
                                    <div className="flex items-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-full">
                                        <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2 shadow-sm"></span> Present
                                    </div>
                                    <div className="flex items-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-full">
                                        <span className="w-3 h-3 bg-red-500 rounded-full mr-2 shadow-sm"></span> Absent
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ... Notices and Resources Tabs (kept standard but clean) ... */}
                {activeTab === 'notices' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                    <MessageSquare className="h-7 w-7 mr-3 text-indigo-600 dark:text-indigo-400" />
                                    Classroom Notices
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Post updates and announcements for your students.</p>
                            </div>
                            <Button onClick={() => setShowNoticeModal(true)} className="flex items-center vibrant-glow px-6 py-3 rounded-xl text-sm font-bold">
                                <Plus className="h-4 w-4 mr-2" /> Post Notice
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {notices.map(notice => (
                                <div key={notice.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 group">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{notice.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">{new Date(notice.timestamp).toLocaleDateString()}</span>
                                            <button onClick={() => handleEditNotice(notice)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button onClick={async () => {
                                                if (confirm('Delete this notice?')) {
                                                    await deleteNotice(notice.id);
                                                    fetchData();
                                                }
                                            }} className="text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{notice.content}</p>

                                    {notice.attachments && notice.attachments.length > 0 && (
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {notice.attachments.map((file, idx) => (
                                                <div key={idx} className="flex items-center px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-colors">
                                                    <FileIcon className="h-3 w-3 mr-2" />
                                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                                    <span className="ml-2 opacity-60">({Math.round(file.size / 1024)}KB)</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {notices.length === 0 && (
                                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No notices posted yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'resources' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                    <Book className="h-7 w-7 mr-3 text-indigo-600 dark:text-indigo-400" />
                                    Question Papers
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Upload and manage previous year question papers.</p>
                            </div>
                            <Button onClick={() => setShowPaperModal(true)} className="flex items-center vibrant-glow px-6 py-3 rounded-xl text-sm font-bold">
                                <Upload className="h-4 w-4 mr-2" /> Upload Paper
                            </Button>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {papers.map(paper => (
                                <div key={paper.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all duration-300 relative group hover:-translate-y-1">
                                    <button
                                        onClick={async () => {
                                            if (confirm('Delete this paper?')) {
                                                await deleteQuestionPaper(paper.id);
                                                fetchData();
                                            }
                                        }}
                                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 bg-white dark:bg-gray-700 rounded-full shadow-md"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>

                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm group-hover:scale-110 transition-transform">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate" title={paper.title}>{paper.title}</h4>
                                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1">{paper.subject} • {paper.year}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50 dark:border-gray-700">
                                        <span className="text-xs text-gray-400 font-medium">{new Date(paper.uploadedAt).toLocaleDateString()}</span>
                                        <a
                                            href={paper.fileData}
                                            download={paper.fileName}
                                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <Download className="h-3 w-3 mr-1.5" /> Download
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {papers.length === 0 && (
                                <div className="col-span-full py-16 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Book className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No papers uploaded yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Notice Modal */}
            {showNoticeModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl p-8 animated-border relative transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editingNoticeId ? 'Edit Notice' : 'Post New Notice'}</h3>
                            <button onClick={closeNoticeModal} className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-gray-700 p-2 rounded-full transition-colors"><CloseIcon className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const noticeData = {
                                    id: editingNoticeId || `notice-${Date.now()}`,
                                    teacherId: currentUser.id,
                                    teacherName: currentUser.name,
                                    title: noticeForm.title,
                                    content: noticeForm.content,
                                    attachments: attachments,
                                    timestamp: Date.now()
                                };

                                if (editingNoticeId) {
                                    await updateNotice(noticeData);
                                } else {
                                    await createNotice(noticeData);
                                }
                                closeNoticeModal();
                                fetchData();
                            } catch (e: any) {
                                alert(e.message);
                            }
                        }} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
                                <input
                                    required
                                    className="w-full px-4 py-3 border-none bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                    value={noticeForm.title}
                                    onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
                                    placeholder="e.g. Exam Schedule"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Content</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full px-4 py-3 border-none bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium resize-none"
                                    value={noticeForm.content}
                                    onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })}
                                    placeholder="Type your message here..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Attachments</label>
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-200 dark:border-gray-600 border-dashed rounded-2xl cursor-pointer bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <div className="bg-white dark:bg-gray-600 p-2 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                                <Upload className="w-5 h-5 text-indigo-500" />
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Click to upload file (Max 5MB)</p>
                                        </div>
                                        <input type="file" className="hidden" onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];
                                                if (file.size > 5 * 1024 * 1024) return alert("File too large (Max 5MB)");

                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setAttachments([...attachments, {
                                                        name: file.name,
                                                        data: reader.result as string,
                                                        size: file.size
                                                    }]);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }} />
                                    </label>
                                </div>

                                {attachments.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {attachments.map((file, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm border border-gray-100 dark:border-gray-600/50">
                                                <span className="truncate flex-1 text-gray-700 dark:text-gray-200 font-medium">{file.name}</span>
                                                <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button type="submit" fullWidth className="vibrant-glow py-3.5 rounded-xl text-base">
                                {editingNoticeId ? 'Update Notice' : 'Post Notice'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Paper Upload Modal */}
            {showPaperModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animated-border">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Question Paper</h3>
                            <button onClick={() => { setShowPaperModal(false); setPaperFile(null); }} className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-gray-700 p-2 rounded-full transition-colors"><CloseIcon className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={savePaper} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
                                <input
                                    required
                                    placeholder="e.g. Mid Term 2024"
                                    className="w-full px-4 py-3 border-none bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                    value={paperForm.title}
                                    onChange={e => setPaperForm({ ...paperForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-3 border-none bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium appearance-none"
                                        value={paperForm.subject}
                                        onChange={e => setPaperForm({ ...paperForm, subject: e.target.value })}
                                    >
                                        {currentUser.subjects?.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Year</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-4 py-3 border-none bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                    value={paperForm.year}
                                    onChange={e => setPaperForm({ ...paperForm, year: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">PDF File</label>
                                <div className="flex items-center justify-center w-full">
                                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-colors group ${paperFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-600/50'}`}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {paperFile ? (
                                                <>
                                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full mb-2">
                                                        <FileIcon className="w-6 h-6 text-emerald-500" />
                                                    </div>
                                                    <p className="text-sm text-emerald-600 font-bold truncate max-w-[200px]">{paperFile.name}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="bg-white dark:bg-gray-600 p-2 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                                        <Upload className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Click to upload PDF</p>
                                                </>
                                            )}
                                        </div>
                                        <input type="file" accept="application/pdf" className="hidden" onChange={handlePaperUpload} />
                                    </label>
                                </div>
                            </div>

                            <Button type="submit" fullWidth className="vibrant-glow py-3.5 rounded-xl text-base">
                                Upload Paper
                            </Button>
                        </form>
                    </div>
                </div>
            )}
            {/* Add/Edit Student Modal */}
            {showStudentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 ring-1 ring-gray-200 dark:ring-gray-700">
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                {editingStudentId ? <Pencil className="h-5 w-5 mr-3 text-indigo-600" /> : <UserPlus className="h-5 w-5 mr-3 text-indigo-600" />}
                                {editingStudentId ? 'Edit Student' : 'Add New Student'}
                            </h3>
                            <button onClick={() => setShowStudentModal(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                                <CloseIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveStudent} className="p-8 space-y-5">
                            <Input
                                label="Full Name"
                                placeholder="e.g. John Doe"
                                value={newStudent.name}
                                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-5">
                                <Input
                                    label="Student ID / Roll No"
                                    placeholder="e.g. CS-2024-001"
                                    value={newStudent.id}
                                    onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value })}
                                    required
                                    disabled={!!editingStudentId}
                                />
                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={newStudent.email}
                                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                    required
                                />
                            </div>
                            {!editingStudentId && (
                                <Input
                                    label="Initial Password"
                                    type="password"
                                    placeholder="Create a strong password"
                                    value={newStudent.password}
                                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                                    required
                                />
                            )}

                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    onClick={() => setShowStudentModal(false)}
                                    className="flex-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 shadow-lg shadow-indigo-500/30">
                                    {editingStudentId ? 'Update Student' : 'Add Student'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
