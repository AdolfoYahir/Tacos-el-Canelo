import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-carrito',
  imports: [CommonModule],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css'
})
export class Carrito implements OnInit {
  
  pedido: any[] = []; // Cambiado a pedido para mantener consistencia
  usuarioActual: any = null;
  total: number = 0;

  constructor(private router: Router) {}

  ngOnInit() {
    // Intentar obtener de sesion primero, luego de usuarioActual
    const sesion = localStorage.getItem('sesion');
    const usuarioGuardado = localStorage.getItem('usuarioActual');
    
    if (sesion) {
      this.usuarioActual = JSON.parse(sesion);
      this.cargarPedido();
    } else if (usuarioGuardado) {
      this.usuarioActual = JSON.parse(usuarioGuardado);
      this.cargarPedido();
    } else {
      alert('Debes iniciar sesión');
      this.router.navigate(['/']);
    }
  }

  cargarPedido() {
    if (this.usuarioActual && this.usuarioActual.id) {
      const keyCarrito = `carrito_${this.usuarioActual.id}`;
      this.pedido = JSON.parse(localStorage.getItem(keyCarrito) || '[]');
      this.calcularTotal();
    } else {
      console.error('No hay usuario actual o ID no disponible');
      this.pedido = [];
      this.total = 0;
    }
  }

  calcularTotal() {
    this.total = this.pedido.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }

  vaciarCarrito() {
    if (this.usuarioActual && this.usuarioActual.id && confirm('¿Vaciar todo el carrito?')) {
      const keyCarrito = `carrito_${this.usuarioActual.id}`;
      localStorage.setItem(keyCarrito, '[]');
      this.pedido = [];
      this.total = 0;
      alert('Carrito vaciado');
    }
  }

  quitar(index: number) {
    if (confirm('¿Eliminar este producto?')) {
      // Restaurar al inventario
      const itemEliminado = this.pedido[index];
      if (itemEliminado) {
        const inventario = JSON.parse(localStorage.getItem('inventario') || '[]');
        const prodInventario = inventario.find((x: any) => x.nombre === itemEliminado.nombre);
        
        if (prodInventario) {
          prodInventario.cantidad += itemEliminado.cantidad;
          localStorage.setItem('inventario', JSON.stringify(inventario));
        }
      }
      
      // Eliminar del carrito
      this.pedido.splice(index, 1);
      
      if (this.usuarioActual && this.usuarioActual.id) {
        const keyCarrito = `carrito_${this.usuarioActual.id}`;
        localStorage.setItem(keyCarrito, JSON.stringify(this.pedido));
        this.calcularTotal();
      }
    }
  }

  confirmarPedido() {
    if (this.pedido.length === 0) {
      alert('No hay productos en el carrito');
      return;
    }
    
    // Aquí podrías guardar el pedido en un historial
    const historialKey = `historial_${this.usuarioActual.id}`;
    const historial = JSON.parse(localStorage.getItem(historialKey) || '[]');
    
    const pedidoCompleto = {
      fecha: new Date().toISOString(),
      productos: [...this.pedido],
      total: this.total
    };
    
    historial.push(pedidoCompleto);
    localStorage.setItem(historialKey, JSON.stringify(historial));
    
    alert('¡Pedido confirmado!');
    this.vaciarCarrito();
    this.router.navigate(['/menu']);
  }

  regresarMenu() {
    this.router.navigate(['/bebidas']);
  }

  irpago() {
    if (this.pedido.length === 0) {
      alert('No hay productos en el carrito para pagar');
      return;
    }
    this.router.navigate(['/pago']);
  }
}