import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { User, AttendanceRecord, Notice, QuestionPaper, AttendanceStatus } from '../types';
import { getStudentAttendance, getNotices, getQuestionPapers, getUsers, createJoinRequest } from '../services/storage';
import { Button } from '../components/Button';
import { 
  BarChart, FileText, MessageSquare, Book, UserPlus, Download, 
  CheckCircle, AlertCircle, X, Search, PieChart, Calendar, Clock, 
  User as UserIcon, Hash, School, CheckSquare, Square, File as FileIcon 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentDashboardProps {
  currentUser: User;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'classroom' | 'resources'>('overview');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [joinRequestStatus, setJoinRequestStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

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

  const handleJoinRequest = async (teacherId: string) => {
      try {
          await createJoinRequest({
              id: `req-${Date.now()}`,
              studentId: currentUser.id,
              studentName: currentUser.name,
              teacherId: teacherId,
              teacherName: '', 
              status: 'PENDING',
              timestamp: Date.now()
          });
          setJoinRequestStatus({ msg: 'Request sent successfully!', type: 'success' });
      } catch (e: any) {
          setJoinRequestStatus({ msg: e.message, type: 'error' });
      }
      setTimeout(() => setJoinRequestStatus(null), 3000);
  };

  const getScoreStyles = (score: number, max: number) => {
     const percentage = (score / max) * 100;
     if (percentage >= 75) return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' };
     if (percentage >= 60) return { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400', bar: 'bg-blue-500' };
     if (percentage >= 40) return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' };
     return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500' };
  };

  const sortedMarks = [
      { id: 'cie1', title: 'Internal Assessment 1', score: currentUser.cie?.cie1 || 0, max: 20 },
      { id: 'cie2', title: 'Internal Assessment 2', score: currentUser.cie?.cie2 || 0, max: 20 },
      { id: 'assign', title: 'Assignment', score: currentUser.cie?.assignment || 0, max: 10, isAssignment: true, submitted: currentUser.cie?.assignmentSubmitted }
  ];

  const attendanceStats = useMemo(() => {
      const total = attendance.length;
      const present = attendance.filter(a => a.status === 'PRESENT').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return { total, present, absent: total - present, percentage };
  }, [attendance]);

  const filteredTeachers = teachers.filter(t => 
      !currentUser.teacherIds?.includes(t.id) && 
      (t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || t.id.toLowerCase().includes(teacherSearch.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-12">
        {/* Navigation Tabs */}
        <div className="flex justify-center">
            <div className="flex p-1.5 space-x-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 overflow-x-auto max-w-full">
                {[
                    { id: 'overview', icon: PieChart, label: 'Overview' },
                    { id: 'attendance', icon: Calendar, label: 'Attendance' },
                    { id: 'classroom', icon: MessageSquare, label: 'Classroom' },
                    { id: 'resources', icon: Book, label: 'Resources' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center justify-center px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300 whitespace-nowrap ${
                            activeTab === tab.id 
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

        <div className="animate-fade-in">
            {activeTab === 'overview' && (
                <div className="grid gap-6 md:grid-cols-12">
                     {/* ID Card */}
                     <div className="md:col-span-4 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-lg relative z-10 -mt-2 mb-4">
                            <QRCode value={currentUser.id} size={80} style={{ width: '100%', height: '100%' }} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mb-4">{currentUser.id}</p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full mt-2">
                             <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                                 <p className="text-xs text-gray-400 uppercase font-bold">Role</p>
                                 <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{currentUser.role}</p>
                             </div>
                             <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                                 <p className="text-xs text-gray-400 uppercase font-bold">Email</p>
                                 <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate" title={currentUser.email}>{currentUser.email.split('@')[0]}</p>
                             </div>
                        </div>
                     </div>

                     {/* Stats & Join */}
                     <div className="md:col-span-8 space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg mb-2"><CheckCircle className="h-5 w-5" /></div>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{attendanceStats.present}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Classes Attended</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg mb-2"><X className="h-5 w-5" /></div>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{attendanceStats.absent}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Classes Missed</span>
                            </div>
                            <div className="col-span-2 sm:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between px-8">
                                <div>
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Attendance Rate</p>
                                    <p className="text-4xl font-extrabold">{attendanceStats.percentage}%</p>
                                </div>
                                <div className="h-16 w-16 relative">
                                     <svg className="w-full h-full transform -rotate-90">
                                         <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-indigo-500/50" />
                                         <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" 
                                            strokeDasharray={175.9} 
                                            strokeDashoffset={175.9 - (175.9 * attendanceStats.percentage) / 100} 
                                            className="text-white transition-all duration-1000 ease-out" 
                                            strokeLinecap="round"
                                         />
                                     </svg>
                                </div>
                            </div>
                        </div>

                        {/* Marks Section */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <BarChart className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" /> 
                                Academic Performance
                            </h3>
                            <div className="grid gap-6 md:grid-cols-3">
                                {sortedMarks.map((item, idx) => {
                                    const styles = getScoreStyles(item.score, item.max);
                                    const pct = Math.min((item.score / item.max) * 100, 100);
                                    return (
                                        <div key={item.id} className={`border rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all ${styles.bg} ${styles.border} subtle-shimmer group`}>
                                            <div className="relative z-10">
                                                <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${styles.bar}`}></span>
                                                    {item.title}
                                                </h3>
                                                
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-baseline gap-1">
                                                        <div className={`text-3xl font-extrabold ${styles.text}`}>{item.score}</div>
                                                        <div className="text-xs font-bold text-gray-400">/ {item.max}</div>
                                                    </div>
                                                    
                                                    {item.isAssignment && (
                                                        <div className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${item.submitted ? 'bg-white/50 dark:bg-black/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-white/50 dark:bg-black/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'}`}>
                                                            {item.submitted ? <CheckSquare className="h-3 w-3 mr-1" /> : <Square className="h-3 w-3 mr-1" />}
                                                            {item.submitted ? 'Done' : 'Pending'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="w-full bg-white/50 dark:bg-black/10 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-full rounded-full ${styles.bar} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Join Teachers */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                                <span className="flex items-center"><UserPlus className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" /> Join New Classes</span>
                                {joinRequestStatus && <span className={`text-xs px-2 py-1 rounded-lg ${joinRequestStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{joinRequestStatus.msg}</span>}
                            </h3>
                            <div className="flex gap-2 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Find teacher by name or ID..." 
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none text-gray-900 dark:text-white"
                                        value={teacherSearch}
                                        onChange={e => setTeacherSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                                {filteredTeachers.length > 0 ? filteredTeachers.map(teacher => (
                                    <div key={teacher.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                                                {teacher.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{teacher.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{teacher.id}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleJoinRequest(teacher.id)} className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                                            Request Join
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-center text-gray-400 text-sm py-4">No unjoined teachers found matching search.</p>
                                )}
                            </div>
                        </div>
                     </div>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                            <Clock className="h-6 w-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                            Attendance History
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date & Time</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Subject</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                {attendance.length > 0 ? attendance.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                            <div className="font-bold text-gray-900 dark:text-white">{record.date}</div>
                                            <div className="text-xs text-gray-400">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-medium">
                                            {record.subject}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${record.status === 'PRESENT' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800'}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic">No attendance records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'classroom' && (
                <div className="space-y-6">
                    {notices.map(notice => (
                        <div key={notice.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{notice.title}</h3>
                                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Posted by {notice.teacherName}</p>
                                </div>
                                <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-1 rounded-lg">{new Date(notice.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">{notice.content}</p>
                            
                            {notice.attachments && notice.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    {notice.attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                            <FileIcon className="h-3 w-3 mr-2" />
                                            <span className="truncate max-w-[150px]">{file.name}</span>
                                            <a href={file.data} download={file.name} className="ml-2 hover:bg-indigo-200 dark:hover:bg-indigo-800 p-1 rounded-full transition-colors">
                                                <Download className="h-3 w-3" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {notices.length === 0 && (
                        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">No classroom notices available.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'resources' && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                     {papers.map(paper => (
                        <div key={paper.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-bold text-gray-900 dark:text-white truncate" title={paper.title}>{paper.title}</h4>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1">{paper.subject} • {paper.year}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50 dark:border-gray-700">
                                <span className="text-xs text-gray-400 font-medium">By {paper.teacherName}</span>
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
                            <p className="font-medium">No study resources found.</p>
                        </div>
                     )}
                </div>
            )}
        </div>
    </div>
  );
};