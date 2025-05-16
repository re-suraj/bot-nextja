"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MarginCalculator() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    exchange: "NSE",
    symbol: "",
    quantity: "",
    price: "",
    productType: "INTRADAY",
    orderType: "MARKET",
    triggerPrice: 0,
    squareoff: 0,
    stoploss: 0,
    trailingStopLoss: 0
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/margin/calculator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("jwtToken")}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        if (response.status === 401) {
          router.push("/login");
        } else {
          setError(data.error || "Failed to calculate margin");
        }
      }
    } catch (err) {
      setError("An error occurred while calculating margin");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Margin Calculator
          </h1>

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="exchange"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Exchange
                  </label>
                  <select
                    id="exchange"
                    name="exchange"
                    value={formData.exchange}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="productType"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Product Type
                  </label>
                  <select
                    id="productType"
                    name="productType"
                    value={formData.productType}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="INTRADAY">Intraday</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="symbol"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Symbol
                  </label>
                  <input
                    type="text"
                    name="symbol"
                    id="symbol"
                    value={formData.symbol}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="e.g., RELIANCE"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    id="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Price
                  </label>
                  <input
                    type="number"
                    name="price"
                    id="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter price"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="orderType"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Order Type
                  </label>
                  <select
                    id="orderType"
                    name="orderType"
                    value={formData.orderType}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="MARKET">Market</option>
                    <option value="LIMIT">Limit</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="triggerPrice"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Trigger Price
                  </label>
                  <input
                    type="number"
                    name="triggerPrice"
                    id="triggerPrice"
                    value={formData.triggerPrice}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter trigger price"
                  />
                </div>

                <div>
                  <label
                    htmlFor="squareoff"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Square Off
                  </label>
                  <input
                    type="number"
                    name="squareoff"
                    id="squareoff"
                    value={formData.squareoff}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter square off"
                  />
                </div>

                <div>
                  <label
                    htmlFor="stoploss"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    name="stoploss"
                    id="stoploss"
                    value={formData.stoploss}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter stop loss"
                  />
                </div>

                <div>
                  <label
                    htmlFor="trailingStopLoss"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Trailing Stop Loss
                  </label>
                  <input
                    type="number"
                    name="trailingStopLoss"
                    id="trailingStopLoss"
                    value={formData.trailingStopLoss}
                    onChange={handleChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter trailing stop loss"
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
                  {isLoading ? "Calculating..." : "Calculate Margin"}
                </button>
              </div>
            </form>

            {result && (
              <div className="mt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Margin Details
                </h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Total Margin Required
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        ₹{result.totalMarginRequired?.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Available Margin
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        ₹{result.availableMargin?.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Order Value
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        ₹{result.orderValue?.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Margin Blocked
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        ₹{result.marginBlocked?.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Additional Margin
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        ₹{result.additionalMargin?.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Leverage
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {result.leverage}x
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Margin Utilized
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        ₹{result.marginUtilized?.toFixed(2)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
