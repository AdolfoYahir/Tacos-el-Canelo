import { Routes } from '@angular/router';
import { Menu } from './menu/menu';
import { Login } from './login/login';
import { Bebidas } from './bebidas/bebidas';
import { Carrito } from './carrito/carrito';
import { Pago } from './pago/pago';
import { Estado } from './estado/estado';
import { Admin } from './admin/admin';
import { Registro } from './registro/registro';
import { authGuard, adminGuard } from './auth-guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'registro', component: Registro },
  { path: 'menu', component: Menu },
  { path: 'bebidas', component: Bebidas },
  { path: 'admin', component: Admin, canActivate: [adminGuard] },
  { path: 'carrito', component: Carrito, canActivate: [authGuard] },
  { path: 'pago', component: Pago, canActivate: [authGuard] },
  { path: 'estado', component: Estado, canActivate: [authGuard] },
];

