
import React, { useState, useEffect } from 'react';
import { User, Order, Client } from '../types';
import { getOrders, getClients } from '../services/storageService';
import { Package, Clock, CheckCircle, Search, Eye, X, Loader2, Printer, CheckCheck } from 'lucide-react';

interface Props {
  user: User;
}

const ALL_SIZES = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3'];

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

  const handlePrint = (order: Order) => {
    const win = window.open('', '', 'height=800,width=900');
    if (!win) return;

    const html = `
      <html>
        <head>
          <title>Pedido #${order.displayId}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print { 
                .no-print { display: none; } 
                body { -webkit-print-color-adjust: exact; } 
            }
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 4px; }
            th { background-color: #f3f4f6; }
          </style>
        </head>
        <body class="bg-white text-black p-8">
            <div class="flex justify-between border-b-2 border-black pb-4 mb-6">
                <div>
                    <h1 class="text-3xl font-extrabold uppercase tracking-wider">Pedido #${order.displayId}</h1>
                    <p class="text-sm mt-1">Emissão: ${new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-lg">${order.repName}</p>
                    <p class="text-sm text-gray-600">Representante</p>
                </div>
            </div>

            <div class="mb-6 border border-black p-4 bg-gray-50">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-xs uppercase text-gray-500 font-bold">Cliente</p>
                        <p class="font-bold text-lg">${order.clientName}</p>
                    </div>
                    <div>
                        <p class="text-xs uppercase text-gray-500 font-bold">Localização</p>
                        <p>${order.clientCity} - ${order.clientState}</p>
                    </div>
                    <div>
                        <p class="text-xs uppercase text-gray-500 font-bold">Entrega</p>
                        <p>${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'A Combinar'}</p>
                    </div>
                    <div>
                        <p class="text-xs uppercase text-gray-500 font-bold">Pagamento</p>
                        <p>${order.paymentMethod || '-'}</p>
                    </div>
                </div>
            </div>

            <table class="w-full mb-6">
                <thead>
                    <tr class="bg-gray-200">
                        <th class="text-left p-2">Ref / Cor</th>
                        ${ALL_SIZES.map(s => `<th class="text-center w-8">${s}</th>`).join('')}
                        <th class="text-right p-2 w-16">Qtd</th>
                        <th class="text-right p-2 w-24">Unit.</th>
                        <th class="text-right p-2 w-24">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td class="p-2">
                                <strong>${item.reference}</strong><br/>
                                <span class="uppercase text-xs">${item.color}</span>
                            </td>
                            ${ALL_SIZES.map(s => {
                                // LÓGICA ATUALIZADA PDF:
                                // Se existir 'picked' (separação feita), usa o valor separado.
                                // Caso contrário, usa o valor original do pedido (sizes).
                                const val = item.picked && item.picked[s] !== undefined ? item.picked[s] : item.sizes[s];
                                return `<td class="text-center">${val || '-'}</td>`;
                            }).join('')}
                            <td class="text-right font-bold p-2">${item.totalQty}</td>
                            <td class="text-right p-2">${item.unitPrice.toFixed(2)}</td>
                            <td class="text-right font-bold p-2">${item.totalItemValue.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="bg-gray-100">
                        <td colspan="${ALL_SIZES.length + 1}" class="text-right font-bold uppercase p-2">Total Itens</td>
                        <td class="text-right font-bold p-2">${order.totalPieces}</td>
                        <td class="text-right font-bold p-2">-</td>
                        <td class="text-right font-bold p-2">${order.subtotalValue.toFixed(2)}</td>
                    </tr>
                    ${order.discountValue > 0 ? `
                    <tr>
                        <td colspan="${ALL_SIZES.length + 3}" class="text-right p-2">
                            Desconto (${order.discountType === 'percentage' ? '%' : 'R$'})
                        </td>
                        <td class="text-right text-red-600 font-bold p-2">
                            - ${order.discountType === 'percentage' 
                                ? ((order.subtotalValue * order.discountValue)/100).toFixed(2) 
                                : order.discountValue.toFixed(2)}
                        </td>
                    </tr>` : ''}
                    <tr class="text-lg border-t-2 border-black">
                        <td colspan="${ALL_SIZES.length + 3}" class="text-right uppercase font-bold p-2">Total Final</td>
                        <td class="text-right font-bold p-2">R$ ${(order.finalTotalValue || 0).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <div class="mt-12 pt-8 border-t border-black flex justify-between text-xs">
                <div class="text-center">
                    _______________________________<br/>
                    ${order.repName}<br/>(Representante)
                </div>
                <div class="text-center">
                    _______________________________<br/>
                    ${order.clientName}<br/>(Cliente)
                </div>
            </div>
            
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
  };

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
            {filteredOrders.map(order => {
                // Cálculo de progresso de separação
                let totalSeparado = 0;
                let totalPedido = order.totalPieces;
                order.items.forEach(item => {
                    if (item.picked) {
                        // Cast Object.values to number[] to avoid 'unknown' type errors
                        totalSeparado += (Object.values(item.picked) as number[]).reduce((a, b) => a + b, 0);
                    }
                });

                const isFullyPicked = totalSeparado >= totalPedido && totalPedido > 0;
                
                return (
                    <div key={order.id} className={`bg-white p-4 rounded-lg shadow border-l-4 ${isFullyPicked ? 'border-green-500' : 'border-blue-400'} flex flex-col md:flex-row justify-between items-center transition-all`}>
                        <div className="mb-2 md:mb-0">
                            <div className="flex items-center gap-2">
                                <span className={`font-bold text-lg ${isFullyPicked ? 'text-green-800' : 'text-blue-900'}`}>Pedido #{order.displayId}</span>
                                <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-gray-700 font-medium">{order.clientName}</div>
                            <div className="text-sm text-gray-500 mt-1">
                                {order.totalPieces} peças • <span className="text-green-600 font-bold">R$ {(order.finalTotalValue || 0).toFixed(2)}</span>
                            </div>
                             {/* Indicador de Separação */}
                             {totalSeparado > 0 && (
                                <div className={`mt-2 text-xs inline-block px-2 py-1 rounded border font-bold ${isFullyPicked ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {isFullyPicked ? 'Separação Completa: ' : 'Separação: '}
                                    <span className="ml-1">
                                        {totalSeparado} / {totalPedido}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Lógica de Ícones: 
                                1. Impresso = CheckCircle (Verde) - Status administrativo
                                2. Totalmente Separado = CheckCheck (Verde Escuro) - Status Físico
                                3. Aberto = Clock (Amarelo) 
                            */}
                            {order.status === 'printed' ? (
                                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-bold mr-2">
                                    <CheckCircle className="w-4 h-4 mr-2" /> Processado
                                </div>
                            ) : isFullyPicked ? (
                                <div className="flex items-center text-green-700 bg-green-100 px-3 py-1 rounded-full text-sm font-bold mr-2 border border-green-200">
                                    <CheckCheck className="w-4 h-4 mr-2" /> Completo
                                </div>
                            ) : (
                                <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm font-bold mr-2">
                                    <Clock className="w-4 h-4 mr-2" /> Aguardando
                                </div>
                            )}
                            
                            <button 
                                onClick={() => handlePrint(order)}
                                className="text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
                                title="Imprimir Pedido"
                            >
                                <Printer className="w-5 h-5" />
                            </button>

                            <button 
                            onClick={() => setViewOrder(order)}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition"
                            title="Ver Detalhes"
                            >
                                <Eye className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                );
            })}
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
                                    <th className="border p-2 text-center">Grade (Separado/Pedido)</th>
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
                                            {/* 
                                                ATUALIZAÇÃO DE VISUALIZAÇÃO:
                                                Agora itera sobre ALL_SIZES para garantir que itens que não estavam 
                                                no pedido original (sizes={}) mas foram bipados (picked={}) apareçam.
                                            */}
                                            {ALL_SIZES.map(s => {
                                                const q = (item.sizes && item.sizes[s]) || 0;
                                                const p = (item.picked && item.picked[s]) || 0;

                                                // Se não tem nem pedido nem separado, não exibe
                                                if (q === 0 && p === 0) return null;

                                                let displayStr = `${q}`;
                                                let style = 'bg-gray-100 text-gray-600 border-gray-200';

                                                if (p > 0) {
                                                    if (q === 0) {
                                                        // Item Extra (não estava no pedido original)
                                                        displayStr = `${p}`;
                                                        style = 'bg-blue-100 text-blue-800 border-blue-200';
                                                    } else {
                                                        // Item Separado vs Pedido
                                                        displayStr = `${p}/${q}`;
                                                        if (p >= q) style = 'bg-green-100 text-green-800 border-green-200';
                                                        else style = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                                                    }
                                                }

                                                return (
                                                    <span key={s} className={`${style} px-1.5 py-0.5 mx-0.5 rounded text-xs border inline-block mb-1`}>
                                                        <span className="font-bold mr-0.5">{s}:</span>{displayStr}
                                                    </span>
                                                )
                                            })}
                                            {/* Fallback visual caso item esteja completamente zerado */}
                                            {(!item.sizes && !item.picked) && <span className="text-gray-300">-</span>}
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
                    
                    {/* Botão de Imprimir/Compartilhar no Modal */}
                    <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                        <button 
                            onClick={() => handlePrint(viewOrder)}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center shadow-sm font-medium"
                        >
                            <Printer className="w-5 h-5 mr-2" />
                            Imprimir / Compartilhar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default RepOrderList;
