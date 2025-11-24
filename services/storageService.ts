import { User, ProductDef, Order, Client, Role } from '../types';
import { supabase } from './supabaseClient';

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) { 
    console.error("Erro ao buscar usuários:", error); 
    // Lança o erro para que o componente de Login possa exibir "Erro de conexão"
    throw error; 
  }
  return data as User[];
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
  if (error) { console.error(error); return []; }
  return data as ProductDef[];
};

export const addProduct = async (prod: ProductDef): Promise<void> => {
  const { error } = await supabase.from('products').insert(prod);
  if (error) throw error;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
};

// --- CLIENTS ---
export const getClients = async (repId?: string): Promise<Client[]> => {
  let query = supabase.from('clients').select('*');
  if (repId) {
    query = query.eq('repId', repId);
  }
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data as Client[];
};

export const addClient = async (client: Client): Promise<void> => {
  const { error } = await supabase.from('clients').insert(client);
  if (error) throw error;
};

export const updateClient = async (updatedClient: Client): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .update(updatedClient)
    .eq('id', updatedClient.id);
  if (error) throw error;
};

export const deleteClient = async (id: string): Promise<void> => {
  // Agora lança o erro para ser capturado no componente (ex: chave estrangeira)
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error; 
};

// --- ORDERS ---
export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) { console.error(error); return []; }
  return data as Order[];
};

export const addOrder = async (order: Omit<Order, 'displayId'>): Promise<Order | null> => {
  let newSeq = 1000;

  try {
    // Tenta buscar a sequência. Se a tabela app_config não existir, cairá no catch.
    const { data: seqData, error: seqError } = await supabase.from('app_config').select('value').eq('key', 'order_seq').maybeSingle();
    
    if (!seqError) {
      const currentSeq = seqData?.value || 1000;
      newSeq = currentSeq + 1;
      // Atualiza Seq (Optimistic)
      await supabase.from('app_config').upsert({ key: 'order_seq', value: newSeq });
    } else {
        // Fallback simples se app_config não existir: usa timestamp curto
        newSeq = Math.floor(Date.now() / 1000) % 100000;
    }
  } catch (err) {
    console.warn("Tabela app_config não encontrada ou erro de permissão. Usando ID baseado em timestamp.");
    newSeq = Math.floor(Date.now() / 1000) % 100000;
  }

  const newOrder = { ...order, displayId: newSeq };
  const { error } = await supabase.from('orders').insert(newOrder);
  
  if (error) {
    console.error("Erro ao criar pedido:", error);
    throw error;
  }
  return newOrder as Order;
};

export const updateOrderStatus = async (id: string, status: 'open' | 'printed'): Promise<void> => {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) console.error(error);
};

export const initializeStorage = () => {
  console.log("Serviço de armazenamento Supabase inicializado");
};