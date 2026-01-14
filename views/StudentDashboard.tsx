
import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { User, AttendanceRecord, Notice, QuestionPaper } from '../types';
import { getStudentAttendance, getNotices, getQuestionPapers, getUsers, createJoinRequest } from '../services/storage';
import { Button } from '../components/Button';
import {
    Home, Layers, Bookmark, Briefcase, PieChart,
    Search, Settings, Bell, LogOut, User as UserIcon,
    CheckCircle, X, Download, FileText, Menu, ChevronDown,
    Filter
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentDashboardProps {
    currentUser: User;
    onLogout: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'classroom' | 'resources' | 'idcard'>('overview');
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [papers, setPapers] = useState<QuestionPaper[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Derived Data
    const attendanceStats = useMemo(() => {
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'PRESENT').length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        return { total, present, absent: total - present, percentage };
    }, [attendance]);

    const sortedMarks = [
        { id: 'cie1', title: 'Internal Assessment 1', score: currentUser.cie?.cie1 || 0, max: 20 },
        { id: 'cie2', title: 'Internal Assessment 2', score: currentUser.cie?.cie2 || 0, max: 20 },
        { id: 'assign', title: 'Assignment', score: currentUser.cie?.assignment || 0, max: 10, isAssignment: true, submitted: currentUser.cie?.assignmentSubmitted }
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [att, not, pap, allUsers] = await Promise.all([
                    getStudentAttendance(currentUser.id),
                    getNotices({ studentId: currentUser.id }),
                    getQuestionPapers({ studentId: currentUser.id }),
                    getUsers()
                ]);
                setAttendance(att);
                setNotices(not);
                setPapers(pap);
                setTeachers(allUsers.filter(u => u.role === 'TEACHER'));
            } catch (error) {
                console.error("Error fetching data", error);
            }
        };
        fetchData();
    }, [currentUser.id]);

    // Render Helpers
    const SidebarItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label?: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center justify-center lg:justify-start lg:px-6 py-4 transition-all duration-200 group relative ${activeTab === id
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
            title={label}
        >
            {activeTab === id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-gray-900 dark:bg-white rounded-r-full hidden lg:block"></div>
            )}
            <Icon className={`h-6 w-6 ${activeTab === id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className={`hidden lg:block ml-4 font-bold text-sm ${activeTab === id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                {label}
            </span>
        </button>
    );

    return (
        <div className="flex h-screen bg-white dark:bg-[#0f1115] font-sans overflow-hidden selection:bg-black selection:text-white">
            {/* Sidebar */}
            <aside className="w-20 lg:w-64 flex flex-col items-center bg-gray-50/50 dark:bg-[#13161c] border-r border-gray-100 dark:border-gray-800 backdrop-blur-xl z-20">
                <div className="h-20 flex items-center justify-center w-full border-b border-gray-100 dark:border-gray-800/50">
                    <div className="h-10 w-10 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black font-bold text-xl shadow-lg shadow-gray-200 dark:shadow-none">
                        R
                    </div>
                </div>

                <nav className="flex-1 w-full py-8 space-y-2">
                    <SidebarItem id="overview" icon={Home} label="Dashboard" />
                    <SidebarItem id="attendance" icon={Layers} label="Attendance" />
                    <SidebarItem id="classroom" icon={Bookmark} label="Classroom" />
                    <SidebarItem id="resources" icon={Briefcase} label="Resources" />
                    <SidebarItem id="idcard" icon={PieChart} label="My ID Card" />
                </nav>

                <div className="pb-8 w-full flex flex-col items-center space-y-4">
                    <button onClick={onLogout} className="p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-600 transition-colors">
                        <LogOut className="h-6 w-6" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0f1115] relative">
                {/* Header */}
                <header className="h-20 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between px-8 bg-white/80 dark:bg-[#0f1115]/90 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </h1>
                        <div className="hidden md:flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-full px-4 py-2 border border-transparent focus-within:border-gray-200 dark:focus-within:border-gray-700 transition-colors ml-8 w-64 lg:w-96">
                            <Search className="h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search here..."
                                className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-900 dark:text-white placeholder-gray-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><Settings className="h-5 w-5" /></button>
                        <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors relative">
                            <Bell className="h-5 w-5" />
                            {notices.length > 0 && <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#0f1115]"></span>}
                        </button>

                        <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-2"></div>

                        <button
                            onClick={() => setActiveTab('idcard')}
                            className="hidden sm:flex items-center bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-gray-200 dark:shadow-none hover:transform hover:scale-105 transition-all"
                        >
                            View ID Card
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{currentUser.name}</p>
                                <p className="text-xs text-gray-400 font-medium mt-1">{currentUser.role}</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 p-0.5 shadow-md">
                                <div className="h-full w-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400 cursor-pointer" />
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    {activeTab === 'overview' && (
                        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
                            {/* Hero Stats */}
                            <div className="flex flex-col md:flex-row items-end justify-between gap-8 pb-8 border-b border-gray-100 dark:border-gray-800">
                                <div>
                                    <h2 className="text-7xl lg:text-8xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-2">
                                        {attendanceStats.percentage}
                                    </h2>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium ml-1">Current attendance score</p>
                                </div>
                                <div className="flex-1 w-full max-w-xl bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 relative overflow-hidden">
                                    <div className="flex justify-between text-sm font-bold mb-3 z-10 relative">
                                        <span className="text-emerald-600 dark:text-emerald-400">{attendanceStats.percentage >= 75 ? 'Safe Zone' : 'Needs Improvement'}</span>
                                        <span className="text-gray-400">Target: 75%</span>
                                    </div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative z-10">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-orange-300 via-yellow-300 to-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]"
                                            style={{ width: `${Math.min(attendanceStats.percentage, 100)}%` }}
                                        ></div>
                                        <div className="absolute top-0 bottom-0 w-0.5 bg-black dark:bg-white opacity-20" style={{ left: '75%' }}></div>
                                    </div>
                                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gradient-to-br from-emerald-100 to-transparent dark:from-emerald-900/20 rounded-full blur-2xl opacity-50"></div>
                                </div>
                            </div>

                            {/* Secondary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 rounded-3xl bg-white dark:bg-[#13161c] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Total Classes</p>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full"><Layers className="h-5 w-5" /></div>
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{attendanceStats.total}</span>
                                        <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">Record</span>
                                    </div>
                                </div>
                                <div className="p-6 rounded-3xl bg-white dark:bg-[#13161c] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Classes Attended</p>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full"><CheckCircle className="h-5 w-5" /></div>
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{attendanceStats.present}</span>
                                        <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">+12%</span>
                                    </div>
                                </div>
                                <div className="p-6 rounded-3xl bg-white dark:bg-[#13161c] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Assessment Score</p>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full"><PieChart className="h-5 w-5" /></div>
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{(currentUser.cie?.cie1 || 0) + (currentUser.cie?.cie2 || 0)}</span>
                                        <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-full">Avg</span>
                                    </div>
                                </div>
                            </div>

                            {/* Main Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Marks/Lists */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Academic Performance</h3>
                                            <div className="flex gap-2">
                                                <button className="px-4 py-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold">Sem 5</button>
                                                <button className="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700">Sem 4</button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {sortedMarks.map((item) => (
                                                <div key={item.id} className="group flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-[#13161c] border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all hover:shadow-lg hover:translate-x-1">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${item.score / (item.max || 1) > 0.75 ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                                            <FileText className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 dark:text-white">{item.title}</h4>
                                                            <p className="text-xs font-bold text-gray-400 mt-1">{item.isAssignment ? (item.submitted ? 'Submitted' : 'Pending') : 'Written Test'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <span className="block font-bold text-gray-900 dark:text-white">{item.score} <span className="text-gray-400 text-xs">/ {item.max}</span></span>
                                                            <span className="text-xs text-gray-400 font-bold">Score</span>
                                                        </div>
                                                        <button className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                                            :
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Recent Notices Preview */}
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Classroom Updates</h3>
                                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500 opacity-20 rounded-full -ml-10 -mb-10 blur-2xl"></div>

                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-8">
                                                    <span className="text-indigo-200 font-bold tracking-widest text-xs uppercase bg-white/10 px-3 py-1 rounded-lg backdrop-blur-md">Latest Notice</span>
                                                    <span className="text-indigo-100 text-sm font-medium">{notices[0] ? new Date(notices[0].timestamp).toLocaleDateString() : 'Today'}</span>
                                                </div>
                                                <h4 className="text-2xl font-bold mb-3 leading-tight">
                                                    {notices[0]?.title || "No new announcements"}
                                                </h4>
                                                <p className="text-indigo-100/80 text-sm line-clamp-2 mb-6">
                                                    {notices[0]?.content || "Check back properly for updates from your teachers."}
                                                </p>
                                                <button onClick={() => setActiveTab('classroom')} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all">
                                                    Read Full Notice
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Trends/Visuals */}
                                <div className="space-y-8">
                                    <div className="p-8 rounded-[2.5rem] bg-gray-50 dark:bg-[#13161c] border border-gray-100 dark:border-gray-800">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="font-bold text-gray-900 dark:text-white">Attendance Trends</h3>
                                            <Filter className="h-5 w-5 text-gray-400" />
                                        </div>

                                        {/* Pure CSS Flower/Radar Chart Simulation */}
                                        <div className="relative w-full aspect-square flex items-center justify-center">
                                            {/* Center Core */}
                                            <div className="absolute h-16 w-16 bg-white dark:bg-gray-800 rounded-full shadow-lg z-20 flex items-center justify-center border-4 border-gray-50 dark:border-gray-900">
                                                <PieChart className="h-6 w-6 text-indigo-500" />
                                            </div>

                                            {/* Petals - Static visualization of "Trends" for now */}
                                            {[
                                                { color: 'bg-emerald-400/20', glow: 'bg-emerald-400/40', rotate: '0deg', h: 'h-32' },
                                                { color: 'bg-indigo-400/20', glow: 'bg-indigo-400/40', rotate: '60deg', h: 'h-24' },
                                                { color: 'bg-orange-400/20', glow: 'bg-orange-400/40', rotate: '120deg', h: 'h-28' },
                                                { color: 'bg-pink-400/20', glow: 'bg-pink-400/40', rotate: '180deg', h: 'h-20' },
                                                { color: 'bg-blue-400/20', glow: 'bg-blue-400/40', rotate: '240deg', h: 'h-36' },
                                                { color: 'bg-purple-400/20', glow: 'bg-purple-400/40', rotate: '300deg', h: 'h-28' },
                                            ].map((petal, i) => (
                                                <div
                                                    key={i}
                                                    className={`absolute w-16 ${petal.h} rounded-full origin-bottom bottom-1/2 left-[calc(50%-2rem)] transition-all duration-1000 ease-in-out group hover:scale-110`}
                                                    style={{ transform: `rotate(${petal.rotate}) translateY(-10px)` }}
                                                >
                                                    <div className={`w-full h-full rounded-full ${petal.color} backdrop-blur-sm relative overflow-hidden`}>
                                                        <div className={`absolute inset-0 bg-gradient-to-t from-transparent to-white/30`}></div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Labels */}
                                            <div className="absolute top-4 font-bold text-[10px] text-emerald-600 bg-white/80 px-2 py-1 rounded shadow-sm">Engagement</div>
                                            <div className="absolute bottom-10 right-0 font-bold text-[10px] text-blue-600 bg-white/80 px-2 py-1 rounded shadow-sm">Consistency</div>
                                            <div className="absolute bottom-10 left-0 font-bold text-[10px] text-orange-600 bg-white/80 px-2 py-1 rounded shadow-sm">Focus</div>
                                        </div>
                                        <p className="text-center text-xs text-gray-400 font-bold mt-4">Your diverse learning metrics</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Placeholder for other tabs utilizing the new layout style */}
                    {activeTab === 'attendance' && (
                        <div className="max-w-7xl mx-auto bg-white dark:bg-[#13161c] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 animate-fade-in-up">
                            <h2 className="text-2xl font-bold mb-6">Detailed Attendance</h2>
                            <div className="space-y-4">
                                {attendance.map(a => (
                                    <div key={a.id} className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                                        <div className="flex gap-4 items-center">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                {a.status === 'PRESENT' ? <CheckCircle size={20} /> : <X size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{a.subject}</p>
                                                <p className="text-xs text-gray-500">{new Date(a.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${a.status === 'PRESENT' ? 'bg-white text-emerald-600 shadow-sm' : 'bg-white text-red-600 shadow-sm'}`}>
                                            {a.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'idcard' && (
                        <div className="h-full flex flex-col items-center justify-center animate-fade-in-up">
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[2rem] shadow-2xl text-white max-w-sm w-full relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div>
                                        <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-1">Student ID</p>
                                        <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                                    </div>
                                    <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
                                        <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                                    </div>
                                </div>

                                <div className="flex justify-center my-8 bg-white p-4 rounded-2xl shadow-inner relative z-10">
                                    <QRCode value={currentUser.id} size={150} />
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between border-b border-white/10 pb-2">
                                        <span className="text-gray-400 text-sm">ID Number</span>
                                        <span className="font-mono font-bold">{currentUser.id}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-2">
                                        <span className="text-gray-400 text-sm">Department</span>
                                        <span className="font-bold">{currentUser.branch || 'General'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Valid Thru</span>
                                        <span className="font-bold text-emerald-400">2026</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={() => {
                                    // (Existing PDF logic kept for brevity if needed, or trigger same logic)
                                    const doc = new jsPDF();
                                    doc.text(`ID Card: ${currentUser.name}`, 10, 10);
                                    doc.save("id-card.pdf");
                                }}
                                className="mt-8 shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 px-8 flex items-center gap-2"
                            >
                                <Download size={20} /> Download PDF
                            </Button>
                        </div>
                    )}

                    {/* Fallback for other tabs */}
                    {(activeTab === 'classroom' || activeTab === 'resources') && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 animate-fade-in-up">
                            <div className="h-20 w-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <Bookmark className="h-10 w-10 opacity-20" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Under Construction</h3>
                            <p>This section is being redesigned to match the new dashboard.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};