import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import {
  User,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';

export interface Usuario {
  id_usuario: string;
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  rol: 'cliente' | 'admin';
  contrasena?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

export interface GoogleProfileData {
  telefono: string;
  direccion: string;
}

/** Validación local del correo antes de Firebase */
export function esCorreoValido(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

export function mensajeAuthFirebase(code: string | undefined): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya está registrado. Inicia sesión.';
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    case 'auth/network-request-failed':
      return 'No hay conexión o el servicio no respondió. Revisa tu internet e intenta de nuevo.';
    case 'auth/user-disabled':
      return 'Esta cuenta fue deshabilitada. Contacta al administrador.';
    default:
      return code ?? 'Ocurrió un error. Intenta de nuevo.';
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  private _currentUser$ = new BehaviorSubject<Usuario | null>(null);
  currentUser$ = this._currentUser$.asObservable();

  private _loading$ = new BehaviorSubject<boolean>(false);
  loading$ = this._loading$.asObservable();

  private _isInitialized$ = new BehaviorSubject<boolean>(false);
  isInitialized$ = this._isInitialized$.asObservable();

  private authStateUnsubscribe: (() => void) | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initAuthStateListener();
    }
  }

  /**
   * Inicializa el listener del estado de autenticación de Firebase.
   * Esto permite detectar cambios de sesión (expulsión, logout forzado, etc.)
   */
  private initAuthStateListener(): void {
    this.authStateUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Usuario de Firebase disponible
        // Verificar si tenemos datos en Firestore
        const snap = await getDoc(doc(db, 'usuario', firebaseUser.uid));
        if (snap.exists()) {
          const usuario = { id_usuario: snap.id, ...snap.data() } as Usuario;
          this.guardarUsuarioStorage(usuario);
        } else {
          // Usuario de Firebase sin perfil en Firestore
          // Podría ser un caso de datos corruptos, limpiar
          console.warn('Usuario de Firebase sin perfil en Firestore');
          this._currentUser$.next(null);
        }
      } else {
        // No hay usuario de Firebase, limpiar storage local
        this.limpiarStorage();
      }
      this._isInitialized$.next(true);
    });
  }

  /**
   * Método para sincronizar manualmente la sesión con Firestore.
   * Útil después de actualizaciones de perfil.
   */
  async syncSession(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      this.limpiarStorage();
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'usuario', firebaseUser.uid));
      if (snap.exists()) {
        const usuario = { id_usuario: snap.id, ...snap.data() } as Usuario;
        this.guardarUsuarioStorage(usuario);
      } else {
        this.limpiarStorage();
      }
    } catch (error) {
      console.error('Error sincronizando sesión:', error);
    }
  }

  private guardarUsuarioStorage(usuario: Usuario): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem('usuario', JSON.stringify(usuario));
    sessionStorage.setItem('usuario', JSON.stringify(usuario));
    this._currentUser$.next(usuario);
  }

  private limpiarStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('usuario');
    this._currentUser$.next(null);
  }

  get isAuthenticated(): boolean {
    return this._currentUser$.value !== null;
  }

  get isInitialized(): boolean {
    return this._isInitialized$.value;
  }

  get currentUser(): Usuario | null {
    return this._currentUser$.value;
  }

  /** Obtiene el usuario actual de Firebase (para acceso directo si es necesario) */
  getFirebaseCurrentUser() {
    return auth.currentUser;
  }

  /** Obtiene el resultado de redirección de Google (para ngOnInit) */
  async getRedirectResult(): Promise<User | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const resultado = await getRedirectResult(auth);
      return resultado?.user ?? null;
    } catch (error) {
      console.error('getRedirectResult:', error);
      return null;
    }
  }

  /** Restablecer contraseña */
  async restablecerContrasena(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, error: 'No disponible en este entorno' };
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { success: false, error: 'Escribe tu correo arriba y vuelve a pulsar «¿Olvidaste tu contraseña?» para enviarte el enlace.' };
    }
    if (!esCorreoValido(trimmedEmail)) {
      return { success: false, error: 'Introduce un correo electrónico válido.' };
    }
    this._loading$.next(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      return { success: true };
    } catch (error) {
      const e = error as { code?: string };
      return { success: false, error: mensajeAuthFirebase(e?.code) || 'No se pudo enviar el correo. Intenta más tarde.' };
    } finally {
      this._loading$.next(false);
    }
  }

  /** Iniciar sesión con email y contraseña */
  async ingresarConEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, error: 'No disponible en este entorno' };
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { success: false, error: 'Escribe tu correo electrónico.' };
    }
    if (!esCorreoValido(trimmedEmail)) {
      return { success: false, error: 'El correo no tiene un formato válido (ejemplo: nombre@correo.com).' };
    }
    if (!password) {
      return { success: false, error: 'Escribe tu contraseña.' };
    }
    this._loading$.next(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const resultado = await this.cargarSesionDesdeFirestore(cred.user.uid);
      return resultado;
    } catch (error) {
      const e = error as { code?: string };
      return { success: false, error: mensajeAuthFirebase(e?.code) };
    } finally {
      this._loading$.next(false);
    }
  }

  /** Crear nueva cuenta */
  async crearCuenta(datos: {
    nombre: string;
    email: string;
    password: string;
    telefono: string;
    direccion: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, error: 'No disponible en este entorno' };
    }
    const { nombre, email, password, telefono, direccion } = datos;
    const trimmedNombre = nombre.trim();
    const trimmedEmail = email.trim();
    const trimmedTelefono = telefono.trim();
    const trimmedDireccion = direccion.trim();

    if (!trimmedNombre || !trimmedEmail || !password || !trimmedTelefono || !trimmedDireccion) {
      return { success: false, error: 'Completa todos los campos.' };
    }
    if (!esCorreoValido(trimmedEmail)) {
      return { success: false, error: 'El correo no tiene un formato válido.' };
    }
    if (trimmedTelefono.length !== 10 || Number.isNaN(Number(trimmedTelefono))) {
      return { success: false, error: 'El teléfono debe tener 10 dígitos.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    this._loading$.next(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      await updateProfile(cred.user, { displayName: trimmedNombre });

      const usuario: Omit<Usuario, 'id_usuario'> = {
        nombre: trimmedNombre,
        correo: trimmedEmail,
        telefono: trimmedTelefono,
        direccion: trimmedDireccion,
        rol: 'cliente',
        contrasena: '',
      };
      await setDoc(doc(db, 'usuario', cred.user.uid), usuario);

      const completo: Usuario = { id_usuario: cred.user.uid, ...usuario };
      this.guardarUsuarioStorage(completo);
      await this.router.navigate(['/menu']);
      return { success: true };
    } catch (error) {
      const e = error as { code?: string };
      return { success: false, error: mensajeAuthFirebase(e?.code) };
    } finally {
      this._loading$.next(false);
    }
  }

  /** Iniciar sesión con Google (redirección) */
  async loginConGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, error: 'No disponible en este entorno' };
    }
    try {
      await signInWithRedirect(auth, googleProvider);
      return { success: true };
    } catch (error) {
      const e = error as { code?: string };
      return { success: false, error: mensajeAuthFirebase(e?.code) || 'No se pudo iniciar sesión con Google.' };
    }
  }

  /** Verificar si el usuario de Google necesita completar perfil */
  async verificarPerfilGoogle(user: User): Promise<boolean> {
    const snap = await getDoc(doc(db, 'usuario', user.uid));
    return !snap.exists();
  }

  /** Guardar perfil de Google (teléfono y dirección) */
  async guardarPerfilGoogle(user: User, datos: GoogleProfileData): Promise<{ success: boolean; error?: string }> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, error: 'No disponible en este entorno' };
    }
    const telefono = datos.telefono.trim();
    const direccion = datos.direccion.trim();

    if (!telefono || !direccion) {
      return { success: false, error: 'Completa teléfono y dirección.' };
    }
    if (telefono.length !== 10 || Number.isNaN(Number(telefono))) {
      return { success: false, error: 'El teléfono debe tener 10 dígitos.' };
    }

    this._loading$.next(true);
    try {
      const usuario: Omit<Usuario, 'id_usuario'> = {
        nombre: user.displayName ?? '',
        correo: user.email ?? '',
        telefono,
        direccion,
        rol: 'cliente',
        contrasena: '',
      };
      await setDoc(doc(db, 'usuario', user.uid), usuario);
      const completo: Usuario = { id_usuario: user.uid, ...usuario };
      this.guardarUsuarioStorage(completo);
      await this.router.navigate(['/menu']);
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: 'No se pudo guardar tu perfil. Intenta de nuevo.' };
    } finally {
      this._loading$.next(false);
    }
  }

  /** Cancelar y cerrar sesión de Google */
  async cancelarCompletarGoogle(): Promise<void> {
    await signOut(auth);
  }

  /** Cerrar sesión */
  async signOut(): Promise<void> {
    await signOut(auth);
    this.limpiarStorage();
  }

  /** Cleanup del listener cuando el servicio se destruye */
  ngOnDestroy(): void {
    if (this.authStateUnsubscribe) {
      this.authStateUnsubscribe();
    }
  }

  /** Cargar sesión desde Firestore y guardar en storage */
  private async cargarSesionDesdeFirestore(uid: string): Promise<{ success: boolean; error?: string }> {
    const snap = await getDoc(doc(db, 'usuario', uid));
    if (!snap.exists()) {
      await signOut(auth);
      return { success: false, error: 'Tu cuenta no tiene perfil en el sistema. Crea una cuenta o contacta soporte.' };
    }
    return this.aplicarUsuarioFirestore(snap.id, snap.data() as Record<string, unknown>);
  }

  /** Aplicar usuario desde Firestore y navegar según rol */
  private async aplicarUsuarioFirestore(id: string, data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    const usuario = { id_usuario: id, ...data } as Usuario;
    this.guardarUsuarioStorage(usuario);
    if (usuario.rol === 'admin') {
      await this.router.navigate(['/admin']);
    } else {
      await this.router.navigate(['/menu']);
    }
    return { success: true };
  }
}
