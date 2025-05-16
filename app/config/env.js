// Environment variables configuration
const OANDA_API_URL = process.env.OANDA_API_URL || "https://api-fxpractice.oanda.com";
const OANDA_ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID || "101-001-31701945-001";
const OANDA_API_KEY = process.env.OANDA_API_KEY || "c87de240064f6d839211a8bb9fb46354-301353f03ea7363dff1216b24aaa652d";

// Validate environment variables
function validateEnv() {
  const missingVars = [];

  if (!OANDA_API_KEY) {
    missingVars.push("OANDA_API_KEY");
  }

  if (!OANDA_ACCOUNT_ID) {
    missingVars.push("OANDA_ACCOUNT_ID");
  }

  if (missingVars.length > 0) {
    console.error(
      "Missing required environment variables:",
      missingVars.join(", ")
    );
    console.error("Please set these variables in your .env.local file");
    return false;
  }

  return true;
}

// Validate on module load
const isEnvValid = validateEnv();

export {
  OANDA_API_URL,
  OANDA_ACCOUNT_ID,
  OANDA_API_KEY,
  isEnvValid
}; 