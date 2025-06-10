import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export async function getDatabaseSchema() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123abc',
    database: process.env.DB_NAME || 'tools'
  });

  try {
    // Obtener tablas con al menos un registro
    const [nonEmptyTables] = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'tools'
      AND table_rows > 0;
    `);

    if (nonEmptyTables.length === 0) return '';

    const tableNames = nonEmptyTables.map(t => `'${t.table_name}'`).join(',');

    // Obtener columnas solo de esas tablas
    const [columns] = await db.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'tools'
      AND table_name IN (${tableNames})
      ORDER BY table_name, ordinal_position;
    `);

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
