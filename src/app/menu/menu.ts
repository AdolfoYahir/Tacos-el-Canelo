import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OnInit } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-menu',
  imports: [FormsModule, NgFor, NgIf, RouterModule, CommonModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu implements OnInit {

  productos: any[] = [];
  usuarioActual: any = null;
  configuracion: any = {
    estado: 'abierto',
    horaApertura: '10:00',
    horaCierre: '22:00',
    mensaje: 'Los pedidos están cerrados en este momento'
  };
  horaActual: string = '';

  constructor(private router: Router) {
    this.actualizarHora();
  }

  ngOnInit() {
    // Obtener el usuario actual de la sesión
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
    
    // Actualizar hora cada minuto
    setInterval(() => {
      this.actualizarHora();
    }, 60000);
  }

  actualizarHora() {
    const ahora = new Date();
    this.horaActual = ahora.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  cargarConfiguracion() {
    const config = localStorage.getItem('configuracion');
    if (config) {
      this.configuracion = JSON.parse(config);
    }
  }

  pedidosPermitidos(): boolean {
    if (!this.configuracion) return false;
    
    // Si el admin cerró manualmente los pedidos
    if (this.configuracion.estado === 'cerrado') {
      return false;
    }
    
    // Verificar horario
    const ahora = new Date();
    const horaActualNum = ahora.getHours() * 60 + ahora.getMinutes();
    
    const [horaApertura, minutoApertura] = this.configuracion.horaApertura.split(':').map(Number);
    const [horaCierre, minutoCierre] = this.configuracion.horaCierre.split(':').map(Number);
    
    const aperturaNum = horaApertura * 60 + minutoApertura;
    const cierreNum = horaCierre * 60 + minutoCierre;
    
    return horaActualNum >= aperturaNum && horaActualNum <= cierreNum;
  }

  getMensajeEstado(): string {
    if (this.configuracion.estado === 'cerrado') {
      return this.configuracion.mensaje || 'Los pedidos están cerrados por el administrador';
    }
    
    if (!this.pedidosPermitidos()) {
      return `Horario de atención: ${this.configuracion.horaApertura} a ${this.configuracion.horaCierre}`;
    }
    
    return '';
  }

  cargar() {
    const datos = localStorage.getItem('inventario') || '[]';
    const inventario = JSON.parse(datos);

    this.productos = inventario
      .filter((p: any) => p.tipo === 'comida')
      .map((p: any) => ({
        nombre: p.nombre,
        precio: this.obtenerPrecio(p.nombre),
        disponible: p.disponible, // Cambiado a usar disponible booleano
        cantidad: 0,
        opciones: {
          conQueso: false,
          cebollaYCilantro: false,
          cebollaAsada: false,
          sinVerdura: false
        }
      }));
  }

  obtenerPrecio(nombre: string) {
    if (nombre.includes('Taco')) return 15;
    if (nombre.includes('Quesadilla')) return 25;
    return 20;
  }

  agregar(p: any) {
    p.cantidad++;
  }

  quitar(p: any) {
    if (p.cantidad > 0) {
      p.cantidad--;
    }
  }
  
  toggleSinVerdura(p: any) {
    if (p.opciones.sinVerdura) {
      p.opciones.cebollaYCilantro = false;
      p.opciones.cebollaAsada = false;
    }
  }

  quitarSinVerdura(p: any) {
    if (p.opciones.cebollaYCilantro || p.opciones.cebollaAsada) {
      p.opciones.sinVerdura = false;
    }
  }

  // Nuevo método para agregar todo el pedido
  agregarPedidoCompleto() {
    // Verificar si los pedidos están permitidos
    if (!this.pedidosPermitidos()) {
      alert(this.getMensajeEstado() || 'Los pedidos no están disponibles en este momento');
      return;
    }

    if (!this.usuarioActual) {
      alert('Debes iniciar sesión');
      this.router.navigate(['/']);
      return;
    }

    // Verificar si hay productos seleccionados
    const productosSeleccionados = this.productos.filter(p => p.cantidad > 0);
    
    if (productosSeleccionados.length === 0) {
      alert('Selecciona al menos un producto');
      return;
    }

    // Verificar disponibilidad de todos los productos
    const inventario = JSON.parse(localStorage.getItem('inventario') || '[]');
    
    for (let p of productosSeleccionados) {
      const prod = inventario.find((x: any) => x.nombre === p.nombre);
      
      if (!prod || !prod.disponible) {
        alert(`${p.nombre} no está disponible`);
        return;
      }
    }

    // Obtener el carrito del usuario actual
    const keyCarrito = `carrito_${this.usuarioActual.id}`;
    let carrito = JSON.parse(localStorage.getItem(keyCarrito) || '[]');

    // Agregar cada producto seleccionado al carrito
    for (let p of productosSeleccionados) {
      let opcionesSeleccionadas = [];

      if (p.opciones.conQueso) opcionesSeleccionadas.push('Con queso');
      
      if (!p.opciones.sinVerdura) {
        if (p.opciones.cebollaYCilantro) opcionesSeleccionadas.push('Cebolla y cilantro');
        if (p.opciones.cebollaAsada) opcionesSeleccionadas.push('Cebolla asada');
      } else {
        opcionesSeleccionadas.push('Sin verdura');
      }

      carrito.push({
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio,
        opciones: opcionesSeleccionadas,
        fecha: new Date().toISOString()
      });

      // Actualizar inventario (marcar como no disponible si era el último)
      const prod = inventario.find((x: any) => x.nombre === p.nombre);
      if (prod) {
        prod.disponible = false; // Se agota después de la compra
      }
    }

    // Guardar en el carrito del usuario específico
    localStorage.setItem(keyCarrito, JSON.stringify(carrito));
    localStorage.setItem('inventario', JSON.stringify(inventario));

    alert('¡Pedido agregado correctamente!');

    // Resetear cantidades y opciones
    this.productos.forEach(p => {
      p.cantidad = 0;
      p.opciones = {
        conQueso: false,
        cebollaYCilantro: false,
        cebollaAsada: false,
        sinVerdura: false
      };
    });

    // Ir a bebidas
    this.router.navigate(['/bebidas']);
  }

  siguiente() {
    if (!this.pedidosPermitidos()) {
      alert(this.getMensajeEstado() || 'Los pedidos están cerrados');
      return;
    }
    this.router.navigate(['/bebidas']);
  }

  regresar() {
    this.router.navigate(['/']);
  }

  hayProductosSeleccionados(): boolean {
    return this.productos.some(function(producto) {
      return producto.cantidad > 0;
    });
  }
}