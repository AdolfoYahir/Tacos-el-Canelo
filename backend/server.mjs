import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'data', 'productos.json');

function loadProductos() {
  const raw = readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function saveProductos(list) {
  writeFileSync(DATA_FILE, JSON.stringify(list, null, 2) + '\n', 'utf8');
}

const app = express();
const PORT = process.env.PORT_API ?? 3000;

app.use(cors({ origin: ['http://localhost:4200', 'http://127.0.0.1:4200'] }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, servicio: 'Tacos El Canelo API', intercambio: 'JSON' });
});

app.get('/api/productos', (_req, res) => {
  try {
    const productos = loadProductos();
    res.json(productos);
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.get('/api/productos/:id', (req, res) => {
  try {
    const productos = loadProductos();
    const p = productos.find((x) => x.id_producto === req.params.id);
    if (!p) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.post('/api/productos', (req, res) => {
  try {
    const body = req.body;
    if (!body?.id_producto || !body?.nombre || typeof body.precio !== 'number') {
      res.status(400).json({ error: 'Se requiere id_producto, nombre y precio (número)' });
      return;
    }
    const list = loadProductos();
    if (list.some((x) => x.id_producto === body.id_producto)) {
      res.status(409).json({ error: 'id_producto ya existe' });
      return;
    }
    const nuevo = {
      id_producto: body.id_producto,
      nombre: body.nombre,
      precio: body.precio,
      categoria: body.categoria ?? 'comida',
      disponible: body.disponible !== false,
      descripcion: body.descripcion ?? '',
    };
    list.push(nuevo);
    saveProductos(list);
    res.status(201).json(nuevo);
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.put('/api/productos/:id', (req, res) => {
  try {
    const list = loadProductos();
    const i = list.findIndex((x) => x.id_producto === req.params.id);
    if (i === -1) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    const actual = { ...list[i], ...req.body, id_producto: list[i].id_producto };
    list[i] = actual;
    saveProductos(list);
    res.json(actual);
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.delete('/api/productos/:id', (req, res) => {
  try {
    const list = loadProductos();
    const filtrado = list.filter((x) => x.id_producto !== req.params.id);
    if (filtrado.length === list.length) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    saveProductos(filtrado);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.listen(PORT, () => {
  console.log(`API REST escuchando en http://localhost:${PORT}`);
  console.log('Ejemplos: GET /api/productos  |  GET /api/health');
});
