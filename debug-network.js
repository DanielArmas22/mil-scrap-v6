// debug-network.js - Script para diagnosticar problemas de red entre contenedores
const http = require('http');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const dns = require('dns');
const net = require('net');

// Función para verificar DNS
async function checkDNS(hostname) {
  console.log(`\n🔍 Verificando resolución DNS para: ${hostname}`);
  try {
    const addresses = await promisify(dns.lookup)(hostname);
    console.log(`✅ Resolución DNS exitosa: ${hostname} -> ${addresses.address}`);
    return addresses.address;
  } catch (error) {
    console.error(`❌ Error al resolver DNS: ${error.message}`);
    // Intentar obtener información usando comandos del sistema
    try {
      const { stdout } = await exec(`getent hosts ${hostname}`);
      console.log(`ℹ️ Información del host (getent): ${stdout}`);
    } catch (cmdError) {
      console.error(`ℹ️ No se pudo obtener información adicional: ${cmdError.message}`);
    }
    return null;
  }
}

// Función para verificar puerto abierto
async function checkPortOpen(host, port) {
  console.log(`\n🔍 Verificando conexión a ${host}:${port}`);
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    socket.setTimeout(5000);

    socket.on('connect', () => {
      console.log(`✅ Conexión exitosa a ${host}:${port}`);
      socket.destroy();
      resolved = true;
      resolve(true);
    });

    socket.on('timeout', () => {
      console.error(`❌ Timeout al conectar a ${host}:${port}`);
      socket.destroy();
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    socket.on('error', (error) => {
      console.error(`❌ Error al conectar a ${host}:${port}: ${error.message}`);
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

// Función para probar HTTP
async function testHTTP(host, port, path = '/') {
  console.log(`\n🔍 Probando HTTP GET http://${host}:${port}${path}`);
  return new Promise((resolve) => {
    let data = '';
    const req = http.get({
      host,
      port,
      path,
      timeout: 5000
    }, (res) => {
      console.log(`✅ Respuesta HTTP recibida. Status: ${res.statusCode}`);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const preview = data.length > 100 ? `${data.substring(0, 100)}...` : data;
        console.log(`ℹ️ Respuesta: ${preview}`);
        resolve(true);
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error HTTP: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`❌ Timeout en petición HTTP`);
      resolve(false);
    });

    req.end();
  });
}

// Ejecutar diagnósticos de red
async function runDiagnostics() {
  console.log('🔧 Iniciando diagnósticos de red para Browserless');

  // 1. Verificar información del sistema
  try {
    const { stdout: hostname } = await exec('hostname');
    console.log(`ℹ️ Hostname: ${hostname.trim()}`);

    const { stdout: interfaces } = await exec('ip addr');
    console.log(`ℹ️ Interfaces de red:\n${interfaces}`);
  } catch (error) {
    console.error(`❌ Error al obtener información del sistema: ${error.message}`);
  }

  // 2. Verificar DNS para el servicio chrome
  const chromeIP = await checkDNS('chrome');

  // 3. Verificar puerto
  if (chromeIP) {
    await checkPortOpen(chromeIP, 3000);
    await checkPortOpen('chrome', 3000);
  } else {
    console.log('⚠️ Intentando conexión directa sin resolver DNS...');
    await checkPortOpen('chrome', 3000);
  }

  // 4. Probar API de Browserless
  await testHTTP('chrome', 3000, '/json/version');

  console.log('\n🔧 Diagnóstico completo');
}

// Ejecutar y manejar errores
runDiagnostics().catch(err => {
  console.error('Error en diagnósticos:', err);
});