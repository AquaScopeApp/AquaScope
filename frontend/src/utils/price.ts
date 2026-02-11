/**
 * Price Parsing Utilities
 *
 * Extracts numeric values from string-based price fields (e.g. "$249.99", "€120", "1,250.00").
 * Mirrors the backend parse_price() utility in backend/app/utils/price.py.
 */

/**
 * Extract a numeric value from a price string.
 * Handles formats: "$249.99", "€120", "150 USD", "1,250.00", "1.250,00"
 */
export function parsePrice(priceStr: string | null | undefined): number | null {
  if (!priceStr) return null

  // Strip currency symbols and letters
  let cleaned = priceStr.replace(/[^0-9.,\-]/g, '').trim()
  if (!cleaned) return null

  // Detect European format: "1.250,00" (dot as thousands, comma as decimal)
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }
  // Handle comma as decimal: "250,00"
  else if (/^\d+(,\d{1,2})$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.')
  }
  // Handle comma as thousands: "1,250.00"
  else {
    cleaned = cleaned.replace(/,/g, '')
  }

  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

/**
 * Format a number as a price string.
 * The currency parameter defaults to 'EUR' for backward compatibility,
 * but callers should prefer using the useCurrency() hook to get the app default.
 */
export function formatPrice(amount: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
