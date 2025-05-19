"use client";

import { useState, useEffect } from "react";

const ORDER_TYPES = [
  "MARKET",
  "LIMIT",
  "STOP",
  "MARKET_IF_TOUCHED",
  "TAKE_PROFIT",
  "STOP_LOSS",
  "GUARANTEED_STOP_LOSS",
  "TRAILING_STOP_LOSS",
];

const TIME_IN_FORCE = ["GTC", "GTD", "GFD", "FOK", "IOC"];
const POSITION_FILL = ["OPEN_ONLY", "REDUCE_FIRST", "REDUCE_ONLY", "DEFAULT"];
const TRIGGER_CONDITIONS = ["DEFAULT", "INVERSE", "BID", "ASK", "MID"];

export default function OandaOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderState, setOrderState] = useState("PENDING");
  const [beforeID, setBeforeID] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [formData, setFormData] = useState({
    type: "MARKET",
    instrument: "EUR_USD",
    units: "",
    price: "",
    timeInForce: "GTC",
    positionFill: "DEFAULT",
    triggerCondition: "DEFAULT",
    priceBound: "",
    gtdTime: "",
    tradeID: "",
    distance: "",
    takeProfitOnFill: null,
    stopLossOnFill: null,
    guaranteedStopLossOnFill: null,
    trailingStopLossOnFill: null,
  });

  useEffect(() => {
    fetchOrders();
  }, [orderState]);

  const fetchOrders = async (loadMore = false) => {
    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const url = `/api/oanda/orders?state=${orderState}&count=10${
        loadMore && beforeID ? `&beforeID=${beforeID}` : ""
      }`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        if (loadMore) {
          setOrders((prev) => [...prev, ...data.orders]);
        } else {
          setOrders(data.orders);
        }
        setBeforeID(data.lastTransactionID);
        setHasMore(data.hasMore);
      } else {
        setError(data.error || "Failed to fetch orders");
      }
    } catch (err) {
      setError("An error occurred while fetching orders");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

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

    try {
      const response = await fetch("/api/oanda/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form
        setFormData({
          type: "MARKET",
          instrument: "EUR_USD",
          units: "",
          price: "",
          timeInForce: "GTC",
          positionFill: "DEFAULT",
          triggerCondition: "DEFAULT",
          priceBound: "",
          gtdTime: "",
          tradeID: "",
          distance: "",
          takeProfitOnFill: null,
          stopLossOnFill: null,
          guaranteedStopLossOnFill: null,
          trailingStopLossOnFill: null,
        });
        // Refresh orders list
        fetchOrders();
      } else {
        setError(data.error || "Failed to create order");
      }
    } catch (err) {
      setError("An error occurred while creating the order");
    }
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchOrders(true);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const formatNumber = (number) => {
    if (number === undefined || number === null) return "-";
    return Number(number).toFixed(5);
  };

  const renderOrderTypeSpecificFields = () => {
    switch (formData.type) {
      case "MARKET":
        return (
          <div>
            <label className="block text-sm font-medium text-[#787b86]">
              Price Bound (optional)
            </label>
            <input
              type="number"
              name="priceBound"
              value={formData.priceBound}
              onChange={handleChange}
              step="0.00001"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
            />
          </div>
        );
      case "LIMIT":
      case "STOP":
      case "MARKET_IF_TOUCHED":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-[#787b86]">
                Price *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                step="0.00001"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
              />
            </div>
            {formData.type !== "LIMIT" && (
              <div>
                <label className="block text-sm font-medium text-[#787b86]">
                  Price Bound (optional)
                </label>
                <input
                  type="number"
                  name="priceBound"
                  value={formData.priceBound}
                  onChange={handleChange}
                  step="0.00001"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
                />
              </div>
            )}
            {formData.timeInForce === "GTD" && (
              <div>
                <label className="block text-sm font-medium text-[#787b86]">
                  GTD Time
                </label>
                <input
                  type="datetime-local"
                  name="gtdTime"
                  value={formData.gtdTime}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
                />
              </div>
            )}
          </>
        );
      case "TAKE_PROFIT":
      case "STOP_LOSS":
      case "GUARANTEED_STOP_LOSS":
      case "TRAILING_STOP_LOSS":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-[#787b86]">
                Trade ID *
              </label>
              <input
                type="text"
                name="tradeID"
                value={formData.tradeID}
                onChange={handleChange}
                required
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
              />
            </div>
            {formData.type !== "TRAILING_STOP_LOSS" && (
              <div>
                <label className="block text-sm font-medium text-[#787b86]">
                  Price
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.00001"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#787b86]">
                Distance
              </label>
              <input
                type="number"
                name="distance"
                value={formData.distance}
                onChange={handleChange}
                step="0.00001"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
              />
            </div>
            {formData.timeInForce === "GTD" && (
              <div>
                <label className="block text-sm font-medium text-[#787b86]">
                  GTD Time
                </label>
                <input
                  type="datetime-local"
                  name="gtdTime"
                  value={formData.gtdTime}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
                />
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2962ff]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e222d] shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#d1d4dc]">Orders</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setOrderState("PENDING")}
            className={`px-4 py-2 rounded-md ${
              orderState === "PENDING"
                ? "bg-[#2962ff] text-white"
                : "bg-[#2a2e39] text-[#d1d4dc]"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setOrderState("FILLED")}
            className={`px-4 py-2 rounded-md ${
              orderState === "FILLED"
                ? "bg-[#2962ff] text-white"
                : "bg-[#2a2e39] text-[#d1d4dc]"
            }`}
          >
            Filled
          </button>
          <button
            onClick={() => setOrderState("CANCELLED")}
            className={`px-4 py-2 rounded-md ${
              orderState === "CANCELLED"
                ? "bg-[#2962ff] text-white"
                : "bg-[#2a2e39] text-[#d1d4dc]"
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Order Creation Form */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#787b86]">
              Order Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
            >
              {ORDER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#787b86]">
              Instrument
            </label>
            <input
              type="text"
              name="instrument"
              value={formData.instrument}
              onChange={handleChange}
              required
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#787b86]">
              Units
            </label>
            <input
              type="number"
              name="units"
              value={formData.units}
              onChange={handleChange}
              required
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#787b86]">
              Time in Force
            </label>
            <select
              name="timeInForce"
              value={formData.timeInForce}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
            >
              {TIME_IN_FORCE.map((tif) => (
                <option key={tif} value={tif}>
                  {tif}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#787b86]">
              Position Fill
            </label>
            <select
              name="positionFill"
              value={formData.positionFill}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
            >
              {POSITION_FILL.map((pf) => (
                <option key={pf} value={pf}>
                  {pf.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#787b86]">
              Trigger Condition
            </label>
            <select
              name="triggerCondition"
              value={formData.triggerCondition}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[#2a2e39] bg-[#2a2e39] text-[#d1d4dc] focus:outline-none focus:ring-[#2962ff] focus:border-[#2962ff] sm:text-sm rounded-md"
            >
              {TRIGGER_CONDITIONS.map((tc) => (
                <option key={tc} value={tc}>
                  {tc.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {renderOrderTypeSpecificFields()}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-[#2962ff] text-white rounded-md hover:bg-[#1e53e5] focus:outline-none focus:ring-2 focus:ring-[#2962ff] focus:ring-offset-2 focus:ring-offset-[#1e222d]"
          >
            Create Order
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-[#2a2e39] border border-[#ef5350] rounded-md">
          <div className="text-sm text-[#ef5350]">{error}</div>
        </div>
      )}

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#2a2e39]">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                Instrument
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                Units
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                State
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                Time in Force
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#787b86] uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2e39]">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                  {order.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                  {order.type.replace(/_/g, " ")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                  {order.instrument}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                  {order.units}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                  {formatNumber(order.price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                  {order.state}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                  {order.timeInForce}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d1d4dc]">
                  {formatDate(order.createTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 bg-[#2a2e39] text-[#d1d4dc] rounded-md hover:bg-[#363b4a] focus:outline-none focus:ring-2 focus:ring-[#2962ff] focus:ring-offset-2 focus:ring-offset-[#1e222d] disabled:opacity-50"
          >
            {isLoadingMore ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2962ff] mr-2"></div>
                Loading...
              </div>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
