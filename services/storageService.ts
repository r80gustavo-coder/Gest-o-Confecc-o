
import { User, ProductDef, Order, Client, Role, RepPrice } from '../types';
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
  return (data || []) as ProductDef[];
};

export const addProduct = async (prod: ProductDef): Promise<void> => {
  const { error } = await supabase.from('products').insert(prod);
  if (error) throw error;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
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
  
  // FIX: Mapeia repId do código para rep_id do banco
  if (repId) {
    query = query.eq('rep_id', repId);
  }
  
  const { data, error } = await query;
  if (error) { 
    console.error(error); 
    return []; 
  }
  
  // Mapeia snake_case (banco) para camelCase (app)
  return data?.map((row: any) => ({
    id: row.id,
    repId: row.rep_id, // snake_case -> camelCase
    name: row.name,
    city: row.city,
    neighborhood: row.neighborhood,
    state: row.state
  })) as Client[] || [];
};

export const addClient = async (client: Client): Promise<void> => {
  // Mapeia camelCase (app) para snake_case (banco)
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

  // Mapeamento robusto para Pedidos
  return data?.map((row: any) => ({
    ...row,
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
    totalPieces: row.total_pieces || row.totalPieces,
    subtotalValue: row.subtotal_value || row.subtotalValue,
    discountType: row.discount_type || row.discountType,
    discountValue: row.discount_value || row.discountValue,
    finalTotalValue: row.final_total_value || row.finalTotalValue
  })) as Order[] || [];
};

export const addOrder = async (order: Omit<Order, 'displayId'>): Promise<Order | null> => {
  let newSeq = 1000;

  // Lógica de sequência tolerante a falhas
  try {
    const { data: seqData, error: seqError } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'order_seq')
      .maybeSingle();
    
    if (!seqError && seqData) {
      const currentSeq = seqData.value;
      newSeq = currentSeq + 1;
      // Tenta atualizar, mas não bloqueia se falhar
      await supabase.from('app_config').upsert({ key: 'order_seq', value: newSeq });
    } else if (!seqError && !seqData) {
      // Se não existir, tenta criar
      await supabase.from('app_config').insert({ key: 'order_seq', value: 1001 });
      newSeq = 1001;
    } else {
       // Se der erro (tabela não existe), usa timestamp
       throw new Error("Table config missing");
    }
  } catch (err) {
    // Fallback silencioso para Timestamp se a tabela de config não existir
    console.warn("Usando fallback de ID para pedido.");
    newSeq = Math.floor(Date.now() / 1000) % 100000;
  }

  const orderWithSeq = { ...order, displayId: newSeq };

  // Mapeia para snake_case antes de salvar
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
    items: orderWithSeq.items, // JSONB geralmente mantém estrutura
    total_pieces: orderWithSeq.totalPieces,
    subtotal_value: orderWithSeq.subtotalValue,
    discount_type: orderWithSeq.discountType,
    discount_value: orderWithSeq.discountValue,
    final_total_value: orderWithSeq.finalTotalValue
  };

  const { error } = await supabase.from('orders').insert(dbOrder);
  
  if (error) {
    console.error("Erro ao criar pedido (Supabase):", error);
    // Propaga o erro para o componente lidar
    throw new Error(error.message || "Erro desconhecido ao salvar no banco");
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
