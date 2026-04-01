import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DatabaseService } from '../database';
import { CatalogoApiService } from '../catalogo-api.service';
import { environment } from '../../environments/environment';
import { Producto, Usuario } from '../models/database.models';

@Component({
  standalone: true,
  selector: 'app-bebidas',
  imports: [FormsModule, CommonModule],
  templateUrl: './bebidas.html',
  styleUrl: './bebidas.css',
})
export class Bebidas implements OnInit {

  private platformId = inject(PLATFORM_ID);

  bebidas: (Producto & { cantidad: number })[] = [];
  usuarioActual: Usuario | null = null;
  isLoading = false;
  configuracion: any = {
    estado: 'abierto',
    horaApertura: '10:00',
    horaCierre: '22:00',
    mensaje: 'Los pedidos están cerrados en este momento'
  };

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private catalogoApi: CatalogoApiService,
  ) {}

  ngOnInit() {
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

    this.cargarConfiguracion();
    this.cargarBebidas();
  }

  cargarConfiguracion() {
    if (!isPlatformBrowser(this.platformId)) return;
    const config = localStorage.getItem('configuracion');
    if (config) {
      try {
        this.configuracion = JSON.parse(config);
      } catch {}
    }
  }

  async cargarBebidas(): Promise<void> {
    this.isLoading = true;
    try {
      let productos: Producto[];
      if (environment.apiBaseUrl) {
        try {
          productos = await this.catalogoApi.fetchProductos();
        } catch {
          productos = await this.dbService.getProductos();
        }
      } else {
        productos = await this.dbService.getProductos();
      }
      this.bebidas = productos
        .filter(p => p.categoria === 'bebida' && p.disponible)
        .map(p => ({ ...p, cantidad: 0 }));
    } catch (error) {
      console.error('Error al cargar bebidas:', error);
      alert('No se pudieron cargar las bebidas. Intenta de nuevo.');
    } finally {
      this.isLoading = false;
    }
  }

  pedidosPermitidos(): boolean {
    if (!this.configuracion) return false;
    if (this.configuracion.estado === 'cerrado') return false;

    const ahora = new Date();
    const horaActualNum = ahora.getHours() * 60 + ahora.getMinutes();
    const [horaAp, minAp] = this.configuracion.horaApertura.split(':').map(Number);
    const [horaCi, minCi] = this.configuracion.horaCierre.split(':').map(Number);

    return horaActualNum >= horaAp * 60 + minAp && horaActualNum <= horaCi * 60 + minCi;
  }

  agregar(b: any) { b.cantidad++; }

  quitar(b: any) { if (b.cantidad > 0) b.cantidad--; }

  hayBebidasSeleccionadas(): boolean {
    return this.bebidas.some(b => b.cantidad > 0);
  }
async agregarPedidoCompleto(): Promise<void> {
  if (!isPlatformBrowser(this.platformId)) return;

  if (!this.pedidosPermitidos()) {
    alert('Los pedidos están cerrados en este momento');
    return;
  }

  if (!this.usuarioActual) {
    alert('Debes iniciar sesión');
    this.router.navigate(['/']);
    return;
  }

  const bebidasSeleccionadas = this.bebidas.filter(b => b.cantidad > 0);
  if (bebidasSeleccionadas.length === 0) {
    alert('Selecciona al menos una bebida');
    return;
  }

  this.isLoading = true;
  try {
    const pedidoRaw = sessionStorage.getItem('pedidoActual');
    if (!pedidoRaw) {
      alert('No hay un pedido activo. Regresa al menú primero.');
      this.router.navigate(['/menu']);
      return;
    }

    const pedido = JSON.parse(pedidoRaw);

    const detalles = bebidasSeleccionadas.map(b => ({
      id_pedido: pedido.id_pedido,
      id_producto: b.id_producto,
      cantidad: b.cantidad,
      subtotal: b.cantidad * b.precio
    }));

    await this.dbService.createDetalles(detalles);

    alert('¡Bebidas agregadas al pedido!');
    this.router.navigate(['/carrito']);

  } catch (error) {
    console.error('Error al agregar bebidas:', error);
    alert('Error al guardar las bebidas. Intenta de nuevo.');
  } finally {
    this.isLoading = false;
  }
}
  siguiente() {
    this.router.navigate(['/carrito']);
  }

  regresar() {
    this.router.navigate(['/menu']);
  }
}