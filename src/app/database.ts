import { Injectable } from '@angular/core';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, onSnapshot, Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { Usuario, Pedido, DetallePedido, Producto } from './models/database.models';

@Injectable({ providedIn: 'root' })
export class DatabaseService {

  // ─────────────────────────────────────────
  // USUARIOS
  // ─────────────────────────────────────────

  async getUsuarios(): Promise<Usuario[]> {
    const snapshot = await getDocs(collection(db, 'usuario'));
    return snapshot.docs.map(d => ({ id_usuario: d.id, ...d.data() }) as Usuario);
  }

  async getUsuarioPorCredenciales(nombre: string, contrasena: string): Promise<Usuario | null> {
    const q = query(
      collection(db, 'usuario'),
      where('nombre', '==', nombre),
      where('contrasena', '==', contrasena)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id_usuario: d.id, ...d.data() } as Usuario;
  }

  async getUsuarioById(id: string): Promise<Usuario> {
    const snap = await getDoc(doc(db, 'usuario', id));
    if (!snap.exists()) throw new Error('Usuario no encontrado');
    return { id_usuario: snap.id, ...snap.data() } as Usuario;
  }

  async createUsuario(usuario: Omit<Usuario, 'id_usuario'>): Promise<Usuario> {
    const ref = await addDoc(collection(db, 'usuario'), usuario);
    return { id_usuario: ref.id, ...usuario };
  }

  async updateUsuario(id: string, usuario: Partial<Usuario>): Promise<Usuario> {
    await updateDoc(doc(db, 'usuario', id), { ...usuario });
    return this.getUsuarioById(id);
  }

  async deleteUsuario(id: string): Promise<void> {
    await deleteDoc(doc(db, 'usuario', id));
  }

  // ─────────────────────────────────────────
  // PRODUCTOS
  // ─────────────────────────────────────────

  async getProductos(): Promise<Producto[]> {
    const snapshot = await getDocs(collection(db, 'producto'));
    return snapshot.docs.map(d => ({ id_producto: d.id, ...d.data() }) as Producto);
  }

  async getProductoById(id: string): Promise<Producto> {
    const snap = await getDoc(doc(db, 'producto', id));
    if (!snap.exists()) throw new Error('Producto no encontrado');
    return { id_producto: snap.id, ...snap.data() } as Producto;
  }

  async createProducto(producto: Omit<Producto, 'id_producto'>): Promise<Producto> {
    const ref = await addDoc(collection(db, 'producto'), producto);
    return { id_producto: ref.id, ...producto };
  }

  async updateProducto(id: string, producto: Partial<Producto>): Promise<Producto> {
    await updateDoc(doc(db, 'producto', id), { ...producto });
    return this.getProductoById(id);
  }

  async deleteProducto(id: string): Promise<void> {
    await deleteDoc(doc(db, 'producto', id));
  }

  // ─────────────────────────────────────────
  // PEDIDOS
  // ─────────────────────────────────────────

  async getPedidos(): Promise<Pedido[]> {
    const snapshot = await getDocs(collection(db, 'pedido'));
    const pedidos = snapshot.docs.map(d => ({ id_pedido: d.id, ...d.data() }) as Pedido);

    // Enriquecer con usuario y detalles
    return Promise.all(pedidos.map(async pedido => {
      const [usuario, detalle_pedido] = await Promise.all([
        this.getUsuarioById(pedido.id_usuario).catch(() => undefined),
        this.getDetallesByPedido(pedido.id_pedido)
      ]);
      return { ...pedido, usuario, detalle_pedido };
    }));
  }

  subscribePedidos(
    onData: (pedidos: Pedido[]) => void,
    onError?: (error: unknown) => void
  ): Unsubscribe {
    const sortPedidos = (list: Pedido[]) =>
      [...list].sort((a, b) => {
        const aTime = new Date(a.fecha).getTime();
        const bTime = new Date(b.fecha).getTime();
        return bTime - aTime;
      });

    let snapGen = 0;
    return onSnapshot(
      collection(db, 'pedido'),
      (snapshot) => {
        const gen = ++snapGen;
        const base = snapshot.docs.map(d => ({ id_pedido: d.id, ...d.data() }) as Pedido);
        // Entrega síncrona: quita el estado “Cargando…” aunque el enriquecimiento tarde o falle.
        onData(sortPedidos(base));

        void (async () => {
          try {
            const enriched = await Promise.all(
              base.map(async pedido => {
                const [usuario, detalle_pedido] = await Promise.all([
                  this.getUsuarioById(pedido.id_usuario).catch(() => undefined),
                  this.getDetallesByPedido(pedido.id_pedido),
                ]);
                return { ...pedido, usuario, detalle_pedido };
              })
            );
            if (gen !== snapGen) return;
            onData(sortPedidos(enriched));
          } catch (err) {
            if (gen === snapGen) onError?.(err);
          }
        })();
      },
      (err) => onError?.(err)
    );
  }

  async getPedidoById(id: string): Promise<Pedido> {
    const snap = await getDoc(doc(db, 'pedido', id));
    if (!snap.exists()) throw new Error('Pedido no encontrado');
    const pedido = { id_pedido: snap.id, ...snap.data() } as Pedido;

    const [usuario, detalle_pedido] = await Promise.all([
      this.getUsuarioById(pedido.id_usuario).catch(() => undefined),
      this.getDetallesByPedido(pedido.id_pedido)
    ]);
    return { ...pedido, usuario, detalle_pedido };
  }

  async getPedidosByUsuario(idUsuario: string): Promise<Pedido[]> {
    const q = query(collection(db, 'pedido'), where('id_usuario', '==', idUsuario));
    const snapshot = await getDocs(q);
    const pedidos = snapshot.docs.map(d => ({ id_pedido: d.id, ...d.data() }) as Pedido);

    return Promise.all(pedidos.map(async pedido => {
      const detalle_pedido = await this.getDetallesByPedido(pedido.id_pedido);
      return { ...pedido, detalle_pedido };
    }));
  }

  async createPedido(pedido: Omit<Pedido, 'id_pedido'>): Promise<Pedido> {
    const { usuario, detalle_pedido, ...pedidoData } = pedido;
    const ref = await addDoc(collection(db, 'pedido'), pedidoData);
    return { id_pedido: ref.id, ...pedido };
  }

  async updatePedido(id: string, pedido: Partial<Pedido>): Promise<Pedido> {
    const { usuario, detalle_pedido, ...pedidoData } = pedido;
    await updateDoc(doc(db, 'pedido', id), { ...pedidoData });
    return this.getPedidoById(id);
  }

  async updateEstadoPedido(id: string, estado: string): Promise<Pedido> {
    await updateDoc(doc(db, 'pedido', id), { estado });
    return this.getPedidoById(id);
  }

  async deletePedido(id: string): Promise<void> {
    await deleteDoc(doc(db, 'pedido', id));
  }

  // ─────────────────────────────────────────
  // DETALLE PEDIDO
  // ─────────────────────────────────────────

  async getDetallesByPedido(idPedido: string): Promise<DetallePedido[]> {
    try {
      const q = query(collection(db, 'detalle_pedido'), where('id_pedido', '==', idPedido));
      const snapshot = await getDocs(q);
      const detalles = snapshot.docs.map(d => ({ id_detalle: d.id, ...d.data() }) as DetallePedido);

      return Promise.all(detalles.map(async detalle => {
        const producto = await this.getProductoById(detalle.id_producto).catch(() => undefined);
        return { ...detalle, producto };
      }));
    } catch {
      // Sin permiso o índice faltante: el admin aún puede listar el pedido (total, fecha, estado).
      return [];
    }
  }

  async createDetalle(detalle: Omit<DetallePedido, 'id_detalle'>): Promise<DetallePedido> {
    const { producto, ...detalleData } = detalle;
    const ref = await addDoc(collection(db, 'detalle_pedido'), detalleData);
    return { id_detalle: ref.id, ...detalle };
  }

  async createDetalles(detalles: Omit<DetallePedido, 'id_detalle'>[]): Promise<DetallePedido[]> {
    return Promise.all(detalles.map(d => this.createDetalle(d)));
  }

  async updateDetalle(id: string, detalle: Partial<DetallePedido>): Promise<DetallePedido> {
    const { producto, ...detalleData } = detalle;
    await updateDoc(doc(db, 'detalle_pedido', id), { ...detalleData });
    const snap = await getDoc(doc(db, 'detalle_pedido', id));
    return { id_detalle: snap.id, ...snap.data() } as DetallePedido;
  }

  async deleteDetalle(id: string): Promise<void> {
    await deleteDoc(doc(db, 'detalle_pedido', id));
  }

  async deleteDetallesByPedido(idPedido: string): Promise<void> {
    const q = query(collection(db, 'detalle_pedido'), where('id_pedido', '==', idPedido));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
  }
}