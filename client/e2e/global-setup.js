/**
 * Playwright global setup.
 * Initializes the Ktor server database before any browser tests run.
 */
async function globalSetup() {
  const apiBase = process.env.API_BASE_URL || "http://127.0.0.1:9154";

  // Check if database is already initialized
  const checkRes = await fetch(`${apiBase}/initial-setup`);
  if (checkRes.ok) {
    const status = await checkRes.json();
    if (status.initialized) {
      console.log("[global-setup] Database already initialized");
      return;
    }
  }

  // Database not initialized — try to create initial setup.
  // Use a unique username to avoid collisions with users created by E2E tests.
  const uid = Date.now().toString(36);
  const userName = `admin_${uid}`;

  console.log(`[global-setup] Initializing database (user: ${userName})...`);
  const setupRes = await fetch(`${apiBase}/initial-setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessType: "store",
      userName,
      userPassword: "password123",
      userPin: "0000",
      businessName: "Test Store",
      businessAddress: "123 Test St",
      businessPhone: "1234567890",
      businessEmail: "test@example.com",
      businessCurrency: "USD",
    }),
  });

  if (setupRes.status === 201) {
    console.log("[global-setup] Database initialized successfully");
  } else if (setupRes.status === 409) {
    console.log("[global-setup] Database already initialized (409)");
  } else {
    const body = await setupRes.text();
    console.warn(
      `[global-setup] Setup returned ${setupRes.status}: ${body}`,
    );
  }

  // Verify initialization
  const verifyRes = await fetch(`${apiBase}/initial-setup`);
  if (verifyRes.ok) {
    const status = await verifyRes.json();
    if (status.initialized) {
      console.log("[global-setup] Verified: database is initialized");
    } else {
      console.error("[global-setup] WARNING: database still not initialized after setup");
    }
  }
}

export default globalSetup;
