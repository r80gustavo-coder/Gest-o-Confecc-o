import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import AdminOrderList from './components/AdminOrderList';
import ProductManager from './components/ProductManager';
import RepManager from './components/RepManager';
import ClientManager from './components/ClientManager';
import RepOrderForm from './components/RepOrderForm';
import RepOrderList from './components/RepOrderList';
import { User, Role } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check local session persistence first (simple approach)
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('current_user', JSON.stringify(u));
    setActiveTab(u.role === Role.ADMIN ? 'dashboard' : 'rep-dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('current_user');
    setActiveTab('dashboard');
  };

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      {user.role === Role.ADMIN && (
        <>
          {activeTab === 'dashboard' && <AdminDashboard onNavigate={setActiveTab} />}
          {activeTab === 'orders' && <AdminOrderList />}
          {activeTab === 'products' && <ProductManager />}
          {activeTab === 'reps' && <RepManager />}
        </>
      )}

      {user.role === Role.REP && (
        <>
          {activeTab === 'rep-dashboard' && <RepOrderList user={user} />}
          {activeTab === 'new-order' && <RepOrderForm user={user} onOrderCreated={() => setActiveTab('rep-dashboard')} />}
          {activeTab === 'clients' && <ClientManager user={user} />}
        </>
      )}
    </Layout>
  );
};

export default App;