"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MarginQuote() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    // exchangeTokens: { NSE: ["3045"] },
    exchangeTokens: { CDS: ["26009"] },
    clientIP: "127.0.0.1",
    macAddress: "00:11:22:33:44:55",
  });

  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    const jwtToken = sessionStorage.getItem("jwtToken");
    if (!jwtToken) {
      router.push("/login");
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchQuote = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/margin/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("jwtToken")}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setQuote(data);
        setLastUpdated(new Date());
      } else {
        if (response.status === 401) {
          // router.push("/login");
        } else {
          setError(data.error || "Failed to fetch margin quote");
        }
      }
    } catch (err) {
      setError("An error occurred while fetching margin quote");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      fetchQuote();
      interval = setInterval(fetchQuote, 5000); // Refresh every 5 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchQuote();
  };
  useEffect(() => {
    // instruments
    const fetchInstruments = async () => {
      setError("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/margin/instruments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("jwtToken")}`,
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          // setQuote(data);
          // setLastUpdated(new Date());
        } else {
          if (response.status === 401) {
            // router.push("/login");
          } else {
            setError(data.error || "Failed to fetch margin quote");
          }
        }
      } catch (err) {
        setError("An error occurred while fetching margin quote");
      } finally {
        setIsLoading(false);
      }
    };
    const fetchFunds = async () => {
      setError("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/margin/funds", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("jwtToken")}`,
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          // setQuote(data);
          // setLastUpdated(new Date());
        } else {
          if (response.status === 401) {
            // router.push("/login");
          } else {
            setError(data.error || "Failed to fetch margin quote");
          }
        }
      } catch (err) {
        setError("An error occurred while fetching margin quote");
      } finally {
        setIsLoading(false);
      }
    };
    const fetchGetOrderBook = async () => {
      setError("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/order/get-order-book", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("jwtToken")}`,
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          // setQuote(data);
          // setLastUpdated(new Date());
        } else {
          if (response.status === 401) {
            // router.push("/login");
          } else {
            setError(data.error || "Failed to fetch margin quote");
          }
        }
      } catch (err) {
        setError("An error occurred while fetching margin quote");
      } finally {
        setIsLoading(false);
      }
    };
    const fetchProfile = async () => {
      setError("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/get-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("jwtToken")}`,
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          // setQuote(data);
          // setLastUpdated(new Date());
        } else {
          if (response.status === 401) {
            // router.push("/login");
          } else {
            setError(data.error || "Failed to fetch margin quote");
          }
        }
      } catch (err) {
        setError("An error occurred while fetching margin quote");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstruments();
    fetchFunds();
    fetchGetOrderBook();
    fetchProfile();
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Market Quote
          </h1>

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="exchangeTokens"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Exchange Tokens
                  </label>
                  <input
                    type="text"
                    name="exchangeTokens"
                    id="exchangeTokens"
                    value={JSON.stringify(formData.exchangeTokens)}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder='{"NSE": ["3045"]}'
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="clientIP"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Client IP
                  </label>
                  <input
                    type="text"
                    name="clientIP"
                    id="clientIP"
                    value={formData.clientIP}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter client IP"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="macAddress"
                    className="block text-sm font-medium text-gray-700"
                  >
                    MAC Address
                  </label>
                  <input
                    type="text"
                    name="macAddress"
                    id="macAddress"
                    value={formData.macAddress}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter MAC address"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="auto-refresh"
                  name="auto-refresh"
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="auto-refresh"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Auto-refresh every 5 seconds
                </label>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isLoading
                      ? "bg-indigo-400"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {isLoading ? "Fetching Quote..." : "Get Market Quote"}
                </button>
              </div>
            </form>

            {quote && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Market Quote Details
                  </h2>
                  {lastUpdated && (
                    <span className="text-sm text-gray-500">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-900 overflow-x-auto">
                    {JSON.stringify(quote, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
