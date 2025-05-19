// /lib/oanda.js
// const OANDA_API_URL = process.env.OANDA_API_URL;
// const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;
// const API_KEY = process.env.OANDA_API_KEY;

import { OANDA_API_URL, OANDA_ACCOUNT_ID, OANDA_API_KEY, isEnvValid } from '../config/env';

// Validate on module load
if (!isEnvValid) {
  throw new Error(
    "OANDA API configuration is invalid. Please check your environment variables."
  );
}

/**
 * Make a GET request to the OANDA API
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<any>} - API response data
 */
export async function oandaGet(endpoint) {
  try {
    const response = await fetch(`${OANDA_API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${OANDA_API_KEY}`,
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
  try {
    const response = await fetch(`${OANDA_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OANDA_API_KEY}`,
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
  try {
    const response = await fetch(`${OANDA_API_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${OANDA_API_KEY}`,
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
  try {
    const response = await fetch(`${OANDA_API_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${OANDA_API_KEY}`,
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

export { OANDA_ACCOUNT_ID as ACCOUNT_ID };
