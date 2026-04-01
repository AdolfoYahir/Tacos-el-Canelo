import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, NgZone, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { onAuthStateChanged } from 'firebase/auth';
import { DatabaseService } from '../database';
import { CatalogoApiService } from '../catalogo-api.service';
import { environment } from '../../environments/environment';
import { Pedido, Producto, Usuario } from '../models/database.models';
import { CarritoService } from '../carrito';
import { auth } from '../firebase';

const QUESO_EXTRA_PRICE = 5;

/** IDs del catálogo (API/Firestore) sin opción de queso extra. */
const SIN_QUESO_EXTRA_IDS = new Set([
  'taco-blando',
  'taco-con-queso',
  'volcan',
  'torta-con-queso',
  'quesadilla-sencilla',
  'quesadilla-doble',
]);

function normalizarNombreCatalogo(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Nombres sin queso extra si el id no coincide (datos viejos o distintos fuentes). */
const SIN_QUESO_EXTRA_NOMBRES = new Set(
  [
    'torta con queso',
    'quesadilla doble',
    'quesadilla sencilla',
    'taco con queso',
    'taco blando',
    'volcán',
    'volcan',
  ].map(normalizarNombreCatalogo)
);

export interface OpcionesProducto {
  conQueso: boolean;
  cebollaYCilantro: boolean;
  cebollaAsada: boolean;
  sinVerdura: boolean;
}

export interface ProductoMenu {
  id_producto: string;
  nombre: string;
  precio: number;
  disponible: boolean;
  cantidad: number;
  categoria?: string;
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
  changeDetection: ChangeDetectionStrategy.Default
})
export class Menu implements OnInit, OnDestroy {

  private readonly router     = inject(Router);
  private readonly dbService  = inject(DatabaseService);
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly carrito    = inject(CarritoService);
  private readonly cdr        = inject(ChangeDetectorRef);
  private readonly ngZone     = inject(NgZone);

  productos: ProductoMenu[] = [];
  usuarioActual: Usuario | null = null;
  horaActual = '';
  isLoading = false;
  configuracion: Configuracion = {
    estado: 'abierto',
    horaApertura: '00:00',
    horaCierre: '23:59',
    mensaje: 'Los pedidos están cerrados en este momento',
  };

  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeAuth: (() => void) | null = null;

  agregarAlCarrito(producto: Producto) {
    this.carrito.agregar(producto, 1);
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const sesion = sessionStorage.getItem('usuario') ?? localStorage.getItem('usuario');
    if (!sesion) {
      alert('Debes iniciar sesión primero');
      this.router.navigate(['/']);
      return;
    }

    try {
      this.usuarioActual = JSON.parse(sesion) as Usuario;
      sessionStorage.setItem('usuario', sesion);
    } catch {
      alert('Sesión inválida. Por favor inicia sesión de nuevo.');
      this.router.navigate(['/']);
      return;
    }

    this.actualizarHora();
    this.clockInterval = setInterval(() => this.actualizarHora(), 60_000);
    this.cargarConfiguracion();
    this.unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        alert('Tu sesión expiró. Inicia sesión nuevamente.');
        this.router.navigate(['/']);
        return;
      }
      this.cargarProductos();
    });
  }

  ngOnDestroy(): void {
    if (this.clockInterval !== null) clearInterval(this.clockInterval);
    if (this.unsubscribeAuth) this.unsubscribeAuth();
  }

  private actualizarHora(): void {
    this.horaActual = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

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

  async cargarProductos(): Promise<void> {
    this.isLoading = true;
    try {
      console.log('Cargando productos...');
      let data: Producto[];
      if (environment.apiBaseUrl) {
        try {
          data = await this.catalogoApi.fetchProductos();
          console.log('Productos vía API REST (JSON):', data.length);
        } catch (apiErr) {
          console.warn('Catálogo API no disponible; usando Firebase.', apiErr);
          data = await this.dbService.getProductos();
        }
      } else {
        data = await this.dbService.getProductos();
      }
      console.log('Productos obtenidos:', data);
      const mappedProducts = data
        .filter(p => p.disponible !== false && p.nombre !== 'Torta' && p.nombre !== 'Taco con queso')
        .map(p => ({
          id_producto: p.id_producto,
          nombre: p.nombre,
          precio: p.precio,
          disponible: p.disponible ?? true,
          categoria: p.categoria,
          cantidad: 0,
          opciones: {
            conQueso: false,
            cebollaYCilantro: false,
            cebollaAsada: false,
            sinVerdura: false,
          },
        }));
      this.ngZone.run(() => {
        this.productos = mappedProducts;
        console.log('Productos mapeados:', this.productos);
        console.log('Cantidad de productos:', this.productos.length);
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('Error al cargar productos:', error);
      alert('No se pudieron cargar los productos. Intenta de nuevo.');
    } finally {
      this.isLoading = false;
    }
  }

  pedidosPermitidos(): boolean {
    if (!this.configuracion) return false;
    if (this.configuracion.estado === 'cerrado') return false;
    const ahora = new Date();
    const horaActualMin = ahora.getHours() * 60 + ahora.getMinutes();
    const [horaAp, minAp] = this.configuracion.horaApertura.split(':').map(Number);
    const [horaCi, minCi] = this.configuracion.horaCierre.split(':').map(Number);
    return horaActualMin >= horaAp * 60 + minAp && horaActualMin <= horaCi * 60 + minCi;
  }

  getMensajeEstado(): string {
    if (this.configuracion.estado === 'cerrado') {
      return this.configuracion.mensaje || 'Los pedidos están cerrados por el administrador';
    }
    return `Horario de atención: ${this.configuracion.horaApertura} a ${this.configuracion.horaCierre}`;
  }

  agregar(p: ProductoMenu): void { p.cantidad++; }
  quitar(p: ProductoMenu): void { if (p.cantidad > 0) p.cantidad--; }

  hayProductosSeleccionados(): boolean {
    return this.productos.some(p => p.cantidad > 0);
  }

  /** Queso extra: visible solo si aplica (taco blando y otros excluidos por id o nombre normalizado). */
  mostrarOpcionQuesoExtra(p: ProductoMenu): boolean {
    return p.cantidad > 0 && this.permiteQuesoExtra(p);
  }

  private permiteQuesoExtra(p: ProductoMenu): boolean {
    if ((p.categoria ?? '').trim().toLowerCase() === 'bebida') return false;
    if (SIN_QUESO_EXTRA_IDS.has(p.id_producto)) return false;
    if (SIN_QUESO_EXTRA_NOMBRES.has(normalizarNombreCatalogo(p.nombre))) return false;
    return true;
  }

  toggleSinVerdura(p: ProductoMenu): void {
    if (p.opciones.sinVerdura) {
      p.opciones.cebollaYCilantro = false;
      p.opciones.cebollaAsada = false;
    }
  }

  quitarSinVerdura(p: ProductoMenu): void {
    if (p.opciones.cebollaYCilantro || p.opciones.cebollaAsada) {
      p.opciones.sinVerdura = false;
    }
  }

  private calcularSubtotal(p: ProductoMenu): number {
    const base = p.precio * p.cantidad;
    const queso =
      p.opciones.conQueso && this.permiteQuesoExtra(p) ? QUESO_EXTRA_PRICE * p.cantidad : 0;
    return base + queso;
  }

  buildOpcionesLabel(p: ProductoMenu): string[] {
    const tags: string[] = [];
    if (p.opciones.conQueso && this.permiteQuesoExtra(p)) tags.push('Con queso');
    if (p.opciones.sinVerdura) {
      tags.push('Sin verdura');
    } else {
      if (p.opciones.cebollaYCilantro) tags.push('Cebolla y cilantro');
      if (p.opciones.cebollaAsada) tags.push('Cebolla asada');
    }
    return tags;
  }

  private resetProductos(): void {
    this.productos.forEach(p => {
      p.cantidad = 0;
      p.opciones = { conQueso: false, cebollaYCilantro: false, cebollaAsada: false, sinVerdura: false };
    });
  }

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
      const total = productosSeleccionados.reduce((sum, p) => sum + this.calcularSubtotal(p), 0);
      const pedido: Pedido = await this.dbService.createPedido({
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        total,
        id_usuario: this.usuarioActual.id_usuario,
      } as Omit<Pedido, 'id_pedido'>);
      const detalles = productosSeleccionados.map(p => ({
        cantidad: p.cantidad,
        subtotal: this.calcularSubtotal(p),
        id_pedido: pedido.id_pedido,
        id_producto: p.id_producto,
      }));
      await this.dbService.createDetalles(detalles);
      sessionStorage.setItem('pedidoActual', JSON.stringify(pedido));
      sessionStorage.setItem('opcionesMenu', JSON.stringify(
        productosSeleccionados.map(p => ({ nombre: p.nombre, cantidad: p.cantidad, opciones: p.opciones }))
      ));
      alert('¡Productos agregados al pedido!');
      this.resetProductos();
      this.router.navigate(['/carrito']);
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
    if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}