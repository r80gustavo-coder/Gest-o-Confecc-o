import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { getUsers, addUser } from '../services/storageService';
import { Lock, User as UserIcon, Check, AlertTriangle, WifiOff } from 'lucide-react';
import { supabase } from '../services/supabase';

interface Props {
  onLogin: (user: User) => void;
}

const MASTER_EMAIL = 'gustavo_benvindo80@hotmail.com';
const MASTER_PASS = 'Gustavor80';

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState(MASTER_EMAIL);
  const [password, setPassword] = useState(MASTER_PASS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Teste simples de conexão. Se a URL for placeholder, isso deve falhar.
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) {
          // Se for erro de tabela inexistente ou auth, tecnicamente conectou, mas vamos tratar falhas gerais como erro
          console.warn("Status DB:", error.message);
          setDbStatus('error');
      } else {
          setDbStatus('connected');
      }
    } catch (e) {
      setDbStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Tenta buscar usuários do banco
      const users = await getUsers();
      const validUser = users.find(u => u.username === username && u.password === password);
      
      if (validUser) {
        onLogin(validUser);
        return;
      }

      // 2. Fallback de Segurança (Master Login)
      if (username === MASTER_EMAIL && password === MASTER_PASS) {
          console.log("Usando Master Login Override");
          
          const masterUser: User = {
            id: crypto.randomUUID(),
            name: 'Gustavo Benvindo',
            username: MASTER_EMAIL,
            password: MASTER_PASS,
            role: Role.ADMIN
          };

          // Tenta criar o usuário no banco se a conexão existir
          if (dbStatus === 'connected') {
             const exists = users.find(u => u.username === MASTER_EMAIL);
             if (!exists) {
               await addUser(masterUser);
             } else {
               masterUser.id = exists.id;
             }
          }

          onLogin(masterUser);
          return;
      }

      setError('Usuário ou senha inválidos.');
      
    } catch (err) {
      console.error(err);
      // Se tudo falhar (banco offline), mas for o mestre, deixa entrar
      if (username === MASTER_EMAIL && password === MASTER_PASS) {
         onLogin({
            id: 'admin-offline',
            name: 'Gustavo Benvindo',
            username: MASTER_EMAIL,
            password: MASTER_PASS,
            role: Role.ADMIN
         });
         alert('Aviso: Login realizado em modo OFFLINE. Algumas funções podem não salvar dados.');
      } else {
         setError('Erro ao conectar ao sistema.');
      }
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
          
          <div className="flex justify-center mt-4">
             {dbStatus === 'connected' ? (
                 <span className="flex items-center text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                     <Check className="w-3 h-3 mr-1" /> Banco de Dados Conectado
                 </span>
             ) : (
                 <span className="flex items-center text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100" title="Verifique o console para detalhes">
                     {dbStatus === 'checking' ? (
                        <>Verificando conexão...</>
                     ) : (
                        <><WifiOff className="w-3 h-3 mr-1" /> Sem Conexão com Banco</>
                     )}
                 </span>
             )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="email@exemplo.com"
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
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-md flex justify-center disabled:opacity-70"
          >
            {loading ? 'Entrando...' : 'Acessar Painel'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400">
          &copy; 2025 Gestão Confecção Pro
        </div>
      </div>
    </div>
  );
};

export default Login;