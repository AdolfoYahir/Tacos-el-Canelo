import { Component, NgZone, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Unsubscribe } from 'firebase/firestore';
import { DatabaseService } from '../database';
import { Producto, Pedido } from '../models/database.models';

// ─────────────────────────────────────────────────────────────
// AdminComponent → panel de administración
// Ruta: /admin
// Requiere: adminGuard (rol === 'admin')
// Permite: gestionar productos y cambiar estado de pedidos
// ─────────────────────────────────────────────────────────────

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [FormsModule, CommonModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class Admin implements OnInit, OnDestroy {

  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);

  // ── Productos ──
  productos: Producto[] = [];
  nuevoNombre: string = '';
  nuevaDescripcion: string = '';
  nuevoPrecio: number = 0;
  nuevaCategoria: string = 'comida';
  cargandoProductos: boolean = false;

  // ── Pedidos ──
  pedidos: Pedido[] = [];
  cargandoPedidos: boolean = false;
  private unsubscribePedidos: Unsubscribe | null = null;

  // ── Estados disponibles para un pedido ──
  estados: string[] = ['pendiente', 'preparando', 'listo', 'entregado'];

  // ── Mensajes de feedback ──
  errorMsg: string = '';
  exitoMsg: string = '';

  constructor(
    private db: DatabaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    void this.cargarProductos();
    // Carga inicial sin depender solo del listener (y evita UI congelada si Firestore corre fuera de NgZone).
    void this.cargarPedidos();
    this.iniciarSuscripcionPedidos();
  }

  ngOnDestroy(): void {
    if (this.unsubscribePedidos) this.unsubscribePedidos();
  }

  // ─────────────────────────────────────────
  // PRODUCTOS
  // ─────────────────────────────────────────

  async cargarProductos(): Promise<void> {
    this.cargandoProductos = true;
    try {
      const productos = await this.db.getProductos();
      this.ngZone.run(() => {
        this.productos = productos;
      });
    } catch (err) {
      this.ngZone.run(() => {
        this.errorMsg = 'Error al cargar productos.';
      });
      console.error(err);
    } finally {
      this.ngZone.run(() => {
        this.cargandoProductos = false;
      });
    }
  }

  async agregarProducto(): Promise<void> {
    if (!this.nuevoNombre.trim()) {
      this.errorMsg = 'El nombre del producto es obligatorio.';
      return;
    }
    if (this.nuevoPrecio <= 0) {
      this.errorMsg = 'El precio debe ser mayor a 0.';
      return;
    }

    // Verificar duplicado localmente antes de ir a Supabase
    const existe = this.productos.some(
      p => p.nombre.toLowerCase() === this.nuevoNombre.trim().toLowerCase()
    );
    if (existe) {
      this.errorMsg = 'Ya existe un producto con ese nombre.';
      return;
    }

    try {
      const nuevo = await this.db.createProducto({
        nombre: this.nuevoNombre.trim(),
        descripcion: this.nuevaDescripcion.trim(),
        precio: this.nuevoPrecio,
        categoria: this.nuevaCategoria,
        imagen_url: '',
        disponible: true
      });

      this.productos.push(nuevo);
      this.limpiarFormProducto();
      this.mostrarExito('Producto agregado correctamente.');
    } catch (err) {
      this.errorMsg = 'Error al agregar producto.';
      console.error(err);
    }
  }

  async cambiarDisponibilidad(producto: Producto): Promise<void> {
    try {
      const actualizado = await this.db.updateProducto(producto.id_producto, {
        disponible: !producto.disponible
      });
      // Actualizar localmente sin recargar toda la lista
      const idx = this.productos.findIndex(p => p.id_producto === producto.id_producto);
      if (idx >= 0) this.productos[idx] = actualizado;

      const estado = actualizado.disponible ? 'disponible' : 'no disponible';
      this.mostrarExito(`${actualizado.nombre} ahora está ${estado}.`);
    } catch (err) {
      this.errorMsg = 'Error al cambiar disponibilidad.';
      console.error(err);
    }
  }

  async eliminarProducto(id: string): Promise<void> {  // ← string
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    await this.db.deleteProducto(id);
    this.productos = this.productos.filter(p => p.id_producto !== id);
    this.mostrarExito('Producto eliminado.');
  } catch (err) {
    this.errorMsg = 'Error al eliminar producto.';
    console.error(err);
  }
}

  limpiarFormProducto(): void {
    this.nuevoNombre = '';
    this.nuevaDescripcion = '';
    this.nuevoPrecio = 0;
    this.nuevaCategoria = 'comida';
  }

  // ─────────────────────────────────────────
  // PEDIDOS
  // ─────────────────────────────────────────

  async cargarPedidos(): Promise<void> {
    this.cargandoPedidos = true;
    try {
      const pedidos = await this.db.getPedidos();
      const sorted = pedidos.sort((a, b) => {
        const aTime = new Date(a.fecha).getTime();
        const bTime = new Date(b.fecha).getTime();
        return bTime - aTime;
      });
      this.ngZone.run(() => {
        this.errorMsg = '';
        this.pedidos = sorted;
      });
    } catch (err) {
      this.ngZone.run(() => {
        this.errorMsg = 'Error al cargar pedidos.';
      });
      console.error(err);
    } finally {
      this.ngZone.run(() => {
        this.cargandoPedidos = false;
      });
    }
  }

  iniciarSuscripcionPedidos(): void {
    this.unsubscribePedidos = this.db.subscribePedidos(
      (pedidos) => {
        this.ngZone.run(() => {
          this.errorMsg = '';
          this.pedidos = pedidos;
          this.cargandoPedidos = false;
        });
      },
      (err) => {
        const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
        const msg = err instanceof Error ? err.message : String(err);
        this.ngZone.run(() => {
          this.errorMsg =
            code === 'permission-denied'
              ? 'Firestore bloqueó la lectura de pedidos. Publica reglas que permitan listar la colección `pedido` (y idealmente leer `detalle_pedido`) para usuarios autenticados o lectura según tu política. Detalle: permission-denied.'
              : `Error al sincronizar pedidos: ${msg || 'revisa la consola (F12) y las reglas de Firestore.'}`;
          this.cargandoPedidos = false;
        });
        console.error(err);
      }
    );
  }

  async cambiarEstadoPedido(pedido: Pedido, nuevoEstado: string): Promise<void> {
    try {
      const actualizado = await this.db.updateEstadoPedido(pedido.id_pedido, nuevoEstado);
      // Actualizar localmente sin recargar toda la lista
      const idx = this.pedidos.findIndex(p => p.id_pedido === pedido.id_pedido);
      if (idx >= 0) this.pedidos[idx] = { ...this.pedidos[idx], estado: actualizado.estado };
      this.mostrarExito(`Pedido #${pedido.id_pedido} actualizado a "${nuevoEstado}".`);
    } catch (err) {
      this.errorMsg = 'Error al actualizar estado del pedido.';
      console.error(err);
    }
  }

  // ─────────────────────────────────────────
  // SESIÓN
  // ─────────────────────────────────────────

  cerrarSesion(): void {
    localStorage.removeItem('usuario');
    localStorage.removeItem('ultimo_pedido_id');
    this.router.navigate(['/']);
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

  mostrarExito(msg: string): void {
    this.errorMsg = '';
    this.exitoMsg = msg;
    setTimeout(() => this.exitoMsg = '', 3000);
  }

  get productosDisponibles(): Producto[] {
    return this.productos.filter(p => p.disponible);
  }

  get productosNoDisponibles(): Producto[] {
    return this.productos.filter(p => !p.disponible);
  }
}