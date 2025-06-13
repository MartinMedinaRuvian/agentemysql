import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Validar que todas las variables necesarias estén definidas
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`La variable de entorno ${varName} no está definida`);
  }
}

export async function getDatabaseSchema() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Consultar tablas con al menos un registro
    const [nonEmptyTables] = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ?
      AND table_rows > 0;
    `, [process.env.DB_NAME]);

    if (nonEmptyTables.length === 0) return '';

    const tableNames = nonEmptyTables.map(t => `'${t.table_name}'`).join(',');

    // Consultar columnas solo de esas tablas
    const [columns] = await db.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = ?
      AND table_name IN (${tableNames})
      ORDER BY table_name, ordinal_position;
    `, [process.env.DB_NAME]);

    const schema = {};
    for (const { table_name, column_name } of columns) {
      if (!schema[table_name]) schema[table_name] = [];
      schema[table_name].push(column_name);
    }

    return Object.entries(schema)
      .map(([table, cols]) => `${table}(${cols.join(', ')})`)
      .join('\n');
  } finally {
    await db.end();
  }
}
