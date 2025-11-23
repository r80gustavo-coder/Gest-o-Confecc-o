import { supabase } from './supabase';
import { User, ProductDef, Order, Client, Role, SizeGridType } from '../types';

// O "initializeStorage" não é mais necessário da mesma forma, pois os dados persistem na nuvem.
// A criação das tabelas é feita via SQL no painel do Supabase.
export const initializeStorage = async () => {
  // Opcional: verificação de saúde da conexão
};

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data || [];
};

export const addUser = async (user: User) => {
  // Remove ID to let DB handle UUID generation if needed, or keep provided ID
  const { error } = await supabase.from('users').insert([{
    id: user.id,
    name: user.name,
    username: user.username,
    password: user.password,
    role: user.role
  }]);
  if (error) console.error('Error adding user:', error);
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) console.error('Error deleting user:', error);
};

// --- PRODUCTS ---
export const getProducts = async (): Promise<ProductDef[]> => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  // Map snake_case to camelCase
  return (data || []).map((p: any) => ({
    id: p.id,
    reference: p.reference,
    color: p.color,
    gridType: p.grid_type as SizeGridType
  }));
};

export const addProduct = async (prod: ProductDef) => {
  const { error } = await supabase.from('products').insert([{
    id: prod.id,
    reference: prod.reference,
    color: prod.color,
    grid_type: prod.gridType
  }]);
  if (error) console.error('Error adding product:', error);
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) console.error('Error deleting product:', error);
};

// --- CLIENTS ---
export const getClients = async (repId?: string): Promise<Client[]> => {
  let query = supabase.from('clients').select('*');
  
  if (repId) {
    query = query.eq('rep_id', repId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    repId: c.rep_id,
    name: c.name,
    city: c.city,
    neighborhood: c.neighborhood,
    state: c.state
  }));
};

export const addClient = async (client: Client) => {
  const { error } = await supabase.from('clients').insert([{
    id: client.id,
    rep_id: client.repId,
    name: client.name,
    city: client.city,
    neighborhood: client.neighborhood,
    state: client.state
  }]);
  if (error) console.error('Error adding client:', error);
};

// --- ORDERS ---
export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  return (data || []).map((o: any) => ({
    id: o.id,
    displayId: o.display_id,
    repId: o.rep_id,
    repName: o.rep_name,
    clientId: o.client_id,
    clientName: o.client_name,
    clientCity: o.client_city,
    clientState: o.client_state,
    createdAt: o.created_at,
    deliveryDate: o.delivery_date,
    paymentMethod: o.payment_method,
    status: o.status,
    items: o.items, // JSONB comes as object automatically
    totalPieces: o.total_pieces
  }));
};

export const addOrder = async (order: Omit<Order, 'displayId'>) => {
  // We don't send displayId, the DB SERIAL will handle it.
  const { error } = await supabase.from('orders').insert([{
    id: order.id,
    rep_id: order.repId,
    rep_name: order.repName,
    client_id: order.clientId,
    client_name: order.clientName,
    client_city: order.clientCity,
    client_state: order.clientState,
    created_at: order.createdAt,
    delivery_date: order.deliveryDate,
    payment_method: order.paymentMethod,
    status: order.status,
    items: order.items,
    total_pieces: order.totalPieces
  }]);
  
  if (error) {
    console.error('Error adding order:', error);
    throw error;
  }
};

export const updateOrderStatus = async (id: string, status: 'open' | 'printed') => {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) console.error('Error updating order status:', error);
};