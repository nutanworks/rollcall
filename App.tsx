import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { getUsers } from './services/storage';
import { Login } from './views/Login';
import { AdminDashboard } from './views/AdminDashboard';
import { TeacherDashboard } from './views/TeacherDashboard';
import { StudentDashboard } from './views/StudentDashboard';
import { Layout } from './components/Layout';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  // Check for session in local storage or simpler state persistence could be added
  // For now, we rely on React state. Refreshing clears login (security feature ;) )
  // But to be nice, let's allow persistent login simulation if we wanted, 
  // but simpler to keep secure by clearing on refresh for this demo.

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout user={user} onLogout={handleLogout} title={`${user.role.charAt(0) + user.role.slice(1).toLowerCase()} Dashboard`}>
      {user.role === UserRole.ADMIN && <AdminDashboard />}
      {user.role === UserRole.TEACHER && <TeacherDashboard currentUser={user} />}
      {user.role === UserRole.STUDENT && <StudentDashboard currentUser={user} />}
    </Layout>
  );
};

export default App;