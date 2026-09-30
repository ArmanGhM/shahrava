import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Serve static assets from project root
app.use(express.static(__dirname));

// Route handlers for directories with index.html
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about', 'index.html'));
});

app.get('/cities', (req, res) => {
  res.sendFile(path.join(__dirname, 'cities', 'index.html'));
});

app.get('/attractions', (req, res) => {
  res.sendFile(path.join(__dirname, 'attractions', 'index.html'));
});

app.get('/explore', (req, res) => {
  res.sendFile(path.join(__dirname, 'explore', 'index.html'));
});

// Fallback to root index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Shahrava server listening on http://${HOST}:${PORT}`);
});
