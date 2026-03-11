export type UserRole = 'admin' | 'cliente';
export type OrderStatus = 'pendiente' | 'preparando' | 'listo' | 'entregado';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  correo: string;
  contrasena: string;
  rol: string;
  telefono: string;
  direccion: string;
}

export interface Producto {
  id_producto: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  imagen_url?: string;
  disponible: boolean;
}

export interface DetallePedido {
  id_detalle: number;
  id_pedido: number;
  id_producto: number;
  cantidad: number;
  subtotal: number;
  producto?: Producto;
}

export interface Pedido {
  id_pedido: number;
  id_usuario: number;
  fecha: string;
  estado: string;
  total: number;
  usuario?: Usuario;
  detalle_pedido?: DetallePedido[];
}