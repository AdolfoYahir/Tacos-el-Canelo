export type UserRole = 'admin' | 'cliente';
export type OrderStatus = 'pendiente' | 'preparando' | 'listo' | 'entregado';

export interface Usuario {
  id_usuario: string;       // era number, ahora string (Firestore doc ID)
  nombre: string;
  correo: string;
  contrasena: string;
  rol: string;
  telefono: string;
  direccion: string;
}

export interface Producto {
  id_producto: string;      // era number
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  imagen_url?: string;
  disponible: boolean;
}

export interface DetallePedido {
  id_detalle: string;       // era number
  id_pedido: string;        // era number
  id_producto: string;      // era number
  cantidad: number;
  subtotal: number;
  producto?: Producto;
}

export interface Pedido {
  id_pedido: string;        // era number
  id_usuario: string;       // era number
  fecha: string;
  estado: string;
  total: number;
  usuario?: Usuario;
  detalle_pedido?: DetallePedido[];
}