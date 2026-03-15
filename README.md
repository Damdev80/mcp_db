Proyecto que combina un frontend Next.js 16 (App Router) con un MCP server que transforma preguntas en lenguaje natural en SQL y ejecuta la consulta contra una base de datos de transporte.

## Estructura clave

- `app/`: páginas y componentes del cliente, incluyendo el chat conversacional y los estilos globales.
- `app/api/db/nlp-query/route.ts`: consulta al servidor MCP, ejecuta el SQL con `postgres` y da formato conversacional al resultado. Maneja errores comunes como relaciones faltantes.
- `mcp-server/`: backend Node con instrucciones para Anthropic; produce SQL a partir de texto y ofrece lógica de respaldo cuando el requerimiento es ambiguo.
- `lib/`: helpers y esquemas compartidos usados por el frontend y el MCP server.

## Dependencias

- Next.js 16.1.6 y React 19.2.3 con Tailwind CSS 4 y TypeScript 5.
- `postgres` para la conexión directa a la base de datos.
- `@supabase/*` y `@neondatabase/serverless` para la integración con proveedores SQL.

## Variables de entorno

Configurar `DATABASE_URL` en la raíz para el cliente Next.js. En `mcp-server/` se debe definir `ANTHROPIC_API_KEY` y su propio `DATABASE_URL` en un archivo `.env`.

## Comandos

- `pnpm dev`: arranca el frontend (puerto 3000) y el MCP server (puerto 3002) en paralelo.
- `pnpm build`: compila Next.js y el servidor MCP.
- `pnpm start`: ejecuta la versión optimizada de Next.js.
- `pnpm lint`: ejecuta ESLint sobre el proyecto.

## Flujo de consulta

1. El usuario escribe una pregunta en el chat y se envía a `/api/db/nlp-query`.
2. El endpoint reenvía la pregunta y el historial al MCP server, que devuelve SQL y una posible explicación.
3. El SQL ejecuta contra Postgres; el endpoint detecta tipos de consultas (aggregados, listados, vehículos) y estructura el mensaje final.
4. Si falta una tabla, se reintenta generando SQL sin esa relación.

## Consideraciones adicionales

- Hay estilos glassmorphism con blobs difuminados y claves neon para la UI.
- Las respuestas intentan explicar el resultado (conteo, nombres, placas, vehículo) y adaptarse a distintos tipos de columnas.
- El backend MCP incluye `generateFallbackSql` para seguir preguntas cortas como "sus placas".
