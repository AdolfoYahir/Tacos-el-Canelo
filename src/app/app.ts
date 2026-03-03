import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Pago } from './pago/pago';
import { Admin } from './admin/admin';
import { Bebidas } from './bebidas/bebidas';
import { Carrito } from './carrito/carrito';
import { Estado } from './estado/estado';
import { Login } from './login/login';
import { Menu } from './menu/menu';
import { RouterModule } from '@angular/router';


@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'] 
})
export class App {
  protected readonly title = signal('tacos-app');
}
