import { turso } from './turso';
import { User, ProductDef, Order, Client, Role, SizeGridType } from '../types';

// O "initializeStorage" não é mais necessário da mesma forma.
export const initializeStorage = async () => {
  // Opcional: verificação de saúde da conexão
};

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  try {
    const result = await turso.execute("SELECT * FROM users");
    
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      username: row.username,
      password: row.password,
      role: row.role as Role
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const addUser = async (user: User) => {
  try {
    await turso.execute({
      sql: "INSERT INTO users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)",
      args: [user.id, user.name, user.username, user.password || '', user.role]
    });
  } catch (error) {
    console.error('Error adding user:', error);
  }
};

export const deleteUser = async (id: string) => {
  try {
    await turso.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [id]
    });
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

// --- PRODUCTS ---
export const getProducts = async (): Promise<ProductDef[]> => {
  try {
    const result = await turso.execute("SELECT * FROM products");
    
    // Map snake_case (DB) to camelCase (App)
    return result.rows.map((p: any) => ({
      id: p.id,
      reference: p.reference,
      color: p.color,
      gridType: p.grid_type as SizeGridType
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const addProduct = async (prod: ProductDef) => {
  try {
    await turso.execute({
      sql: "INSERT INTO products (id, reference, color, grid_type) VALUES (?, ?, ?, ?)",
      args: [prod.id, prod.reference, prod.color, prod.gridType]
    });
  } catch (error) {
    console.error('Error adding product:', error);
  }
};

export const deleteProduct = async (id: string) => {
  try {
    await turso.execute({
      sql: "DELETE FROM products WHERE id = ?",
      args: [id]
    });
  } catch (error) {
    console.error('Error deleting product:', error);
  }
};

// --- CLIENTS ---
export const getClients = async (repId?: string): Promise<Client[]> => {
  try {
    let sql = "SELECT * FROM clients";
    const args = [];

    if (repId) {
      sql += " WHERE rep_id = ?";
      args.push(repId);
    }

    const result = await turso.execute({ sql, args });

    return result.rows.map((c: any) => ({
      id: c.id,
      repId: c.rep_id,
      name: c.name,
      city: c.city,
      neighborhood: c.neighborhood,
      state: c.state
    }));
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
};

export const addClient = async (client: Client) => {
  try {
    await turso.execute({
      sql: "INSERT INTO clients (id, rep_id, name, city, neighborhood, state) VALUES (?, ?, ?, ?, ?, ?)",
      args: [client.id, client.repId, client.name, client.city, client.neighborhood, client.state]
    });
  } catch (error) {
    console.error('Error adding client:', error);
  }
};

// --- ORDERS ---
export const getOrders = async (): Promise<Order[]> => {
  try {
    const result = await turso.execute("SELECT * FROM orders");

    return result.rows.map((o: any) => {
      // Parse JSON items manually for SQLite
      let parsedItems = [];
      try {
        parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
      } catch (e) {
        console.error("Erro parsing items JSON", e);
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
        items: parsedItems,
        totalPieces: o.total_pieces
      };
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

export const addOrder = async (order: Omit<Order, 'displayId'>) => {
  try {
    // Stringify items for SQLite
    const itemsJson = JSON.stringify(order.items);
    
    // Calculate next display_id (Manual auto-increment logic for SQLite)
    // We calculate it inside the INSERT using a subquery to be atomic
    const sql = `
      INSERT INTO orders (
        id, display_id, rep_id, rep_name, client_id, client_name, 
        client_city, client_state, created_at, delivery_date, 
        payment_method, status, items, total_pieces
      ) VALUES (
        ?, 
        (SELECT COALESCE(MAX(display_id), 0) + 1 FROM orders), 
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `;

    await turso.execute({
      sql,
      args: [
        order.id,
        order.repId,
        order.repName,
        order.clientId,
        order.clientName,
        order.clientCity,
        order.clientState,
        order.createdAt,
        order.deliveryDate,
        order.paymentMethod,
        order.status,
        itemsJson,
        order.totalPieces
      ]
    });
  } catch (error) {
    console.error('Error adding order:', error);
    throw error;
  }
};

export const updateOrderStatus = async (id: string, status: 'open' | 'printed') => {
  try {
    await turso.execute({
      sql: "UPDATE orders SET status = ? WHERE id = ?",
      args: [status, id]
    });
  } catch (error) {
    console.error('Error updating order status:', error);
  }
};
