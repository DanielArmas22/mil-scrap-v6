const express = require('express');
const scrapeMilanuncios = require('./scrap');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para servir archivos estáticos
app.use(express.static('public'));

// Ruta principal que sirve la interfaz de usuario
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/scrape', async (req, res) => {
  try {
    // Extrae los parámetros de búsqueda desde la query string
    const searchParams = req.query;
    console.log('Parámetros recibidos:', searchParams);

    // Llama a la función de scraping con los parámetros recibidos
    const data = await scrapeMilanuncios(searchParams);

    // Envía los datos al webhook de n8n
    const n8nWebhookUrl = 'https://n8n.sitemaster.lat/webhook/leotest'; // Reemplaza con tu URL real
    await axios.post(n8nWebhookUrl, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Datos enviados exitosamente al flujo de n8n');

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en scraping:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});