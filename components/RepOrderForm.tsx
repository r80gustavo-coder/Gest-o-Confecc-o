import React, { useState, useEffect } from 'react';
import { User, ProductDef, OrderItem, Client, SizeGridType, SIZE_GRIDS } from '../types';
import { getProducts, getClients, addOrder } from '../services/storageService';
import { Plus, Trash, Save, Edit2, Loader2, ChevronDown, Check } from 'lucide-react';

interface Props {
  user: User;
  onOrderCreated: () => void;
}

const ALL_SIZES = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3'];

const RepOrderForm: React.FC<Props> = ({ user, onOrderCreated }) => {
  const [products, setProducts] = useState<ProductDef[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // Item Entry State
  const [currentRef, setCurrentRef] = useState('');
  const [currentColor, setCurrentColor] = useState('');
  const [currentGrid, setCurrentGrid] = useState<SizeGridType>(SizeGridType.ADULT);
  
  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Order Items
  const [items, setItems] = useState<OrderItem[]>([]);

  // Helpers to speed up entry
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  
  // Quick Entry Grid State
  const [quickSizes, setQuickSizes] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const [p, c] = await Promise.all([getProducts(), getClients(user.id)]);
        setProducts(p);
        setClients(c);
        setLoading(false);
    };
    loadData();
  }, [user.id]);

  useEffect(() => {
    // Filter colors when ref changes
    if (currentRef) {
      const colors = products
        .filter(p => p.reference === currentRef)
        .map(p => p.color);
      setAvailableColors([...new Set(colors)]);
      
      // Auto select grid type from product def if possible, but only if not editing manually
      if (editingIndex === null) {
        const prod = products.find(p => p.reference === currentRef);
        if (prod) setCurrentGrid(prod.gridType);
      }
    } else {
      setAvailableColors([]);
    }
  }, [currentRef, products, editingIndex]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRef || !currentColor) return;

    // Convert quickSizes strings to numbers
    const sizesNum: {[key: string]: number} = {};
    let total = 0;
    Object.entries(quickSizes).forEach(([size, qtyStr]) => {
      const q = parseInt(qtyStr as string);
      if (q > 0) {
        sizesNum[size] = q;
        total += q;
      }
    });

    if (total === 0) return;

    const newItem: OrderItem = {
      reference: currentRef,
      color: currentColor,
      gridType: currentGrid,
      sizes: sizesNum,
      totalQty: total
    };

    if (editingIndex !== null) {
      const updatedItems = [...items];
      updatedItems[editingIndex] = newItem;
      setItems(updatedItems);
      setEditingIndex(null);
    } else {
      setItems([...items, newItem]);
    }
    
    // Reset form
    setQuickSizes({});
    setCurrentColor('');
    // Keep Ref if we are just adding new lines, but if we were editing, maybe clear it?
    // Let's keep Ref for speed unless we just finished an edit.
    if (editingIndex !== null) {
      setCurrentRef('');
    }
  };

  const startEditItem = (index: number) => {
    const item = items[index];
    setEditingIndex(index);
    setCurrentRef(item.reference);
    setCurrentColor(item.color);
    setCurrentGrid(item.gridType);
    
    // Convert numbers back to string for inputs
    const sizeStrings: {[key: string]: string} = {};
    Object.entries(item.sizes).forEach(([k, v]) => {
      sizeStrings[k] = v.toString();
    });
    setQuickSizes(sizeStrings);

    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeItem = (index: number) => {
    if (confirm('Remover este item?')) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
      if (editingIndex === index) {
        setEditingIndex(null);
        setQuickSizes({});
        setCurrentColor('');
        setCurrentRef('');
      }
    }
  };

  const handleSaveOrder = async () => {
    if (!selectedClientId || items.length === 0) return;

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    setLoading(true);
    await addOrder({
      id: crypto.randomUUID(),
      repId: user.id,
      repName: user.name,
      clientId: client.id,
      clientName: client.name,
      clientCity: client.city,
      clientState: client.state,
      createdAt: new Date().toISOString(),
      deliveryDate,
      paymentMethod,
      status: 'open',
      items,
      totalPieces: items.reduce((acc, i) => acc + i.totalQty, 0)
    });
    setLoading(false);

    onOrderCreated();
  };

  // Unique list of references for datalist
  const uniqueRefs = [...new Set(products.map(p => p.reference))];

  if (loading && products.length === 0) {
      return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center justify-between">
        <span>{editingIndex !== null ? 'Editando Item' : 'Novo Pedido'}</span>
        {editingIndex !== null && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Modo Edição</span>}
      </h2>

      {/* HEADER: Client Info - Stacked on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 pb-6 border-b">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <div className="relative">
            <select 
                className="w-full border rounded p-2 pr-8 appearance-none bg-white"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
            >
                <option value="">Selecione...</option>
                {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.city}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Entrega</label>
            <input 
                type="date" 
                className="w-full border rounded p-2"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
            />
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento</label>
            <input 
                type="text" 
                className="w-full border rounded p-2"
                placeholder="Ex: 30/60 dias"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
            />
            </div>
        </div>
      </div>

      {/* INPUT AREA: Optimized for Mobile */}
      <div className={`p-3 md:p-4 rounded-lg mb-6 border transition-colors ${editingIndex !== null ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-100'}`}>
        <form onSubmit={handleAddItem} className="flex flex-col gap-3">
          
          <div className="flex flex-col md:flex-row gap-3">
            {/* Reference */}
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Referência</label>
                <input 
                list="refs" 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 uppercase h-10"
                value={currentRef}
                onChange={(e) => setCurrentRef(e.target.value.toUpperCase())}
                placeholder="REF..."
                required
                />
                <datalist id="refs">
                {uniqueRefs.map(r => <option key={r} value={r} />)}
                </datalist>
            </div>

            {/* Color */}
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Cor</label>
                <input 
                list="colors"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 uppercase h-10"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value.toUpperCase())}
                placeholder="COR..."
                required
                />
                <datalist id="colors">
                {availableColors.map(c => <option key={c} value={c} />)}
                </datalist>
            </div>
          </div>

          {/* Size Grid - Horizontal Scroll on Mobile */}
          <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Grade de Quantidades</label>
              <div className="bg-white p-2 rounded border border-gray-200 shadow-sm overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                    {SIZE_GRIDS[currentGrid]?.map(size => (
                    <div key={size} className="w-12">
                        <label className="block text-[10px] text-center text-gray-500 font-bold mb-1">{size}</label>
                        <input 
                        type="number"
                        min="0"
                        inputMode="numeric"
                        className="w-full border text-center p-2 rounded text-base focus:bg-blue-50 outline-none"
                        value={quickSizes[size] || ''}
                        onChange={(e) => setQuickSizes({...quickSizes, [size]: e.target.value})}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') handleAddItem(e);
                        }}
                        />
                    </div>
                    ))}
                </div>
              </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            <button 
                type="submit" 
                className={`flex-1 ${editingIndex !== null ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'} text-white p-3 rounded flex items-center justify-center font-bold shadow-sm active:scale-95 transition`}
            >
                {editingIndex !== null ? (
                <> <Save className="w-5 h-5 mr-2" /> Atualizar Item </>
                ) : (
                <> <Plus className="w-5 h-5 mr-2" /> Adicionar Item </>
                )}
            </button>
            
            {editingIndex !== null && (
                <button 
                type="button" 
                onClick={() => {
                    setEditingIndex(null);
                    setQuickSizes({});
                    setCurrentColor('');
                    setCurrentRef('');
                }}
                className="bg-gray-400 text-white p-3 rounded font-bold hover:bg-gray-500 w-24"
                >
                Cancelar
                </button>
            )}
          </div>
          
          <div className="flex gap-4 justify-center mt-1">
             <label className="flex items-center text-xs text-gray-600 cursor-pointer p-1">
               <input 
                 type="radio" 
                 name="gridType" 
                 checked={currentGrid === SizeGridType.ADULT} 
                 onChange={() => setCurrentGrid(SizeGridType.ADULT)} 
                 className="mr-1"
               /> Normal (P-GG)
             </label>
             <label className="flex items-center text-xs text-gray-600 cursor-pointer p-1">
               <input 
                 type="radio" 
                 name="gridType" 
                 checked={currentGrid === SizeGridType.PLUS} 
                 onChange={() => setCurrentGrid(SizeGridType.PLUS)} 
                 className="mr-1"
               /> Plus (G1-G3)
             </label>
          </div>

        </form>
      </div>

      {/* ITEMS LIST: Cards on Mobile, Table on Desktop */}
      {items.length > 0 && (
        <div className="mb-20">
            <h3 className="font-bold text-gray-700 mb-2 px-1">Itens Adicionados ({items.length})</h3>
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto border rounded-lg shadow-sm bg-white">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                    <tr>
                        <th className="p-3">Ref/Cor</th>
                        {ALL_SIZES.map(s => (
                        <th key={s} className="p-2 text-center bg-gray-50 w-10">{s}</th>
                        ))}
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-center">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                    {items.map((item, idx) => (
                        <tr key={idx} className={`hover:bg-blue-50 ${editingIndex === idx ? 'bg-orange-50 ring-2 ring-orange-200' : ''}`}>
                        <td className="p-3">
                            <div className="font-bold text-gray-800">{item.reference}</div>
                            <div className="text-xs text-gray-500 uppercase">{item.color}</div>
                        </td>
                        {ALL_SIZES.map(s => (
                            <td key={s} className="p-2 text-center">
                            {item.sizes[s] ? <span className="font-bold text-blue-700">{item.sizes[s]}</span> : <span className="text-gray-300">-</span>}
                            </td>
                        ))}
                        <td className="p-3 text-right font-bold text-lg">{item.totalQty}</td>
                        <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                            <button onClick={() => startEditItem(idx)} className="text-blue-500 hover:bg-blue-100 p-1 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash className="w-4 h-4" /></button>
                            </div>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {items.map((item, idx) => (
                    <div key={idx} className={`bg-white border rounded-lg p-3 shadow-sm ${editingIndex === idx ? 'border-orange-400 ring-1 ring-orange-200' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-2 border-b pb-2">
                            <div>
                                <span className="block font-bold text-gray-800 text-lg">{item.reference}</span>
                                <span className="block text-xs text-gray-500 uppercase">{item.color}</span>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-blue-600 text-lg">{item.totalQty} pçs</span>
                            </div>
                        </div>
                        
                        {/* Mini Grid for Mobile */}
                        <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                            {Object.entries(item.sizes).map(([size, qty]) => (
                                <div key={size} className="bg-gray-50 p-1 rounded text-center border border-gray-100">
                                    <span className="block text-gray-400 font-bold text-[10px]">{size}</span>
                                    <span className="block font-bold text-gray-800">{qty}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                             <button 
                                onClick={() => startEditItem(idx)} 
                                className="flex-1 bg-blue-50 text-blue-700 py-2 rounded text-sm font-medium flex items-center justify-center"
                             >
                                <Edit2 className="w-3 h-3 mr-1" /> Editar
                             </button>
                             <button 
                                onClick={() => removeItem(idx)} 
                                className="flex-1 bg-red-50 text-red-700 py-2 rounded text-sm font-medium flex items-center justify-center"
                             >
                                <Trash className="w-3 h-3 mr-1" /> Remover
                             </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Total Footer */}
            <div className="mt-4 bg-gray-800 text-white p-4 rounded-lg flex justify-between items-center shadow-lg">
                <span className="text-sm font-medium uppercase tracking-wider">Total do Pedido</span>
                <span className="text-2xl font-bold text-yellow-400">{items.reduce((acc, i) => acc + i.totalQty, 0)} Peças</span>
            </div>
        </div>
      )}

      {/* Floating Save Button on Mobile */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t md:static md:bg-transparent md:border-0 md:p-0 md:mt-6 z-10 flex justify-end">
        <button 
          onClick={handleSaveOrder}
          disabled={items.length === 0 || !selectedClientId || editingIndex !== null || loading}
          className="w-full md:w-auto bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 shadow-md flex items-center justify-center font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Check className="w-5 h-5 mr-2" />}
          {editingIndex !== null ? 'Salve a Edição' : 'Finalizar Pedido'}
        </button>
      </div>
    </div>
  );
};

export default RepOrderForm;