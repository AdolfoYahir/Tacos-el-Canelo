import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Producto, DetallePedido } from './models/database.models';

// ─────────────────────────────────────────────────────────────
// CarritoService → maneja el estado del carrito en memoria
// Se comparte entre: Menu, Bebidas, Carrito, Pago
// ─────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class CarritoService {

  // BehaviorSubject emite el estado actual a cualquier componente suscrito
  private items = new BehaviorSubject<DetallePedido[]>([]);

  // Observable público — los componentes se suscriben a este
  items$ = this.items.asObservable();

  // ─────────────────────────────────────────
  // Agregar producto al carrito
  // Si ya existe, incrementa la cantidad
  // ─────────────────────────────────────────
  agregar(producto: Producto, cantidad: number = 1): void {
    const actuales = this.items.value;
    const indice = actuales.findIndex(i => i.id_producto === producto.id_producto);

    if (indice >= 0) {
      // Ya existe → actualizar cantidad y subtotal
      const copia = [...actuales];
      copia[indice] = {
        ...copia[indice],
        cantidad: copia[indice].cantidad + cantidad,
        subtotal: (copia[indice].cantidad + cantidad) * producto.precio
      };
      this.items.next(copia);
    } else {
      // Nuevo producto → agregar al carrito
      const nuevoItem: DetallePedido = {
        id_detalle: '',      // Se asigna al guardar en DB
        id_pedido: '',       // Se asigna al crear el pedido
        id_producto: producto.id_producto,
        cantidad,
        subtotal: cantidad * producto.precio,
        producto            // Referencia al objeto completo (para mostrar en UI)
      };
      this.items.next([...actuales, nuevoItem]);
    }
  }

  // ─────────────────────────────────────────
  // Quitar una unidad de un producto
  // Si llega a 0, elimina el item del carrito
  // ─────────────────────────────────────────
  quitar(idProducto: string, precio: number): void {
    const actuales = this.items.value;
    const indice = actuales.findIndex(i => i.id_producto === idProducto);

    if (indice < 0) return;

    const copia = [...actuales];

    if (copia[indice].cantidad <= 1) {
      // Eliminar del carrito
      copia.splice(indice, 1);
    } else {
      // Reducir cantidad
      copia[indice] = {
        ...copia[indice],
        cantidad: copia[indice].cantidad - 1,
        subtotal: (copia[indice].cantidad - 1) * precio
      };
    }

    this.items.next(copia);
  }

  // ─────────────────────────────────────────
  // Eliminar un producto completo del carrito
  // ─────────────────────────────────────────
  eliminar(idProducto: string): void {
    this.items.next(
      this.items.value.filter(i => i.id_producto !== idProducto)
    );
  }

  // ─────────────────────────────────────────
  // Vaciar el carrito completo
  // Llamar después de confirmar el pedido
  // ─────────────────────────────────────────
  limpiar(): void {
    this.items.next([]);
  }

  // ─────────────────────────────────────────
  // Calcular total del carrito
  // ─────────────────────────────────────────
  getTotal(): number {
    return this.items.value.reduce((suma, item) => suma + item.subtotal, 0);
  }

  // ─────────────────────────────────────────
  // Obtener número total de productos
  // (útil para badge del ícono del carrito)
  // ─────────────────────────────────────────
  getCantidadTotal(): number {
    return this.items.value.reduce((suma, item) => suma + item.cantidad, 0);
  }

  // ─────────────────────────────────────────
  // Obtener snapshot actual sin suscribirse
  // ─────────────────────────────────────────
  getItems(): DetallePedido[] {
    return this.items.value;
  }
}