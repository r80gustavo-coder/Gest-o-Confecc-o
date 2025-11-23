import { User, ProductDef, Order, Client, Role, SizeGridType } from '../types';

// Initial Admin
const ADMIN_USER: User = {
  id: 'admin-1',
  name: 'Gustavo Benvindo',
  username: 'gustavo_benvindo80@hotmail.com',
  password: 'Gustavor80',
  role: Role.ADMIN
};

const STORAGE_KEYS = {
  USERS: 'app_users',
  PRODUCTS: 'app_products',
  ORDERS: 'app_orders',
  CLIENTS: 'app_clients',
  ORDER_SEQ: 'app_order_seq'
};

// Initialize helper
export const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([ADMIN_USER]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDER_SEQ)) {
    localStorage.setItem(STORAGE_KEYS.ORDER_SEQ, '1000');
  }
};

// Users
export const getUsers = (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
export const addUser = (user: User) => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};
export const deleteUser = (id: string) => {
  let users = getUsers();
  users = users.filter(u => u.id !== id);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

// Products
export const getProducts = (): ProductDef[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
export const addProduct = (prod: ProductDef) => {
  const prods = getProducts();
  // Check duplicate ref+color
  if (!prods.find(p => p.reference === prod.reference && p.color === prod.color)) {
    prods.push(prod);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
  }
};
export const deleteProduct = (id: string) => {
  let prods = getProducts();
  prods = prods.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
};

// Clients
export const getClients = (repId?: string): Client[] => {
  const clients: Client[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]');
  if (repId) return clients.filter(c => c.repId === repId);
  return clients;
};
export const addClient = (client: Client) => {
  const clients = getClients();
  clients.push(client);
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
};

// Orders
export const getOrders = (): Order[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
export const addOrder = (order: Omit<Order, 'displayId'>) => {
  const orders = getOrders();
  const seq = parseInt(localStorage.getItem(STORAGE_KEYS.ORDER_SEQ) || '1000');
  const newOrder: Order = { ...order, displayId: seq + 1 };
  
  orders.push(newOrder);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  localStorage.setItem(STORAGE_KEYS.ORDER_SEQ, (seq + 1).toString());
  return newOrder;
};
export const updateOrderStatus = (id: string, status: 'open' | 'printed') => {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx >= 0) {
    orders[idx].status = status;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }
};