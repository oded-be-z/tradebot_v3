/**
 * Comprehensive Number Formatting Utility
 * Provides consistent, professional formatting for financial data
 */

class NumberFormatter {
  /**
   * Format a price value with proper currency formatting
   * @param {number} value - The price value to format
   * @param {string} currency - Currency symbol (default: 'USD')
   * @returns {string} - Formatted price string (e.g., "$1,234.56")
   */
  static formatPrice(value, currency = 'USD') {
    if (value === null || value === undefined || isNaN(value)) {
      return '$0.00';
    }

    // Handle very small values (avoid scientific notation)
    if (Math.abs(value) < 0.01 && value !== 0) {
      const decimals = Math.max(2, Math.ceil(-Math.log10(Math.abs(value))) + 1);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    }

    // Standard price formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Format a percentage with proper sign and decimal places
   * @param {number} value - The percentage value
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} - Formatted percentage string (e.g., "+14.50%" or "-3.25%")
   */
  static formatPercentage(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00%';
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      return '0.00%';
    }

    const sign = num >= 0 ? '+' : '';
    const arrow = num >= 0 ? ' ▲' : ' ▼';
    return sign + num.toFixed(decimals) + '%' + arrow;
  }

  /**
   * Format volume with appropriate units (K, M, B)
   * @param {number} value - The volume value
   * @param {string} unit - Unit type (e.g., 'shares', 'contracts', 'coins')
   * @returns {string} - Formatted volume string (e.g., "42.3M shares")
   */
  static formatVolume(value, unit = 'shares') {
    if (!value) return 'N/A';
    
    const cleanedValue = value.toString().replace(/,/g, '');
    const num = parseFloat(cleanedValue);
    if (isNaN(num)) return 'N/A';
    
    let formatted;
    
    if (num >= 1e9) {
      formatted = (num / 1e9).toFixed(1) + 'B';
    } else if (num >= 1e6) {
      formatted = (num / 1e6).toFixed(1) + 'M';
    } else if (num >= 1e3) {
      formatted = (num / 1e3).toFixed(1) + 'K';
    } else {
      formatted = Math.round(num).toLocaleString();
    }
    
    // NEVER add $ sign to volume!
    return `${formatted} ${unit}`;
  }

  /**
   * Format a large number with commas and proper decimal places
   * @param {number} value - The number to format
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} - Formatted number string (e.g., "1,234,567.89")
   */
  static formatLargeNumber(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Format change amount with proper sign and currency
   * @param {number} changePercent - The percentage change
   * @param {number} currentPrice - Current price for calculating change amount
   * @returns {object} - Object with formatted change text and amount
   */
  static formatPriceChange(changePercent, currentPrice) {
    if (changePercent === null || changePercent === undefined || isNaN(changePercent)) {
      return { text: 'unchanged', amount: '($0.00)' };
    }

    // Handle zero change specially
    if (changePercent === 0) {
      return { text: 'unchanged', amount: '($0.00)' };
    }

    const changeAmount = Math.abs(currentPrice * (changePercent / 100));
    
    if (changePercent > 0) {
      const changeText = `up ${changePercent.toFixed(2)}%`;
      const changeAmountText = `(+${this.formatPrice(changeAmount)})`;
      return { text: changeText, amount: changeAmountText };
    } else {
      const changeText = `down ${Math.abs(changePercent).toFixed(2)}%`;
      const changeAmountText = `(-${this.formatPrice(changeAmount)})`;
      return { text: changeText, amount: changeAmountText };
    }
  }

  /**
   * Format moving average with consistent decimal places
   * @param {number} value - The moving average value
   * @returns {string} - Formatted moving average (e.g., "$1,234.56")
   */
  static formatMovingAverage(value) {
    if (value === null || value === undefined || isNaN(value) || value === 'N/A') {
      return 'N/A';
    }

    return this.formatPrice(value);
  }

  /**
   * Format a price range (52-week high/low)
   * @param {number} high - High price
   * @param {number} low - Low price
   * @returns {string} - Formatted range string (e.g., "$1,234.56 - $2,345.67")
   */
  static formatPriceRange(high, low) {
    const highFormatted = this.formatPrice(high);
    const lowFormatted = this.formatPrice(low);
    return `${highFormatted} - ${lowFormatted}`;
  }

  /**
   * Calculate and format volatility assessment
   * @param {number} high52 - 52-week high
   * @param {number} low52 - 52-week low
   * @returns {string} - Volatility description ("significant", "moderate", "low")
   */
  static assessVolatility(high52, low52) {
    if (!high52 || !low52 || high52 <= low52) {
      return 'moderate';
    }

    const volatilityRatio = (high52 - low52) / low52;
    
    if (volatilityRatio > 1.0) return 'significant';
    if (volatilityRatio > 0.5) return 'moderate'; 
    return 'low';
  }

  /**
   * Format market cap with appropriate units
   * @param {number} value - Market cap value
   * @returns {string} - Formatted market cap (e.g., "$1.2T", "$450.3B")
   */
  static formatMarketCap(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }

    if (value >= 1e12) {
      return '$' + (value / 1e12).toFixed(1) + 'T';
    } else if (value >= 1e9) {
      return '$' + (value / 1e9).toFixed(1) + 'B';
    } else if (value >= 1e6) {
      return '$' + (value / 1e6).toFixed(1) + 'M';
    } else {
      return this.formatPrice(value);
    }
  }

  /**
   * Comprehensive number validation and formatting
   * @param {any} value - Value to validate and format
   * @param {string} type - Type of formatting needed
   * @returns {string} - Safely formatted value
   */
  static safeFormat(value, type = 'price') {
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return type === 'price' ? '$0.00' : '0';
      }

      switch (type) {
        case 'price':
          return this.formatPrice(numValue);
        case 'percentage':
          return this.formatPercentage(numValue);
        case 'volume':
          return this.formatVolume(numValue);
        case 'large':
          return this.formatLargeNumber(numValue);
        default:
          return numValue.toString();
      }
    } catch (error) {
      console.error('Number formatting error:', error);
      return type === 'price' ? '$0.00' : '0';
    }
  }

  /**
   * Universal formatNumber function as requested
   * @param {any} value - Value to format
   * @param {string} type - Type of formatting
   * @returns {string} - Formatted value
   */
  static formatNumber(value, type = 'price') {
    if (value === null || value === undefined) return 'N/A';
    
    if (type === 'price') {
      // Ensure no scientific notation
      const num = parseFloat(value);
      if (isNaN(num)) return '$0.00';
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    } else if (type === 'percentage') {
      const num = parseFloat(value);
      if (isNaN(num)) return '0.00%';
      
      const sign = num > 0 ? '+' : '';
      return sign + num.toFixed(2) + '%';
    } else if (type === 'volume') {
      const num = parseFloat(value);
      if (isNaN(num)) return '0';
      
      if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
      if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
      return Math.round(num).toLocaleString();
    }
    
    // Default formatting for other numbers
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

module.exports = NumberFormatter;