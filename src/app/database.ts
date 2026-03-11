import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { Usuario, Pedido, DetallePedido, Producto } from './models/database.models';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // ─────────────────────────────────────────
  // USUARIOS
  // ─────────────────────────────────────────

  async getUsuarios(): Promise<Usuario[]> {
    const { data, error } = await this.supabase
      .from('usuario')
      .select('*');
    if (error) throw error;
    return data as Usuario[];
  }

  async getUsuarioPorCredenciales(nombre: string, contrasena: string): Promise<Usuario | null> {
    const { data, error } = await this.supabase
      .from('usuario')
      .select('*')
      .eq('nombre', nombre)
      .eq('contrasena', contrasena)
      .maybeSingle();
    if (error) throw error;
    return data as Usuario | null;
  }

  async getUsuarioById(id: number): Promise<Usuario> {
    const { data, error } = await this.supabase
      .from('usuario')
      .select('*')
      .eq('id_usuario', id)
      .single();
    if (error) throw error;
    return data as Usuario;
  }

  async createUsuario(usuario: Omit<Usuario, 'id_usuario'>): Promise<Usuario> {
    const { data, error } = await this.supabase
      .from('usuario')
      .insert(usuario)
      .select()
      .single();
    if (error) throw error;
    return data as Usuario;
  }

  async updateUsuario(id: number, usuario: Partial<Usuario>): Promise<Usuario> {
    const { data, error } = await this.supabase
      .from('usuario')
      .update(usuario)
      .eq('id_usuario', id)
      .select()
      .single();
    if (error) throw error;
    return data as Usuario;
  }

  async deleteUsuario(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('usuario')
      .delete()
      .eq('id_usuario', id);
    if (error) throw error;
  }

  // ─────────────────────────────────────────
  // PRODUCTOS
  // ─────────────────────────────────────────

  async getProductos(): Promise<Producto[]> {
    const { data, error } = await this.supabase
      .from('producto')
      .select('*');
    if (error) throw error;
    return data as Producto[];
  }

  async getProductoById(id: number): Promise<Producto> {
    const { data, error } = await this.supabase
      .from('producto')
      .select('*')
      .eq('id_producto', id)
      .single();
    if (error) throw error;
    return data as Producto;
  }

  async createProducto(producto: Omit<Producto, 'id_producto'>): Promise<Producto> {
    const { data, error } = await this.supabase
      .from('producto')
      .insert(producto)
      .select()
      .single();
    if (error) throw error;
    return data as Producto;
  }

  async updateProducto(id: number, producto: Partial<Producto>): Promise<Producto> {
    const { data, error } = await this.supabase
      .from('producto')
      .update(producto)
      .eq('id_producto', id)
      .select()
      .single();
    if (error) throw error;
    return data as Producto;
  }

  async deleteProducto(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('producto')
      .delete()
      .eq('id_producto', id);
    if (error) throw error;
  }

  // ─────────────────────────────────────────
  // PEDIDOS
  // ─────────────────────────────────────────

  async getPedidos(): Promise<Pedido[]> {
    const { data, error } = await this.supabase
      .from('pedido')
      .select('*, usuario(*), detalle_pedido(*, producto(*))');
    if (error) throw error;
    return data as Pedido[];
  }

  async getPedidoById(id: number): Promise<Pedido> {
    const { data, error } = await this.supabase
      .from('pedido')
      .select('*, usuario(*), detalle_pedido(*, producto(*))')
      .eq('id_pedido', id)
      .single();
    if (error) throw error;
    return data as Pedido;
  }

  async getPedidosByUsuario(idUsuario: number): Promise<Pedido[]> {
    const { data, error } = await this.supabase
      .from('pedido')
      .select('*, detalle_pedido(*, producto(*))')
      .eq('id_usuario', idUsuario);
    if (error) throw error;
    return data as Pedido[];
  }

  async createPedido(pedido: Omit<Pedido, 'id_pedido'>): Promise<Pedido> {
    const { data, error } = await this.supabase
      .from('pedido')
      .insert(pedido)
      .select()
      .single();
    if (error) throw error;
    return data as Pedido;
  }

  async updatePedido(id: number, pedido: Partial<Pedido>): Promise<Pedido> {
    const { data, error } = await this.supabase
      .from('pedido')
      .update(pedido)
      .eq('id_pedido', id)
      .select()
      .single();
    if (error) throw error;
    return data as Pedido;
  }

  async updateEstadoPedido(id: number, estado: string): Promise<Pedido> {
    const { data, error } = await this.supabase
      .from('pedido')
      .update({ estado })
      .eq('id_pedido', id)
      .select()
      .single();
    if (error) throw error;
    return data as Pedido;
  }

  async deletePedido(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('pedido')
      .delete()
      .eq('id_pedido', id);
    if (error) throw error;
  }

  // ─────────────────────────────────────────
  // DETALLE PEDIDO
  // ─────────────────────────────────────────

  async getDetallesByPedido(idPedido: number): Promise<DetallePedido[]> {
    const { data, error } = await this.supabase
      .from('detalle_pedido')
      .select('*, producto(*)')
      .eq('id_pedido', idPedido);
    if (error) throw error;
    return data as DetallePedido[];
  }

  async createDetalle(detalle: Omit<DetallePedido, 'id_detalle'>): Promise<DetallePedido> {
    const { data, error } = await this.supabase
      .from('detalle_pedido')
      .insert(detalle)
      .select()
      .single();
    if (error) throw error;
    return data as DetallePedido;
  }

  async createDetalles(detalles: Omit<DetallePedido, 'id_detalle'>[]): Promise<DetallePedido[]> {
    const { data, error } = await this.supabase
      .from('detalle_pedido')
      .insert(detalles)
      .select();
    if (error) throw error;
    return data as DetallePedido[];
  }

  async updateDetalle(id: number, detalle: Partial<DetallePedido>): Promise<DetallePedido> {
    const { data, error } = await this.supabase
      .from('detalle_pedido')
      .update(detalle)
      .eq('id_detalle', id)
      .select()
      .single();
    if (error) throw error;
    return data as DetallePedido;
  }

  async deleteDetalle(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('detalle_pedido')
      .delete()
      .eq('id_detalle', id);
    if (error) throw error;
  }

  async deleteDetallesByPedido(idPedido: number): Promise<void> {
    const { error } = await this.supabase
      .from('detalle_pedido')
      .delete()
      .eq('id_pedido', idPedido);
    if (error) throw error;
  }
}