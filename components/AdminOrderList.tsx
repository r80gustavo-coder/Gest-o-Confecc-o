import React, { useState, useEffect } from 'react';
import { Order, OrderItem } from '../types';
import { getOrders, updateOrderStatus } from '../services/storageService';
import { Printer, Calculator, CheckCircle, X, Loader2 } from 'lucide-react';

const ALL_SIZES = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3'];

const AdminOrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // Date Range Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Aggregation Modal State
  const [showAggregation, setShowAggregation] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const data = await getOrders();
    setOrders(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOrderIds(newSet);
  };

  const filteredOrders = orders.filter(o => {
    const orderDate = o.createdAt.split('T')[0];
    const afterStart = !startDate || orderDate >= startDate;
    const beforeEnd = !endDate || orderDate <= endDate;
    return afterStart && beforeEnd;
  });

  const handleSelectAllFiltered = () => {
    if (selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0) {
        setSelectedOrderIds(new Set()); // Deselect all
    } else {
        setSelectedOrderIds(new Set(filteredOrders.map(o => o.id))); // Select all currently visible
    }
  };

  const handlePrintIndividual = async (order: Order) => {
    const printContent = document.getElementById(`print-order-${order.id}`);
    if (printContent) {
        // Optimistic update
        const updatedOrders = orders.map(o => o.id === order.id ? { ...o, status: 'printed' as const } : o);
        setOrders(updatedOrders);
        
        // Background update
        updateOrderStatus(order.id, 'printed');

        const win = window.open('', '', 'height=700,width=900');
        if(win) {
            win.document.write('<html><head><title>Imprimir Pedido</title>');
            win.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            win.document.write('<style>@media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; } }</style>');
            win.document.write('</head><body class="p-8 bg-white">');
            win.document.write(printContent.innerHTML);
            win.document.write('</body></html>');
            win.document.close();
            setTimeout(() => {
                win.print();
            }, 500);
        }
    }
  };

  // Logic to aggregate items from selected orders
  const getAggregatedItems = () => {
    const selected = orders.filter(o => selectedOrderIds.has(o.id));
    const aggregation: Record<string, OrderItem> = {}; // Key: Ref-Color

    selected.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.reference}-${item.color}`;
        if (!aggregation[key]) {
          aggregation[key] = { 
              ...item, 
              sizes: { ...item.sizes }, 
              totalQty: item.totalQty 
          };
        } else {
          aggregation[key].totalQty += item.totalQty;
          Object.entries(item.sizes).forEach(([size, qty]) => {
            aggregation[key].sizes[size] = (aggregation[key].sizes[size] || 0) + (qty as number);
          });
        }
      });
    });

    return Object.values(aggregation).sort((a, b) => a.reference.localeCompare(b.reference));
  };

  const aggregatedItems = showAggregation ? getAggregatedItems() : [];

  const handlePrintAggregation = () => {
    const win = window.open('', '', 'height=800,width=1000');
    if (!win) return;

    const totalPieces = aggregatedItems.reduce((acc, i) => acc + i.totalQty, 0);
    const dateRange = startDate && endDate 
        ? `Período: ${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`
        : 'Relatório Geral';
    
    // Calculate vertical totals per size for the footer
    const sizeTotals: Record<string, number> = {};
    ALL_SIZES.forEach(s => sizeTotals[s] = 0);
    aggregatedItems.forEach(item => {
        ALL_SIZES.forEach(s => {
            if (item.sizes[s]) sizeTotals[s] += item.sizes[s];
        });
    });

    const html = `
      <html>
        <head>
          <title>Lista de Produção</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid black; padding: 4px; text-align: center; }
            th { background-color: #f3f4f6; font-weight: bold; }
            td.left { text-align: left; }
            .header { margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="text-2xl font-bold uppercase">Resumo de Produção</h1>
            <p class="text-sm text-gray-600">${dateRange}</p>
            <p class="text-sm">Pedidos Selecionados: <strong>${selectedOrderIds.size}</strong></p>
          </div>

          <table>
            <thead>
              <tr>
                <th width="20%" class="left">Referência</th>
                <th width="20%" class="left">Cor</th>
                ${ALL_SIZES.map(s => `<th>${s}</th>`).join('')}
                <th width="10%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${aggregatedItems.map(item => `
                <tr>
                  <td class="left font-bold">${item.reference}</td>
                  <td class="left uppercase">${item.color}</td>
                  ${ALL_SIZES.map(s => `<td>${item.sizes[s] ? `<strong>${item.sizes[s]}</strong>` : '-'}</td>`).join('')}
                  <td class="font-bold bg-gray-50 text-base">${item.totalQty}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
               <tr class="bg-gray-100">
                 <td colspan="2" class="left font-bold uppercase p-2">Totais por Tamanho</td>
                 ${ALL_SIZES.map(s => `<td>${sizeTotals[s] > 0 ? sizeTotals[s] : ''}</td>`).join('')}
                 <td class="font-bold text-xl">${totalPieces}</td>
               </tr>
            </tfoot>
          </table>
          
          <div class="mt-8 text-xs text-gray-500">
            Impresso em: ${new Date().toLocaleString()}
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">Gestão de Pedidos</h2>
        <div className="flex flex-col md:flex-row gap-4 items-center w-full xl:w-auto">
           <div className="flex items-center gap-2">
             <span className="text-sm text-gray-500 font-medium">De:</span>
             <input 
               type="date" 
               className="border p-2 rounded shadow-sm text-sm" 
               value={startDate} 
               onChange={(e) => setStartDate(e.target.value)} 
             />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm text-gray-500 font-medium">Até:</span>
             <input 
               type="date" 
               className="border p-2 rounded shadow-sm text-sm" 
               value={endDate} 
               onChange={(e) => setEndDate(e.target.value)} 
             />
           </div>
           
           {selectedOrderIds.size > 0 && (
             <button 
               onClick={() => setShowAggregation(true)}
               className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center shadow transition w-full md:w-auto justify-center"
             >
               <Calculator className="w-4 h-4 mr-2" />
               Somar ({selectedOrderIds.size})
             </button>
           )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden no-print">
        {loading ? (
             <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-sm font-bold uppercase">
            <tr>
              <th className="p-4 w-10">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAllFiltered}
                  checked={filteredOrders.length > 0 && selectedOrderIds.size >= filteredOrders.length}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="p-4">Pedido #</th>
              <th className="p-4">Data</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Repr.</th>
              <th className="p-4 text-center">Peças</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Nenhum pedido encontrado neste período.</td></tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id} className={`hover:bg-blue-50 transition ${selectedOrderIds.has(order.id) ? 'bg-blue-50' : ''}`}>
                <td className="p-4">
                  <input 
                    type="checkbox" 
                    checked={selectedOrderIds.has(order.id)} 
                    onChange={() => toggleSelect(order.id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="p-4 font-bold text-gray-800">#{order.displayId}</td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-4 text-sm">
                  <div className="font-medium text-gray-900">{order.clientName}</div>
                  <div className="text-xs text-gray-500">{order.clientCity}</div>
                </td>
                <td className="p-4 text-sm text-gray-600">{order.repName}</td>
                <td className="p-4 text-center font-bold text-blue-600">{order.totalPieces}</td>
                <td className="p-4 text-center">
                  {order.status === 'printed' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" /> Impresso
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Aberto
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handlePrintIndividual(order)}
                    className="text-gray-500 hover:text-blue-600 transition p-2"
                    title="Imprimir Pedido"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  
                  {/* Hidden Print Template for Individual Orders */}
                  <div id={`print-order-${order.id}`} className="hidden">
                    <div className="border-2 border-black p-8 font-sans max-w-3xl mx-auto">
                        <div className="flex justify-between border-b-2 border-black pb-4 mb-6">
                            <div>
                                <h1 className="text-4xl font-extrabold uppercase tracking-wider">Pedido #{order.displayId}</h1>
                                <p className="text-sm mt-1">Emissão: {new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">{order.repName}</p>
                                <p className="text-sm text-gray-600">Representante</p>
                            </div>
                        </div>

                        <div className="mb-8 border border-black p-4 bg-gray-50">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs uppercase text-gray-500 font-bold">Cliente</p>
                                    <p className="font-bold text-lg">{order.clientName}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-gray-500 font-bold">Localização</p>
                                    <p>{order.clientCity} - {order.clientState}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-gray-500 font-bold">Entrega</p>
                                    <p>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'A Combinar'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-gray-500 font-bold">Pagamento</p>
                                    <p>{order.paymentMethod || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <table className="w-full border-collapse border border-black text-sm">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="border border-black p-1 text-left">Ref</th>
                                    <th className="border border-black p-1 text-left">Cor</th>
                                    {ALL_SIZES.map(s => (
                                        <th key={s} className="border border-black p-1 text-center w-8">{s}</th>
                                    ))}
                                    <th className="border border-black p-1 w-16 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-black p-1 font-bold">{item.reference}</td>
                                        <td className="border border-black p-1 uppercase">{item.color}</td>
                                        {ALL_SIZES.map(s => (
                                            <td key={s} className="border border-black p-1 text-center">
                                                {item.sizes[s] ? <span className="font-bold">{item.sizes[s]}</span> : <span className="text-gray-300">-</span>}
                                            </td>
                                        ))}
                                        <td className="border border-black p-1 text-right font-bold text-lg">{item.totalQty}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100">
                                    <td colSpan={2} className="border border-black p-2 text-right font-bold uppercase">Total Peças</td>
                                    <td colSpan={ALL_SIZES.length + 1} className="border border-black p-2 text-right font-bold text-lg">{order.totalPieces}</td>
                                </tr>
                            </tfoot>
                        </table>
                        
                        <div className="mt-12 pt-8 border-t border-black flex justify-between text-xs">
                            <div>_______________________________<br/>Assinatura Representante</div>
                            <div>_______________________________<br/>Assinatura Cliente</div>
                        </div>
                    </div>
                  </div>
                  {/* End Print Template */}

                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {/* Aggregation Modal (Production List) */}
      {showAggregation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-purple-50">
              <div>
                <h2 className="text-xl font-bold text-purple-900 flex items-center">
                  <Calculator className="w-5 h-5 mr-2" /> Resumo de Produção
                </h2>
                <p className="text-sm text-purple-600 mt-1">
                  Consolidado de {selectedOrderIds.size} pedidos selecionados ({startDate ? `De ${new Date(startDate).toLocaleDateString()}` : 'Início'} até {endDate ? new Date(endDate).toLocaleDateString() : 'Hoje'})
                </p>
              </div>
              <button onClick={() => setShowAggregation(false)} className="p-2 hover:bg-purple-100 rounded-full">
                <X className="w-6 h-6 text-purple-800" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Ref</th>
                    <th className="border p-2 text-left">Cor</th>
                    {ALL_SIZES.map(s => <th key={s} className="border p-2 text-center w-10">{s}</th>)}
                    <th className="border p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border p-2 font-bold">{item.reference}</td>
                      <td className="border p-2 uppercase">{item.color}</td>
                      {ALL_SIZES.map(s => (
                          <td key={s} className="border p-2 text-center">
                              {item.sizes[s] ? <span className="font-bold">{item.sizes[s]}</span> : <span className="text-gray-300">-</span>}
                          </td>
                      ))}
                      <td className="border p-2 text-right font-bold text-lg">{item.totalQty}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-purple-50 font-bold text-purple-900">
                    <tr>
                        <td colSpan={2} className="border p-3 text-right">TOTAL GERAL:</td>
                        {ALL_SIZES.map(s => {
                            const colTotal = aggregatedItems.reduce((acc, i) => acc + (i.sizes[s] || 0), 0);
                            return <td key={s} className="border p-3 text-center">{colTotal || ''}</td>
                        })}
                        <td className="border p-3 text-right text-xl">
                            {aggregatedItems.reduce((acc, i) => acc + i.totalQty, 0)}
                        </td>
                    </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
               <button 
                 onClick={handlePrintAggregation}
                 className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center shadow-lg transform active:scale-95 transition"
               >
                 <Printer className="w-5 h-5 mr-2" /> Imprimir Lista de Produção
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderList;