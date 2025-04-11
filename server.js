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

app.get('/scrape2', async (req, res) => {
  try {
    // Obtener parámetros de búsqueda
    const searchParams = req.query;
    console.log('Parámetros recibidos en scrape2:', searchParams);

    // Construir la URL objetivo
    const targetUrl = buildUrl(searchParams);
    console.log(`URL objetivo: ${targetUrl}`);

    // Token para Browserless
    const browserlessToken = process.env.BROWSERLESS_TOKEN || 'S0G1V9NnysIfNo6b4594f2f03360c5cb9faececf54';

    // URL del endpoint de scrape de Browserless
    const browserlessUrl = `http://chrome:3000/scrape?token=${browserlessToken}`;

    // Código de la función que realizará el scroll y aceptará cookies
    const functionCode = `
      async () => {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 100));
        
        // Aceptar cookies si están presentes
        try {
          const cookieButtons = document.querySelectorAll('button[id*="accept"], button[class*="cookie"], [class*="consent"]');
          for (const btn of cookieButtons) {
            if (btn.offsetParent !== null) {
              console.log("Aceptando cookies...");
              btn.click();
              await sleep(1000);
              break;
            }
          }
        } catch(e) {}
        
        // Scroll para cargar elementos
        for (let i = 0; i < 10; i++) {
          window.scrollBy(0, window.innerHeight);
          await sleep(300);
        }
        
        // Volver arriba y hacer scroll de nuevo
        window.scrollTo(0, 0);
        await sleep(1000);
        
        const totalHeight = document.body.scrollHeight;
        for (let i = 0; i < 15; i++) {
          window.scrollBy(0, totalHeight / 15);
          await sleep(400);
        }
        
        return document.querySelectorAll('article.ma-AdCardV2').length;
      }
    `.trim();

    // Configuración para la API de scrape
    const requestData = {
      url: targetUrl,
      gotoOptions: {
        waitUntil: 'networkidle2',
        timeout: 60000
      },
      // Utilizar waitForFunction según la documentación
      // waitForFunction: {
      //   fn: functionCode,
      //   timeout: 30000
      // },
      // Esperar a que aparezca el selector principal
      // waitForSelector: {
      //   selector: 'article.ma-AdCardV2',
      //   timeout: 30000
      // },
      // Definir los elementos a extraer (formato corregido)
      elements: [
        { selector: 'article.ma-AdCardV2 h2.ma-AdCardV2-title' },
        { selector: 'article.ma-AdCardV2 .ma-AdPrice-value' },
        { selector: 'article.ma-AdCardV2 .ma-AdLocation-text' },
        { selector: 'article.ma-AdCardV2 .ma-AdCardV2-description' },
        { selector: 'article.ma-AdCardV2 .ma-AdCardV2-photoContainer picture img' },
        { selector: 'article.ma-AdCardV2 .ma-AdCardV2-row.ma-AdCardV2-row--small.ma-AdCardV2-row--wrap a' },
        { selector: 'article.ma-AdCardV2 .ma-AdTagList .ma-AdTag-label' }
      ],
      cookies: [
        {
          name: 'visited_before',
          value: 'true',
          domain: '.milanuncios.com',
          path: '/'
        }
      ],
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    };

    console.log('Enviando solicitud a API de scrape de Browserless...');
    console.log("Datos de la solicitud:", JSON.stringify(requestData));
    // Llamar a la API de Browserless
    const response = await axios.post(browserlessUrl, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutos de timeout
    });

    // Procesar la respuesta con la estructura correcta
    console.log("Respuesta recibida de browserless:", JSON.stringify(response.data, null, 2).substring(0, 300) + "...");

    // Extraer los datos
    const scrapedData = [];

    if (response.data) {
      // Agrupar resultados por artículo
      const articles = new Map();

      // Recorrer todos los elementos extraídos
      response.data.forEach(item => {
        const selectors = item.selector.split(' ');
        const articleSelector = selectors[0]; // Obtener el selector del artículo

        if (articleSelector === 'article.ma-AdCardV2') {
          // Para cada artículo, creamos un objeto si no existe
          if (!articles.has(item.as)) {
            articles.set(item.as, {});
          }

          // Agregar la propiedad al objeto del artículo
          if (item.as === 'details') {
            // Si es un array, tratarlo de forma especial
            if (Array.isArray(item.results)) {
              articles.get(item.as) = item.results.map(result => result.text || '');
            }
          } else {
            // Para propiedades simples
            if (item.results && item.results.length > 0) {
              articles.get(item.as) = item.results[0].text || item.results[0].attribute || '';
            }
          }
        }
      });

      // Convertir el mapa a un array de objetos
      articles.forEach((properties, index) => {
        scrapedData.push({
          id: `item-${index}`,
          title: properties.title || 'Título no encontrado',
          price: properties.price || 'Precio no encontrado',
          location: properties.location || 'Ubicación no encontrada',
          description: properties.description || 'Descripción no encontrada',
          imageUrl: properties.imageUrl || 'Imagen no encontrada',
          productLink: properties.productPath ? `https://www.milanuncios.com${properties.productPath}` : 'Link no encontrado',
          details: {
            kilometers: properties.details && properties.details[0] ? properties.details[0] : 'Desconocido',
            year: properties.details && properties.details[1] ? properties.details[1] : 'Desconocido',
            fuel: properties.details && properties.details[2] ? properties.details[2] : 'Desconocido'
          }
        });
      });
    }

    console.log(`Processed ${scrapedData.length} items from Browserless scrape API`);

    // Si no hay datos, es posible que haya un captcha
    if (scrapedData.length === 0) {
      console.log('No se encontraron resultados. Posible captcha o estructura DOM cambiada.');

      return res.status(404).json({
        success: false,
        error: 'No se encontraron resultados. Posible captcha o cambio en la estructura de la página',
        method: 'browserless-direct-api'
      });
    }

    // Enviar al webhook de n8n
    const n8nWebhookUrl = 'https://n8n.sitemaster.lat/webhook/leotest';
    await axios.post(n8nWebhookUrl, scrapedData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Datos enviados exitosamente al flujo de n8n');

    // Responder con los datos
    res.json({ success: true, data: scrapedData });

  } catch (error) {
    console.error('Error en scrape2:', error.message);

    // Si hay un error en la respuesta de Browserless, intentar capturar más detalles
    if (error.response) {
      console.error('Error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
      method: 'browserless-direct-api'
    });
  }
});

// Función buildUrl (reutilizada del archivo scrap.js)
function buildUrl(params = {}) {
  const baseUrl = 'https://www.milanuncios.com/motor/';
  const url = new URL(baseUrl);
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });
  return url.toString();
}

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});