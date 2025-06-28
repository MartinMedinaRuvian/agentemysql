import express from "express";
import cors from "cors";
import { ChatOllama } from "@langchain/ollama";
import { queryDbTool } from "../langchain/tools.js";
import { getDatabaseSchema } from "../util/getSchema.js";
import { exec } from 'child_process';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const schema = await getDatabaseSchema();

app.get("/api/modelos", (req, res) => {
  exec('ollama list', (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: error.message });
    if (stderr) return res.status(500).json({ error: stderr });
    res.json({ modelos: stdout });
  });
});

app.post("/api/generar-sql", async (req, res) => {
  const { modelo, pregunta } = req.body

  const llm = new ChatOllama({
    model: modelo,
    baseUrl: "http://localhost:11434"
  });

  const prompt = `
Convierte la pregunta en una consulta Mysql (MariaDB)
Sin explicar. Usa como contexto el esquema:
${schema}
Pregunta:
${pregunta}
`.trim();

  try {
    const response = await llm.invoke(prompt);
    const rawContent = response.content.trim();
    const match = rawContent.match(/SELECT[\s\S]+?;/i);
    const sql = match ? match[0].trim() : "NO_QUERY";

    if (sql === "NO_QUERY") {
      return res.json({ sql: null, resultado: null });
    }

    const resultado = await queryDbTool.invoke({ input: sql });
let parsedResultado = resultado;
if (typeof resultado === "string") {
  try {
    parsedResultado = JSON.parse(resultado);
  } catch (e) {
    console.warn("No se pudo parsear el resultado como JSON:", e);
  }
}

res.json({ sql, resultado: parsedResultado });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error procesando la solicitud" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor API Agente escuchando en http://localhost:${PORT}`);
});
