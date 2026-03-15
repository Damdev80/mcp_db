/**
 * Database Schema for Transportation Management System
 * Provides schema information for Claude to generate accurate SQL queries
 */

export const DATABASE_SCHEMA = `
-- SISTEMA DE GESTIÓN DE TRANSPORTE DE PERSONAS
-- Schema PostgreSQL

-- 1. PERSONAS BASE
CREATE TABLE personas (
  id SERIAL PRIMARY KEY,
  tipo_doc VARCHAR(10) NOT NULL,
  num_doc VARCHAR(20) UNIQUE NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(120) UNIQUE,
  fecha_nac DATE,
  ciudad_id INT,
  direccion VARCHAR(200),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CIUDADES / ZONAS
CREATE TABLE ciudades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  departamento VARCHAR(100),
  pais VARCHAR(60) DEFAULT 'Colombia'
);

CREATE TABLE zonas (
  id SERIAL PRIMARY KEY,
  ciudad_id INT REFERENCES ciudades(id),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT
);

-- 3. TRABAJADORES INTERNOS
CREATE TABLE cargos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  descripcion TEXT
);

CREATE TABLE trabajadores (
  id SERIAL PRIMARY KEY,
  persona_id INT UNIQUE REFERENCES personas(id),
  cargo_id INT REFERENCES cargos(id),
  fecha_ingreso DATE NOT NULL,
  salario_base NUMERIC(12,2),
  tipo_contrato VARCHAR(40),
  activo BOOLEAN DEFAULT TRUE
);

-- 4. CONDUCTORES
CREATE TABLE licencias_conduccion (
  id SERIAL PRIMARY KEY,
  conductor_id INT REFERENCES trabajadores(id),
  categoria VARCHAR(10) NOT NULL,
  numero VARCHAR(40) UNIQUE NOT NULL,
  fecha_expedicion DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  entidad_expide VARCHAR(100)
);

CREATE TABLE conductores (
  id SERIAL PRIMARY KEY,
  trabajador_id INT UNIQUE REFERENCES trabajadores(id),
  licencia_id INT REFERENCES licencias_conduccion(id),
  experiencia_anios INT DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'disponible'
);

-- 5. CLIENTES / PASAJEROS
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  persona_id INT UNIQUE REFERENCES personas(id),
  tipo_cliente VARCHAR(30) DEFAULT 'particular',
  empresa VARCHAR(120),
  fecha_registro DATE DEFAULT CURRENT_DATE
);

-- 6. FLOTA DE VEHÍCULOS
CREATE TABLE tipos_vehiculo (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  capacidad INT NOT NULL,
  descripcion TEXT
);

CREATE TABLE vehiculos (
  id SERIAL PRIMARY KEY,
  placa VARCHAR(10) UNIQUE NOT NULL,
  tipo_id INT REFERENCES tipos_vehiculo(id),
  marca VARCHAR(60),
  modelo VARCHAR(60),
  anio INT,
  color VARCHAR(40),
  num_interno VARCHAR(20) UNIQUE,
  kilometraje INT DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'activo',
  zona_id INT REFERENCES zonas(id),
  fecha_matricula DATE,
  soat_vence DATE,
  tecno_vence DATE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RUTAS
CREATE TABLE rutas (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  ciudad_id INT REFERENCES ciudades(id),
  origen VARCHAR(120) NOT NULL,
  destino VARCHAR(120) NOT NULL,
  distancia_km NUMERIC(8,2),
  duracion_min INT,
  activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE paradas (
  id SERIAL PRIMARY KEY,
  ruta_id INT REFERENCES rutas(id),
  nombre VARCHAR(120) NOT NULL,
  orden INT NOT NULL,
  latitud NUMERIC(10,7),
  longitud NUMERIC(10,7),
  tiempo_desde_origen_min INT
);

-- 8. HORARIOS Y DESPACHOS
CREATE TABLE horarios (
  id SERIAL PRIMARY KEY,
  ruta_id INT REFERENCES rutas(id),
  hora_salida TIME NOT NULL,
  dias_operacion VARCHAR(20) NOT NULL,
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE despachos (
  id SERIAL PRIMARY KEY,
  horario_id INT REFERENCES horarios(id),
  vehiculo_id INT REFERENCES vehiculos(id),
  conductor_id INT REFERENCES conductores(id),
  fecha DATE NOT NULL,
  hora_real_salida TIME,
  hora_real_llegada TIME,
  estado VARCHAR(20) DEFAULT 'programado',
  observaciones TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RESERVAS Y TIQUETES
CREATE TABLE reservas (
  id SERIAL PRIMARY KEY,
  despacho_id INT REFERENCES despachos(id),
  cliente_id INT REFERENCES clientes(id),
  parada_origen_id INT REFERENCES paradas(id),
  parada_destino_id INT REFERENCES paradas(id),
  num_pasajeros INT DEFAULT 1,
  estado VARCHAR(20) DEFAULT 'confirmada',
  canal_venta VARCHAR(30),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tiquetes (
  id SERIAL PRIMARY KEY,
  reserva_id INT REFERENCES reservas(id),
  codigo VARCHAR(30) UNIQUE NOT NULL,
  asiento VARCHAR(5),
  precio NUMERIC(10,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'activo',
  emitido_en TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PAGOS
CREATE TABLE pagos (
  id SERIAL PRIMARY KEY,
  tiquete_id INT REFERENCES tiquetes(id),
  monto NUMERIC(10,2) NOT NULL,
  metodo VARCHAR(30),
  referencia VARCHAR(80),
  estado VARCHAR(20) DEFAULT 'aprobado',
  pagado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MANTENIMIENTO
CREATE TABLE tipos_mantenimiento (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL
);

CREATE TABLE mantenimientos (
  id SERIAL PRIMARY KEY,
  vehiculo_id INT REFERENCES vehiculos(id),
  tipo_id INT REFERENCES tipos_mantenimiento(id),
  descripcion TEXT,
  costo NUMERIC(12,2),
  fecha_entrada DATE NOT NULL,
  fecha_salida DATE,
  taller VARCHAR(120),
  km_en_entrada INT,
  estado VARCHAR(20) DEFAULT 'en_proceso'
);

-- 12. INCIDENTES
CREATE TABLE incidentes (
  id SERIAL PRIMARY KEY,
  despacho_id INT REFERENCES despachos(id),
  conductor_id INT REFERENCES conductores(id),
  vehiculo_id INT REFERENCES vehiculos(id),
  tipo VARCHAR(40),
  descripcion TEXT,
  gravedad VARCHAR(20),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  resuelto BOOLEAN DEFAULT FALSE
);

-- 13. NOVEDADES DE CONDUCTOR
CREATE TABLE novedades_conductor (
  id SERIAL PRIMARY KEY,
  conductor_id INT REFERENCES conductores(id),
  tipo VARCHAR(40),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  descripcion TEXT,
  registrado_por INT REFERENCES trabajadores(id)
);
`;

// Table metadata for query execution
export const TABLE_COLUMNS: Record<string, string[]> = {
  personas: ['id', 'tipo_doc', 'num_doc', 'nombres', 'apellidos', 'telefono', 'email', 'fecha_nac', 'ciudad_id', 'direccion', 'activo', 'creado_en'],
  ciudades: ['id', 'nombre', 'departamento', 'pais'],
  zonas: ['id', 'ciudad_id', 'nombre', 'descripcion'],
  cargos: ['id', 'nombre', 'descripcion'],
  trabajadores: ['id', 'persona_id', 'cargo_id', 'fecha_ingreso', 'salario_base', 'tipo_contrato', 'activo'],
  licencias_conduccion: ['id', 'conductor_id', 'categoria', 'numero', 'fecha_expedicion', 'fecha_vencimiento', 'entidad_expide'],
  conductores: ['id', 'trabajador_id', 'licencia_id', 'experiencia_anios', 'estado'],
  clientes: ['id', 'persona_id', 'tipo_cliente', 'empresa', 'fecha_registro'],
  tipos_vehiculo: ['id', 'nombre', 'capacidad', 'descripcion'],
  vehiculos: ['id', 'placa', 'tipo_id', 'marca', 'modelo', 'anio', 'color', 'num_interno', 'kilometraje', 'estado', 'zona_id', 'fecha_matricula', 'soat_vence', 'tecno_vence', 'creado_en'],
  rutas: ['id', 'codigo', 'nombre', 'ciudad_id', 'origen', 'destino', 'distancia_km', 'duracion_min', 'activa'],
  paradas: ['id', 'ruta_id', 'nombre', 'orden', 'latitud', 'longitud', 'tiempo_desde_origen_min'],
  horarios: ['id', 'ruta_id', 'hora_salida', 'dias_operacion', 'activo'],
  despachos: ['id', 'horario_id', 'vehiculo_id', 'conductor_id', 'fecha', 'hora_real_salida', 'hora_real_llegada', 'estado', 'observaciones', 'creado_en'],
  reservas: ['id', 'despacho_id', 'cliente_id', 'parada_origen_id', 'parada_destino_id', 'num_pasajeros', 'estado', 'canal_venta', 'creado_en'],
  tiquetes: ['id', 'reserva_id', 'codigo', 'asiento', 'precio', 'estado', 'emitido_en'],
  pagos: ['id', 'tiquete_id', 'monto', 'metodo', 'referencia', 'estado', 'pagado_en'],
  tipos_mantenimiento: ['id', 'nombre'],
  mantenimientos: ['id', 'vehiculo_id', 'tipo_id', 'descripcion', 'costo', 'fecha_entrada', 'fecha_salida', 'taller', 'km_en_entrada', 'estado'],
  incidentes: ['id', 'despacho_id', 'conductor_id', 'vehiculo_id', 'tipo', 'descripcion', 'gravedad', 'fecha', 'resuelto'],
  novedades_conductor: ['id', 'conductor_id', 'tipo', 'fecha_inicio', 'fecha_fin', 'descripcion', 'registrado_por'],
};

/**
 * Execute a simple SELECT query by parsing SQL and using Supabase client
 * Supports basic SELECT * FROM table and SELECT columns FROM table queries
 */
export function parseSQLQuery(sql: string): { table: string; columns: string[] } | null {
  // Extract table name from SELECT query
  const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)/i);
  if (!selectMatch) return null;

  const columnsStr = selectMatch[1].trim();
  const tableName = selectMatch[2].toLowerCase();

  let columns: string[] = [];
  if (columnsStr === '*') {
    columns = TABLE_COLUMNS[tableName] || [];
  } else {
    columns = columnsStr
      .split(',')
      .map(col => col.trim())
      .filter(col => col.length > 0);
  }

  return { table: tableName, columns };
}
