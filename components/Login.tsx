import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers, setupDatabase, checkDatabaseHealth, REQUIRED_SQL_SCHEMA } from '../services/storageService';
import { Lock, User as UserIcon, Loader2, Database, AlertCircle, PlayCircle, Settings, CheckCircle2, XCircle, Eye, Copy, Terminal } from 'lucide-react';

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
  
  // Diagnóstico
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [debugUsers, setDebugUsers] = useState<User[] | null>(null);

  // SQL Copy
  const [sqlCopied, setSqlCopied] = useState(false);

  // Verifica o banco assim que carrega a página
  useEffect(() => {
    checkSystem();
  }, []);

  const checkSystem = async () => {
      setCheckingHealth(true);
      try {
          const health = await checkDatabaseHealth();
          setHealthStatus(health);
          
          if (health.status === 'missing_tables') {
              setNeedsSetup(true);
              setError("Tabelas não encontradas no Supabase.");
          } else if (health.status === 'error') {
              setError(`Erro de conexão: ${health.message}`);
              setShowDiagnostics(true);
          }
      } catch (e) {
          console.error("Health check failed", e);
          setError("Falha grave ao verificar sistema.");
      } finally {
          setCheckingHealth(false);
      }
  };

  const fetchDebugUsers = async () => {
      try {
          const users = await getUsers();
          setDebugUsers(users);
      } catch (e) {
          setDebugUsers([]);
          alert("Erro ao buscar usuários: " + JSON.stringify(e));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSetupMsg('');

    try {
      const users = await getUsers();
      // Comparação simples (em produção idealmente seria case-insensitive ou hash)
      const validUser = users.find(u => u.username === username && u.password === password);
      
      if (validUser) {
        onLogin(validUser);
      } else {
        setError('Usuário ou senha incorretos.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === "TABLE_MISSING" || JSON.stringify(err).includes("relation") || JSON.stringify(err).includes("does not exist")) {
          setError('As tabelas do banco ainda não foram criadas.');
          setNeedsSetup(true);
      } else {
          setError('Erro ao tentar login. Verifique o diagnóstico.');
          setShowDiagnostics(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupDatabase = async () => {
    setLoading(true);
    setSetupMsg('Verificando tabelas e usuário Admin...');
    setError('');
    
    try {
      const result = await setupDatabase();
      if (result.success) {
        setSetupMsg(result.message);
        setNeedsSetup(false);
        // Pre-fill login com os dados do Gustavo
        setUsername('gustavo_benvindo80@hotmail.com');
        setPassword('Gustavor80');
        // Re-check health
        checkSystem();
      } else {
        // Se falhar porque as tabelas não existem, mostramos o SQL
        if (result.message?.includes("SQL")) {
            setNeedsSetup(true);
            setError("Tabelas inexistentes. Use o comando SQL abaixo no seu painel Supabase.");
        } else {
            setError('Erro: ' + result.message);
        }
      }
    } catch (e: any) {
      setError('Falha crítica ao configurar banco: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copySQL = () => {
      navigator.clipboard.writeText(REQUIRED_SQL_SCHEMA);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
  };

  if (checkingHealth) {
      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500">Conectando ao Supabase...</p>
              </div>
          </div>
      );
  }

  // Verificar se as variaveis de ambiente estão carregadas (sem expor o valor real)
  const envCheck = {
      url: !!process.env.VITE_SUPABASE_URL,
      key: !!process.env.VITE_SUPABASE_ANON_KEY || !!process.env.VITE_SUPABASE_KEY
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 relative">
        <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="absolute top-4 right-4 text-gray-400 hover:text-blue-600"
            title="Diagnóstico de Conexão"
        >
            <Settings className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">Confecção Pro</h1>
          <p className="text-gray-500 mt-2">Sistema de Gestão de Pedidos (Supabase)</p>
        </div>

        {/* Painel de Diagnóstico */}
        {(showDiagnostics || error.includes("Erro de conexão")) && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm animate-fade-in">
                <h3 className="font-bold text-gray-700 mb-2 border-b pb-1 flex justify-between">
                    Diagnóstico do Sistema
                    <button onClick={() => setShowDiagnostics(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-4 h-4"/></button>
                </h3>
                
                <div className="flex justify-between items-center mb-1">
                    <span>Arquivo .env (Supabase)?</span>
                    {envCheck.url && envCheck.key ? <span className="text-green-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Sim</span> : <span className="text-red-600 flex items-center"><XCircle className="w-3 h-3 mr-1"/> Não</span>}
                </div>
                <div className="flex justify-between items-center mb-1">
                    <span>Status Conexão:</span>
                    <span className={healthStatus?.status === 'ok' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {healthStatus?.status === 'ok' ? 'Online' : healthStatus?.status === 'missing_tables' ? 'Sem Tabelas' : 'Erro'}
                    </span>
                </div>
                {healthStatus?.message && (
                    <div className="mt-2 p-2 bg-red-100 text-red-800 rounded text-xs break-words font-mono">
                        {healthStatus.message}
                    </div>
                )}

                <div className="mt-4 flex gap-2">
                     <button 
                        onClick={fetchDebugUsers}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-2 rounded text-xs font-bold flex items-center justify-center"
                    >
                        <Eye className="w-3 h-3 mr-1" /> Debug Users
                    </button>
                    <button 
                        onClick={() => setNeedsSetup(true)}
                        className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-2 rounded text-xs font-bold"
                    >
                        Ver Configuração
                    </button>
                </div>
            </div>
        )}

        {needsSetup ? (
           <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center animate-fade-in">
               <Database className="w-12 h-12 text-orange-500 mx-auto mb-3" />
               <h3 className="text-lg font-bold text-orange-800 mb-2">Configuração Inicial</h3>
               
               {/* Instruções de SQL se for Supabase */}
               <div className="text-left bg-white p-3 rounded border border-orange-200 mb-4">
                   <p className="text-xs text-orange-800 mb-2 font-bold flex items-center">
                       <Terminal className="w-3 h-3 mr-1" /> Ação Necessária no Supabase:
                   </p>
                   <p className="text-xs text-gray-600 mb-2">
                       Copie o código abaixo e execute no <strong>SQL Editor</strong> do seu painel Supabase para criar as tabelas.
                   </p>
                   <div className="relative">
                       <textarea 
                           readOnly 
                           className="w-full h-24 text-[10px] p-2 bg-gray-900 text-green-400 font-mono rounded resize-none"
                           value={REQUIRED_SQL_SCHEMA}
                       />
                       <button 
                           onClick={copySQL}
                           className="absolute top-2 right-2 bg-white text-gray-800 p-1 rounded hover:bg-gray-200 shadow"
                           title="Copiar SQL"
                       >
                           {sqlCopied ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : <Copy className="w-4 h-4"/>}
                       </button>
                   </div>
               </div>

               <button 
                onClick={handleSetupDatabase}
                disabled={loading}
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition flex items-center justify-center shadow-md"
               >
                   {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <PlayCircle className="w-5 h-5 mr-2" />}
                   {loading ? 'Verificando...' : 'Já criei, verificar agora'}
               </button>
               {error && <p className="mt-3 text-red-600 text-sm font-bold bg-white p-2 rounded border border-red-100">{error}</p>}
               
               <button 
                   onClick={() => setNeedsSetup(false)}
                   className="mt-4 text-gray-500 text-sm underline"
               >
                   Voltar para Login
               </button>
           </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {error && !showDiagnostics && (
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Email / Usuário</label>
                <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="gustavo_benvindo80@hotmail.com"
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
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-md flex justify-center items-center"
            >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Entrar no Sistema'}
            </button>
            </form>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          &copy; 2025 Gestão Confecção. <br/>
          {process.env.VITE_SUPABASE_URL ? (
             <span className="text-green-500">Supabase Conectado</span>
          ) : (
             <span className="text-red-400">Supabase Desconectado</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;