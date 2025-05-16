// /lib/oanda.js
// const OANDA_API_URL = process.env.OANDA_API_URL;
// const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;
// const API_KEY = process.env.OANDA_API_KEY;

const OANDA_API_URL = "https://api-fxpractice.oanda.com";
// NEXT_PUBLIC_OANDA_ACCOUNT_ID="101-001-31701945-001"
const ACCOUNT_ID = "101-001-31701945-001";
const API_KEY =
  "c87de240064f6d839211a8bb9fb46354-301353f03ea7363dff1216b24aaa652d";
// Validate environment variables
function validateEnv() {
  const missingVars = [];

  if (!API_KEY) {
    missingVars.push("OANDA_API_KEY");
  }

  if (!ACCOUNT_ID) {
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

/**
 * Make a GET request to the OANDA API
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<any>} - API response data
 */
export async function oandaGet(endpoint) {
  if (!isEnvValid) {
    throw new Error(
      "OANDA API configuration is invalid. Please check your environment variables."
    );
  }

  try {
    const response = await fetch(`${OANDA_API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OANDA API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("OANDA API request failed:", error);
    throw error;
  }
}

/**
 * Make a POST request to the OANDA API
 * @param {string} endpoint - API endpoint path
 * @param {object} data - Request body
 * @returns {Promise<any>} - API response data
 */
export async function oandaPost(endpoint, data) {
  if (!isEnvValid) {
    throw new Error(
      "OANDA API configuration is invalid. Please check your environment variables."
    );
  }

  try {
    const response = await fetch(`${OANDA_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OANDA API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("OANDA API request failed:", error);
    throw error;
  }
}

/**
 * Make a PUT request to the OANDA API
 * @param {string} endpoint - API endpoint path
 * @param {object} data - Request body
 * @returns {Promise<any>} - API response data
 */
export async function oandaPut(endpoint, data) {
  if (!isEnvValid) {
    throw new Error(
      "OANDA API configuration is invalid. Please check your environment variables."
    );
  }

  try {
    const response = await fetch(`${OANDA_API_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OANDA API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("OANDA API request failed:", error);
    throw error;
  }
}

/**
 * Make a DELETE request to the OANDA API
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<any>} - API response data
 */
export async function oandaDelete(endpoint) {
  if (!isEnvValid) {
    throw new Error(
      "OANDA API configuration is invalid. Please check your environment variables."
    );
  }

  try {
    const response = await fetch(`${OANDA_API_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OANDA API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("OANDA API request failed:", error);
    throw error;
  }
}

export { ACCOUNT_ID };
