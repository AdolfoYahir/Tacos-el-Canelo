import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

type VistaAuth = 'ingresar' | 'crear_cuenta';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  vista: VistaAuth = 'ingresar';
  /** Tras Google: si no hay documento en Firestore, se pide teléfono y dirección aquí mismo. */
  mostrarCompletarGoogle = false;

  errorMsg = '';
  exitoMsg = '';
  cargando = false;

  loginEmail = '';
  loginPassword = '';

  regNombre = '';
  regEmail = '';
  regPassword = '';
  regTelefono = '';
  regDireccion = '';

  googleTelefono = '';
  googleDireccion = '';

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const user = await this.authService.getRedirectResult();
      if (!user) return;
      this.cargando = true;
      this.cdr.detectChanges();
      const necesitaPerfil = await this.authService.verificarPerfilGoogle(user);
      if (necesitaPerfil) {
        this.mostrarCompletarGoogle = true;
        this.cdr.detectChanges();
      }
      // Si no necesita perfil, la navegación ya se hace dentro del servicio
    } catch (error: unknown) {
      const e = error as { code?: string; message?: string };
      const { mensajeAuthFirebase } = await import('../auth.service');
      this.errorMsg = mensajeAuthFirebase(e?.code) || e?.message || 'Error al completar el inicio de sesión.';
      console.error('getRedirectResult:', error);
      this.cdr.detectChanges();
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  setVista(v: VistaAuth): void {
    this.vista = v;
    this.errorMsg = '';
    this.exitoMsg = '';
  }

  async restablecerContrasena(): Promise<void> {
    this.errorMsg = '';
    this.exitoMsg = '';
    const resultado = await this.authService.restablecerContrasena(this.loginEmail);
    if (resultado.success) {
      this.exitoMsg =
        'Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.';
    } else {
      this.errorMsg = resultado.error || 'No se pudo enviar el correo. Intenta más tarde.';
    }
  }

  async ingresarConEmail(): Promise<void> {
    this.errorMsg = '';
    this.exitoMsg = '';
    this.cargando = true;
    this.cdr.detectChanges();
    try {
      const resultado = await this.authService.ingresarConEmail(this.loginEmail, this.loginPassword);
      if (!resultado.success) {
        this.errorMsg = resultado.error || '';
        this.cdr.detectChanges();
      }
      // Si success, la navegación ya se hace dentro del servicio
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async crearCuenta(): Promise<void> {
    this.errorMsg = '';
    this.cargando = true;
    this.cdr.detectChanges();
    try {
      const resultado = await this.authService.crearCuenta({
        nombre: this.regNombre,
        email: this.regEmail,
        password: this.regPassword,
        telefono: this.regTelefono,
        direccion: this.regDireccion,
      });
      if (!resultado.success) {
        this.errorMsg = resultado.error || '';
        this.cdr.detectChanges();
      }
      // Si success, la navegación ya se hace dentro del servicio
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async loginConGoogle(): Promise<void> {
    this.errorMsg = '';
    this.cargando = true;
    this.cdr.detectChanges();
    try {
      await this.authService.loginConGoogle();
      // Si success, la redirección ocurre automáticamente
    } catch (error: unknown) {
      const e = error as { code?: string };
      this.errorMsg = e?.code || 'No se pudo iniciar sesión con Google.';
      console.error(error);
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async guardarPerfilGoogle(): Promise<void> {
    this.errorMsg = '';
    const user = this.authService.getFirebaseCurrentUser();
    if (!user) {
      this.errorMsg = 'Sesión expirada. Vuelve a iniciar sesión con Google.';
      this.mostrarCompletarGoogle = false;
      return;
    }
    this.cargando = true;
    this.cdr.detectChanges();
    try {
      const resultado = await this.authService.guardarPerfilGoogle(user, {
        telefono: this.googleTelefono,
        direccion: this.googleDireccion,
      });
      if (!resultado.success) {
        this.errorMsg = resultado.error || '';
        this.cdr.detectChanges();
      } else {
        this.mostrarCompletarGoogle = false;
      }
      // Si success, la navegación ya se hace dentro del servicio
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async cancelarCompletarGoogle(): Promise<void> {
    await this.authService.cancelarCompletarGoogle();
    this.mostrarCompletarGoogle = false;
    this.googleTelefono = '';
    this.googleDireccion = '';
    this.errorMsg = '';
    this.cdr.detectChanges();
  }
}
