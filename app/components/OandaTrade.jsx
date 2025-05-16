"use client";

import { useState } from "react";

export default function OandaTrade() {
  const [formData, setFormData] = useState({
    instrument: "EUR_USD",
    unitsSize: 100,
  });

  const [tradeResult, setTradeResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setTradeResult(null);

    try {
      const response = await fetch("/api/oanda/trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setTradeResult(data);
      } else {
        setError(data.error || "Failed to execute trade");
      }
    } catch (err) {
      setError("An error occurred while executing trade");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Execute Trade</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="instrument"
              className="block text-sm font-medium text-gray-700"
            >
              Instrument
            </label>
            <select
              id="instrument"
              name="instrument"
              value={formData.instrument}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="EUR_USD">EUR/USD</option>
              <option value="GBP_USD">GBP/USD</option>
              <option value="USD_JPY">USD/JPY</option>
              <option value="AUD_USD">AUD/USD</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="unitsSize"
              className="block text-sm font-medium text-gray-700"
            >
              Units Size
            </label>
            <input
              type="number"
              name="unitsSize"
              id="unitsSize"
              value={formData.unitsSize}
              onChange={handleChange}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter units size"
              required
            />
          </div>
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
            {isLoading ? "Executing Trade..." : "Execute Trade"}
          </button>
        </div>
      </form>

      {tradeResult && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Trade Result</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {tradeResult.status}
                </dd>
              </div>
              {tradeResult.tradeType && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Trade Type</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {tradeResult.tradeType}
                  </dd>
                </div>
              )}
              {tradeResult.analysis && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Short MA
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {tradeResult.analysis.shortMA.toFixed(5)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Long MA
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {tradeResult.analysis.longMA.toFixed(5)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Last Price
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {tradeResult.analysis.lastPrice.toFixed(5)}
                    </dd>
                  </div>
                </>
              )}
              {tradeResult.order && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Order Details</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(tradeResult.order, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
} 