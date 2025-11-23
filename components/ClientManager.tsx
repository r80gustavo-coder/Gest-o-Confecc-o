import React, { useState, useEffect } from 'react';
import { User, Client } from '../types';
import { getClients, addClient } from '../services/storageService';
import { Plus, MapPin, Store, Loader2 } from 'lucide-react';

interface Props {
  user: User;
}

const ClientManager: React.FC<Props> = ({ user }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    name: '', city: '', neighborhood: '', state: ''
  });
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    const data = await getClients(user.id);
    setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addClient({
        id: crypto.randomUUID(),
        repId: user.id,
        ...form
    });
    await fetchClients();
    setForm({ name: '', city: '', neighborhood: '', state: '' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Meus Clientes</h2>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Store className="w-5 h-5 mr-2 text-blue-600" /> Cadastrar Novo Cliente
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Loja / Cliente</label>
                <input 
                    required
                    className="w-full border p-2 rounded"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Ex: Boutique Elegance"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input 
                    required
                    className="w-full border p-2 rounded"
                    value={form.city}
                    onChange={e => setForm({...form, city: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
                <input 
                    required
                    className="w-full border p-2 rounded uppercase"
                    maxLength={2}
                    value={form.state}
                    onChange={e => setForm({...form, state: e.target.value})}
                    placeholder="SP"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input 
                    required
                    className="w-full border p-2 rounded"
                    value={form.neighborhood}
                    onChange={e => setForm({...form, neighborhood: e.target.value})}
                />
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> Salvar Cliente
                </button>
            </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {loading ? <Loader2 className="animate-spin text-blue-500" /> : clients.map(client => (
             <div key={client.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                 <h4 className="font-bold text-lg text-gray-800">{client.name}</h4>
                 <div className="flex items-center text-gray-500 mt-2">
                     <MapPin className="w-4 h-4 mr-1" />
                     <span className="text-sm">{client.city} - {client.state}</span>
                 </div>
                 <p className="text-xs text-gray-400 mt-1">{client.neighborhood}</p>
             </div>
         ))}
         {!loading && clients.length === 0 && (
             <div className="col-span-3 text-center text-gray-400 py-10">
                 Você ainda não tem clientes cadastrados.
             </div>
         )}
      </div>
    </div>
  );
};

export default ClientManager;