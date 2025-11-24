import { User, ProductDef, Order, Client, Role } from '../types';
import { supabase } from './supabaseClient';

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) { console.error(error); return []; }
  return data as User[];
};

export const addUser = async (user: User): Promise<void> => {
  const { error } = await supabase.from('users').insert(user);
  if (error) console.error(error);
};

export const deleteUser = async (id: string): Promise<void> => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) console.error(error);
};

// --- PRODUCTS ---
export const getProducts = async (): Promise<ProductDef[]> => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) { console.error(error); return []; }
  return data as ProductDef[];
};

export const addProduct = async (prod: ProductDef): Promise<void> => {
  // Check duplicate logic handled by DB constraints ideally, or client side check before call
  const { error } = await supabase.from('products').insert(prod);
  if (error) console.error(error);
};

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) console.error(error);
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
  if (error) console.error("Erro ao adicionar cliente:", error);
};

export const updateClient = async (updatedClient: Client): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .update(updatedClient)
    .eq('id', updatedClient.id);
  if (error) console.error("Erro ao atualizar cliente:", error);
};

export const deleteClient = async (id: string): Promise<void> => {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) console.error("Erro ao deletar cliente:", error);
};

// --- ORDERS ---
export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) { console.error(error); return []; }
  return data as Order[];
};

export const addOrder = async (order: Omit<Order, 'displayId'>): Promise<Order | null> => {
  // Fetch current sequence
  // Note: In a real DB, use a SERIAL or SEQUENCE column. simulating here.
  const { data: seqData } = await supabase.from('app_config').select('value').eq('key', 'order_seq').single();
  let currentSeq = seqData?.value || 1000;
  const newSeq = currentSeq + 1;

  // Update Seq (Optimistic)
  await supabase.from('app_config').upsert({ key: 'order_seq', value: newSeq });

  const newOrder = { ...order, displayId: newSeq };
  const { error } = await supabase.from('orders').insert(newOrder);
  
  if (error) {
    console.error(error);
    return null;
  }
  return newOrder as Order;
};

export const updateOrderStatus = async (id: string, status: 'open' | 'printed'): Promise<void> => {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) console.error(error);
};

export const initializeStorage = () => {
  // No-op for Supabase, data is in cloud
  console.log("Supabase storage service initialized");
};