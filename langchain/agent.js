import readline from "readline";
import { ChatOllama } from "@langchain/ollama";
import { queryDbTool } from "./tools.js";
import { getDatabaseSchema } from "./getSchema.js";

const schema = await getDatabaseSchema();
console.log(schema);

// Función para pedir la pregunta desde la consola si no viene como argumento
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

async function main() {
  console.time("⏳ Tiempo total");

  // Captura el argumento desde la consola o solicita input
  let preguntaIngresada = process.argv.slice(2).join(" ");
  if (!preguntaIngresada) {
    preguntaIngresada = await askQuestion("❓ Ingresa tu pregunta: ");
  }

  const llm = new ChatOllama({
    model: "gemma3:12b",
    baseUrl: "http://localhost:11434",
    temperature: 0.0,
  });

  const prompt = `
Convierte la pregunta en una consulta MySQL.
Sin explicar. Usa el esquema:
${schema}
Pregunta:
${preguntaIngresada}
`.trim();

  console.time("🧠 Tiempo generación SQL");
  const response = await llm.invoke(prompt);
  console.timeEnd("🧠 Tiempo generación SQL");

  const rawContent = response.content.trim();
  console.log(response, "respuesta agent martin");

  const match = rawContent.match(/SELECT[\s\S]+?;/i);
  const sql = match ? match[0].trim() : "NO_QUERY";

  if (sql === "NO_QUERY") {
    console.log("❌ No se pudo generar una consulta válida.");
    console.timeEnd("⏳ Tiempo total");
    return;
  }

  console.log("📝 Consulta generada:\n", sql);

  console.time("⏱️ Tiempo ejecución SQL");
  const result = await queryDbTool.invoke({ input: sql });
  console.timeEnd("⏱️ Tiempo ejecución SQL");

  console.log("✅ Resultado de la consulta:", result);
  console.timeEnd("⏳ Tiempo total");
}

main().catch(console.error);
