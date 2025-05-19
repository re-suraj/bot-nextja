// OANDA API Primitive Types

// Basic Types
export type DecimalNumber = string;
export type AccountUnits = string;
export type Currency = string;
export type InstrumentName = string;
export type DateTime = string;
export type PricingComponent = string;

// Enums
export enum InstrumentType {
  CURRENCY = "CURRENCY",
  CFD = "CFD",
  METAL = "METAL"
}

export enum DayOfWeek {
  SUNDAY = "SUNDAY",
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
  SATURDAY = "SATURDAY"
}

export enum AcceptDatetimeFormat {
  UNIX = "UNIX",
  RFC3339 = "RFC3339"
}

export enum GuaranteedStopLossOrderModeForInstrument {
  DISABLED = "DISABLED",
  ALLOWED = "ALLOWED",
  REQUIRED = "REQUIRED"
}

export enum Direction {
  LONG = "LONG",
  SHORT = "SHORT"
}

// Interfaces
export interface Tag {
  type: string;
  name: string;
}

export interface FinancingDayOfWeek {
  dayOfWeek: DayOfWeek;
  daysCharged: number;
}

export interface InstrumentFinancing {
  longRate: DecimalNumber;
  shortRate: DecimalNumber;
  financingDaysOfWeek: FinancingDayOfWeek[];
}

export interface InstrumentCommission {
  commission: DecimalNumber;
  unitsTraded: DecimalNumber;
  minimumCommission: DecimalNumber;
}

export interface GuaranteedStopLossOrderLevelRestriction {
  volume: DecimalNumber;
  priceRange: DecimalNumber;
}

export interface ConversionFactor {
  factor: DecimalNumber;
}

export interface HomeConversionFactors {
  gainQuoteHome: ConversionFactor;
  lossQuoteHome: ConversionFactor;
  gainBaseHome: ConversionFactor;
  lossBaseHome: ConversionFactor;
}

export interface Instrument {
  name: InstrumentName;
  type: InstrumentType;
  displayName: string;
  pipLocation: number;
  displayPrecision: number;
  tradeUnitsPrecision: number;
  minimumTradeSize: DecimalNumber;
  maximumTrailingStopDistance: DecimalNumber;
  minimumGuaranteedStopLossDistance: DecimalNumber;
  minimumTrailingStopDistance: DecimalNumber;
  maximumPositionSize: DecimalNumber;
  maximumOrderUnits: DecimalNumber;
  marginRate: DecimalNumber;
  commission: InstrumentCommission;
  guaranteedStopLossOrderMode: GuaranteedStopLossOrderModeForInstrument;
  guaranteedStopLossOrderExecutionPremium?: DecimalNumber;
  guaranteedStopLossOrderLevelRestriction?: GuaranteedStopLossOrderLevelRestriction;
  financing: InstrumentFinancing;
  tags: Tag[];
} 