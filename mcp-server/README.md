# 🚀 MCP Server - Query Chat

Tu servidor MCP (Model Context Protocol) para convertir preguntas en lenguaje natural a SQL queries.

## Características

✅ Usa Claude 3.5 Sonnet para entender preguntas en español  
✅ Genera SQL válido y seguro (solo SELECT)  
✅ Se integra con Supabase automáticamente  
✅ Corre en paralelo con Next.js con `pnpm dev`  
✅ Explicaciones claras de cada query  

## Arquitectura

```
┌─────────────────────────────────────────┐
│          Next.js Frontend (3000)         │
│                                         │
│    Chat UI → Pregunta → API Endpoint   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      /api/db/nlp-query (Next.js)        │
│                                         │
│  • Obtiene schema de Supabase           │
│  • Llama al MCP Server                  │
│  • Ejecuta SQL en BD                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│     MCP Server (puerto 3002)            │
│                                         │
│  • Recibe pregunta en natural language  │
│  • Llama a Claude 3.5 Sonnet            │
│  • Genera SQL válido                    │
│  • Devuelve SQL + explicación           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Supabase / PostgreSQL          │
│                                         │
│  • Ejecuta el SQL                       │
│  • Devuelve resultados                  │
└─────────────────────────────────────────┘
```

## Environment Variables

```env
# En .env.local (raíz del proyecto)
ANTHROPIC_API_KEY=sk-ant-api03-...  # Tu API key de Claude
NEXT_PUBLIC_SUPABASE_URL=...        # URL de Supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

## Ejecutar

### Opción 1: Ambos servidores (Recomendado)
```bash
pnpm dev
```

Esto inicia:
- Next.js en http://localhost:3000
- MCP Server en http://localhost:3002

### Opción 2: Solo MCP Server
```bash
cd mcp-server
pnpm dev
```

### Opción 3: Solo Next.js
```bash
pnpm dev:next
```

## Endpoints

### MCP Server

**POST** `/nlp-to-sql`

Convierte pregunta natural a SQL.

Request:
```json
{
  "question": "¿Cuántos usuarios activos tengo?",
  "schema": {
    "tables": ["users", "orders"],
    "columns": {
      "users": ["id", "name", "active", "created_at"]
    }
  }
}
```

Response:
```json
{
  "success": true,
  "sql": "SELECT COUNT(*) as active_users FROM users WHERE active = true;",
  "explanation": "Esta query cuenta todos los usuarios con active=true"
}
```

### Next.js API

**POST** `/api/db/nlp-query`

Procesa pregunta → genera SQL → ejecuta → devuelve resultado.

Request:
```json
{
  "question": "¿Cuántos usuarios activos tengo?"
}
```

Response:
```json
{
  "result": "Generated SQL:\n\n```sql\nSELECT...\n```\n\nExplanation:..."
}
```

## Cómo funciona

1. **User escribe pregunta** en el chat
2. **Next.js API** recibe la pregunta en `/api/db/nlp-query`
3. **Obtiene schema** de Supabase (tablas disponibles)
4. **Llama al MCP Server** con la pregunta y schema
5. **Claude genera SQL** usando el context de schema
6. **Ejecuta el SQL** en Supabase
7. **Devuelve resultado** al chat

## Seguridad

- ✅ Solo genera `SELECT` queries (sin INSERT/UPDATE/DELETE)
- ✅ Usa parametrizadas queries (cuando sea aplicable)
- ✅ Valida entrada del usuario
- ✅ Maneja errores de forma segura
- ⚠️ Para producción: Agregue rate limiting y autenticación

## Limitaciones

- Actualmente no cachea preguntas similares
- No tiene "memoria" entre queries (sin contexto de chat anterior)
- Necesita schema explícito de Supabase
- Rate limited por la API de Anthropic

## Próximas mejoras

- [ ] Memoizar queries frecuentes
- [ ] Agregar contexto histórico a Claude
- [ ] Soporte para JOIN queries complejas
- [ ] Analytics de queries ejecutadas
- [ ] Sugerir columnas cuando es ambiguo
- [ ] Visualizar resultados en tablas/gráficos

## Troubleshooting

### "MCP Server unreachable"
- Verifica que `pnpm dev` está corriendo
- Mira que el puerto 3002 esté disponible
- Revisa la consola de errores

### "Query failed"
- Mira los logs de Supabase
- Verifica que el schema en Supabase es correcto
- Prueba una pregunta más simple

### Claude no responde
- Verifica `ANTHROPIC_API_KEY` en `.env.local`
- Revisa que tienes créditos en Anthropic
- Mira los logs del MCP Server (puerto 3002)

## Contacto

Para reportar bugs o sugerencias, revisa la documentación principal del proyecto.
