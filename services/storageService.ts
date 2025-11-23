import { supabase } from './supabase';
import { User, ProductDef, Order, Client, Role, SizeGridType } from '../types';

// O email mestre que sempre será ADMIN
const MASTER_EMAIL = 'gustavo_benvindo80@hotmail.com';

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }

  // Mapeia o banco para o tipo da aplicação e define ROLE
  return data.map((u: any) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    password: u.password,
    // Como a tabela não tem coluna role, definimos admin pelo email
    role: u.username === MASTER_EMAIL ? Role.ADMIN : Role.REP
  }));
};

export const addUser = async (user: User) => {
  // O ID é gerado pelo banco (gen_random_uuid), então não enviamos se for novo
  // Mas como o app gera UUID no frontend, podemos enviar ou omitir.
  // Vamos enviar para manter consistência, mas remover role que não existe no DB.
  
  const { error } = await supabase.from('users').insert({
    id: user.id, // Opcional se o banco gera, mas vamos manter
    name: user.name,
    username: user.username,
    password: user.password
  });
  
  if (error) console.error('Erro ao adicionar usuário:', error);
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) console.error('Erro ao deletar usuário:', error);
};

// --- PRODUCTS ---
export const getProducts = async (): Promise<ProductDef[]> => {
  const { data, error } = await supabase.from('products').select('*');
  
  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }

  // Mapeia colunas do banco (ref, grade) para o app (reference, gridType)
  return data.map((p: any) => ({
    id: p.id,
    reference: p.ref,
    color: p.color,
    gridType: p.grade === 'PLUS' ? SizeGridType.PLUS : SizeGridType.ADULT
  }));
};

export const addProduct = async (prod: ProductDef) => {
  // Mapeia app -> banco
  const dbProduct = {
    ref: prod.reference,
    color: prod.color,
    grade: prod.gridType === SizeGridType.PLUS ? 'PLUS' : 'STD'
  };

  // Verifica duplicidade (já garantido pelo UNIQUE no banco, mas bom evitar erro 500 no console)
  const { data } = await supabase
    .from('products')
    .select('id')
    .eq('ref', dbProduct.ref)
    .eq('color', dbProduct.color)
    .eq('grade', dbProduct.grade);

  if (data && data.length > 0) return;

  const { error } = await supabase.from('products').insert(dbProduct);
  if (error) console.error('Erro ao adicionar produto:', error);
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) console.error('Erro ao deletar produto:', error);
};

// --- CLIENTS ---
export const getClients = async (repId?: string): Promise<Client[]> => {
  let query = supabase.from('clients').select('*');
  
  // Se for rep, filtra. Se for admin (repId vazio ou não passado na chamada as vezes), traz tudo? 
  // O componente AdminOrderList não passa repId, mas ClientManager sim.
  if (repId) {
    query = query.eq('repId', repId);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }
  return data as Client[];
};

export const addClient = async (client: Client) => {
  // Omitimos o ID do objeto client se quisermos que o banco gere, 
  // mas como o frontend gera UUID, passamos direto.
  const { error } = await supabase.from('clients').insert({
    id: client.id,
    repId: client.repId,
    name: client.name,
    city: client.city,
    state: client.state,
    neighborhood: client.neighborhood
  });
  if (error) console.error('Erro ao adicionar cliente:', error);
};

// --- ORDERS ---
export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.from('orders').select('*');
  
  if (error) {
    console.error('Erro ao buscar pedidos:', error);
    return [];
  }

  // Mapeamento e geração de Display ID (já que o banco não tem sequence numérica configurada no script)
  return data.map((o: any) => {
    // Tenta criar um ID numérico curto baseado no timestamp para exibição "Pedido #1234"
    const timestampId = new Date(o.created_at).getTime() % 10000;

    return {
      id: o.id,
      displayId: timestampId, // Fake ID visual
      repId: o.repId,
      repName: o.repName || 'N/A',
      clientId: o.clientId,
      clientName: o.clientName,
      clientCity: o.clientCity,
      clientState: o.clientState,
      createdAt: o.created_at,
      deliveryDate: o.deliveryDate,
      paymentMethod: o.payment, // Mapeado de 'payment'
      status: o.status === 'Impresso' ? 'printed' : 'open', // Mapeado de 'Pendente'/'Impresso'
      items: o.items || [], // JSONB vem direto
      totalPieces: (o.items || []).reduce((acc: number, i: any) => acc + i.totalQty, 0)
    };
  });
};

export const addOrder = async (order: Omit<Order, 'displayId'>) => {
  const dbOrder = {
    id: order.id,
    repId: order.repId,
    clientId: order.clientId,
    repName: order.repName,
    clientName: order.clientName,
    clientCity: order.clientCity,
    clientState: order.clientState,
    deliveryDate: order.deliveryDate,
    payment: order.paymentMethod, // Mapeado
    status: 'Pendente',
    items: order.items,
    created_at: order.createdAt
  };
  
  const { error } = await supabase.from('orders').insert(dbOrder);
  if (error) console.error('Erro ao criar pedido:', error);
};

export const updateOrderStatus = async (id: string, status: 'open' | 'printed') => {
  const dbStatus = status === 'printed' ? 'Impresso' : 'Pendente';
  const { error } = await supabase.from('orders').update({ status: dbStatus }).eq('id', id);
  if (error) console.error('Erro ao atualizar status:', error);
};

export const initializeStorage = () => {
  // Placeholder
};
