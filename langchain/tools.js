import { DynamicTool } from "langchain/tools";
import axios from "axios";

export const queryDbTool = new DynamicTool({
  name: "execute_custom_query",
  description: "Ejecuta una consulta SQL SELECT sobre MySQL. Solo acepta consultas SELECT.",
  func: async (input) => {
    let query = input;

    

    // Si el modelo lo devuelve con comillas dobles, las quitamos
    if (query.startsWith('"') && query.endsWith('"')) {
      try {
        query = JSON.parse(query); // elimina comillas extras si están
      } catch {
        // Si no es JSON válido, mantenemos el string original
      }
    }

    try {
      console.log(query, 'queri martin')
      const response = await axios.post("http://localhost:3000/query", {
        query,
      });
      console.log(response.data, 'response martin')

      return JSON.stringify(response.data.result); // por si el resultado es objeto
    } catch (error) {
      console.log(error)
      return `Error ejecutando la consulta: ${error.message}`;
    }
  },
});
