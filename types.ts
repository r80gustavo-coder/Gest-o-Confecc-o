export enum Role {
  ADMIN = 'admin',
  REP = 'rep'
}

export enum SizeGridType {
  ADULT = 'ADULT', // Agora chamado visualmente de "Normal" (P, M, G, GG)
  PLUS = 'PLUS',   // G1, G2, G3
}

export interface User {
  id: string;
  name: string;
  username: string; // Used for login
  password?: string;
  role: Role;
}

export interface ProductDef {
  id: string;
  reference: string;
  color: string;
  gridType: SizeGridType;
}

export interface Client {
  id: string;
  repId: string;
  name: string;
  city: string;
  neighborhood: string;
  state: string;
}

export interface OrderItem {
  reference: string;
  color: string;
  gridType: SizeGridType;
  sizes: { [size: string]: number }; // e.g. { "P": 10, "M": 5 }
  totalQty: number;
}

export interface Order {
  id: string;
  displayId: number; // Sequential ID (Pedido #101)
  repId: string;
  repName: string;
  clientId: string;
  clientName: string;
  clientCity: string;
  clientState: string;
  createdAt: string; // ISO date
  deliveryDate: string;
  paymentMethod: string;
  status: 'open' | 'printed';
  items: OrderItem[];
  totalPieces: number;
}

export const SIZE_GRIDS = {
  [SizeGridType.ADULT]: ['P', 'M', 'G', 'GG'],
  [SizeGridType.PLUS]: ['G1', 'G2', 'G3'],
};