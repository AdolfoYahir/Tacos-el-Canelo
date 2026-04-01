import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css']
})
export class Registro {

  private platformId = inject(PLATFORM_ID);
  telefono: string = '';
  direccion: string = '';
  errorMsg: string = '';
  cargando: boolean = false;

  constructor(private router: Router) {}

  async completarPerfil() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.errorMsg = '';

    if (!this.telefono || !this.direccion) {
      this.errorMsg = 'Por favor completa todos los campos.';
      return;
    }

    if (this.telefono.length !== 10 || isNaN(Number(this.telefono))) {
      this.errorMsg = 'El teléfono debe tener exactamente 10 dígitos.';
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      this.errorMsg = 'Sesión expirada. Inicia sesión de nuevo.';
      this.router.navigate(['/']);
      return;
    }

    this.cargando = true;

    try {
      const usuario = {
        nombre: user.displayName ?? '',
        correo: user.email ?? '',
        telefono: this.telefono,
        direccion: this.direccion.trim(),
        rol: 'cliente',
        contrasena: ''
      };

      await setDoc(doc(db, 'usuario', user.uid), usuario);

      const usuarioCompleto = { id_usuario: user.uid, ...usuario };
      localStorage.setItem('usuario', JSON.stringify(usuarioCompleto));
      sessionStorage.setItem('usuario', JSON.stringify(usuarioCompleto));

      this.router.navigate(['/menu']);

    } catch (error) {
      this.errorMsg = 'Error al guardar perfil. Intenta de nuevo.';
      console.error(error);
    } finally {
      this.cargando = false;
    }
  }

  irALogin() {
    this.router.navigate(['/']);
  }
}