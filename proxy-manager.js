/**
 * Gestor de proxies para rotación en las solicitudes
 */

// Lista de proxies disponibles en formato IP:PUERTO:USUARIO:CONTRASEÑA:IP_SALIDA
const proxies = [
  "109.196.163.110:6208:przhawwj:nne286u0lxhs:104.143.244.84",
  "45.43.191.0:5961:przhawwj:nne286u0lxhs:109.196.161.209",
  "64.137.99.182:5815:przhawwj:nne286u0lxhs:64.137.37.224",
  "92.112.148.140:6585:przhawwj:nne286u0lxhs:89.34.237.221",
  "45.43.180.148:6787:przhawwj:nne286u0lxhs:23.27.208.40",
  "45.43.186.206:6424:przhawwj:nne286u0lxhs:46.202.224.171",
  "64.137.8.211:6893:przhawwj:nne286u0lxhs:145.223.55.67",
  "45.43.180.42:6681:przhawwj:nne286u0lxhs:154.203.49.18",
  "92.112.148.129:6574:przhawwj:nne286u0lxhs:104.253.219.211",
  "109.196.161.125:6573:przhawwj:nne286u0lxhs:38.225.15.70"
];

/**
* Obtiene un proxy aleatorio
* @returns {Object} Objeto con los datos del proxy seleccionado
*/
function getRandomProxy() {
  const selectedProxy = proxies[Math.floor(Math.random() * proxies.length)];
  const [ip, port, username, password] = selectedProxy.split(":");

  return {
    host: ip,
    port: port,
    username: username,
    password: password,
    // Formato completo para configuración de puppeteer
    proxyUrl: `http://${username}:${password}@${ip}:${port}`
  };
}

/**
* Obtiene las opciones de Browserless para usar un proxy
* @returns {Object} Opciones para la conexión a Browserless
*/
function getBrowserlessProxyOptions() {
  const proxy = getRandomProxy();
  console.log(`Usando proxy: ${proxy.host}:${proxy.port}`);

  return {
    proxy: {
      server: `http://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password
    }
  };
}

module.exports = {
  getRandomProxy,
  getBrowserlessProxyOptions
};