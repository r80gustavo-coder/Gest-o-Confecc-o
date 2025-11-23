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
        console.error("[HEALTH CHECK ERROR]", error);
        
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
      const checkUsers = await turso.execute("SELECT * FROM users");
      
      if (checkUsers.rows.length === 0) {
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
    // Garantir a seleção explícita das colunas para evitar confusão na ordem
    const result = await turso.execute("SELECT id, name, username, password, role FROM users");
    console.log("Users loaded from DB:", result.rows.length, "rows"); 

    return result.rows.map((row: any) => {
        // Fallback robusto se o driver retornar array em vez de objeto
        if (Array.isArray(row)) {
            return {
                id: row[0],
                name: row[1],
                username: row[2],
                password: row[3],
                role: row[4] as Role
            };
        }

        // Se for objeto (padrão esperado)
        return {
            id: row.id,
            name: row.name,
            username: row.username,
            password: row.password,
            role: row.role as Role
        };
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    const msg = JSON.stringify(error);
    if (msg.includes("no such table") || msg.includes("not found")) {
        throw new Error("TABLE_MISSING");
    }
    throw error;
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
    
    return result.rows.map((p: any) => {
        if (Array.isArray(p)) {
             return {
                 id: p[0],
                 reference: p[1],
                 color: p[2],
                 gridType: p[3] as SizeGridType
             };
        }
        return {
            id: p.id,
            reference: p.reference,
            color: p.color,
            gridType: p.grid_type as SizeGridType
        };
    });
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

    return result.rows.map((c: any) => {
        if(Array.isArray(c)) {
            return {
                id: c[0],
                repId: c[1],
                name: c[2],
                city: c[3],
                neighborhood: c[4],
                state: c[5]
            }
        }
        return {
            id: c.id,
            repId: c.rep_id,
            name: c.name,
            city: c.city,
            neighborhood: c.neighborhood,
            state: c.state
        };
    });
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
      let itemsStr = '';
      let id, displayId, repId, repName, clientId, clientName, clientCity, clientState, createdAt, deliveryDate, paymentMethod, status, totalPieces;
      
      if (Array.isArray(o)) {
          // Mapeamento manual de colunas se for array
          // Ordem: id, display_id, rep_id, rep_name, client_id, client_name, client_city, client_state, created_at, delivery_date, payment_method, status, items, total_pieces
          id = o[0]; displayId = o[1]; repId = o[2]; repName = o[3]; clientId = o[4]; clientName = o[5]; 
          clientCity = o[6]; clientState = o[7]; createdAt = o[8]; deliveryDate = o[9]; paymentMethod = o[10]; 
          status = o[11]; itemsStr = o[12]; totalPieces = o[13];
      } else {
          id = o.id; displayId = o.display_id; repId = o.rep_id; repName = o.rep_name; clientId = o.client_id;
          clientName = o.client_name; clientCity = o.client_city; clientState = o.client_state;
          createdAt = o.created_at; deliveryDate = o.delivery_date; paymentMethod = o.payment_method;
          status = o.status; itemsStr = o.items; totalPieces = o.total_pieces;
      }

      let parsedItems = [];
      try {
        parsedItems = typeof itemsStr === 'string' ? JSON.parse(itemsStr) : itemsStr;
      } catch (e) {
        console.error("Erro parsing items JSON", e);
      }

      return {
        id,
        displayId,
        repId,
        repName,
        clientId,
        clientName,
        clientCity,
        clientState,
        createdAt,
        deliveryDate, // Mapped for interface
        delivery_date: deliveryDate,
        paymentMethod,
        status: status as 'open' | 'printed',
        items: parsedItems,
        totalPieces
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