import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Agregado

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [FormsModule, CommonModule], // Cambiado NgFor por CommonModule
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class Admin {

  productos: any[] = [];
  pedidosEstado: string = 'cerrado'; // 'abierto' o 'cerrado'
  horaApertura: string = '10:00';
  horaCierre: string = '22:00';
  mensajePersonalizado: string = '';

  nuevo = '';
  tipoNuevo = 'comida';

  constructor(private router: Router) {

    const datos = localStorage.getItem('inventario');
    const config = localStorage.getItem('configuracion');

    if (datos) {
      this.productos = JSON.parse(datos);
    } else {
      this.productos = [
        { nombre: 'Taco de birria', tipo: 'comida', disponible: true },
        { nombre: 'Quesadilla', tipo: 'comida', disponible: true },
        { nombre: 'Agua fresca', tipo: 'bebida', disponible: true },
        { nombre: 'Coca Cola', tipo: 'bebida', disponible: true }
      ];
      this.guardar();
    }

    // Cargar configuración de horarios
    if (config) {
      const configData = JSON.parse(config);
      this.pedidosEstado = configData.estado || 'cerrado';
      this.horaApertura = configData.horaApertura || '10:00';
      this.horaCierre = configData.horaCierre || '22:00';
      this.mensajePersonalizado = configData.mensaje || '';
    } else {
      this.guardarConfiguracion();
    }
  }

  cerrarSesion() {
    localStorage.removeItem('sesion');
    localStorage.removeItem('usuarioActual');
    this.router.navigate(['/']);
  }

  guardar() {
    localStorage.setItem('inventario', JSON.stringify(this.productos));
  }

  guardarConfiguracion() {
    const config = {
      estado: this.pedidosEstado,
      horaApertura: this.horaApertura,
      horaCierre: this.horaCierre,
      mensaje: this.mensajePersonalizado
    };
    localStorage.setItem('configuracion', JSON.stringify(config));
  }

  cambiarEstadoPedidos() {
    this.pedidosEstado = this.pedidosEstado === 'abierto' ? 'cerrado' : 'abierto';
    this.guardarConfiguracion();
    
    const estadoTexto = this.pedidosEstado === 'abierto' ? 'ABIERTOS' : 'CERRADOS';
    alert(`Pedidos ${estadoTexto}`);
  }

  guardarHorarios() {
    this.guardarConfiguracion();
    alert('Horarios guardados correctamente');
  }

  // Versión simplificada de disponibilidad
  estaDisponible(producto: any): boolean {
    return producto.disponible;
  }

  // Verificar si se pueden hacer pedidos
  pedidosAbiertos(): boolean {
    return this.pedidosEstado === 'abierto';
  }

  agregar() {
    if (!this.nuevo.trim()) {
      alert('Escribe un nombre');
      return;
    }

    const existe = this.productos.some(
      p => p.nombre.toLowerCase() === this.nuevo.toLowerCase()
    );

    if (existe) {
      alert('Ese producto ya existe');
      return;
    }

    this.productos.push({
      nombre: this.nuevo,
      tipo: this.tipoNuevo,
      disponible: true // Por defecto disponible al agregar
    });

    this.nuevo = '';

    this.guardar();
  }

  // Nuevo método para cambiar disponibilidad con switch
  cambiarDisponibilidad(p: any) {
    p.disponible = !p.disponible;
    this.guardar();
    
    const estado = p.disponible ? 'disponible' : 'no disponible';
    alert(`${p.nombre} ahora está ${estado}`);
  }

  eliminar(i: number) {
    if (confirm('¿Eliminar producto?')) {
      this.productos.splice(i, 1);
      this.guardar();
    }
  }

  // Método para obtener productos disponibles
  productosDisponibles() {
    return this.productos.filter(p => p.disponible);
  }

  // Método para obtener productos no disponibles
  productosNoDisponibles() {
    return this.productos.filter(p => !p.disponible);
  }
}