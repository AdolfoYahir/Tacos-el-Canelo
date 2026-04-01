import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CarritoService } from '../carrito';
import { DatabaseService } from '../database';
import { DetallePedido, Usuario } from '../models/database.models';

// ─────────────────────────────────────────────────────────────
// PagoComponent → pantalla de resumen y confirmación de pedido
// Ruta: /pago
// Requiere: authGuard (usuario logueado)
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pago-container">
      <h2>Confirmar Pedido</h2>

      <!-- Resumen de productos -->
      <div class="resumen">
        <div class="item" *ngFor="let item of items">
          <span>{{ item.producto?.nombre }} x{{ item.cantidad }}</span>
          <span>\${{ item.subtotal | number:'1.2-2' }}</span>
        </div>

        <div class="total">
          <strong>Total: \${{ total | number:'1.2-2' }}</strong>
        </div>
      </div>

      <!-- Mensaje de error -->
      <p class="error" *ngIf="error">{{ error }}</p>

      <!-- Botones -->
      <div class="acciones">
        <button (click)="regresar()" [disabled]="cargando">
          Regresar
        </button>
        <button (click)="confirmarPedido()" [disabled]="cargando || items.length === 0">
          {{ cargando ? 'Procesando...' : 'Confirmar Pedido' }}
        </button>
      </div>
    </div>
  `
})
export class Pago implements OnInit {

  items: DetallePedido[] = [];
  total: number = 0;
  cargando: boolean = false;
  error: string = '';

  constructor(
    private carritoService: CarritoService,
    private db: DatabaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Cargar items actuales del carrito
    this.items = this.carritoService.getItems();
    this.total = this.carritoService.getTotal();

    // Si el carrito está vacío, regresar al menú
    if (this.items.length === 0) {
      this.router.navigate(['/menu']);
    }
  }

  // ─────────────────────────────────────────
  // Confirmar pedido — flujo completo:
  // 1. Obtener usuario de localStorage
  // 2. Crear el pedido en Supabase
  // 3. Crear los detalles del pedido
  // 4. Limpiar carrito
  // 5. Redirigir a /estado
  // ─────────────────────────────────────────
  async confirmarPedido(): Promise<void> {
    this.cargando = true;
    this.error = '';

    try {
      // 1. Obtener usuario logueado
      const raw = localStorage.getItem('usuario');
      if (!raw) {
        this.router.navigate(['/']);
        return;
      }
      const usuario: Usuario = JSON.parse(raw);

      // 2. Crear el pedido
      const pedido = await this.db.createPedido({
        id_usuario: usuario.id_usuario,
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        total: this.total
      });

      // 3. Crear los detalles (uno por cada producto en el carrito)
      const detalles = this.items.map(item => ({
        id_pedido: pedido.id_pedido,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        subtotal: item.subtotal
      }));
      await this.db.createDetalles(detalles);

      // 4. Limpiar carrito
      this.carritoService.limpiar();

      // 5. Guardar id del pedido para mostrarlo en /estado
      localStorage.setItem('ultimo_pedido_id', pedido.id_pedido.toString());

      // 6. Redirigir a la pantalla de estado
      this.router.navigate(['/estado']);

    } catch (err: any) {
      this.error = 'Ocurrió un error al procesar el pedido. Intenta de nuevo.';
      console.error('Error al confirmar pedido:', err);
    } finally {
      this.cargando = false;
    }
  }

  regresar(): void {
    this.router.navigate(['/carrito']);
  }
}