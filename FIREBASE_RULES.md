# Reglas de Seguridad de Firebase Firestore

## Problema
Los pedidos activos aparecen en Firebase Console pero no se cargan en la página. Esto es causado por reglas de seguridad restrictivas en Firestore.

## Solución

### Paso 1: Acceder a Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **tacos-el-canelo**
3. En el menú lateral, haz clic en **"Firestore Database"**

### Paso 2: Verificar las reglas actuales
1. Haz clic en la pestaña **"Rules"** (Reglas)
2. Revisa las reglas actuales de Firestore

### Paso 3: Actualizar las reglas
Las reglas deben permitir lectura pública para que la aplicación funcione. Reemplaza las reglas actuales con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Colección de usuarios - lectura pública, escritura solo autenticada
    match /usuario/{userId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Colección de productos - lectura pública para todos
    match /producto/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Colección de pedidos - lectura y escritura para usuarios autenticados
    match /pedido/{orderId} {
      allow read: if true;  // Cambiar a request.auth != null si solo admin debe ver pedidos
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
    
    // Colección de detalles de pedidos - lectura y escritura para usuarios autenticados
    match /detalle_pedido/{detalleId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
  }
}
```

### Paso 4: Publicar las reglas
1. Haz clic en **"Publish"** (Publicar) después de actualizar las reglas
2. Espera unos segundos y actualiza tu aplicación Angular

## Alternativa: Si solo el admin debe ver todos los pedidos
Si quieres que solo el administrador pueda ver todos los pedidos:

```javascript
match /pedido/{orderId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null;
}
```

Y en la colección `usuario`, necesitas agregar un campo `rol` y verificarlo:

```javascript
allow read: if request.auth != null && 
           get(/databases/$(database)/documents/usuario/$(request.auth.uid)).data.rol == 'admin';
```

## Verificación
Después de publicar las reglas, verifica en tu aplicación:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network" o "Console"
3. Recarga la página de administración
4. Si hay errores de permisos, aparecerán en la consola
