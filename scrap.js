// scrap.js - Versión mejorada para extraer TODOS los elementos
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

// Importamos la función para resolver captchas
const { solveCaptcha } = require('./captchaSolver');


// Función de delay con variación para parecer más humano
function sleep(ms) {
  const jitter = Math.floor(Math.random() * 100);
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

// Función para añadir agentes de usuario aleatorios
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.2045.60',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/102.0.0.0'
  ];

  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Auto-scroll exhaustivo para cargar todos los elementos
async function exhaustiveScroll(page) {
  console.log('Iniciando scroll exhaustivo para cargar todos los elementos...');

  try {
    // Primer enfoque: scroll simple hasta el final
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        let iterations = 0;
        const maxIterations = 50; // Límite de seguridad

        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          iterations++;

          // Verificar si llegamos al final o alcanzamos el límite
          if (window.innerHeight + window.scrollY >= document.body.scrollHeight || iterations >= maxIterations) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    // Esperar a que se carguen elementos adicionales
    await sleep(2000);

    console.log('Realizando un segundo scroll para cargar elementos rezagados...');

    // Segundo enfoque: scroll más lento para asegurar que se carguen todos los elementos
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        // Primero, volver al principio
        window.scrollTo(0, 0);

        setTimeout(async () => {
          const height = document.body.scrollHeight;
          const scrollStep = Math.floor(height / 20); // Dividir la altura en 20 pasos

          // Scroll paso a paso con pausa entre cada paso
          for (let i = 0; i < 20; i++) {
            window.scrollBy(0, scrollStep);
            await new Promise(r => setTimeout(r, 400)); // Esperar 400ms entre scrolls
          }

          // Scroll final al fondo
          window.scrollTo(0, height);
          setTimeout(resolve, 1000);
        }, 500);
      });
    });

    // Esperar para asegurar que la carga de AJAX termine
    await sleep(2000);

    // Tercer enfoque: click en "mostrar más" o botones de paginación si existen
    try {
      const loadMoreSelectors = [
        'button[class*="more"]',
        'a[class*="more"]',
        '[class*="load-more"]',
        '[class*="show-more"]',
        'button[class*="siguiente"]',
        'a[class*="siguiente"]',
        '.pagination a[class*="next"]',
        'button[class*="next"]'
      ];

      for (const selector of loadMoreSelectors) {
        const hasMoreButton = await page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel);
          return elements.length > 0;
        }, selector);

        if (hasMoreButton) {
          console.log(`Encontrado botón "mostrar más" o paginación: ${selector}`);

          // Contar cuántos elementos tenemos antes de hacer clic
          const countBefore = await page.evaluate((articleSelector) => {
            return document.querySelectorAll(articleSelector).length;
          }, 'article, [class*="AdCard"], [class*="result-item"]');

          console.log(`Elementos antes de hacer clic: ${countBefore}`);

          // Hacer clic en el botón
          await page.click(selector);
          await sleep(3000); // Esperar a que carguen más elementos

          // Contar cuántos elementos tenemos después de hacer clic
          const countAfter = await page.evaluate((articleSelector) => {
            return document.querySelectorAll(articleSelector).length;
          }, 'article, [class*="AdCard"], [class*="result-item"]');

          console.log(`Elementos después de hacer clic: ${countAfter}`);

          // Si cargaron más elementos, seguir haciendo clic hasta que no aumenten
          if (countAfter > countBefore) {
            let previousCount = countAfter;
            let attempts = 0;

            while (attempts < 5) { // Máximo 5 intentos
              const stillHasButton = await page.evaluate((sel) => {
                const btn = document.querySelector(sel);
                return btn && (btn.offsetParent !== null); // Verificar que es visible
              }, selector);

              if (!stillHasButton) break;

              console.log('Haciendo clic para cargar más elementos...');
              await page.click(selector).catch(() => { }); // Ignorar errores de clic
              await sleep(3000);

              // Contar nuevamente
              const newCount = await page.evaluate((articleSelector) => {
                return document.querySelectorAll(articleSelector).length;
              }, 'article, [class*="AdCard"], [class*="result-item"]');

              console.log(`Elementos después del clic adicional: ${newCount}`);

              // Si no aumentaron, salir del bucle
              if (newCount <= previousCount) {
                attempts++;
              } else {
                previousCount = newCount;
                attempts = 0;
              }
            }
          }
          break; // Si encontramos un botón funcional, salir del bucle
        }
      }
    } catch (e) {
      console.log('Error al intentar cargar más elementos:', e.message);
    }

    console.log('Scroll exhaustivo completado.');
    return true;
  } catch (error) {
    console.error('Error en exhaustiveScroll:', error.message);
    return false;
  }
}

// Verificar cuántos elementos hay visibles en la página
async function countVisibleElements(page) {
  try {
    const selectors = [
      'article.ma-AdCardV2',
      'article[class*="AdCard"]',
      'article',
      '.ma-AdCardV2',
      '[class*="AdCard"]',
      '[class*="listing-item"]',
      '[class*="result-item"]'
    ];

    let totalElements = 0;

    for (const selector of selectors) {
      const count = await page.evaluate((sel) => {
        return document.querySelectorAll(sel).length;
      }, selector);

      console.log(`Selector "${selector}": ${count} elementos`);
      totalElements = Math.max(totalElements, count);
    }

    console.log(`Total de elementos detectados: ${totalElements}`);
    return totalElements;
  } catch (error) {
    console.error('Error al contar elementos:', error.message);
    return 0;
  }
}

// Construir URL de búsqueda
function buildUrl(params = {}) {
  const baseUrl = 'https://www.milanuncios.com/motor/';
  const url = new URL(baseUrl);
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });
  return url.toString();
}

// Función para manejar cookies y consentimiento
async function handleCookiesConsent(page) {
  try {
    console.log('Buscando y manejando diálogos de cookies...');

    // Esperar por diferentes tipos de botones de aceptar cookies
    const cookieSelectors = [
      'button[id*="accept"]',
      'button[id*="cookie"]',
      'button[id*="consent"]',
      'button[class*="cookie"]',
      'button[class*="consent"]',
      'a[id*="accept"]',
      '.cookie-consent-accept',
      '.accept-cookies',
      '[data-testid="cookie-policy-dialog-accept-button"]'
    ];

    // Intentar cada selector
    for (const selector of cookieSelectors) {
      try {
        const cookieButton = await page.$(selector);
        if (cookieButton) {
          console.log(`Encontrado botón de cookies: ${selector}`);

          // Hacer clic con cierto retraso
          await cookieButton.click({ delay: 100 });
          console.log('Cookies aceptadas.');

          await sleep(1000);
          return true;
        }
      } catch (e) {
        console.log(`Error al intentar con selector ${selector}: ${e.message}`);
      }
    }

    // Intento alternativo: buscar por texto
    try {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.innerText.toLowerCase(), button);
        if (text.includes('accept') || text.includes('acepto') || text.includes('aceptar')) {
          console.log(`Encontrado botón por texto: "${text}"`);
          await button.click({ delay: 100 });
          console.log('Cookies aceptadas por texto.');
          await sleep(1000);
          return true;
        }
      }
    } catch (e) {
      console.log(`Error buscando por texto: ${e.message}`);
    }

    console.log('No se encontraron diálogos de cookies o ya estaban aceptadas.');
    return false;
  } catch (error) {
    console.log('Error al manejar cookies, continuando:', error.message);
    return false;
  }
}

// Función para extraer datos con múltiples selectores exhaustivos
async function extractData(page) {
  try {

    // Extraer datos con el selector identificado
    const scrapedData = await page.evaluate(() => {
      const data = [];
      const articles = document.querySelectorAll('article.ma-AdCardV2');
      const productUrl = 'https://www.milanuncios.com';
      articles.forEach(article => {
        // Título
        const titleEl = article.querySelector('h2.ma-AdCardV2-title');
        const title = titleEl ? titleEl.innerText.trim() : 'Título no encontrado';

        // Precio
        const priceEl = article.querySelector('.ma-AdPrice-value');
        const price = priceEl ? priceEl.innerText.trim() : 'Precio no encontrado';

        // Ubicación
        const locationEl = article.querySelector('.ma-AdLocation-text');
        const location = locationEl ? locationEl.innerText.trim() : 'Ubicación no encontrada';

        // Descripción
        const descriptionEl = article.querySelector('.ma-AdCardV2-description');
        const description = descriptionEl ? descriptionEl.innerText.trim() : 'Descripción no encontrada';

        // Imagen
        const imageEl = article.querySelector('a.ma-AdCardV2-link .ma-AdCardV2-photoContainer picture img');
        const imageUrl = imageEl ? imageEl.getAttribute('src') : 'Imagen no encontrada';

        // Enlace del producto
        const linkEl = article.querySelector('.ma-AdCardV2-row.ma-AdCardV2-row--small.ma-AdCardV2-row--wrap a');
        const productLink = linkEl ? productUrl + linkEl.getAttribute('href') : 'Link no encontrado';

        // Extraer los detalles (kilómetros, año, combustible)
        // Seleccionamos todos los .ma-AdTag-label dentro de la lista .ma-AdTagList
        const detailEls = article.querySelectorAll('.ma-AdTagList .ma-AdTag-label');
        const detailTexts = Array.from(detailEls).map(el => el.innerText.trim());
        // detailTexts podría verse como ["181.300 kms", "2019", "otro"]

        // Asignamos cada parte a una variable; si no existe, usamos 'Desconocido'
        const kilometers = detailTexts[0] || 'Desconocido';
        const year = detailTexts[1] || 'Desconocido';
        const fuel = detailTexts[2] || 'Desconocido';

        // Generamos un ID único para evitar duplicados
        const id = title + price;

        // Armamos el objeto final con la información extraída
        data.push({
          id,
          title,
          price,
          location,
          description,
          imageUrl,
          productLink,
          details: {
            kilometers,
            year,
            fuel
          }
        });
      });

      return data;
    });

    return scrapedData;
  } catch (error) {
    console.error('Error en extractData:', error.message);
    return { error: error.message };
  }
}

// Función principal de scraping mejorada con extracción exhaustiva y manejo de captchas
async function scrapeMilanuncios(searchParams = {}) {
  const urlToScrape = buildUrl(searchParams);
  console.log(`Scraping URL: ${urlToScrape}`);

  console.log('Esperando 5 segundos para que el entorno gráfico se estabilice...');
  await sleep(5000);

  let browser = null;
  let maxRetries = 3; // Aumentamos el número de reintentos

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`\n=== Intento ${attempt} de ${maxRetries} ===\n`);
        await sleep(5000);
      }

      // Configuración básica para el navegador
      const browserWSEndpoint = process.env.BROWSERLESS_URL || 'ws://chrome:3000';
      console.log(`Conectando a Browserless en: ${browserWSEndpoint}`);

      // Conectar a la instancia de Browserless en lugar de iniciar Chrome localmente
      browser = await puppeteer.connect({
        browserWSEndpoint,
        defaultViewport: {
          width: 1920,
          height: 1080
        },
        // Nombre de sesión para identificar fácilmente en la interfaz de depuración
        args: [`--window-name="MilAnuncios-Scraper-${Date.now()}"`]
      });

      console.log('Creando nueva página...');
      const page = await browser.newPage();

      // Configurar timeouts altos para evitar problemas
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(30000);

      // Configurar user agent aleatorio
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      console.log(`Usando User-Agent: ${userAgent}`);
      await page.setUserAgent(userAgent);

      // Configurar cabeceras HTTP adicionales para parecer más humano
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });

      // Navegar a la URL
      console.log('Navegando a la URL...');
      await page.goto(urlToScrape, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      console.log('Página cargada correctamente.');

      // Manejar cookies
      await handleCookiesConsent(page);

      // Esperar un tiempo antes de continuar
      await sleep(2000);

      // Verificar si hay captcha
      console.log('Comprobando si hay captcha o verificación de seguridad...');


      // Comprobar si hay elementos visibles que indican resultados
      const initialResults = await page.evaluate(() => {
        return document.querySelectorAll('article, .ma-AdCardV2, [class*="result"], [class*="listing"]').length;
      }).catch(() => 0);

      console.log(`Elementos de resultados visibles inicialmente: ${initialResults}`);

      // Si no hay resultados visibles, puede ser un captcha o bloqueo
      if (initialResults < 3) {
        console.log('Pocos o ningún resultado visible, verificando captcha...');

        // Intentar resolver el captcha
        const captchaResolved = await solveCaptcha(page);

        if (captchaResolved) {
          console.log('¡Captcha resuelto exitosamente!');

          // Esperar para que la página se actualice después de resolver el captcha
          await sleep(3000);
        } else {
          console.log('No se detectó captcha específico o no se pudo resolver. Intentando estrategias alternativas...');

          // Estrategia 1: Buscar y hacer clic en cualquier botón que parezca de verificación
          const buttons = await page.$$('button, [role="button"], [class*="button"], [class*="btn"]');
          if (buttons.length > 0) {
            console.log(`Encontrados ${buttons.length} posibles botones de verificación`);

            // Intenta hacer clic en botones que parecen de verificación
            for (const button of buttons.slice(0, 3)) { // limitar a los primeros 3
              try {
                const buttonText = await page.evaluate(el => el.innerText.toLowerCase(), button)
                  .catch(() => '');

                if (buttonText.includes('click') || buttonText.includes('continue') ||
                  buttonText.includes('start') || buttonText.includes('verify') ||
                  buttonText.includes('haz clic') || buttonText.includes('continuar') ||
                  buttonText.includes('comenzar') || buttonText.includes('verificar')) {

                  console.log(`Haciendo clic en botón con texto: ${buttonText}`);
                  await button.click();
                  await sleep(2000);
                  break;
                }
              } catch (e) {
                console.log('Error al procesar botón:', e.message);
              }
            }
          }

          // Estrategia 2: Si después de los clics aún no hay resultados, recargar la página
          const resultsAfterClicks = await page.evaluate(() => {
            return document.querySelectorAll('article, .ma-AdCardV2').length;
          }).catch(() => 0);

          if (resultsAfterClicks < 3) {
            console.log('Aún sin resultados suficientes. Recargando la página...');
            await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
            await sleep(3000);

            // Manejar cookies nuevamente después de recargar
            await handleCookiesConsent(page);
          }
        }
      }

      // Contar elementos antes del scroll
      console.log('Contando elementos antes del scroll:');
      const initialCount = await countVisibleElements(page);

      // Si todavía no hay elementos después de todo, intentar una última estrategia
      if (initialCount < 3) {
        console.log('Pocos resultados detectados. Intentando una última estrategia de recuperación...');

        // Tomar captura del estado actual


        // Cerrar el navegador y lanzar un nuevo intento
        if (browser) {
          await page.close();
          await browser.disconnect();
          browser = null;
        }

        // Si no es el último intento, continuar con el siguiente
        if (attempt < maxRetries) {
          console.log('Reiniciando el navegador para un nuevo intento limpio...');
          continue;
        } else {
          throw new Error('No se pudieron obtener resultados después de múltiples intentos');
        }
      }

      // Realizar auto-scroll para cargar todos los elementos
      await exhaustiveScroll(page);

      // Contar elementos después del scroll
      console.log('Contando elementos después del scroll:');
      const finalCount = await countVisibleElements(page);
      console.log(`Incremento de elementos: ${finalCount - initialCount} (${initialCount} -> ${finalCount})`);

      // Esperar un poco después del auto-scroll
      await sleep(3000);

      // Extraer los datos
      const scrapedData = await extractData(page);

      // Verificar si hubo error en la extracción
      if (scrapedData && scrapedData.error) {
        console.log(`Error en la extracción: ${scrapedData.error}`);

        // Si estamos en el último intento, devolver lo que tengamos
        if (attempt === maxRetries) {
          console.log('Se alcanzó el número máximo de intentos.');
          await page.close();
          await browser.disconnect();
          browser = null;
          return {
            error: scrapedData.error,
            message: 'No se pudieron extraer datos después de múltiples intentos',
            partial: true
          };
        }

        // Si no es el último intento, cerrar y reintentar
        console.log('Preparando para reintentar...');
        await browser.close();
        browser = null;
        continue;
      }

      // Verificar si obtuvimos datos vacíos, lo que indicaría un problema
      if (Array.isArray(scrapedData) && scrapedData.length === 0 && finalCount > 3) {
        console.log('Se detectaron elementos en la página pero no se pudo extraer ningún dato. Posible cambio en la estructura del DOM.');


        if (attempt < maxRetries) {
          console.log('Intentando de nuevo con otra estrategia...');
          await browser.close();
          browser = null;
          continue;
        }
      }

      // Si llegamos aquí, la extracción fue exitosa
      console.log(`Extracción completada. Se extrajeron ${Array.isArray(scrapedData) ? scrapedData.length : 0} artículos.`);

      // Cerrar navegador y devolver datos
      await browser.close();
      browser = null;
      return Array.isArray(scrapedData) ? scrapedData : [];

    } catch (error) {
      console.error(`Error en scraping (intento ${attempt + 1}/${maxRetries + 1}):`, error.message);

      // Cerrar el navegador si sigue abierto
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error al cerrar el navegador:', closeError.message);
        }
        browser = null;
      }

      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        throw new Error(`Error después de ${maxRetries + 1} intentos: ${error.message}`);
      }

      // Esperar antes de reintentar
      const retryDelay = (attempt + 1) * 8000;
      console.log(`Esperando ${retryDelay / 1000} segundos antes de reintentar...`);
      await sleep(retryDelay);
    }
  }
}

module.exports = scrapeMilanuncios;