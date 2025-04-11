// test-scrape2.js
(async () => {
  try {
    // Define los parámetros de búsqueda
    const params = new URLSearchParams({
      s: 'hyundai negro',
      desde: '1010',
      hasta: '20200',
      demanda: 'n',
      vendedor: 'part',
      orden: 'relevance',
      fromSearch: '1',
      fromSuggester: '1',
      suggestionUsed: '0',
      hitOrigin: 'listing',
      recentSearchShowed: '0',
      recentSearchUsed: '0'
    });

    // Construye la URL del endpoint del servidor
    const url = `http://localhost:3001/scrape2?${params.toString()}`;
    console.log(`Probando endpoint alternativo: ${url}`);

    // Realiza la petición GET
    const response = await fetch(url);
    const data = await response.json();

    // Muestra la respuesta formateada en consola
    console.log('Respuesta del servidor (API directa):', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
})();