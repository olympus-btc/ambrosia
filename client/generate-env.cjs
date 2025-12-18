const fs = require("fs");
const os = require("os");
const path = require("path");

const confPath = path.join(os.homedir(), ".Ambrosia-POS", "ambrosia.conf");
const envPath = path.join(__dirname, ".env");

let apiBaseUrl = "";
let host = "";
let port = "";

try {
  // Verificar que el archivo de configuración existe
  if (!fs.existsSync(confPath)) {
    console.error("❌ Error: No se encontró el archivo ambrosia.conf");
    console.error(`   Ruta esperada: ${confPath}`);
    console.error("   Por favor, inicie el backend de Ambrosia primero.");
    process.exit(1);
  }

  const raw = fs.readFileSync(confPath, "utf-8");
  const lines = raw.split("\n");

  const confData = {};
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.includes("=")) {
      const [key, value] = trimmedLine.split("=").map((s) => s.trim());
      confData[key] = value;
    }
  });

  const ip = confData["http-bind-ip"];
  port = confData["http-bind-port"];
  const hostValue = confData["http-bind-ip"];

  // Validar que los valores necesarios existen
  if (!ip || !port) {
    console.error("❌ Error: Configuración incompleta en ambrosia.conf");
    console.error(`   http-bind-ip: ${ip || 'NO ENCONTRADO'}`);
    console.error(`   http-bind-port: ${port || 'NO ENCONTRADO'}`);
    process.exit(1);
  }

  // Combinar IP y puerto para la URL base
  if (ip && port) {
    apiBaseUrl = `http://${ip}:${port}`;
    console.log("✅ API Base URL generada:", apiBaseUrl);
  }

  // Obtener el valor de HOST
  if (hostValue) {
    host = hostValue;
    console.log("✅ HOST generado:", host);
  }

  // Crear el contenido final para el .env
  let envContent = "";
  if (host) {
    envContent += `HOST=${host}\n`;
  }
  if (port) {
    envContent += `NEXT_PUBLIC_PORT_API=${port}\n`;
  }

  // Agregar flag para Electron
  if (process.env.ELECTRON) {
    envContent += `NEXT_PUBLIC_ELECTRON=true\n`;
  }

  fs.writeFileSync(envPath, envContent);

  console.log("✅ Archivo .env escrito exitosamente en:", envPath);
  console.log("   Contenido:");
  console.log(envContent.split('\n').map(line => `   ${line}`).join('\n'));

} catch (err) {
  console.error("❌ Error generando .env desde ambrosia.conf:", err.message);
  console.error("   Stack:", err.stack);
  process.exit(1);
}
