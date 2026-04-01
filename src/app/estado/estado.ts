import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../database';
import { Pedido } from '../models/database.models';


@Component({
  selector: 'app-estado',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="estado-container">
      <h2>Estado de tu Pedido</h2>

      <!-- Cargando -->
      <p *ngIf="cargando">Cargando pedido...</p>

      <!-- Error -->
      <p class="error" *ngIf="error">{{ error }}</p>

      <!-- Pedido encontrado -->
      <div class="pedido-card" *ngIf="pedido && !cargando">

        <p><strong>Pedido #{{ pedido.id_pedido }}</strong></p>
        <p>Fecha: {{ pedido.fecha | date:'short' }}</p>
        <p>Total: \${{ pedido.total | number:'1.2-2' }}</p>

        <!-- Barra de progreso de estados -->
        <div class="progreso">
          <div
            *ngFor="let paso of pasos"
            class="paso"
            [class.activo]="paso === pedido.estado"
            [class.completado]="estaCompletado(paso)"
          >
            {{ paso | titlecase }}
          </div>
        </div>

        <!-- Detalle de productos -->
        <div class="detalle" *ngIf="pedido.detalle_pedido?.length">
          <h3>Productos</h3>
          <div class="item" *ngFor="let item of pedido.detalle_pedido">
            <span>{{ item.producto?.nombre }} x{{ item.cantidad }}</span>
            <span>\${{ item.subtotal | number:'1.2-2' }}</span>
          </div>
        </div>

        <!-- Mensaje según estado -->
        <p class="mensaje">{{ getMensaje() }}</p>

      </div>

      <!-- Botón volver al menú (solo si entregado) -->
      <button
        *ngIf="pedido?.estado === 'entregado'"
        (click)="volverAlMenu()"
      >
        Hacer otro pedido
      </button>

    </div>
  `
})
export class Estado implements OnInit, OnDestroy {

  pedido: Pedido | null = null;
  cargando: boolean = true;
  error: string = '';

  // Orden de los estados para la barra de progreso
  pasos: string[] = ['pendiente', 'preparando', 'listo', 'entregado'];

  // Intervalo para auto-actualizar el estado
  private intervalo: any;

  constructor(
    private db: DatabaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPedido();

    // Polling: re-consulta el estado cada 15 segundos automáticamente
    this.intervalo = setInterval(() => {
      this.cargarPedido();
    }, 15000);
  }

  ngOnDestroy(): void {
    // Limpiar intervalo al salir del componente
    if (this.intervalo) clearInterval(this.intervalo);
  }

  // ─────────────────────────────────────────
  // Carga el pedido desde Supabase usando
  // el id guardado en localStorage por Pago
  // ─────────────────────────────────────────
  async cargarPedido(): Promise<void> {
    this.error = '';
    try {
      const idPedido = localStorage.getItem('ultimo_pedido_id');
      if (!idPedido) {
        this.error = 'No se encontró ningún pedido reciente.';
        this.cargando = false;
        return;
      }

      this.pedido = await this.db.getPedidoById(idPedido);  // ← string directo

    } catch (err: any) {
      this.error = 'No se pudo cargar el pedido. Intenta de nuevo.';
      console.error('Error al cargar pedido:', err);
    } finally {
      this.cargando = false;
    }
  }

  // ─────────────────────────────────────────
  // Retorna true si el paso ya fue superado
  // (para colorear pasos anteriores al actual)
  // ─────────────────────────────────────────
  estaCompletado(paso: string): boolean {
    if (!this.pedido) return false;
    const indexActual = this.pasos.indexOf(this.pedido.estado);
    const indexPaso = this.pasos.indexOf(paso);
    return indexPaso < indexActual;
  }

  // ─────────────────────────────────────────
  // Mensaje amigable según el estado actual
  // ─────────────────────────────────────────
  getMensaje(): string {
    switch (this.pedido?.estado) {
      case 'pendiente':   return 'Tu pedido fue recibido, en breve lo preparamos.';
      case 'preparando':  return 'Estamos preparando tu pedido.';
      case 'listo':       return '¡Tu pedido está listo para entregarse!';
      case 'entregado':   return '¡Pedido entregado! Buen provecho.';
      default:            return '';
    }
  }

  volverAlMenu(): void {
    localStorage.removeItem('ultimo_pedido_id');
    this.router.navigate(['/menu']);
  }
}