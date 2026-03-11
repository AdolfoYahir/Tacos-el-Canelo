import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../database';
import { Usuario } from '../models/database.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {

  nombre: string = '';
  contrasena: string = '';
  errorMsg: string = '';
  cargando: boolean = false;

  constructor(
    private dbService: DatabaseService,
    private router: Router
  ) {}

  async iniciarSesion() {
    this.errorMsg = '';

    const nombreTrimmed = this.nombre.trim();
    const contrasenaTrimmed = this.contrasena.trim();

    if (!nombreTrimmed || !contrasenaTrimmed) {
      this.errorMsg = 'Por favor completa todos los campos.';
      return;
    }

    this.cargando = true;

    try {
      // Query filtered server-side: avoids fetching all users to the client
      const usuario: Usuario | null = await this.dbService.getUsuarioPorCredenciales(
        nombreTrimmed,
        contrasenaTrimmed
      );

      if (!usuario) {
        this.errorMsg = 'Usuario o contraseña incorrectos.';
        return;
      }

      sessionStorage.setItem('usuario', JSON.stringify(usuario));

      if (usuario.rol === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/menu']);
      }

    } catch (error) {
      this.errorMsg = 'Error al conectar con la base de datos.';
      console.error(error);
    } finally {
      this.cargando = false;
    }
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }
}