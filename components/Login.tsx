import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers, setupDatabase, checkDatabaseHealth } from '../services/storageService';
import { Lock, User as UserIcon, Loader2, Database, AlertCircle, PlayCircle } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMsg, setSetupMsg] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(true);

  // Verifica o banco assim que carrega a página
  useEffect(() => {
    const checkSystem = async () => {
        try {
            const health = await checkDatabaseHealth();
            if (health.status === 'missing_tables') {
                setNeedsSetup(true);
            }
        } catch (e) {
            console.error("Health check failed", e);
        } finally {
            setCheckingHealth(false);
        }
    };
    checkSystem();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSetupMsg('');
    setNeedsSetup(false);

    try {
      const users = await getUsers();
      const validUser = users.find(u => u.username === username && u.password === password);
      
      if (validUser) {
        onLogin(validUser);
      } else {
        setError('Usuário ou senha incorretos.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === "TABLE_MISSING" || JSON.stringify(err).includes("no such table")) {
          setError('As tabelas do banco ainda não foram criadas.');
          setNeedsSetup(true);
      } else {
          setError('Erro de conexão. Verifique suas chaves do Turso.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupDatabase = async () => {
    setLoading(true);
    setSetupMsg('Criando tabelas e usuário admin...');
    try {
      const result = await setupDatabase();
      if (result.success) {
        setSetupMsg(result.message);
        setNeedsSetup(false);
        // Pre-fill login
        setUsername('admin');
        setPassword('123456');
      } else {
        setError('Erro: ' + result.message);
      }
    } catch (e) {
      setError('Falha crítica ao configurar banco.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingHealth) {
      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500">Conectando ao sistema...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">Confecção Pro</h1>
          <p className="text-gray-500 mt-2">Sistema de Gestão de Pedidos</p>
        </div>

        {needsSetup ? (
           <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center animate-fade-in">
               <Database className="w-12 h-12 text-orange-500 mx-auto mb-3" />
               <h3 className="text-lg font-bold text-orange-800 mb-2">Primeiro Acesso Detectado</h3>
               <p className="text-sm text-orange-700 mb-6">
                   O banco de dados está conectado, mas as tabelas ainda não foram criadas.
               </p>
               <button 
                onClick={handleSetupDatabase}
                disabled={loading}
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition flex items-center justify-center shadow-md"
               >
                   {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <PlayCircle className="w-5 h-5 mr-2" />}
                   {loading ? 'Configurando...' : 'Criar Tabelas Automaticamente'}
               </button>
               {error && <p className="mt-3 text-red-600 text-sm font-bold">{error}</p>}
           </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center flex flex-col items-center border border-red-200">
                <span className="flex items-center font-bold mb-1">
                    <AlertCircle className="w-4 h-4 mr-2" /> Atenção
                </span>
                {error}
                </div>
            )}

            {setupMsg && (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm text-center font-bold border border-green-200">
                {setupMsg}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usuário / Email</label>
                <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="123456"
                />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-md flex justify-center items-center"
            >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Entrar no Sistema'}
            </button>
            </form>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          &copy; 2025 Gestão Confecção. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default Login;