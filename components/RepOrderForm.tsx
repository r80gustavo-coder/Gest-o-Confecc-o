import React, { useState, useEffect } from 'react';
import { User, ProductDef, OrderItem, Client, SizeGridType, SIZE_GRIDS } from '../types';
import { getProducts, getClients, addOrder } from '../services/storageService';
import { Plus, Trash, Save, Edit2 } from 'lucide-react';

interface Props {
  user: User;
  onOrderCreated: () => void;
}

const ALL_SIZES = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3'];

const RepOrderForm: React.FC<Props> = ({ user, onOrderCreated }) => {
  const [products, setProducts] = useState<ProductDef[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
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
    setProducts(getProducts());
    setClients(getClients(user.id));
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

  const handleSaveOrder = () => {
    if (!selectedClientId || items.length === 0) return;

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    addOrder({
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

    onOrderCreated();
  };

  // Unique list of references for datalist
  const uniqueRefs = [...new Set(products.map(p => p.reference))];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-gray-800">
        {editingIndex !== null ? 'Editando Item do Pedido' : 'Novo Pedido'}
      </h2>

      {/* HEADER: Client Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <select 
            className="w-full border rounded p-2"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.city}</option>
            ))}
          </select>
        </div>
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

      {/* INPUT AREA: "Excel Style" */}
      <div className={`p-4 rounded-lg mb-6 border transition-colors ${editingIndex !== null ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-100'}`}>
        <form onSubmit={handleAddItem} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">Referência</label>
            <input 
              list="refs" 
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 uppercase"
              value={currentRef}
              onChange={(e) => setCurrentRef(e.target.value.toUpperCase())}
              placeholder="Digite REF..."
              required
            />
            <datalist id="refs">
              {uniqueRefs.map(r => <option key={r} value={r} />)}
            </datalist>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">Cor</label>
            <input 
              list="colors"
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 uppercase"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value.toUpperCase())}
              placeholder="Digite Cor..."
              required
            />
             <datalist id="colors">
              {availableColors.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Size Grid Inputs */}
          <div className="flex gap-1 bg-white p-2 rounded border border-gray-200 shadow-sm overflow-x-auto">
             {SIZE_GRIDS[currentGrid]?.map(size => (
               <div key={size} className="w-10">
                 <label className="block text-[10px] text-center text-gray-500 font-bold mb-1">{size}</label>
                 <input 
                   type="number"
                   min="0"
                   className="w-full border text-center p-1 rounded text-sm focus:bg-blue-50 outline-none"
                   value={quickSizes[size] || ''}
                   onChange={(e) => setQuickSizes({...quickSizes, [size]: e.target.value})}
                   onKeyDown={(e) => {
                     if(e.key === 'Enter') handleAddItem(e);
                   }}
                 />
               </div>
             ))}
          </div>

          <button 
            type="submit" 
            className={`${editingIndex !== null ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'} text-white p-2 rounded flex items-center h-[42px] px-4 min-w-[120px] justify-center transition`}
          >
            {editingIndex !== null ? (
              <> <Save className="w-4 h-4 mr-2" /> Atualizar </>
            ) : (
              <> <Plus className="w-5 h-5 mr-1" /> Adicionar </>
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
              className="bg-gray-400 text-white p-2 rounded h-[42px] px-3 hover:bg-gray-500"
            >
              Cancelar
            </button>
          )}
        </form>

        <div className="mt-2 text-xs text-gray-600 flex gap-4 pl-1">
           <label className="flex items-center cursor-pointer hover:text-blue-600">
             <input 
               type="radio" 
               name="gridType" 
               checked={currentGrid === SizeGridType.ADULT} 
               onChange={() => setCurrentGrid(SizeGridType.ADULT)} 
               className="mr-1"
             /> Normal (P-GG)
           </label>
           <label className="flex items-center cursor-pointer hover:text-blue-600">
             <input 
               type="radio" 
               name="gridType" 
               checked={currentGrid === SizeGridType.PLUS} 
               onChange={() => setCurrentGrid(SizeGridType.PLUS)} 
               className="mr-1"
             /> Plus (G1-G3)
           </label>
        </div>
      </div>

      {/* ITEMS TABLE (MATRIX VIEW) */}
      {items.length > 0 && (
        <div className="overflow-x-auto border rounded-lg shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
              <tr>
                <th className="p-3 w-1/4">Referência</th>
                <th className="p-3 w-1/4">Cor</th>
                {ALL_SIZES.map(s => (
                  <th key={s} className="p-2 text-center bg-gray-50 w-10">{s}</th>
                ))}
                <th className="p-3 text-right">Total</th>
                <th className="p-3 w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <tr key={idx} className={`hover:bg-blue-50 ${editingIndex === idx ? 'bg-orange-50 ring-2 ring-orange-200' : ''}`}>
                  <td className="p-3 font-bold text-gray-800">{item.reference}</td>
                  <td className="p-3 text-gray-600 uppercase">{item.color}</td>
                  
                  {/* Grid Columns */}
                  {ALL_SIZES.map(s => (
                    <td key={s} className="p-2 text-center">
                      {item.sizes[s] ? (
                        <span className="font-bold text-blue-700">{item.sizes[s]}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  ))}

                  <td className="p-3 text-right font-bold text-lg">{item.totalQty}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => startEditItem(idx)} 
                        className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-100 rounded"
                        title="Editar Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeItem(idx)} 
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded"
                        title="Remover Item"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-800 text-white font-bold">
              <tr>
                <td colSpan={2} className="p-3 text-right uppercase text-xs tracking-wider">Totais da Grade:</td>
                {ALL_SIZES.map(s => {
                   const totalSize = items.reduce((acc, i) => acc + (i.sizes[s] || 0), 0);
                   return (
                     <td key={s} className="p-2 text-center text-xs">
                       {totalSize > 0 ? totalSize : ''}
                     </td>
                   )
                })}
                <td className="p-3 text-right text-lg text-yellow-400">
                  {items.reduce((acc, i) => acc + i.totalQty, 0)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button 
          onClick={handleSaveOrder}
          disabled={items.length === 0 || !selectedClientId || editingIndex !== null}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5 mr-2" />
          {editingIndex !== null ? 'Termine a edição antes de salvar' : 'Finalizar Pedido'}
        </button>
      </div>
    </div>
  );
};

export default RepOrderForm;