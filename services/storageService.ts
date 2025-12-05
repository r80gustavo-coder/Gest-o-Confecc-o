
import { User, ProductDef, Order, Client, Role, RepPrice, OrderItem } from '../types';
import { supabase } from './supabaseClient';

// --- UTILS ---
// Função segura para gerar UUID em qualquer ambiente
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Falha silenciosa
    }
  }
  // Fallback manual
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) { 
    console.error("Erro ao buscar usuários:", error); 
    throw error; 
  }
  return (data || []) as User[];
};

export const addUser = async (user: User): Promise<void> => {
  const { error } = await supabase.from('users').insert(user);
  if (error) throw error;
};

export const deleteUser = async (id: string): Promise<void> => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
};

// --- PRODUCTS ---
export const getProducts = async (): Promise<ProductDef[]> => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) { 
    console.error(error); 
    return []; 
  }
  // Mapeamento snake_case (banco) -> camelCase (app)
  return data?.map((p: any) => ({
    id: p.id,
    reference: p.reference,
    color: p.color,
    gridType: p.grid_type || p.gridType,
    stock: p.stock || {}, 
    enforceStock: p.enforce_stock || false,
    basePrice: p.base_price || 0 // Mapeia o preço de custo
  })) as ProductDef[] || [];
};

export const addProduct = async (prod: ProductDef): Promise<void> => {
  // Mapeamento camelCase (app) -> snake_case (banco)
  const dbProd = {
    id: prod.id,
    reference: prod.reference,
    color: prod.color,
    grid_type: prod.gridType,
    stock: prod.stock,
    enforce_stock: prod.enforceStock,
    base_price: prod.basePrice // Salva o preço de custo
  };

  const { error } = await supabase.from('products').insert(dbProd);
  if (error) throw error;
};

// Função atualizada para editar estoque, preço base e configurações
export const updateProductInventory = async (id: string, newStock: any, enforceStock: boolean, basePrice: number): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .update({ 
            stock: newStock, 
            enforce_stock: enforceStock,
            base_price: basePrice
        })
        .eq('id', id);
    if (error) throw error;
}

// Mantendo compatibilidade com código antigo se houver
export const updateProductStock = async (id: string, newStock: any): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', id);
    if (error) throw error;
}

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
};

// --- LOGICA DE ESTOQUE ---

// Função chamada na CRIAÇÃO do pedido.
// Regra: Só baixa estoque se enforceStock == true.
export const updateStockOnOrderCreation = async (items: OrderItem[]): Promise<void> => {
    const currentProducts = await getProducts();

    for (const item of items) {
        const product = currentProducts.find(
            p => p.reference === item.reference && p.color === item.color
        );

        // Só baixa na hora do pedido se estiver Travado (enforceStock = true)
        if (product && product.enforceStock) {
            const newStock = { ...product.stock };
            
            Object.entries(item.sizes).forEach(([size, qty]) => {
                const currentQty = newStock[size] || 0;
                newStock[size] = currentQty - qty;
            });

            await updateProductInventory(product.id, newStock, product.enforceStock, product.basePrice);
        }
    }
};

// Função para SALVAR A SEPARAÇÃO e baixar estoque de produtos "Livres".
export const saveOrderPicking = async (orderId: string, oldItems: OrderItem[], newItems: OrderItem[]): Promise<void> => {
    // 1. Atualiza o Pedido com os novos items (que contém o campo 'picked')
    const { error } = await supabase
        .from('orders')
        .update({ items: newItems })
        .eq('id', orderId);
    
    if (error) throw error;

    // 2. Calcula diferença e atualiza estoque APENAS para produtos LIVRES (enforceStock = false)
    const currentProducts = await getProducts();

    for (let i = 0; i < newItems.length; i++) {
        const newItem = newItems[i];
        const oldItem = oldItems[i]; // Assume que a ordem dos itens não muda

        const product = currentProducts.find(
            p => p.reference === newItem.reference && p.color === newItem.color
        );

        // Se o produto existe e é LIVRE (enforceStock == false), controlamos o estoque na separação
        if (product && !product.enforceStock) {
            let stockChanged = false;
            const newStock = { ...product.stock };

            const newPicked = newItem.picked || {};
            const oldPicked = oldItem.picked || {};

            // Itera sobre os tamanhos para ver a diferença
            const allSizes = new Set([...Object.keys(newPicked), ...Object.keys(oldPicked)]);
            
            allSizes.forEach(size => {
                const qNew = newPicked[size] || 0;
                const qOld = oldPicked[size] || 0;
                const delta = qNew - qOld; // Se positivo, separou mais (baixa estoque). Se negativo, devolveu (sobe estoque).

                if (delta !== 0) {
                    const currentStockQty = newStock[size] || 0;
                    newStock[size] = currentStockQty - delta;
                    stockChanged = true;
                }
            });

            if (stockChanged) {
                 await updateProductInventory(product.id, newStock, product.enforceStock, product.basePrice);
            }
        }
    }
};


// --- REP PRICES ---
export const getRepPrices = async (repId: string): Promise<RepPrice[]> => {
  const { data, error } = await supabase.from('rep_prices').select('*').eq('rep_id', repId);
  if (error) {
    console.warn("Tabela rep_prices pode não existir ainda ou erro de conexão", error);
    return [];
  }
  return data?.map(d => ({
    id: d.id,
    repId: d.rep_id,
    reference: d.reference,
    price: d.price
  })) || [];
};

export const upsertRepPrice = async (priceData: RepPrice): Promise<void> => {
  const { data: existing } = await supabase
    .from('rep_prices')
    .select('id')
    .eq('rep_id', priceData.repId)
    .eq('reference', priceData.reference)
    .single();

  if (existing) {
     const { error } = await supabase
      .from('rep_prices')
      .update({ price: priceData.price })
      .eq('id', existing.id);
     if (error) throw error;
  } else {
     const { error } = await supabase
      .from('rep_prices')
      .insert({ 
        rep_id: priceData.repId, 
        reference: priceData.reference, 
        price: priceData.price 
      });
     if (error) throw error;
  }
};

// --- CLIENTS ---
export const getClients = async (repId?: string): Promise<Client[]> => {
  let query = supabase.from('clients').select('*');
  
  if (repId) {
    query = query.eq('rep_id', repId);
  }
  
  const { data, error } = await query;
  if (error) { 
    console.error(error); 
    return []; 
  }
  
  return data?.map((row: any) => ({
    id: row.id,
    repId: row.rep_id,
    name: row.name,
    city: row.city,
    neighborhood: row.neighborhood,
    state: row.state
  })) as Client[] || [];
};

export const addClient = async (client: Client): Promise<void> => {
  const dbClient = {
    id: client.id,
    rep_id: client.repId,
    name: client.name,
    city: client.city,
    neighborhood: client.neighborhood,
    state: client.state
  };

  const { error } = await supabase.from('clients').insert(dbClient);
  if (error) throw error;
};

export const updateClient = async (updatedClient: Client): Promise<void> => {
  const dbClient = {
    rep_id: updatedClient.repId,
    name: updatedClient.name,
    city: updatedClient.city,
    neighborhood: updatedClient.neighborhood,
    state: updatedClient.state
  };

  const { error } = await supabase
    .from('clients')
    .update(dbClient)
    .eq('id', updatedClient.id);
  if (error) throw error;
};

export const deleteClient = async (id: string): Promise<void> => {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error; 
};

// --- ORDERS ---
export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) { 
    console.error("Erro ao buscar pedidos:", error); 
    return []; 
  }

  return data?.map((row: any) => {
    let items = row.items;
    if (items && !Array.isArray(items) && items.list) {
        items = items.list; 
    }

    return {
      ...row,
      id: row.id,
      displayId: row.display_id || row.displayId,
      repId: row.rep_id || row.repId,
      repName: row.rep_name || row.repName,
      clientId: row.client_id || row.clientId,
      clientName: row.client_name || row.clientName,
      clientCity: row.client_city || row.clientCity,
      clientState: row.client_state || row.clientState,
      createdAt: row.created_at || row.createdAt,
      deliveryDate: row.delivery_date || row.deliveryDate,
      paymentMethod: row.payment_method || row.paymentMethod,
      status: row.status,
      items: Array.isArray(items) ? items : [], 
      totalPieces: row.total_pieces || row.totalPieces,
      subtotalValue: row.subtotal_value || row.subtotalValue || 0,
      discountType: row.discount_type || row.discountType || null,
      discountValue: row.discount_value || row.discountValue || 0,
      finalTotalValue: row.final_total_value || row.finalTotalValue || 0
    };
  }) as Order[] || [];
};

export const addOrder = async (order: Omit<Order, 'displayId'>): Promise<Order | null> => {
  // 1. Sequencial do ID
  let newSeq = 1000;
  try {
    const { data: seqData, error: seqError } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'order_seq')
      .maybeSingle();
    
    if (!seqError && seqData) {
      const currentSeq = seqData.value;
      newSeq = currentSeq + 1;
      await supabase.from('app_config').upsert({ key: 'order_seq', value: newSeq });
    } else if (!seqError && !seqData) {
      await supabase.from('app_config').insert({ key: 'order_seq', value: 1001 });
      newSeq = 1001;
    } else {
       throw new Error("Table config missing");
    }
  } catch (err) {
    console.warn("Usando fallback de ID para pedido.");
    newSeq = Math.floor(Date.now() / 1000) % 100000;
  }

  const orderWithSeq = { ...order, displayId: newSeq };

  const dbOrder = {
    id: orderWithSeq.id,
    display_id: orderWithSeq.displayId,
    rep_id: orderWithSeq.repId,
    rep_name: orderWithSeq.repName,
    client_id: orderWithSeq.clientId,
    client_name: orderWithSeq.clientName,
    client_city: orderWithSeq.clientCity,
    client_state: orderWithSeq.clientState,
    created_at: orderWithSeq.createdAt,
    delivery_date: orderWithSeq.deliveryDate,
    payment_method: orderWithSeq.paymentMethod,
    status: orderWithSeq.status,
    items: orderWithSeq.items, 
    total_pieces: orderWithSeq.totalPieces,
    subtotal_value: orderWithSeq.subtotalValue,
    discount_type: orderWithSeq.discountType,
    discount_value: orderWithSeq.discountValue,
    final_total_value: orderWithSeq.finalTotalValue
  };

  // 2. Salva o Pedido
  const { error } = await supabase.from('orders').insert(dbOrder);
  
  if (error) {
    console.error("Erro ao criar pedido (Supabase):", error);
    throw new Error(error.message || "Erro desconhecido ao salvar no banco");
  }

  // 3. Atualiza o Estoque (SOMENTE para enforceStock=true)
  try {
      await updateStockOnOrderCreation(orderWithSeq.items);
  } catch (err) {
      console.error("Pedido salvo, mas erro ao atualizar estoque:", err);
  }

  return orderWithSeq as Order;
};

export const updateOrderStatus = async (id: string, status: 'open' | 'printed'): Promise<void> => {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) console.error(error);
};

export const initializeStorage = () => {
  console.log("Serviço de armazenamento Supabase inicializado com mapeamento de colunas.");
};
