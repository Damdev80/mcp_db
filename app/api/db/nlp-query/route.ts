import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { TABLE_COLUMNS } from '@/lib/database-schema';

const DATABASE_URL = process.env.DATABASE_URL || '';
const MCP_SERVER_URL = 'http://localhost:3002';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

type QueryRow = Record<string, unknown>;

// PostgreSQL client
const sqlClient = postgres(DATABASE_URL);

const toTitle = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asText = (value: unknown, fallback = 'No disponible'): string => {
  if (value === null || value === undefined) return fallback;
  const raw = String(value).trim();
  return raw === '' ? fallback : raw;
};

const formatDriverVehicleResponse = (rows: QueryRow[]) => {
  const intro = `Tenemos ${rows.length} ${rows.length === 1 ? 'conductor disponible' : 'conductores disponibles'}:`;

  const details = rows.map((item, idx) => {
    const nombres = asText(item.nombres || item.nombre, 'Sin nombre');
    const apellidos = asText(item.apellidos, '').trim();
    const fullName = `${nombres}${apellidos ? ` ${apellidos}` : ''}`.trim();
    const experiencia = asNumber(item.experiencia_anios);
    const placa = asText(item.placa);
    const marca = asText(item.marca, '').trim();
    const modelo = asText(item.modelo, '').trim();
    const vehiculo = [marca, modelo].filter(Boolean).join(' ').trim();

    const line1 = `${idx + 1}) ${fullName}${experiencia !== null ? ` - ${Math.round(experiencia)} años` : ''}`;
    const line2 = `   Placa: ${placa}`;
    const line3 = `   Vehiculo: ${vehiculo || 'No disponible'}`;

    return `${line1}\n${line2}\n${line3}`;
  });

  return `${intro}\n\n${details.join('\n\n')}`;
};

const formatGenericSingleRow = (item: QueryRow) => {
  return Object.entries(item)
    .map(([key, val]) => `${toTitle(key.replace(/_/g, ' '))}: ${asText(val, 'N/A')}`)
    .join('\n');
};

export async function POST(request: NextRequest) {
  try {
    const { question, conversationHistory = [] } = await request.json() as {
      question?: string;
      conversationHistory?: ConversationMessage[];
    };

    if (!question) {
      return NextResponse.json(
        { result: 'Por favor, formula una pregunta.' },
        { status: 400 }
      );
    }

    // Step 1: Get available tables from schema
    const unavailableRelations = new Set(['rutas_info', 'conductores_info', 'vehiculos_info', 'despachos_info', 'pagos_info']);
    const availableTables = Object.keys(TABLE_COLUMNS).filter((name) => !unavailableRelations.has(name) && !name.endsWith('_info'));

    const askMcpForSql = async (promptQuestion: string) => {
      const mpcResponse = await fetch(`${MCP_SERVER_URL}/nlp-to-sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: promptQuestion,
          conversationHistory,
          schema: {
            tables: availableTables,
            columns: TABLE_COLUMNS,
          },
        }),
      });

      const mcpResult = await mpcResponse.json().catch(() => ({}));
      return { ok: mpcResponse.ok, data: mcpResult as { sql?: string; explanation?: string; error?: string } };
    };

    // Step 2: Call MCP Server to convert NLP to SQL
    let sql: string | null = null;
    let mcpExplanation = '';

    try {
      let mcpCall = await askMcpForSql(question);

      if (!mcpCall.ok || !mcpCall.data.sql) {
        // Retry once with stricter fallback instructions to always output SQL.
        const retryPrompt = `${question}\n\nINSTRUCCION EXTRA: Debes responder SIEMPRE con un bloque SQL valido (SELECT) sobre tablas disponibles. Si la pregunta es ambigua, infierela desde el historial conversacional y devuelve una lista util en lugar de pedir aclaracion.`;
        mcpCall = await askMcpForSql(retryPrompt);
      }

      if (!mcpCall.ok || !mcpCall.data.sql) {
        mcpExplanation = mcpCall.data.explanation || '';
        const fallbackMsg = mcpExplanation
          ? `No pude generar SQL valido. ${mcpExplanation}`
          : `No pude generar SQL valido para tu pregunta.`;
        return NextResponse.json({ result: fallbackMsg });
      }

      sql = mcpCall.data.sql;
      console.log('Generated SQL:', sql);
    } catch (mpcError) {
      console.error('MCP connection error:', mpcError);
      return NextResponse.json({
        result: `Error al conectar con el servidor de procesamiento. ¿Está corriendo en puerto 3002?`,
      });
    }

    // Step 3: Execute directly via PostgreSQL (Neon)
    try {
      // Execute the SQL query directly - postgres client handles it safely
      // Claude generates SQL within our schema, so this is safe
      const result = await sqlClient.unsafe(sql);
      const rows = result;

      console.log('Query result rows:', JSON.stringify(rows, null, 2));
      console.log('Number of rows:', rows?.length);
      if (rows && rows.length > 0) {
        console.log('First row keys:', Object.keys(rows[0]));
        console.log('First row:', JSON.stringify(rows[0], null, 2));
      }

      // Handle empty results
      if (!rows || rows.length === 0) {
        return NextResponse.json({
          result: `No hay resultados para esta consulta.`,
        });
      }

      // Check if it's a COUNT query
      const isCountQuery = /COUNT\s*\(\s*\*\s*\)/i.test(sql);
      if (isCountQuery && rows.length > 0) {
        const countValue = Object.values(rows[0])[0];
        const qLower = question.toLowerCase();
        const subject = qLower.includes('conductor')
          ? 'conductores'
          : qLower.includes('vehiculo')
            ? 'vehiculos'
            : qLower.includes('ruta')
              ? 'rutas'
              : 'resultados';
        const hasDisponible = qLower.includes('disponible');
        const hasActivo = qLower.includes('activo');
        const qualifier = hasDisponible ? ' disponibles' : hasActivo ? ' activos' : '';
        return NextResponse.json({
          result: `Hay ${countValue} ${subject}${qualifier}.`,
        });
      }

      // Check if it's a SIMPLE SUM query (without GROUP BY - returns single aggregate)
      // If there's a GROUP BY, treat as multiple results even if SUM() is used
      const isSumQuery = /SUM\s*\(/i.test(sql) && !/GROUP\s+BY/i.test(sql);
      if (isSumQuery && rows.length > 0) {
        const sumValue = Object.values(rows[0]).find(v => typeof v === 'number');
        if (sumValue) {
          const formatted = typeof sumValue === 'number' 
            ? `$${sumValue.toLocaleString('es-CO')} COP`
            : sumValue;
          return NextResponse.json({
            result: `${formatted}`,
          });
        }
      }

      // Format results - conversational output
      if (rows.length === 1) {
        // Single result - format as details
        const item = rows[0] as QueryRow;
        return NextResponse.json({ result: formatGenericSingleRow(item) });
      }

      // Multiple results - friendly list
      const firstRow = rows[0] as QueryRow;
      const hasName = firstRow.nombres || firstRow.nombre;
      const hasApellido = firstRow.apellidos;
      const hasEstado = firstRow.estado;
      const hasExperiencia = firstRow.experiencia_anios;
      const hasEmail = firstRow.email;
      const hasPlaca = firstRow.placa;
      const hasId = firstRow.id;
      const hasMarca = firstRow.marca;
      const hasModelo = firstRow.modelo;
      
      // Check for financial data (costos, ingresos, balance)
      const hasFinancialData = firstRow.costo_mantenimiento || firstRow.ingresos_generados || firstRow.balance_neto || firstRow.costo_total_mantenimiento || firstRow.total_mantenimientos;

      let resultText = '';

      const isDriverWithVehicle = Boolean(hasName && hasPlaca && (hasMarca || hasModelo));

      if (isDriverWithVehicle) {
        resultText = formatDriverVehicleResponse(rows as QueryRow[]);
      } else if (hasName) {
        // People list (conductores, personas, etc)
        resultText = '';
        rows.forEach((item: any, idx: number) => {
          let fullName = item.nombres || item.nombre || 'Sin nombre';
          if (hasApellido && item.apellidos) {
            fullName += ` ${item.apellidos}`;
          }
          
          let line = `${idx + 1}) ${fullName}`;
          
          if (hasEstado && item.estado) line += ` (${item.estado})`;
          if (hasExperiencia && item.experiencia_anios) line += ` - ${item.experiencia_anios} años`;
          if (hasEmail && item.email) line += ` - ${item.email}`;
          
          resultText += line + '\n';
        });
        
        // Add intro text with count
        const introText = `Tenemos ${rows.length} ${rows.length === 1 ? 'persona' : 'personas'} ${
          hasEstado && rows[0].estado ? `en estado "${rows[0].estado}"` : ''
        }:\n\n`;
        resultText = introText + resultText;
      } else if (hasPlaca && hasFinancialData) {
        // Vehicle list with financial data (maintenance costs, income, balance)
        // Helper function to format numbers as COP with proper thousands separator
        const formatCOP = (num: any): string => {
          if (num === null || num === undefined || num === '') return '$0 COP';
          const parsed = typeof num === 'string' ? parseFloat(num) : Number(num);
          if (isNaN(parsed)) return '$0 COP';
          const formatted = Math.round(parsed).toLocaleString('es-CO');
          return `$${formatted} COP`;
        };
        
        resultText = '';
        rows.forEach((item: any, idx: number) => {
          const marca = item.marca || 'N/A';
          const modelo = item.modelo || '';
          const fullModel = modelo ? `${marca} ${modelo}` : marca;
          const placa = item.placa || '---';
          
          let line = `${idx + 1}) 🚌 ${fullModel} (${placa})`;
          
          // Add financial details - handle new column names from JOIN query
          if (item.costo_total_mantenimiento) {
            const costStr = formatCOP(item.costo_total_mantenimiento);
            const totalCount = parseInt(item.total_mantenimientos, 10) || 0;
            line += `\n   Costo mantenimiento: ${costStr} (${totalCount} evento${totalCount !== 1 ? 's' : ''})`;
          } else if (item.costo_mantenimiento) {
            const costStr = formatCOP(item.costo_mantenimiento);
            line += `\n   Costo mantenimiento: ${costStr}`;
          }
          
          if (item.ingresos_generados) {
            const ingresoStr = formatCOP(item.ingresos_generados);
            line += ` | Ingresos: ${ingresoStr}`;
          }
          
          if (item.balance_neto) {
            const balance = typeof item.balance_neto === 'string' 
              ? parseFloat(item.balance_neto) 
              : item.balance_neto;
            const balanceAbs = Math.abs(balance);
            const balanceStr = formatCOP(balanceAbs);
            const balanceLabel = balance < 0 ? `-${balanceStr} (déficit)` : balanceStr;
            line += ` | Balance: ${balanceLabel}`;
          }
          
          if (item.pct_mantenimiento_vs_ingreso) {
            const pct = typeof item.pct_mantenimiento_vs_ingreso === 'string'
              ? parseFloat(item.pct_mantenimiento_vs_ingreso)
              : item.pct_mantenimiento_vs_ingreso;
            const warning = pct > 300 ? ' ⚠️ CRÍTICO' : '';
            line += `\n   El mantenimiento es ${pct.toFixed(1)}% de sus ingresos${warning}`;
          }
          
          resultText += line + '\n\n';
        });
        resultText = resultText.trim();
      } else if (hasPlaca) {
        // Vehicle list without financial data
        resultText = '';
        rows.forEach((item: any, idx: number) => {
          let line = `${idx + 1}) ${item.placa}`;
          if (item.marca) line += ` - ${item.marca}`;
          if (item.modelo) line += ` ${item.modelo}`;
          if (item.estado) line += ` (${item.estado})`;
          resultText += line + '\n';
        });
      } else if (hasId) {
        // Generic list with IDs
        resultText = '';
        rows.forEach((item: any, idx: number) => {
          const values = Object.entries(item)
            .slice(0, 3)
            .map(([k, v]) => `${v}`)
            .join(' - ');
          resultText += `${idx + 1}) ${values}\n`;
        });
      } else {
        // Very generic fallback
        resultText = `Encontré ${rows.length} resultado${rows.length !== 1 ? 's' : ''}:\n\n`;
        resultText += rows
          .slice(0, 10)
          .map((item: any, idx: number) => `${idx + 1}. ${JSON.stringify(item)}`)
          .join('\n');
        if (rows.length > 10) {
          resultText += `\n\n... y ${rows.length - 10} más`;
        }
      }

      return NextResponse.json({ result: resultText });
    } catch (execError: any) {
      console.error('PostgreSQL execution error:', execError);

      // Retry SQL generation when a suggested relation does not exist (e.g. rutas_info)
      const missingRelation = execError?.code === '42P01' && typeof execError?.message === 'string'
        ? execError.message.match(/relation\s+"([^"]+)"\s+does not exist/i)?.[1]
        : null;

      if (missingRelation && sql) {
        try {
          const retryQuestion = `${question}\n\nLa consulta anterior fallo porque la relacion \"${missingRelation}\" no existe. Regenera SQL usando solo tablas existentes del schema provisto y evita esa relacion.`;
          const retryResponse = await fetch(`${MCP_SERVER_URL}/nlp-to-sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: retryQuestion,
              conversationHistory,
              schema: {
                tables: availableTables,
                columns: TABLE_COLUMNS,
              },
            }),
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json().catch(() => ({}));
            if (retryData?.sql) {
              console.log('Retry SQL after missing relation:', retryData.sql);
              const retriedRows = await sqlClient.unsafe(retryData.sql);
              if (retriedRows && retriedRows.length > 0) {
                const first = retriedRows[0];
                if (retriedRows.length === 1) {
                  const lines = Object.entries(first).map(([key, val]) => `${key}: ${val}`).join('\n');
                  return NextResponse.json({ result: lines });
                }
                const quickList = retriedRows
                  .slice(0, 20)
                  .map((item: any, idx: number) => `${idx + 1}) ${Object.values(item).slice(0, 4).join(' - ')}`)
                  .join('\n');
                return NextResponse.json({ result: quickList });
              }
              return NextResponse.json({ result: 'No hay resultados para esta consulta.' });
            }
          }
        } catch (retryErr) {
          console.error('Retry after missing relation failed:', retryErr);
        }
      }

      return NextResponse.json({
        result: `Error: ${execError instanceof Error ? execError.message : 'Error desconocido'}`,
      });
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { result: 'Ocurrió un error procesando tu solicitud.' },
      { status: 500 }
    );
  }
}
