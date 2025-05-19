"use client";

import { useState, useEffect } from "react";

export default function OandaAccount() {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAccountDetails();
  }, []);

  const fetchAccountDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/oanda/account");
      const data = await response.json();

      if (response.ok) {
        setAccount(data);
      } else {
        setError(data.error || "Failed to fetch account details");
      }
    } catch (err) {
      setError("An error occurred while fetching account details");
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (number) => {
    if (number === undefined || number === null) return "-";
    return Number(number).toFixed(5);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2962ff]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[#2a2e39] border border-[#ef5350] rounded-md">
        <div className="text-sm text-[#ef5350]">{error}</div>
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="bg-[#1e222d] shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-[#d1d4dc] mb-6">Account Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#d1d4dc]">Basic Information</h3>
          <div>
            <p className="text-sm text-[#787b86]">Account ID</p>
            <p className="text-[#d1d4dc]">{account.id}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Currency</p>
            <p className="text-[#d1d4dc]">{account.currency}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Created Time</p>
            <p className="text-[#d1d4dc]">{formatDate(account.createdTime)}</p>
          </div>
        </div>

        {/* Balance Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#d1d4dc]">Balance Information</h3>
          <div>
            <p className="text-sm text-[#787b86]">Balance</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.balance)}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Unrealized P/L</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.unrealizedPL)}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">NAV</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.NAV)}</p>
          </div>
        </div>

        {/* Margin Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#d1d4dc]">Margin Information</h3>
          <div>
            <p className="text-sm text-[#787b86]">Margin Used</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.marginUsed)}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Margin Available</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.marginAvailable)}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Margin Call %</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.marginCallPercent)}</p>
          </div>
        </div>

        {/* Position Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#d1d4dc]">Position Information</h3>
          <div>
            <p className="text-sm text-[#787b86]">Position Value</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.positionValue)}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Open Trades</p>
            <p className="text-[#d1d4dc]">{account.openTradeCount}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Open Positions</p>
            <p className="text-[#d1d4dc]">{account.openPositionCount}</p>
          </div>
        </div>

        {/* P/L Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#d1d4dc]">P/L Information</h3>
          <div>
            <p className="text-sm text-[#787b86]">Total P/L</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.pl)}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Resettable P/L</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.resettablePL)}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Financing</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.financing)}</p>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#d1d4dc]">Additional Information</h3>
          <div>
            <p className="text-sm text-[#787b86]">Commission</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.commission)}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Dividend Adjustment</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.dividendAdjustment)}</p>
          </div>
          <div>
            <p className="text-sm text-[#787b86]">Guaranteed Execution Fees</p>
            <p className="text-[#d1d4dc]">{formatNumber(account.guaranteedExecutionFees)}</p>
          </div>
        </div>
      </div>

      {/* Margin Call Information */}
      {account.marginCallEnterTime && (
        <div className="mt-6 p-4 bg-[#2a2e39] rounded-md">
          <h3 className="text-lg font-semibold text-[#ef5350] mb-2">Margin Call Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#787b86]">Enter Time</p>
              <p className="text-[#d1d4dc]">{formatDate(account.marginCallEnterTime)}</p>
            </div>
            <div>
              <p className="text-sm text-[#787b86]">Extension Count</p>
              <p className="text-[#d1d4dc]">{account.marginCallExtensionCount}</p>
            </div>
            <div>
              <p className="text-sm text-[#787b86]">Last Extension</p>
              <p className="text-[#d1d4dc]">{formatDate(account.lastMarginCallExtensionTime)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 