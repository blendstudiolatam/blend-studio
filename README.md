# Blend Studio

Sistema de gestión y reservas del salón Blend Studio (Panamá).
Next.js + TypeScript + Tailwind CSS + Supabase, instalable como PWA.

## Arrancar en tu computadora

1. Copia `.env.example` como `.env.local` y rellena los valores de Supabase.
2. Instala las dependencias (solo la primera vez):

   ```bash
   npm install
   ```

3. Arranca la app y abre http://localhost:3000:

   ```bash
   npm run dev
   ```

## Comandos útiles

- `npm run build`: compila la versión de producción.
- `npm run lint`: revisa el código.
- `npm audit --omit=dev`: revisa vulnerabilidades de las dependencias que llegan a producción.

Las reglas del proyecto están en `CLAUDE.md`.
