import { turso } from './turso';
import { User, ProductDef, Order, Client, Role, SizeGridType } from '../types';

// O "initializeStorage" não é mais necessário da mesma forma.
export const initializeStorage = async () => {
  // Opcional: verificação de saúde da conexão
};

// --- HEALTH CHECK ---
export const checkDatabaseHealth = async () => {
    try {
        // Verifica se a URL do Turso está configurada no client
        if (!process.env.VITE_TURSO_DATABASE_URL) {
            return { status: 'error', message: 'Variável VITE_TURSO_DATABASE_URL não encontrada no .env' };
        }

        // Tenta fazer uma query simples na tabela de usuários
        await turso.execute("SELECT count(*) FROM users LIMIT 1");
        return { status: 'ok' };
    } catch (error: any) {
        const msg = JSON.stringify(error) + (error.message || '');
        
        if (msg.includes("no such table") || msg.includes("Table 'users' not found")) {
            return { status: 'missing_tables' };
        }
        
        // Retorna o erro real para debug
        return { status: 'error', message: error.message || "Erro desconhecido na conexão com Turso" };
    }
};

// --- SETUP DATABASE (Criação de Tabelas) ---
export const setupDatabase = async () => {
  try {
    console.log("Iniciando configuração do banco...");

    // 1. Criar Tabela USERS
    // Simplificamos a query para garantir compatibilidade
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabela 'users' verificada.");

    // 2. Criar Tabela PRODUCTS
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL,
        color TEXT NOT NULL,
        grid_type TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabela 'products' verificada.");

    // 3. Criar Tabela CLIENTS
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        rep_id TEXT NOT NULL,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        neighborhood TEXT,
        state TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabela 'clients' verificada.");

    // 4. Criar Tabela ORDERS
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS orders (
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
      )
    `);
    console.log("Tabela 'orders' verificada.");

    // 5. Inserir ADMIN se não existir
    try {
      // Verifica se existe algum usuário
      const checkUsers = await turso.execute("SELECT count(*) as count FROM users");
      // @ts-ignore
      const count = checkUsers.rows[0]?.count || checkUsers.rows[0]?.[0] || 0;

      if (Number(count) === 0) {
        console.log("Criando usuário admin padrão...");
        await turso.execute({
          sql: "INSERT INTO users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)",
          args: ['admin_init_01', 'Administrador', 'admin', '123456', 'admin']
        });
        return { success: true, message: "Banco configurado! Usuário: admin / Senha: 123456" };
      } else {
        return { success: true, message: "Tabelas verificadas. Usuários já existem." };
      }
    } catch (e) {
      console.error("Erro ao criar admin:", e);
      return { success: true, message: "Tabelas criadas, mas erro ao verificar admin." };
    }

  } catch (error: any) {
    console.error("Erro crítico ao configurar banco:", error);
    return { success: false, message: error.message || "Erro desconhecido ao criar tabelas." };
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
    // Se o erro for "no such table", lançamos para o Login tratar
    if (JSON.stringify(error).includes("no such table")) {
        throw new Error("TABLE_MISSING");
    }
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
        delivery_date: o.delivery_date, // Keeping for raw access if needed
        deliveryDate: o.delivery_date, // Mapped for interface
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