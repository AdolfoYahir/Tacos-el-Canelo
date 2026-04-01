import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';  // ajusta la ruta
import { map, take, filter, switchMap } from 'rxjs/operators';
import { combineLatest, of } from 'rxjs';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esperamos a que la inicialización de Firebase termine
  return combineLatest([
    authService.isInitialized$,
    authService.currentUser$
  ]).pipe(
    filter(([initialized]) => initialized),   // solo cuando ya se inicializó
    take(1),
    map(([_, usuario]) => {
      if (usuario) {
        return true;
      }
      // Guardamos la URL a la que quería ir (útil para después del login)
      return router.createUrlTree(['/'], {
        queryParams: { returnUrl: state.url }
      });
    })
  );
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esperamos a que la inicialización de Firebase termine
  return combineLatest([
    authService.isInitialized$,
    authService.currentUser$
  ]).pipe(
    filter(([initialized]) => initialized),   // solo cuando ya se inicializó
    take(1),
    switchMap(([_, usuario]) => {
      if (!usuario) {
        // No está autenticado, redirigir al login
        return of(router.createUrlTree(['/'], {
          queryParams: { returnUrl: state.url }
        }));
      }
      // Verificar si es administrador usando custom claims
      return new Promise<boolean | import('@angular/router').UrlTree>((resolve) => {
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const idTokenResult = await firebaseUser.getIdTokenResult();
              const isAdmin = idTokenResult.claims?.['admin'] === true;
              if (isAdmin) {
                resolve(true);
              } else {
                // No es admin, redirigir al menú
                resolve(router.createUrlTree(['/menu']));
              }
            } catch {
              resolve(router.createUrlTree(['/menu']));
            }
          } else {
            resolve(router.createUrlTree(['/'], {
              queryParams: { returnUrl: state.url }
            }));
          }
        });
      });
    })
  );
};