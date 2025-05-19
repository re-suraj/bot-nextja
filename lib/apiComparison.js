// OANDA API Comparison Types

// Enums
export const ApiType = {
  V20_REST: "V20 REST API",
  FIX: "FIX",
  MT4: "MT4"
};

export const OrderType = {
  MARKET: "Market Order",
  MARKET_IF_TOUCHED: "MarketIfTouchedOrder",
  STOP: "Standard Stop Order",
  LIMIT: "Standard Limit",
  TAKE_PROFIT: "Take Profit",
  STOP_LOSS: "Stop Loss",
  TRAILING_STOP: "Trailing Stop",
  OCO: "OCO (TP/SL pair only)"
};

export const OrderDuration = {
  FOK: "Fill-or-Kill (FOK)",
  IOC: "Immediate-or-Cancel (IOC)",
  DAY: "DAY",
  GTD: "GTD",
  GTC: "GTC"
};

export const CandleInterval = {
  S5: "S5",
  S10: "S10",
  S15: "S15",
  S30: "S30",
  M1: "M1",
  M2: "M2",
  M3: "M3",
  M4: "M4",
  M5: "M5",
  M10: "M10",
  M15: "M15",
  M30: "M30",
  H1: "H1",
  H2: "H2",
  H3: "H3",
  H4: "H4",
  H6: "H6",
  H8: "H8",
  H12: "H12",
  D: "D",
  W: "W",
  M: "M"
};

export const ApplicationType = {
  WEB: "Web",
  DESKTOP: "Desktop",
  MOBILE: "Mobile"
};

// Default comparison data for V20 REST API
export const defaultV20Comparison = {
  general: {
    licenseAgreement: "Online",
    apiEnabled: "Online/Self-serve",
    os: "All (online)",
    access: "Online",
    availabilityRestrictions: "Not yet available in Global Markets"
  },
  orderTypes: {
    supportedOrderTypes: {
      [OrderType.MARKET]: true,
      [OrderType.MARKET_IF_TOUCHED]: true,
      [OrderType.STOP]: true,
      [OrderType.LIMIT]: true,
      [OrderType.TAKE_PROFIT]: true,
      [OrderType.STOP_LOSS]: true,
      [OrderType.TRAILING_STOP]: true,
      [OrderType.OCO]: true
    },
    supportedDurations: {
      [OrderDuration.FOK]: true,
      [OrderDuration.IOC]: true,
      [OrderDuration.DAY]: true,
      [OrderDuration.GTD]: true,
      [OrderDuration.GTC]: true
    },
    gtdMaxDuration: "None",
    supportedOperations: {
      orderCreation: true,
      priceBounds: true,
      orderModification: true,
      partialTradeClose: true,
      closeAllOrders: true,
      closeAllOrdersOnPair: true,
      positionClose: true,
      closeAllTrades: true,
      staleOrderRejection: true
    }
  },
  accountManagement: {
    accountInformation: {
      listUserAccounts: true,
      accountStatus: true,
      listPositions: true,
      positionUnrealizedPL: true,
      listTrades: true,
      listOrders: true,
      fullAccountHistory: true,
      recentTransactions: "unlimited"
    }
  },
  tradeInfo: {
    resourceInformation: {
      tradeInfo: true,
      tradeTrailingAmount: true,
      orderIdForTrade: true,
      orderInfo: true,
      transactionInfo: true
    },
    marketData: {
      listInstruments: true,
      tradablePairs: "All tradable pairs for division",
      nonTradablePairs: "Price information available",
      instrumentInfo: true,
      currentRates: true,
      instrumentHistory: true,
      historyCaching: true,
      maxHistoryRecords: "5000 per page",
      historyTimeframe: "Complete",
      candleData: "Bid only",
      supportedIntervals: Object.values(CandleInterval),
      flexibleCandleAlignment: false
    },
    streaming: {
      streamingRates: true,
      streamingEvents: true,
      supportedEventTypes: "All account and trading related events"
    }
  },
  usage: {
    quotaPolicy: {
      streamsPerUser: "Aggregate of 20 connections",
      rateLimit: "30"
    },
    technicalRequirements: {
      programmingLanguage: "Language agnostic",
      format: "JSON",
      communicationProtocol: "HTTP",
      connectionState: "stateless"
    },
    applicationTypes: {
      [ApplicationType.WEB]: true,
      [ApplicationType.DESKTOP]: true,
      [ApplicationType.MOBILE]: true
    },
    partnerAbilities: {
      thirdPartyApplication: true,
      personalUseApplication: true
    }
  },
  authentication: {
    authentication: {
      usernamePassword: true,
      accountPassword: true,
      readOnlyAccess: true,
      messageEncryption: "SSL"
    },
    indicators: {
      customIndicators: true,
      builtInIndicators: true,
      customIndicatorQuery: true
    },
    backtesting: true,
    apiIntegration: {
      fxLabs: true,
      autochartist: true
    }
  }
}; 