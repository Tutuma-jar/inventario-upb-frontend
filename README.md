# Inventario UPB — Frontend

Aplicación estática para gestionar los productos de Inventario UPB.

## Desarrollo local

```bash
npm start
```

Abre `http://localhost:5173`. En local consume `http://localhost:3000/api/productos`.

## Despliegue

Render publica el contenido generado por `npm run build` en `dist/`. En producción,
la aplicación consume `https://inventario-upb-backend.onrender.com/api/productos`.

El workflow de GitHub Actions necesita el secreto `RENDER_DEPLOY_HOOK`, con el deploy
hook del Static Site creado en Render.
