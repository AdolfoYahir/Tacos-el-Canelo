import { Routes } from '@angular/router';
import { Menu } from './menu/menu';
import { Login } from './login/login';
import { Bebidas } from './bebidas/bebidas';
import { Carrito } from './carrito/carrito';
import { Pago } from './pago/pago';
import { Estado } from './estado/estado';
import { Admin } from './admin/admin';
import { Registro } from './registro/registro';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'registro', component: Registro },
  { path: 'menu', component: Menu },
  { path: 'bebidas', component: Bebidas },
  { path: 'carrito', component: Carrito },
  { path: 'pago', component: Pago },
  { path: 'estado', component: Estado },
  { path: 'admin', component: Admin }
];