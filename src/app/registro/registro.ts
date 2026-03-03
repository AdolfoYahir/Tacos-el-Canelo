import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-registro',
  imports: [FormsModule],
  templateUrl: './registro.html'
})
export class Registro {

  nombre = '';
  telefono = '';
  direccion = '';
  pass1 = '';
  pass2 = '';
  mostrarPassword = false;

  constructor(private router: Router) {

    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');

    const adminExiste = usuarios.some(
      (u: any) => u.rol === 'admin'
    );

    if (!adminExiste) {
      usuarios.push({
        usuario: 'admin',
        telefono: '0000000000',
        direccion: 'Sistema #1',
        password: 'admin123',
        rol: 'admin'
      });

      localStorage.setItem('usuarios', JSON.stringify(usuarios));
    }
  }

  registrar() {
    
    if (!this.nombre || !this.telefono || !this.direccion || !this.pass1 || !this.pass2) {
      alert('Completa todos los campos');
      return;
    }

    if (this.pass1 !== this.pass2) {
      alert('Las contraseñas no coinciden');
      return;
    }

    const telefonoValido = /^\d{10}$/;
    if (!telefonoValido.test(this.telefono)) {
      alert('El número debe tener exactamente 10 dígitos');
      return;
    }

    const direccionValida = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+ #\d+$/;
    if (!direccionValida.test(this.direccion)) {
      alert('La dirección debe ser como: Cumbres Calle #123');
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');

    const existe = usuarios.find(
      (u: any) =>
        u.usuario === this.nombre ||
        u.telefono === this.telefono
    );

    if (existe) {
      alert('Ya estás registrado');
      return;
    }

    usuarios.push({
      id: Date.now(),
      usuario: this.nombre,
      telefono: this.telefono,
      direccion: this.direccion,
      password: this.pass1,
      rol: 'user'
    });

    localStorage.setItem('usuarios', JSON.stringify(usuarios));

    alert('Registro exitoso');

    this.router.navigate(['/']);
  }

  regresarLogin() {
    alert('Redirigiendo a login');
    this.router.navigate(['/']);
  }
}