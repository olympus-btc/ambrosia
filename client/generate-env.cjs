const fs = require("fs");
const os = require("os");
const path = require("path");

const confPath = path.join(os.homedir(), ".Ambrosia-POS", "ambrosia.conf");
const envPath = path.join(__dirname, ".env");

let host = "";
let port = "";

try {
  // Check if environment variables are set (Docker/production mode)
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log("✅ Using environment variables (Docker mode)");

    // Parse port from NEXT_PUBLIC_API_URL if available
    const url = new URL(process.env.NEXT_PUBLIC_API_URL);
    port = url.port || "9154";
    host = url.hostname;

    console.log(`   API URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    console.log(`   HOST: ${host}`);
    console.log(`   PORT: ${port}`);
  } else {
    // Electron/local mode: read from config file
    console.log("📁 Reading configuration from ambrosia.conf (Electron mode)");

    if (!fs.existsSync(confPath)) {
      console.error("❌ Error: ambrosia.conf file not found");
      console.error(`   Expected path: ${confPath}`);
      console.error("   Please start the Ambrosia backend first.");
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

    if (!ip || !port) {
      console.error("❌ Error: Incomplete configuration in ambrosia.conf");
      console.error(`   http-bind-ip: ${ip || 'NOT FOUND'}`);
      console.error(`   http-bind-port: ${port || 'NOT FOUND'}`);
      process.exit(1);
    }

    host = ip;
    console.log(`   HOST: ${host}`);
    console.log(`   PORT: ${port}`);
  }

  // Create the final content for .env
  let envContent = "";
  if (host) {
    envContent += `HOST=${host}\n`;
  }
  if (port) {
    envContent += `NEXT_PUBLIC_PORT_API=${port}\n`;
  }

  // Add flag for Electron
  if (process.env.ELECTRON) {
    envContent += `NEXT_PUBLIC_ELECTRON=true\n`;
  }

  fs.writeFileSync(envPath, envContent);

  console.log("✅ .env file written successfully to:", envPath);
  console.log("   Contents:");
  console.log(envContent.split('\n').map(line => `   ${line}`).join('\n'));

} catch (err) {
  console.error("❌ Error generating .env:", err.message);
  console.error("   Stack:", err.stack);
  process.exit(1);
}
