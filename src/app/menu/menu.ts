import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DatabaseService } from '../database';
import { Pedido, Producto, Usuario } from '../models/database.models';

const QUESO_EXTRA_PRICE = 5;

export interface OpcionesProducto {
  conQueso: boolean;
  cebollaYCilantro: boolean;
  cebollaAsada: boolean;
  sinVerdura: boolean;
}

export interface ProductoMenu {
  id_producto: number;
  nombre: string;
  precio: number;
  disponible: boolean;
  cantidad: number;
  opciones: OpcionesProducto;
}

export interface OpcionGuardada {
  nombre: string;
  cantidad: number;
  opciones: OpcionesProducto;
}

export interface Configuracion {
  estado: 'abierto' | 'cerrado';
  horaApertura: string;
  horaCierre: string;
  mensaje: string;
}

@Component({
  standalone: true,
  selector: 'app-menu',
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu implements OnInit, OnDestroy {

  private readonly router     = inject(Router);
  private readonly dbService  = inject(DatabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  productos: ProductoMenu[] = [];
  usuarioActual: Usuario | null = null;
  horaActual = '';
  isLoading = false;
  configuracion: Configuracion = {
    estado: 'abierto',
    horaApertura: '10:00',
    horaCierre: '22:00',
    mensaje: 'Los pedidos están cerrados en este momento',
  };

  private clockInterval: ReturnType<typeof setInterval> | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const sesion = sessionStorage.getItem('usuario');
    if (!sesion) {
      alert('Debes iniciar sesión primero');
      this.router.navigate(['/']);
      return;
    }

    try {
      this.usuarioActual = JSON.parse(sesion) as Usuario;
    } catch {
      alert('Sesión inválida. Por favor inicia sesión de nuevo.');
      this.router.navigate(['/']);
      return;
    }

    this.actualizarHora();
    this.clockInterval = setInterval(() => this.actualizarHora(), 60_000);
    this.cargarConfiguracion();
    this.cargarProductos();
  }

  ngOnDestroy(): void {
    if (this.clockInterval !== null) {
      clearInterval(this.clockInterval);
    }
  }

  // ── Clock ──────────────────────────────────────────────────────────────────

  private actualizarHora(): void {
    this.horaActual = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // ── Configuration ──────────────────────────────────────────────────────────

  private cargarConfiguracion(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const raw = localStorage.getItem('configuracion');
    if (!raw) return;
    try {
      this.configuracion = JSON.parse(raw) as Configuracion;
    } catch {
      console.warn('configuracion in localStorage is malformed; using defaults.');
    }
  }

  // ── Products ───────────────────────────────────────────────────────────────

  async cargarProductos(): Promise<void> {
    this.isLoading = true;
    try {
      const data: Producto[] = await this.dbService.getProductos();
      this.productos = data
        .filter((p: Producto) => p.disponible !== false)
        .map((p: Producto) => ({
          ...p,
          disponible: p.disponible ?? true,
          cantidad: 0,
          opciones: {
            conQueso: false,
            cebollaYCilantro: false,
            cebollaAsada: false,
            sinVerdura: false,
          },
        }));
    } catch (error) {
      console.error('Error al cargar productos:', error);
      alert('No se pudieron cargar los productos. Intenta de nuevo.');
    } finally {
      this.isLoading = false;
    }
  }

  // ── Business rules ─────────────────────────────────────────────────────────

  pedidosPermitidos(): boolean {
    if (!this.configuracion) return false;
    if (this.configuracion.estado === 'cerrado') return false;

    const ahora = new Date();
    const horaActualMin = ahora.getHours() * 60 + ahora.getMinutes();
    const [horaAp, minAp] = this.configuracion.horaApertura.split(':').map(Number);
    const [horaCi, minCi] = this.configuracion.horaCierre.split(':').map(Number);

    return (
      horaActualMin >= horaAp * 60 + minAp &&
      horaActualMin <= horaCi * 60 + minCi
    );
  }

  getMensajeEstado(): string {
    if (this.configuracion.estado === 'cerrado') {
      return this.configuracion.mensaje || 'Los pedidos están cerrados por el administrador';
    }
    return `Horario de atención: ${this.configuracion.horaApertura} a ${this.configuracion.horaCierre}`;
  }

  // ── Product quantity helpers ───────────────────────────────────────────────

  agregar(p: ProductoMenu): void { p.cantidad++; }

  quitar(p: ProductoMenu): void { if (p.cantidad > 0) p.cantidad--; }

  hayProductosSeleccionados(): boolean {
    return this.productos.some(p => p.cantidad > 0);
  }

  // ── Topping toggles ────────────────────────────────────────────────────────

  toggleSinVerdura(p: ProductoMenu): void {
    if (p.opciones.sinVerdura) {
      p.opciones.cebollaYCilantro = false;
      p.opciones.cebollaAsada     = false;
    }
  }

  quitarSinVerdura(p: ProductoMenu): void {
    if (p.opciones.cebollaYCilantro || p.opciones.cebollaAsada) {
      p.opciones.sinVerdura = false;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private calcularSubtotal(p: ProductoMenu): number {
    const base  = p.precio * p.cantidad;
    const queso = p.opciones.conQueso ? QUESO_EXTRA_PRICE * p.cantidad : 0;
    return base + queso;
  }

  buildOpcionesLabel(p: ProductoMenu): string[] {
    const tags: string[] = [];
    if (p.opciones.conQueso) tags.push('Con queso');
    if (p.opciones.sinVerdura) {
      tags.push('Sin verdura');
    } else {
      if (p.opciones.cebollaYCilantro) tags.push('Cebolla y cilantro');
      if (p.opciones.cebollaAsada)     tags.push('Cebolla asada');
    }
    return tags;
  }

  private resetProductos(): void {
    this.productos.forEach(p => {
      p.cantidad = 0;
      p.opciones = {
        conQueso: false,
        cebollaYCilantro: false,
        cebollaAsada: false,
        sinVerdura: false,
      };
    });
  }

  // ── Order submission ───────────────────────────────────────────────────────

  async agregarPedidoCompleto(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!this.pedidosPermitidos()) {
      alert(this.getMensajeEstado() || 'Los pedidos no están disponibles');
      return;
    }

    if (!this.usuarioActual) {
      alert('Debes iniciar sesión');
      this.router.navigate(['/']);
      return;
    }

    const productosSeleccionados = this.productos.filter(p => p.cantidad > 0);
    if (productosSeleccionados.length === 0) {
      alert('Selecciona al menos un producto');
      return;
    }

    this.isLoading = true;
    try {
      const total = productosSeleccionados.reduce(
        (sum, p) => sum + this.calcularSubtotal(p),
        0
      );

      const pedido: Pedido = await this.dbService.createPedido({
        fecha:      new Date().toISOString(),
        estado:     'pendiente',
        total,
        id_usuario: this.usuarioActual.id_usuario,
      } as Omit<Pedido, 'id_pedido'>);

      const detalles = productosSeleccionados.map(p => ({
        cantidad:    p.cantidad,
        subtotal:    this.calcularSubtotal(p),
        id_pedido:   pedido.id_pedido,
        id_producto: p.id_producto,
      }));

      await this.dbService.createDetalles(detalles);

      sessionStorage.setItem('pedidoActual', JSON.stringify(pedido));
      const opcionesMenu: OpcionGuardada[] = productosSeleccionados.map(p => ({
        nombre:   p.nombre,
        cantidad: p.cantidad,
        opciones: p.opciones,
      }));
      sessionStorage.setItem('opcionesMenu', JSON.stringify(opcionesMenu));

      alert('¡Productos agregados al pedido!');
      this.resetProductos();
      this.router.navigate(['/bebidas']);

    } catch (error: unknown) {
      console.error('Error al crear pedido:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar el pedido: ${errorMessage}. Intenta de nuevo.`);
    } finally {
      this.isLoading = false;
    }
  }

  siguiente(): void {
    if (!this.pedidosPermitidos()) {
      alert(this.getMensajeEstado() || 'Los pedidos están cerrados');
      return;
    }
    this.router.navigate(['/bebidas']);
  }

  regresar(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('usuario');
    }
    this.router.navigate(['/']);
  }
}