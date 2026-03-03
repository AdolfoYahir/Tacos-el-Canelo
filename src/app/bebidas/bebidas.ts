import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-bebidas',
  imports: [FormsModule, CommonModule],
  templateUrl: './bebidas.html',
  styleUrl: './bebidas.css',
})
export class Bebidas implements OnInit {

  bebidas: any[] = [];
  usuarioActual: any = null;
  configuracion: any = {
    estado: 'abierto',
    horaApertura: '10:00',
    horaCierre: '22:00',
    mensaje: 'Los pedidos están cerrados en este momento'
  };

  constructor(private router: Router) {}

  ngOnInit() {
    const sesion = localStorage.getItem('sesion');
    const usuarioGuardado = localStorage.getItem('usuarioActual');
    
    if (sesion) {
      this.usuarioActual = JSON.parse(sesion);
    } else if (usuarioGuardado) {
      this.usuarioActual = JSON.parse(usuarioGuardado);
    } else {
      alert('Debes iniciar sesión primero');
      this.router.navigate(['/']);
      return;
    }
    
    this.cargarConfiguracion();
    this.cargar();
  }

  cargarConfiguracion() {
    const config = localStorage.getItem('configuracion');
    if (config) {
      this.configuracion = JSON.parse(config);
    }
  }

  pedidosPermitidos(): boolean {
    if (!this.configuracion) return false;
    if (this.configuracion.estado === 'cerrado') return false;
    
    const ahora = new Date();
    const horaActualNum = ahora.getHours() * 60 + ahora.getMinutes();
    
    const horaAperturaArr = this.configuracion.horaApertura.split(':');
    const horaCierreArr = this.configuracion.horaCierre.split(':');
    
    const horaApertura = Number(horaAperturaArr[0]);
    const minutoApertura = Number(horaAperturaArr[1]);
    const horaCierre = Number(horaCierreArr[0]);
    const minutoCierre = Number(horaCierreArr[1]);
    
    const aperturaNum = horaApertura * 60 + minutoApertura;
    const cierreNum = horaCierre * 60 + minutoCierre;
    
    return horaActualNum >= aperturaNum && horaActualNum <= cierreNum;
  }

  cargar() {
    const datos = localStorage.getItem('inventario') || '[]';
    const inventario = JSON.parse(datos);

    // Filtrar sin usar funciones flecha
    const bebidasFiltradas = [];
    for (let i = 0; i < inventario.length; i++) {
      if (inventario[i].tipo === 'bebida') {
        bebidasFiltradas.push(inventario[i]);
      }
    }

    // Mapear sin usar funciones flecha
    this.bebidas = [];
    for (let i = 0; i < bebidasFiltradas.length; i++) {
      this.bebidas.push({
        nombre: bebidasFiltradas[i].nombre,
        precio: this.obtenerPrecio(bebidasFiltradas[i].nombre),
        disponible: bebidasFiltradas[i].disponible,
        cantidad: 0,
        tipo: 'bebida'
      });
    }
  }

  obtenerPrecio(nombre: string) {
    if (nombre.includes('Agua')) return 12;
    if (nombre.includes('Coca')) return 18;
    if (nombre.includes('Boing')) return 15;
    if (nombre.includes('Jugo')) return 14;
    return 15;
  }

  agregar(b: any) {
    b.cantidad++;
  }

  quitar(b: any) {
    if (b.cantidad > 0) {
      b.cantidad--;
    }
  }

  // Método auxiliar para verificar si hay bebidas seleccionadas (sin flechas)
  hayBebidasSeleccionadas(): boolean {
    for (let i = 0; i < this.bebidas.length; i++) {
      if (this.bebidas[i].cantidad > 0) {
        return true;
      }
    }
    return false;
  }

  agregarPedidoCompleto() {
    if (!this.pedidosPermitidos()) {
      alert('Los pedidos están cerrados en este momento');
      return;
    }

    if (!this.usuarioActual) {
      alert('Debes iniciar sesión');
      this.router.navigate(['/']);
      return;
    }

    // Filtrar bebidas seleccionadas sin usar flechas
    const bebidasSeleccionadas = [];
    for (let i = 0; i < this.bebidas.length; i++) {
      if (this.bebidas[i].cantidad > 0) {
        bebidasSeleccionadas.push(this.bebidas[i]);
      }
    }
    
    if (bebidasSeleccionadas.length === 0) {
      alert('Selecciona al menos una bebida');
      return;
    }

    const keyCarrito = `carrito_${this.usuarioActual.id}`;
    let carrito = JSON.parse(localStorage.getItem(keyCarrito) || '[]');

    const inventario = JSON.parse(localStorage.getItem('inventario') || '[]');

    for (let i = 0; i < bebidasSeleccionadas.length; i++) {
      const b = bebidasSeleccionadas[i];
      
      carrito.push({
        nombre: b.nombre,
        cantidad: b.cantidad,
        precio: b.precio,
        tipo: 'bebida',
        fecha: new Date().toISOString()
      });

      // Buscar producto en inventario sin usar flechas
      let prod = null;
      for (let j = 0; j < inventario.length; j++) {
        if (inventario[j].nombre === b.nombre) {
          prod = inventario[j];
          break;
        }
      }
      
      if (prod) {
        prod.disponible = false;
      }
    }

    localStorage.setItem(keyCarrito, JSON.stringify(carrito));
    localStorage.setItem('inventario', JSON.stringify(inventario));

    alert('¡Bebidas agregadas al pedido!');
    
    // Resetear cantidades sin usar forEach
    for (let i = 0; i < this.bebidas.length; i++) {
      this.bebidas[i].cantidad = 0;
    }
    
    this.router.navigate(['/carrito']);
  }

  regresar() {
    this.router.navigate(['/menu']);
  }

  siguiente() {
    this.router.navigate(['/carrito']);
  }
}