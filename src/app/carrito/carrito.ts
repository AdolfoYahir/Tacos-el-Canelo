import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CarritoService } from '../carrito';
import { DetallePedido, Usuario } from '../models/database.models';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrito.html',
  styleUrls: ['./carrito.css']
})
export class Carrito implements OnInit {
  items: DetallePedido[] = [];
  usuarioActual: Usuario | null = null;
  total: number = 0;

  constructor(
    private carritoService: CarritoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Suscribirse a los cambios del carrito
    this.carritoService.items$.subscribe(items => {
      this.items = items;
      this.total = this.carritoService.getTotal();
    });

    // Obtener usuario actual desde localStorage
    try {
      const raw = localStorage.getItem('usuario');
      this.usuarioActual = raw ? JSON.parse(raw) as Usuario : null;
    } catch {
      this.usuarioActual = null;
    }
  }

  regresarMenu(): void {
    this.router.navigate(['/menu']);
  }

  vaciarCarrito(): void {
    this.carritoService.limpiar();
  }

  quitar(item: DetallePedido): void {
    if (item.producto) {
      this.carritoService.quitar(item.id_producto, item.producto.precio);
    }
  }

  eliminar(idProducto: string): void {
    this.carritoService.eliminar(idProducto);
  }

  irAPago(): void {
    this.router.navigate(['/pago']);
  }
}
