/**
 * Pi GCV Unit Standard & High-Precision Converter
 * Global Consensus Value (GCV) = $314,159.00 USD
 * 
 * 1 Pi       = 10^0  Pi = $314,159.00 USD
 * 1 Milli-Pi = 10^-3 Pi = $314.159 USD
 * 1 Micro-Pi = 10^-6 Pi = $0.314159 USD (~31.4 cents)
 * 1 Nano-Pi  = 10^-9 Pi = $0.000314159 USD (~0.03 cents)
 * 1 Pico-Pi  = 10^-12 Pi = $0.000000314 USD
 * 1 Atto-Pi  = 10^-18 Pi = $0.000000000000314 USD
 */

const GCV_USD = 314159n; // USD per 1 full Pi
const USD_DECIMALS = 8n;
const GCV_USD_8DEC = 314159_00000000n; // $314,159.00000000
const ATTO_PER_PI = 10n ** 18n;

export const UNITS = {
  PI: 10n ** 18n,
  MILLI: 10n ** 15n,
  MICRO: 10n ** 12n,
  NANO: 10n ** 9n,
  PICO: 10n ** 6n,
  ATTO: 1n,
};

/**
 * Convert USD (floating number or string) to precise Atto-Pi BigInt
 * @param {number|string} usdAmount e.g. 3.50 (for a coffee)
 * @returns {bigint} BigInt in Atto-Pi
 */
export function usdToAttoPi(usdAmount) {
  const scaledUsd = BigInt(Math.round(Number(usdAmount) * 1e8));
  // attoPi = (scaledUsd * 10^18) / GCV_USD_8DEC
  return (scaledUsd * ATTO_PER_PI) / GCV_USD_8DEC;
}

/**
 * Convert Atto-Pi BigInt into exact USD
 * @param {bigint} attoPi
 * @returns {number} USD value
 */
export function attoPiToUsd(attoPi) {
  const usd8 = (BigInt(attoPi) * GCV_USD_8DEC) / ATTO_PER_PI;
  return Number(usd8) / 1e8;
}

/**
 * Format Atto-Pi into human-readable friendly unit breakdown
 * @param {bigint|string} attoPi
 */
export function formatFriendlyPi(attoPi) {
  const val = BigInt(attoPi);
  if (val >= UNITS.PI) {
    const whole = val / UNITS.PI;
    const rem = ((val % UNITS.PI) * 1000n) / UNITS.PI;
    return `${whole}.${rem.toString().padStart(3, '0')} π (Pi)`;
  } else if (val >= UNITS.MILLI) {
    const whole = val / UNITS.MILLI;
    return `${whole} mπ (Milli-Pi)`;
  } else if (val >= UNITS.MICRO) {
    const whole = val / UNITS.MICRO;
    return `${whole} µπ (Micro-Pi)`;
  } else if (val >= UNITS.NANO) {
    const whole = val / UNITS.NANO;
    return `${whole} nπ (Nano-Pi)`;
  } else if (val >= UNITS.PICO) {
    const whole = val / UNITS.PICO;
    return `${whole} pπ (Pico-Pi)`;
  } else {
    return `${val} aπ (Atto-Pi)`;
  }
}

/**
 * Common item price benchmarks at $314,159 GCV
 */
export const GCV_BENCHMARKS = [
  { item: "Single Espresso", usd: 3.50, category: "F&B" },
  { item: "Subway Ticket", usd: 2.75, category: "Transport" },
  { item: "1-Month High-Speed Fiber", usd: 45.00, category: "Utilities" },
  { item: "EV Supercharging (50 kWh)", usd: 18.00, category: "Energy" },
  { item: "Smartphone Flagship", usd: 999.00, category: "Electronics" },
  { item: "Electric Vehicle (Tesla Model 3)", usd: 38990.00, category: "Automotive" },
  { item: "Modern Suburban Home", usd: 314159.00, category: "Real Estate" }
];
