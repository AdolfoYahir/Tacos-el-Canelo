/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const firebaseConfig = {
  apiKey: 'AIzaSyDTgJ0Pa5PHSQqmXtR91o7QB8b5MEHwGVI',
  authDomain: 'tacos-el-canelo.firebaseapp.com',
  projectId: 'tacos-el-canelo',
  storageBucket: 'tacos-el-canelo.firebasestorage.app',
  messagingSenderId: '183935234727',
  appId: '1:183935234727:web:665328038c4171ce97e182',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type FilaJson = {
  id_producto: string;
  nombre: string;
  precio: number;
  categoria: string;
  disponible: boolean;
  descripcion: string;
};

async function seed() {
  const jsonPath = join(__dirname, 'backend', 'data', 'productos.json');
  const raw = readFileSync(jsonPath, 'utf8');
  const filas = JSON.parse(raw) as FilaJson[];

  console.log('Sincronizando productos (IDs fijos = misma fuente que API Node)...');
  for (const p of filas) {
    const { id_producto, ...campos } = p;
    await setDoc(doc(db, 'producto', id_producto), campos);
    console.log(`${p.nombre} → producto/${id_producto}`);
  }
  console.log('Listo. Ejecuta el API con: npm run api');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
