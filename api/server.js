import express from 'express';
import bodyParser from 'body-parser';
import mcp from '../mcp/index.js';

const app = express();
app.use(bodyParser.json());

app.post('/query', async (req, res) => {
  const { query, params = [] } = req.body;
  try {
    const result = await mcp.executeCustomQuery({ query, params });
    res.json({ result: result.content[0].json });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 API escuchando en http://localhost:3000');
});
