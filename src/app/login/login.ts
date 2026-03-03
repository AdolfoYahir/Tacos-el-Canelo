import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class Login {

  usuario = '';
  password = '';

  constructor(private router: Router) {}

  ingresar() {
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');

    const usuarioInput = this.usuario.trim();
    const passwordInput = this.password.trim();

    if (!usuarioInput && !passwordInput) {
      alert('Ingrese sus datos o regístrese');
      return;
    }

    if (!usuarioInput) {
      alert('Ingrese usuario o teléfono');
      return;
    }

    if (!passwordInput) {
      alert('Ingrese la contraseña');
      return;
    }

    const encontrado = usuarios.find(
      (u: any) =>
        u.usuario === usuarioInput ||
        u.telefono === usuarioInput
    );

    if (!encontrado) {
      alert('Usuario no encontrado. Debe registrarse');
      this.router.navigate(['/registro']);
      return;
    }

    if (encontrado.password !== passwordInput) {
      alert('Contraseña incorrecta');
      return;
    }

    // Guardar sesión del usuario
    localStorage.setItem('sesion', JSON.stringify(encontrado));
    
    // También guardar usuarioActual para mantener consistencia
    localStorage.setItem('usuarioActual', JSON.stringify({
      id: encontrado.id,
      usuario: encontrado.usuario,
      rol: encontrado.rol,
      telefono: encontrado.telefono,
      direccion: encontrado.direccion
    }));

    alert('Bienvenido ' + encontrado.usuario);

    if (encontrado.rol === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/menu']);
    }
  }

  olvidarPassword() {
    alert('Contacta al administrador o vuelve a registrarte');
  }

  registrarse() {
    alert('Redirigiendo a registro');
    this.router.navigate(['/registro']);
  }

  pasar(){
    // Método solo para pruebas - deberías eliminarlo en producción
    alert("Acceso de prueba");
    this.router.navigate(['/menu']);
  }
}