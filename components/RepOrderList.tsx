
import React, { useState, useEffect } from 'react';
import { User, Order, Client } from '../types';
import { getOrders, getClients } from '../services/storageService';
import { Package, Clock, CheckCircle, Search, Eye, X, Loader2 } from 'lucide-react';

interface Props {
  user: User;
}

const RepOrderList: React.FC<Props> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedClientId, setSelectedClientId] = useState('');

  // Modal State
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const [o, c] = await Promise.all([getOrders(), getClients(user.id)]);
        setClients(c);
        setOrders(o.filter(o => o.repId === user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
    };
    fetchData();
  }, [user.id]);

  const filteredOrders = selectedClientId 
    ? orders.filter(o => o.clientId === selectedClientId)
    : orders;

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Meus Pedidos</h2>
            
            <div className="flex items-center w-full md:w-auto">
                <Search className="w-5 h-5 text-gray-400 mr-2" />
                <select
                    className="border p-2 rounded w-full md:w-64"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                >
                    <option value="">Todos os Clientes</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>
        </div>
        
        <div className="grid gap-4">
            {filteredOrders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400 flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-2 md:mb-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-blue-900">Pedido #{order.displayId}</span>
                            <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-gray-700 font-medium">{order.clientName}</div>
                        <div className="text-sm text-gray-500 mt-1">
                            {order.totalPieces} peças • <span className="text-green-600 font-bold">R$ {(order.finalTotalValue || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {order.status === 'printed' ? (
                            <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-bold">
                                <CheckCircle className="w-4 h-4 mr-2" /> Processado
                            </div>
                        ) : (
                            <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm font-bold">
                                <Clock className="w-4 h-4 mr-2" /> Aguardando
                            </div>
                        )}
                        <button 
                           onClick={() => setViewOrder(order)}
                           className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition"
                           title="Ver Detalhes"
                        >
                            <Eye className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
            {filteredOrders.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Nenhum pedido encontrado.</p>
                </div>
            )}
        </div>

        {/* View Order Modal */}
        {viewOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                        <h3 className="font-bold text-lg text-gray-800">Detalhes do Pedido #{viewOrder.displayId}</h3>
                        <button onClick={() => setViewOrder(null)}>
                            <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Cliente</p>
                                <p className="font-bold">{viewOrder.clientName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Entrega</p>
                                <p>{viewOrder.deliveryDate ? new Date(viewOrder.deliveryDate).toLocaleDateString() : 'A combinar'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Pagamento</p>
                                <p>{viewOrder.paymentMethod || '-'}</p>
                            </div>
                        </div>

                        <table className="w-full text-sm border-collapse border border-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border p-2 text-left">Ref</th>
                                    <th className="border p-2 text-left">Cor</th>
                                    <th className="border p-2 text-center">Grade</th>
                                    <th className="border p-2 text-right">Qtd</th>
                                    <th className="border p-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewOrder.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="border p-2 font-medium">{item.reference}</td>
                                        <td className="border p-2">{item.color}</td>
                                        <td className="border p-2 text-center">
                                            {Object.entries(item.sizes).map(([s, q]) => (
                                                <span key={s} className="bg-gray-100 px-1 mx-1 rounded text-xs">
                                                    {s}:{q}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="border p-2 text-right font-bold">{item.totalQty}</td>
                                        <td className="border p-2 text-right">R$ {(item.totalItemValue || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td colSpan={3} className="border p-2 text-right">Total Peças</td>
                                    <td className="border p-2 text-right">{viewOrder.totalPieces}</td>
                                    <td className="border p-2 text-right">-</td>
                                </tr>
                                {viewOrder.discountValue > 0 && (
                                    <tr className="text-red-600">
                                        <td colSpan={4} className="border p-2 text-right">Desconto ({viewOrder.discountType === 'percentage' ? '%' : 'R$'})</td>
                                        <td className="border p-2 text-right">- {viewOrder.discountType === 'percentage' ? `${viewOrder.discountValue}%` : `R$ ${viewOrder.discountValue}`}</td>
                                    </tr>
                                )}
                                <tr className="text-lg">
                                    <td colSpan={4} className="border p-2 text-right uppercase">Total Final</td>
                                    <td className="border p-2 text-right text-green-700">R$ {(viewOrder.finalTotalValue || 0).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default RepOrderList;
