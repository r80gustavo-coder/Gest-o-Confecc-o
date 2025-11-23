import { supabase } from './supabase';
import { User, ProductDef, Order, Client, Role, SizeGridType } from '../types';

// --- SQL SCHEMA HELPER ---
// Se as tabelas não existirem, o usuário precisará rodar isso no SQL Editor do Supabase
export const REQUIRED_SQL_SCHEMA = `
-- Tabela de Usuários
create table if not exists users (
  id text primary key,
  name text not null,
  username text not null unique,
  password text not null,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de Produtos
create table if not exists products (
  id text primary key,
  reference text not null,
  color text not null,
  grid_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de Clientes
create table if not exists clients (
  id text primary key,
  rep_id text not null,
  name text not null,
  city text not null,
  neighborhood text,
  state text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de Pedidos
create table if not exists orders (
  id text primary key,
  display_id integer,
  rep_id text not null,
  rep_name text not null,
  client_id text not null,
  client_name text not null,
  client_city text,
  client_state text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  delivery_date text,
  payment_method text,
  status text default 'open',
  items jsonb not null,
  total_pieces integer not null
);
`;

// --- HEALTH CHECK ---
export const checkDatabaseHealth = async () => {
    try {
        if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
            return { status: 'error', message: 'Variáveis VITE_SUPABASE_URL/KEY não encontradas.' };
        }

        // Tenta fazer uma query simples
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        
        if (error) {
            // Código 42P01 no Postgres significa "undefined table"
            if (error.code === '42P01') {
                return { status: 'missing_tables' };
            }
            return { status: 'error', message: error.message };
        }

        return { status: 'ok' };
    } catch (error: any) {
        console.error("[HEALTH CHECK ERROR]", error);
        return { status: 'error', message: error.message || "Erro desconhecido Supabase" };
    }
};

// --- SETUP DATABASE (Criação de Admin e Verificação) ---
export const setupDatabase = async () => {
  try {
    console.log("Verificando banco...");

    // Verifica se as tabelas existem tentando selecionar admin
    const { error: tableCheckError } = await supabase.from('users').select('id').limit(1);
    
    if (tableCheckError) {
       if (tableCheckError.code === '42P01') {
           return { success: false, message: "As tabelas não existem. Copie o SQL abaixo e rode no Supabase." };
       }
       throw tableCheckError;
    }

    // Inserir ADMIN GUSTAVO se não existir
    const adminEmail = 'gustavo_benvindo80@hotmail.com';
    
    const { data: existingAdmin } = await supabase
        .from('users')
        .select('*')
        .eq('username', adminEmail)
        .single();
      
    if (!existingAdmin) {
        console.log("Criando usuário admin Gustavo...");
        const { error: insertError } = await supabase
            .from('users')
            .insert([{
                id: 'admin_gustavo_80',
                name: 'Gustavo Benvindo',
                username: adminEmail,
                password: 'Gustavor80',
                role: 'admin'
            }]);
        
        if (insertError) throw insertError;
        
        return { success: true, message: `Admin criado! Login: ${adminEmail}` };
    } else {
        return { success: true, message: "Sistema verificado. Admin já existe." };
    }

  } catch (error: any) {
    console.error("Erro setup:", error);
    return { success: false, message: error.message };
  }
};

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
      if (error.code === '42P01') throw new Error("TABLE_MISSING");
      throw error;
  }
  return data.map((u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      password: u.password,
      role: u.role as Role
  }));
};

export const addUser = async (user: User) => {
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
  
  return data.map((p: any) => ({
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

  return data.map((c: any) => ({
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

  return data.map((o: any) => {
      // Supabase retorna JSONB já parseado como objeto
      let parsedItems = o.items;
      if (typeof parsedItems === 'string') {
          try { parsedItems = JSON.parse(parsedItems); } catch(e) {}
      }

      return {
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
        status: o.status as 'open' | 'printed',
        items: parsedItems || [],
        totalPieces: o.total_pieces
      };
  });
};

export const addOrder = async (order: Omit<Order, 'displayId'>) => {
  try {
    // 1. Obter o próximo display_id
    // Nota: Em produção, usar SEQUENCE do Postgres é melhor, mas para compatibilidade mantemos lógica manual por enquanto
    // Ou podemos confiar no Supabase se mudarmos para SERIAL.
    // Vamos fazer uma query rápida para pegar o MAX.
    const { data: maxData } = await supabase
        .from('orders')
        .select('display_id')
        .order('display_id', { ascending: false })
        .limit(1);
        
    const nextId = (maxData && maxData.length > 0 && maxData[0].display_id) 
        ? maxData[0].display_id + 1 
        : 1;

    const { error } = await supabase.from('orders').insert([{
        id: order.id,
        display_id: nextId,
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
        items: order.items, // Supabase converte array JS para JSONB automaticamente
        total_pieces: order.totalPieces
    }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error adding order:', error);
    throw error;
  }
};

export const updateOrderStatus = async (id: string, status: 'open' | 'printed') => {
  const { error } = await supabase
    .from('orders')
    .update({ status: status })
    .eq('id', id);
    
  if (error) console.error('Error updating order status:', error);
};