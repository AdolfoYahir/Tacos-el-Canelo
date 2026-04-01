import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { Producto } from './models/database.models';

@Injectable({ providedIn: 'root' })
export class CatalogoApiService {
  private readonly http = inject(HttpClient);

  async fetchProductos(): Promise<Producto[]> {
    const base = environment.apiBaseUrl;
    if (!base) {
      throw new Error('apiBaseUrl no configurado');
    }
    const url = `${base.replace(/\/$/, '')}/productos`;
    return firstValueFrom(this.http.get<Producto[]>(url));
  }
}
