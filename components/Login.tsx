import React, { useState } from 'react';
import { User } from '../types';
import { getUsers, setupDatabase } from '../services/storageService';
import { Lock, User as UserIcon, Loader2, Database, AlertCircle } from 'lucide-react';

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
      } else {
        setError('Erro: ' + result.message);
      }
    } catch (e) {
      setError('Falha crítica ao configurar banco.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">Confecção Pro</h1>
          <p className="text-gray-500 mt-2">Sistema de Gestão de Pedidos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className={`p-3 rounded-lg text-sm text-center flex flex-col items-center ${needsSetup ? 'bg-orange-50 text-orange-800' : 'bg-red-50 text-red-600'}`}>
              <span className="flex items-center font-bold mb-1">
                 <AlertCircle className="w-4 h-4 mr-2" /> Atenção
              </span>
              {error}
              {needsSetup && (
                  <p className="mt-1 text-xs">Clique no botão abaixo para corrigir.</p>
              )}
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
        
        <div className={`mt-8 pt-6 border-t border-gray-100 ${needsSetup ? 'animate-pulse' : ''}`}>
          <button 
            type="button"
            onClick={handleSetupDatabase}
            className={`w-full flex items-center justify-center text-xs transition p-2 rounded ${needsSetup ? 'bg-orange-100 text-orange-800 font-bold border border-orange-300' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'}`}
          >
            <Database className="w-3 h-3 mr-2" /> 
            {needsSetup ? 'CLIQUE AQUI PARA CRIAR AS TABELAS' : 'Configurar Banco de Dados (Primeiro Acesso)'}
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-gray-400">
          &copy; 2025 Gestão Confecção. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default Login;