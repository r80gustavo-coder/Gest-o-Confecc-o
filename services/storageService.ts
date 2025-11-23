import { turso } from './turso';
import { User, ProductDef, Order, Client, Role, SizeGridType } from '../types';

// O "initializeStorage" não é mais necessário da mesma forma.
export const initializeStorage = async () => {
  // Opcional: verificação de saúde da conexão
};

// --- SETUP DATABASE (Criação de Tabelas) ---
export const setupDatabase = async () => {
  try {
    const queries = [
      // Tabela Users
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'rep')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      // Tabela Products
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL,
        color TEXT NOT NULL,
        grid_type TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      // Tabela Clients
      `CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        rep_id TEXT NOT NULL,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        neighborhood TEXT,
        state TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      // Tabela Orders
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        display_id INTEGER,
        rep_id TEXT NOT NULL,
        rep_name TEXT NOT NULL,
        client_id TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_city TEXT,
        client_state TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        delivery_date TEXT,
        payment_method TEXT,
        status TEXT DEFAULT 'open',
        items TEXT NOT NULL,
        total_pieces INTEGER NOT NULL
      )`
    ];

    // Executar criação de tabelas
    for (const sql of queries) {
      await turso.execute(sql);
    }

    // Criar usuário Admin padrão se não existir
    try {
      await turso.execute({
        sql: "INSERT INTO users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)",
        args: ['admin_init_01', 'Administrador', 'admin', '123456', 'admin']
      });
      console.log("Usuário admin criado.");
    } catch (e) {
      // Ignora erro se usuário já existir (violação de UNIQUE)
      console.log("Usuário admin já existe ou erro ao criar:", e);
    }

    return { success: true, message: "Banco de dados configurado com sucesso!" };
  } catch (error: any) {
    console.error("Erro ao configurar banco:", error);
    return { success: false, message: error.message || "Erro desconhecido" };
  }
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