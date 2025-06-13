import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

class MySQLMCPServer {
  constructor() {
    this.server = new Server({ name: 'query_db', version: '1.0.0' }, { capabilities: { tools: {} } });
    this.pool = null;
    this.setupHandlers();
    this.initializeDatabase();
  }

  async initializeDatabase() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123abc',
      database: process.env.DB_NAME || 'tools',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    const conn = await this.pool.getConnection();
    console.log('✅ MySQL conectado correctamente - MPC');
    conn.release();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'execute_custom_query',
          description: 'Execute a custom SELECT query (read-only)',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'SQL SELECT query' },
              params: {
                type: 'array',
                description: 'Params for prepared statement',
                items: { type: ['string', 'number', 'boolean', 'null'] },
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        if (name === 'execute_custom_query') {
          return await this.executeCustomQuery(args);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error executing ${name}: ${err.message}` }],
          isError: true,
        };
      }
    });
  }


fixCollationConflicts(query, collation = 'utf8_spanish_ci') {
  let fixed = query;

  // Comparaciones de igualdad entre columnas
  fixed = fixed.replace(
    /([a-z_]+\.[a-z_]+)\s*=\s*([a-z_]+\.[a-z_]+)/gi,
    (_, left, right) =>
      `CONVERT(${left} USING utf8) COLLATE ${collation} = CONVERT(${right} USING utf8) COLLATE ${collation}`
  );

  // Comparaciones LIKE con strings
  fixed = fixed.replace(
    /([a-z_]+\.[a-z_]+)\s+LIKE\s+('[^']*')/gi,
    (_, column, value) =>
      `CONVERT(${column} USING utf8) COLLATE ${collation} LIKE ${value}`
  );

  // Comparaciones IN (...)
  fixed = fixed.replace(
    /([a-z_]+\.[a-z_]+)\s+IN\s+\(([^)]+)\)/gi,
    (_, column, values) =>
      `CONVERT(${column} USING utf8) COLLATE ${collation} IN (${values})`
  );

  return fixed;
}

async executeCustomQuery({ query, params = [] }) {
  const defaultCollation = 'utf8_spanish_ci';

  const trimmed = query.trim().toLowerCase();
  let querySearch = trimmed;

  if (trimmed.includes(':')) {
    querySearch = trimmed.split(':')[1].trim();
  }

  const blocked = ['drop', 'delete', 'update', 'insert', 'alter', 'create', 'truncate'];
  if (!querySearch.startsWith('select')) {
    throw new Error('Only SELECT queries are allowed');
  }
  if (blocked.some(k => querySearch.includes(k))) {
    throw new Error('Query contains dangerous keywords');
  }

  try {
    const [rows] = await this.pool.execute(querySearch, params);
    return {
      content: [{ type: 'json', json: rows }],
    };
  } catch (err) {
    if (
      err.message.includes('Illegal mix of collations') &&
      !querySearch.includes('COLLATE')
    ) {
      const fixedQuery = this.fixCollationConflicts(querySearch, defaultCollation);

      try {
        const [fixedRows] = await this.pool.execute(fixedQuery, params);
        return {
          content: [{ type: 'json', json: fixedRows }],
        };
      } catch (e2) {
        throw new Error(
          `Original error: ${err.message}\nWhile retrying: ${e2.message}\nFixed Query: ${fixedQuery}`
        );
      }
    } else {
      throw err;
    }
  }
}




  formatResults(rows) {
    if (!rows.length) return 'No results.';

    const headers = Object.keys(rows[0]);

    // Si solo hay una fila y una columna, retorna el valor directo
    if (rows.length === 1 && headers.length === 1) {
      const val = rows[0][headers[0]];
      return val === null
        ? 'NULL'
        : val instanceof Date
          ? val.toISOString().split('T')[0]
          : String(val);
    }

    // Caso general: tabla formateada
    const table = [
      headers.join(' | '),
      headers.map(() => '---').join(' | '),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h];
          return val === null ? 'NULL' : val instanceof Date ? val.toISOString().split('T')[0] : String(val);
        }).join(' | ')
      ),
    ];
    return table.join('\n');
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🟢 MCP Server listening on stdio');
  }

  async close() {
    if (this.pool) await this.pool.end();
  }
}

// Exporta instancia y función para usar desde otros archivos
const mcpInstance = new MySQLMCPServer();
export default mcpInstance;

// Si quieres usarlo standalone por consola
if (process.argv.includes('--stdio')) {
  mcpInstance.start();
}
