// scrap.js - Versión mejorada para extraer TODOS los elementos
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const proxyManager = require('./proxy-manager');

// Función de delay con variación para parecer más humano
function sleep(ms) {
  // Añadir variabilidad significativa para parecer más humano
  const jitter = Math.floor(Math.random() * (ms * 0.3)); // Hasta 30% de variación
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}
async function humanClick(page, selector) {
  try {
    const element = await page.$(selector);
    if (!element) {
      console.log(`Elemento no encontrado: ${selector}`);
      return false;
    }

    // Obtener posición y dimensiones del elemento
    const box = await element.boundingBox();
    if (!box) {
      console.log(`No se pudo obtener el boundingBox para: ${selector}`);
      return false;
    }

    // Calcular un punto aleatorio dentro del elemento
    const x = box.x + (box.width * 0.3 + Math.random() * box.width * 0.4);
    const y = box.y + (box.height * 0.3 + Math.random() * box.height * 0.4);

    // Mover el cursor gradualmente (más natural)
    await page.mouse.move(
      x - 50 - Math.random() * 100,
      y - 50 - Math.random() * 100,
      { steps: 10 }
    );
    await sleep(100 + Math.random() * 150);

    // Hacer un movimiento final al objetivo
    await page.mouse.move(x, y, { steps: 5 });
    await sleep(50 + Math.random() * 100);

    // Hacer clic con delay variable
    await page.mouse.down();
    await sleep(50 + Math.random() * 100);
    await page.mouse.up();

    console.log(`Clic humano realizado en: ${selector}`);
    return true;
  } catch (error) {
    console.error(`Error al realizar clic humano en ${selector}:`, error.message);
    return false;
  }
}
async function detectCaptcha(page) {
  try {
    // Lista de posibles selectores para diferentes captchas
    const captchaSelectors = [
      // Selectores de captcha comunes
      { type: 'geetest', selector: '.geetest_canvas_img canvas', name: 'GeeTest Canvas' },
      { type: 'geetest', selector: '.geetest_slider_button', name: 'GeeTest Slider' },
      { type: 'geetest', selector: '.geetest_btn', name: 'GeeTest Button' },
      { type: 'recaptcha', selector: '.recaptcha-checkbox', name: 'reCAPTCHA Checkbox' },
      { type: 'recaptcha', selector: 'iframe[src*="recaptcha"]', name: 'reCAPTCHA iframe' },
      { type: 'hcaptcha', selector: 'iframe[src*="hcaptcha"]', name: 'hCaptcha iframe' },
      { type: 'milanuncios', selector: '.slider_verify', name: 'Milanuncios verify' },
      { type: 'milanuncios', selector: '.verify-wrap', name: 'Milanuncios wrap' },
      { type: 'milanuncios', selector: '[class*="verify"]', name: 'Any verify class' },
      { type: 'milanuncios', selector: '[class*="slider"]', name: 'Any slider class' },
      { type: 'generic', selector: '[class*="captcha"]', name: 'Generic Captcha Element' },
      { type: 'generic', selector: '[id*="captcha"]', name: 'Generic Captcha ID' }
    ];

    // Detectar qué selectores están presentes
    for (const item of captchaSelectors) {
      const isPresent = await page.evaluate((selector) => {
        return !!document.querySelector(selector);
      }, item.selector).catch(() => false);

      if (isPresent) {
        console.log(`⚠️ Captcha detectado: ${item.name} (${item.selector})`);
        return true;
      }
    }

    // Verificar también por texto que indique captcha
    const hasCaptchaText = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return bodyText.includes('captcha') ||
        bodyText.includes('robot') ||
        bodyText.includes('verify') ||
        bodyText.includes('verificar') ||
        bodyText.includes('seguridad');
    });

    if (hasCaptchaText) {
      console.log("⚠️ Texto de captcha detectado en la página");
      return true;
    }

    console.log("No se detectó ningún captcha");
    return false;
  } catch (error) {
    console.error("Error detectando captcha:", error.message);
    return false;
  }
}
async function exhaustiveScroll(page) {
  console.log('Iniciando scroll exhaustivo con comportamiento humano...');

  try {
    // Primer enfoque: scroll variable con pausas aleatorias
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let scrolled = 0;
        const scrolls = [];

        // Generar una serie de scrolls variables (como un humano)
        for (let i = 0; i < 50; i++) {
          // Los humanos hacen scrolls de diferentes longitudes
          const baseDistance = 250 + Math.floor(Math.random() * 150);
          // A veces hacemos scrolls más largos
          const distance = Math.random() > 0.8
            ? baseDistance * (1.5 + Math.random())
            : baseDistance;

          scrolls.push({
            distance,
            // Los humanos hacen pausas variables entre scrolls
            delay: 150 + Math.floor(Math.random() * 300)
          });
        }

        // Ejecutar los scrolls con timing variable
        const scrollInterval = setInterval(() => {
          if (scrolled >= scrolls.length ||
            window.innerHeight + window.scrollY >= document.body.scrollHeight) {
            clearInterval(scrollInterval);
            resolve();
            return;
          }

          const currentScroll = scrolls[scrolled];
          window.scrollBy(0, currentScroll.distance);
          totalHeight += currentScroll.distance;
          scrolled++;

          // A veces los humanos se detienen a leer
          if (Math.random() > 0.85) {
            clearInterval(scrollInterval);
            setTimeout(() => {
              // Y luego continúan scrolleando
              scrollInterval = setInterval(scrollStep, 150 + Math.floor(Math.random() * 200));
            }, 1000 + Math.floor(Math.random() * 1500)); // Pausa más larga
          }
        }, 200);
      });
    });

    // Esperar a que se carguen elementos adicionales con tiempo variable
    await sleep(2000 + Math.random() * 1000);

    console.log('Realizando un segundo scroll con pausas naturales...');

    // Segundo enfoque: scroll más humano desde arriba hacia abajo
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        // Primero, volver al principio (los humanos a veces regresan arriba)
        window.scrollTo(0, 0);

        setTimeout(async () => {
          const height = document.body.scrollHeight;
          // Dividir la altura en pasos variables (los humanos no hacen scrolls perfectamente regulares)
          const totalSteps = 15 + Math.floor(Math.random() * 10);

          // Realizar scroll con velocidad variable y pausas aleatorias
          for (let i = 0; i < totalSteps; i++) {
            // Un humano no divide la página en partes iguales
            const scrollPercent = (i / totalSteps) * (0.9 + Math.random() * 0.2);
            const targetPosition = height * scrollPercent;

            // Scroll a la posición calculada
            window.scrollTo(0, targetPosition);

            // Pausa variable entre scrolls
            const pause = 300 + Math.random() * 500;
            if (Math.random() > 0.8) {
              // A veces una pausa más larga para simular lectura
              await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));
            } else {
              await new Promise(r => setTimeout(r, pause));
            }
          }

          // Scroll final al fondo con una pequeña pausa
          window.scrollTo(0, height);
          setTimeout(resolve, 800 + Math.random() * 500);
        }, 500 + Math.random() * 200);
      });
    });

    // Esperar para asegurar que la carga de AJAX termine
    await sleep(2000 + Math.random() * 1000);

    // Tercer enfoque: click en "mostrar más" o botones de paginación con clics humanos
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
          const countBefore = await countVisibleElements(page);

          // Hacer clic de forma humana en el botón
          await humanClick(page, selector);
          await sleep(2500 + Math.random() * 1000); // Esperar a que carguen más elementos

          // Contar cuántos elementos tenemos después de hacer clic
          const countAfter = await countVisibleElements(page);

          console.log(`Elementos: ${countBefore} → ${countAfter}`);

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
              await humanClick(page, selector);
              await sleep(3000 + Math.random() * 1000);

              // Contar nuevamente
              const newCount = await countVisibleElements(page);
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

    // Intentar cada selector con clics humanos
    for (const selector of cookieSelectors) {
      try {
        const hasButton = await page.evaluate((sel) => {
          return !!document.querySelector(sel);
        }, selector);

        if (hasButton) {
          console.log(`Encontrado botón de cookies: ${selector}`);
          await humanClick(page, selector);
          console.log('Cookies aceptadas.');
          await sleep(1000 + Math.random() * 500);
          return true;
        }
      } catch (e) {
        console.log(`Error al intentar con selector ${selector}: ${e.message}`);
      }
    }

    // Intento alternativo: buscar por texto
    try {
      const buttons = await page.$$('button');
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const text = await page.evaluate(el => el.innerText.toLowerCase(), button);
        if (text.includes('accept') || text.includes('acepto') || text.includes('aceptar')) {
          console.log(`Encontrado botón por texto: "${text}"`);

          // Obtener las coordenadas del botón
          const box = await button.boundingBox();
          if (box) {
            // Clic humano en el botón
            const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
            const y = box.y + box.height / 2 + (Math.random() * 10 - 5);

            await page.mouse.move(x - 20 - Math.random() * 30, y - 10 - Math.random() * 20);
            await sleep(100 + Math.random() * 150);
            await page.mouse.move(x, y, { steps: 5 });
            await sleep(50 + Math.random() * 100);
            await page.mouse.down();
            await sleep(50 + Math.random() * 70);
            await page.mouse.up();

            console.log('Cookies aceptadas por texto.');
            await sleep(1000 + Math.random() * 500);
            return true;
          }
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

// Función principal de scraping mejorada con extracción exhaustiva
async function scrapeMilanuncios(searchParams = {}) {
  const urlToScrape = buildUrl(searchParams);
  console.log(`Scraping URL: ${urlToScrape}`);

  let browser = null;
  let page = null;
  let maxRetries = 3; // Aumentar los reintentos para mayor robustez
  const sessionId = `MilAnuncios-Scraper-${Date.now()}`; // ID único para la sesión

  try {
    // Conectar a la instancia de Browserless (una sola vez)
    const browserWSEndpoint = process.env.BROWSERLESS_URL || 'ws://chrome:3000';
    console.log(`Conectando a Browserless en: ${browserWSEndpoint}`);
    console.log(`ID de sesión: ${sessionId}`);

    // Conectamos a Browserless
    browser = await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });

    // Crear una nueva página
    page = await browser.newPage();

    // Si está habilitado el uso de proxies
    if (process.env.USE_PROXIES === 'true') {
      // Aplicar proxy a la página mediante autenticación
      const proxy = proxyManager.getRandomProxy();
      console.log(`Usando proxy: ${proxy.host}:${proxy.port}`);
      await page.authenticate({
        username: proxy.username,
        password: proxy.password
      });
    }

    // Identificar mejor la sesión para la interfaz de debugging
    // await page.evaluate((sid) => {
    //   document.title = `Scraping: ${sid}`;
    //   if (window.localStorage) {
    //     window.localStorage.setItem('browserless_session_id', sid);
    //   }
    // }, sessionId);

    // Configurar tiempos de espera más altos
    page.setDefaultNavigationTimeout(120000);
    page.setDefaultTimeout(60000);

    // Configurar user agent con variabilidad
    const mobileAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.6045.109 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    ];

    const userAgent = mobileAgents[Math.floor(Math.random() * mobileAgents.length)];
    console.log(`Usando User-Agent: ${userAgent}`);
    await page.setUserAgent(userAgent);

    // Configurar cabeceras HTTP adicionales con variabilidad
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });

    // Establecer cookies iniciales para evitar algunas detecciones
    await page.setCookie({
      name: 'visited_before',
      value: 'true',
      domain: '.milanuncios.com',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400
    });

    // Configurar interceptación de peticiones para bloquear recursos innecesarios
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();

      // Bloquear recursos que no son necesarios para la extracción
      if (
        (resourceType === 'image' && !url.includes('milanuncios.com')) ||
        resourceType === 'media' ||
        url.includes('google-analytics') ||
        url.includes('facebook.net') ||
        url.includes('doubleclick.net') ||
        url.includes('amazon-adsystem') ||
        url.includes('/ads/') ||
        url.includes('analytics') ||
        url.includes('tracker')
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Proceso de scraping con reintentos
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`\n=== Intento ${attempt} de ${maxRetries} (Manteniendo la misma sesión) ===\n`);

          // Para cada reintento usar un proxy diferente si está habilitado
          if (process.env.USE_PROXIES === 'true') {
            const newProxy = proxyManager.getRandomProxy();
            console.log(`Cambiando a proxy: ${newProxy.host}:${newProxy.port}`);

            await page.authenticate({
              username: newProxy.username,
              password: newProxy.password
            });
          }

          // Más tiempo de espera entre reintentos para observación
          await sleep(8000);
        }

        // Navegar a la página con tiempos de carga extendidos
        console.log('Navegando a la URL...');

        await page.goto(urlToScrape, {
          waitUntil: 'networkidle2',
          timeout: 90000 // Tiempo extendido para carga inicial
        });

        console.log('Página cargada.');
        // Tiempo de espera para observar la página cargada
        await sleep(5000);

        // Verificar si hay captcha antes de continuar
        const hasCaptcha = await detectCaptcha(page);
        if (hasCaptcha) {
          console.log('⚠️ Captcha detectado en la página! Reintentando...');
          // En lugar de intentar resolver, simplemente reintentar con otro proxy
          continue;
        }

        // Manejar cookies con comportamiento humano
        await handleCookiesConsent(page);

        // Esperar un tiempo aleatorio antes de continuar
        await sleep(3000 + Math.random() * 2000);

        // Contar elementos antes del scroll
        console.log('Contando elementos antes del scroll:');
        const initialCount = await countVisibleElements(page);

        // Realizar auto-scroll exhaustivo con comportamiento humano
        await exhaustiveScroll(page);

        // Verificar si apareció un captcha durante el scroll
        const captchaAfterScroll = await detectCaptcha(page);
        if (captchaAfterScroll) {
          console.log('⚠️ Captcha detectado después del scroll! Reintentando...');
          continue;
        }

        // Esperar más tiempo después del scroll para observación
        await sleep(6000);

        // Contar elementos después del scroll
        console.log('Contando elementos después del scroll:');
        const finalCount = await countVisibleElements(page);

        console.log(`Incremento de elementos: ${finalCount - initialCount} (${initialCount} -> ${finalCount})`);

        // Esperar un poco después del auto-scroll
        await sleep(3000 + Math.random() * 2000);

        // Extraer los datos de manera exhaustiva
        console.log('Iniciando extracción de datos...');
        const scrapedData = await extractData(page);

        // Verificar si hubo error en la extracción
        if (scrapedData && scrapedData.error) {
          console.log(`Error en la extracción: ${scrapedData.error}`);

          // Verificar si el error puede ser por un captcha
          const captchaAfterExtract = await detectCaptcha(page);
          if (captchaAfterExtract) {
            console.log('⚠️ Captcha detectado después de extraer! Reintentando...');
            continue;
          }

          // Si estamos en el último intento, devolver lo que tengamos
          if (attempt === maxRetries) {
            console.log('Se alcanzó el número máximo de intentos, pero mantenemos la sesión abierta para inspección.');
            // NO cerramos la página ni el navegador aquí para mantener la sesión visible
            return {
              error: scrapedData.error,
              message: 'No se pudieron extraer datos después de múltiples intentos',
              partial: true
            };
          }

          // Si no es el último intento, continuamos con el siguiente intento sin cerrar nada
          console.log('Preparando para reintentar con la misma sesión pero diferente proxy...');
          continue;
        }

        // Si llegamos aquí, la extracción fue exitosa
        console.log(`Extracción completada. Se extrajeron ${Array.isArray(scrapedData) ? scrapedData.length : 0} artículos.`);
        console.log('Manteniendo la sesión abierta para inspección...');

        // NO cerramos la página ni el navegador para mantener la sesión visible
        return Array.isArray(scrapedData) ? scrapedData : [];
      } catch (attemptError) {
        console.error(`Error en scraping (intento ${attempt + 1}/${maxRetries + 1}):`, attemptError.message);

        // Si es el último intento, continuamos al manejador de error general
        if (attempt === maxRetries) {
          throw attemptError;
        }

        // Esperar antes de reintentar (tiempo aumentado para observación)
        const retryDelay = (attempt + 1) * 8000;
        console.log(`Esperando ${retryDelay / 1000} segundos antes de reintentar con la misma sesión...`);
        await sleep(retryDelay);
      }
    }
  } catch (error) {
    console.error(`Error general en scraping:`, error.message);
    // Mantenemos la sesión abierta incluso en caso de error
    console.log('Error en el proceso, pero manteniendo la sesión abierta para inspección...');
    return { error: error.message, sessionKept: true };
  }
}

module.exports = scrapeMilanuncios;