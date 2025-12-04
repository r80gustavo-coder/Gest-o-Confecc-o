import React, { useState, useEffect } from 'react';
import { ProductDef, SizeGridType } from '../types';
import { getProducts, addProduct, deleteProduct } from '../services/storageService';
import { Trash, Plus, Shirt, Loader2 } from 'lucide-react';

const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<ProductDef[]>([]);
  const [newRef, setNewRef] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newGrid, setNewGrid] = useState<SizeGridType>(SizeGridType.ADULT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const data = await getProducts();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newRef || !newColor) {
        setError('Preencha referência e cor.');
        return;
    }

    // Uniqueness Check
    const exists = products.some(p => 
        p.reference.toUpperCase() === newRef.toUpperCase() && 
        p.color.toUpperCase() === newColor.toUpperCase()
    );

    if (exists) {
        setError('Esta combinação de Referência e Cor já existe no catálogo.');
        return;
    }

    await addProduct({
        id: crypto.randomUUID(),
        reference: newRef.toUpperCase(),
        color: newColor.toUpperCase(),
        gridType: newGrid
    });

    await fetchData();
    setNewColor(''); // Keep Ref for faster entry
    // setNewRef(''); 
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este produto do catálogo?')) {
        await deleteProduct(id);
        await fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
         <h2 className="text-2xl font-bold text-gray-800">Catálogo de Produtos</h2>
         {loading && <Loader2 className="animate-spin text-blue-600" />}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Cadastrar Novo Produto</h3>
        {error && <div className="mb-4 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
        
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referência</label>
            <input 
                type="text" 
                className="w-full border p-2 rounded uppercase focus:ring-2 focus:ring-blue-500"
                value={newRef}
                onChange={(e) => setNewRef(e.target.value)}
                placeholder="EX: CAMISA-01"
                disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
            <input 
                type="text" 
                className="w-full border p-2 rounded uppercase focus:ring-2 focus:ring-blue-500"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="EX: AZUL MARINHO"
                disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade de Tamanho</label>
            <select 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                value={newGrid}
                onChange={(e) => setNewGrid(e.target.value as SizeGridType)}
                disabled={loading}
            >
                <option value={SizeGridType.ADULT}>Normal (P, M, G, GG)</option>
                <option value={SizeGridType.PLUS}>Plus Size (G1, G2, G3)</option>
            </select>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium flex justify-center items-center h-[42px] mt-4 md:mt-0"
          >
            <Plus className="w-5 h-5 mr-2" /> Adicionar
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-sm">
                    <tr>
                        <th className="p-4">Referência</th>
                        <th className="p-4">Cor</th>
                        <th className="p-4">Grade</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {products.length === 0 && !loading && (
                        <tr><td colSpan={4} className="p-6 text-center text-gray-400">Nenhum produto cadastrado.</td></tr>
                    )}
                    {products.sort((a,b) => a.reference.localeCompare(b.reference)).map(prod => (
                        <tr key={prod.id} className="hover:bg-gray-50">
                            <td className="p-4 font-bold">{prod.reference}</td>
                            <td className="p-4 uppercase">{prod.color}</td>
                            <td className="p-4 text-sm text-gray-500">
                                {prod.gridType === SizeGridType.ADULT && 'Normal'}
                                {prod.gridType === SizeGridType.PLUS && 'Plus Size'}
                            </td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => handleDelete(prod.id)}
                                    className="text-red-500 hover:bg-red-50 p-2 rounded transition"
                                    title="Remover Produto"
                                >
                                    <Trash className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ProductManager;