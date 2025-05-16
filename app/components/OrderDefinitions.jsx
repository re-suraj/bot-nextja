import { useState } from "react";

export default function OrderDefinitions() {
  const [activeTab, setActiveTab] = useState("orderTypes");

  const orderTypes = [
    {
      name: "MARKET",
      description: "A Market Order is an order to buy or sell at the current market price. It is executed immediately at the best available price.",
      useCase: "When you want to enter or exit a position immediately at the current market price."
    },
    {
      name: "LIMIT",
      description: "A Limit Order is an order to buy or sell at a specified price or better. It will only execute if the market reaches the specified price.",
      useCase: "When you want to buy below the current price or sell above the current price."
    },
    {
      name: "STOP",
      description: "A Stop Order is an order to buy or sell when the market reaches a specified price. It becomes a Market Order when triggered.",
      useCase: "When you want to buy above the current price or sell below the current price."
    },
    {
      name: "MARKET_IF_TOUCHED",
      description: "A Market If Touched Order is similar to a Limit Order but becomes a Market Order when triggered.",
      useCase: "When you want to enter a position at a specific price level."
    },
    {
      name: "TAKE_PROFIT",
      description: "A Take Profit Order is used to close a position at a specified price level to secure profits.",
      useCase: "When you want to automatically close a position at a specific profit target."
    },
    {
      name: "STOP_LOSS",
      description: "A Stop Loss Order is used to close a position at a specified price level to limit losses.",
      useCase: "When you want to automatically close a position at a specific loss level."
    },
    {
      name: "GUARANTEED_STOP_LOSS",
      description: "A Guaranteed Stop Loss Order is a Stop Loss Order that is guaranteed to execute at the specified price, even if the market gaps through the price.",
      useCase: "When you want to ensure your stop loss is executed at the exact price, regardless of market conditions."
    },
    {
      name: "TRAILING_STOP_LOSS",
      description: "A Trailing Stop Loss Order is a Stop Loss Order that follows the market price at a specified distance.",
      useCase: "When you want to protect profits while letting winning trades run."
    }
  ];

  const timeInForce = [
    {
      name: "GTC",
      description: "Good Till Cancelled. The order remains active until it is either filled or cancelled.",
      useCase: "Default option for most orders."
    },
    {
      name: "GTD",
      description: "Good Till Date. The order remains active until the specified date or until it is filled.",
      useCase: "When you want the order to expire at a specific date."
    },
    {
      name: "GFD",
      description: "Good For Day. The order remains active until the end of the trading day.",
      useCase: "When you want the order to expire at the end of the trading day."
    },
    {
      name: "FOK",
      description: "Fill or Kill. The order must be filled immediately in its entirety or it will be cancelled.",
      useCase: "When you need the entire order to be filled at once."
    },
    {
      name: "IOC",
      description: "Immediate or Cancel. The order must be filled immediately, partially or in full, or it will be cancelled.",
      useCase: "When you want to fill as much as possible immediately."
    }
  ];

  const positionFill = [
    {
      name: "DEFAULT",
      description: "The default position fill behavior for the account.",
      useCase: "Standard trading behavior."
    },
    {
      name: "OPEN_ONLY",
      description: "When the order is filled, it will only open a new position.",
      useCase: "When you want to ensure the order only opens new positions."
    },
    {
      name: "REDUCE_FIRST",
      description: "When the order is filled, it will first reduce any existing position before opening a new position.",
      useCase: "When you want to reduce existing positions before opening new ones."
    },
    {
      name: "REDUCE_ONLY",
      description: "When the order is filled, it will only reduce an existing position.",
      useCase: "When you want to ensure the order only reduces existing positions."
    }
  ];

  const triggerConditions = [
    {
      name: "DEFAULT",
      description: "The default trigger condition for the account.",
      useCase: "Standard trading behavior."
    },
    {
      name: "INVERSE",
      description: "The trigger condition is inverted. For example, a Stop Order becomes a Limit Order and vice versa.",
      useCase: "When you want to invert the normal trigger behavior."
    },
    {
      name: "BID",
      description: "The order is triggered by the bid price.",
      useCase: "When you want to trigger based on the bid price."
    },
    {
      name: "ASK",
      description: "The order is triggered by the ask price.",
      useCase: "When you want to trigger based on the ask price."
    },
    {
      name: "MID",
      description: "The order is triggered by the mid price.",
      useCase: "When you want to trigger based on the mid price."
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "orderTypes":
        return orderTypes;
      case "timeInForce":
        return timeInForce;
      case "positionFill":
        return positionFill;
      case "triggerConditions":
        return triggerConditions;
      default:
        return orderTypes;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Order Definitions</h2>
        <div className="mt-4 flex space-x-4">
          <button
            onClick={() => setActiveTab("orderTypes")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "orderTypes"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Order Types
          </button>
          <button
            onClick={() => setActiveTab("timeInForce")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "timeInForce"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Time in Force
          </button>
          <button
            onClick={() => setActiveTab("positionFill")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "positionFill"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Position Fill
          </button>
          <button
            onClick={() => setActiveTab("triggerConditions")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "triggerConditions"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Trigger Conditions
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-6">
          {renderContent().map((item) => (
            <div key={item.name} className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
              <p className="mt-2 text-gray-600">{item.description}</p>
              <div className="mt-2">
                <span className="text-sm font-medium text-gray-500">Use Case: </span>
                <span className="text-sm text-gray-600">{item.useCase}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 