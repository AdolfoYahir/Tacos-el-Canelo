import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../database';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css']
})
export class Registro {

  nombre: string = '';
  telefono: string = '';
  direccion: string = '';
  contrasena: string = '';
  confirmarContrasena: string = '';
  mostrarContrasena: boolean = false;
  errorMsg: string = '';
  cargando: boolean = false;

  constructor(
    private dbService: DatabaseService,
    private router: Router
  ) {}

  async registrarse() {
    this.errorMsg = '';

    // Validaciones
    if (!this.nombre || !this.telefono || !this.direccion || !this.contrasena || !this.confirmarContrasena) {
      this.errorMsg = 'Por favor completa todos los campos.';
      return;
    }

    if (this.telefono.length !== 10 || isNaN(Number(this.telefono))) {
      this.errorMsg = 'El teléfono debe tener exactamente 10 dígitos.';
      return;
    }

    if (this.contrasena !== this.confirmarContrasena) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    this.cargando = true;

    try {
      // Verificar que el nombre no esté en uso
      const usuarios = await this.dbService.getUsuarios();
      const existe = usuarios.find(u => u.nombre === this.nombre);
      if (existe) {
        this.errorMsg = 'Ese nombre de usuario ya está en uso.';
        return;
      }

      // Crear usuario
      await this.dbService.createUsuario({
        nombre: this.nombre,
        correo: this.telefono,   // usamos correo para guardar el teléfono
        contrasena: this.contrasena,
        rol: 'cliente',
        telefono: this.telefono,
        direccion: this.direccion
      });

      // Redirigir al login
      this.router.navigate(['/']);

    } catch (error) {
      this.errorMsg = 'Error al registrar. Intenta de nuevo.';
      console.error(error);
    } finally {
      this.cargando = false;
    }
  }

  irALogin() {
    this.router.navigate(['/']);
  }
}