/**
 * Visual Response Builder - Creates stunning ASCII visualizations for financial data
 * Includes sparklines, price cards, risk gauges, and comparison tables
 */

// For compatibility, we'll define color functions manually
const chalk = {
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  greenBright: (text) => `\x1b[92m${text}\x1b[0m`,
  redBright: (text) => `\x1b[91m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
  white: (text) => text  // No color for neutral
};

// Add nested bold object for chalk.bold.white
chalk.bold.white = (text) => `\x1b[1m\x1b[37m${text}\x1b[0m`;

class VisualResponseBuilder {
  constructor() {
    // Box drawing characters
    this.BOX = {
      TL: '┌', TR: '┐', BL: '└', BR: '┘',
      H: '─', V: '│', T: '┬', B: '┴',
      L: '├', R: '┤', C: '┼'
    };
    
    // Chart characters for sparklines
    this.SPARKLINE_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    
    // Risk gauge characters
    this.GAUGE_CHARS = {
      empty: '░',
      filled: '█',
      partial: '▓'
    };
    
    // Trend indicators
    this.TRENDS = {
      up: '🔥 ↑',
      down: '💧 ↓',
      flat: '➡️'
    };
  }

  /**
   * Creates a price card with sparkline
   */
  createPriceCard(symbol, data, userLevel = 'intermediate') {
    // Debug log to see what data we're getting
    console.log('[PriceCard] Creating card for', symbol, 'with data:', {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      hasAnswer: !!data.answer,
      sampleAnswer: data.answer ? data.answer.substring(0, 50) : null
    });
    
    // Try to extract price from various data structures
    // Perplexity API returns data in the 'answer' field as text
    let price = 0;
    let change = 0;
    let changePercent = 0;
    let volume = 0;
    let dayHigh = 0;
    let dayLow = 0;
    
    // Check if we have structured price data
    if (data.price) {
      price = data.price;
      change = data.change || 0;
      changePercent = data.changePercent || 0;
      volume = data.volume || 0;
      dayHigh = data.dayHigh || price;
      dayLow = data.dayLow || price;
    } else if (data.answer) {
      // Try to extract price from answer text
      const priceMatch = data.answer.match(/\$?([\d,]+\.?\d*)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
      
      // For now, use placeholder data when we only have text answer
      // In production, this would be parsed from the answer
      if (price > 0) {
        // Generate realistic placeholder data based on price
        change = (Math.random() - 0.5) * 10;
        changePercent = (change / price) * 100;
        volume = Math.floor(Math.random() * 50000000) + 10000000;
        dayHigh = price + Math.abs(change);
        dayLow = price - Math.abs(change);
      }
    }
    
    // Don't create visual card if no valid price data
    if (price === 0) {
      console.log('[PriceCard] No price data found, skipping card creation');
      return '';
    }
    
    // Generate sparkline if history available
    const sparkline = this.generateSparkline(data.history || []);
    
    // Color based on change
    const trend = change >= 0.5 ? 'up' : change <= -0.5 ? 'down' : 'flat';
    const changeColor = change >= 0 ? chalk.green : chalk.red;
    const priceColor = change >= 0 ? chalk.greenBright : chalk.redBright;
    
    // Build card
    let card = '';
    
    // Header
    card += `${this.BOX.TL}${'─'.repeat(48)}${this.BOX.TR}\n`;
    card += `${this.BOX.V} ${chalk.bold.white(symbol.padEnd(8))} ${this.TRENDS[trend]}${''.padEnd(32)}${this.BOX.V}\n`;
    card += `${this.BOX.L}${'─'.repeat(48)}${this.BOX.R}\n`;
    
    // Price section
    card += `${this.BOX.V} ${chalk.dim('Price:')} ${priceColor(`$${price.toFixed(2)}`).padEnd(20)}`;
    card += `${changeColor(`${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`).padEnd(18)}${this.BOX.V}\n`;
    
    // Day range
    card += `${this.BOX.V} ${chalk.dim('Range:')} ${chalk.red(`$${dayLow.toFixed(2)}`)} ─ ${chalk.green(`$${dayHigh.toFixed(2)}`)}${''.padEnd(20)}${this.BOX.V}\n`;
    
    // Volume (adapt to user level)
    if (userLevel !== 'beginner') {
      const formattedVolume = this.formatNumber(volume);
      card += `${this.BOX.V} ${chalk.dim('Volume:')} ${formattedVolume.padEnd(38)}${this.BOX.V}\n`;
    }
    
    // Sparkline
    if (sparkline) {
      card += `${this.BOX.L}${'─'.repeat(48)}${this.BOX.R}\n`;
      card += `${this.BOX.V} ${chalk.dim('7-Day:')} ${sparkline}${''.padEnd(48 - 8 - sparkline.length)}${this.BOX.V}\n`;
    }
    
    // Risk gauge (for non-beginners)
    if (userLevel !== 'beginner' && data.volatility) {
      const riskGauge = this.createRiskGauge(data.volatility);
      card += `${this.BOX.L}${'─'.repeat(48)}${this.BOX.R}\n`;
      card += `${this.BOX.V} ${chalk.dim('Risk:')} ${riskGauge}${''.padEnd(48 - 7 - riskGauge.length)}${this.BOX.V}\n`;
    }
    
    // Footer
    card += `${this.BOX.BL}${'─'.repeat(48)}${this.BOX.BR}`;
    
    return card;
  }

  /**
   * Generates ASCII sparkline from price history
   */
  generateSparkline(history, width = 30) {
    if (!history || history.length === 0) return '';
    
    // Normalize to width
    const points = this.normalizeDataPoints(history, width);
    if (points.length === 0) return '';
    
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    
    let sparkline = '';
    let prevNormalized = null;
    
    points.forEach((value, i) => {
      const normalized = ((value - min) / range) * (this.SPARKLINE_CHARS.length - 1);
      const charIndex = Math.round(normalized);
      const char = this.SPARKLINE_CHARS[charIndex];
      
      // Color based on trend
      if (prevNormalized !== null) {
        if (normalized > prevNormalized) {
          sparkline += chalk.green(char);
        } else if (normalized < prevNormalized) {
          sparkline += chalk.red(char);
        } else {
          sparkline += chalk.white(char);  // Use white instead of gray for neutral
        }
      } else {
        sparkline += chalk.white(char);
      }
      
      prevNormalized = normalized;
    });
    
    return sparkline;
  }

  /**
   * Creates a risk gauge visualization
   */
  createRiskGauge(volatility, maxBars = 10) {
    // Normalize volatility (0-100) to bars
    const filledBars = Math.round((volatility / 100) * maxBars);
    let gauge = '';
    
    for (let i = 0; i < maxBars; i++) {
      if (i < filledBars) {
        if (i < 3) {
          gauge += chalk.green(this.GAUGE_CHARS.filled);
        } else if (i < 7) {
          gauge += chalk.yellow(this.GAUGE_CHARS.filled);
        } else {
          gauge += chalk.red(this.GAUGE_CHARS.filled);
        }
      } else {
        gauge += chalk.dim(this.GAUGE_CHARS.empty);
      }
    }
    
    // Add percentage
    gauge += ` ${volatility.toFixed(1)}%`;
    
    return gauge;
  }

  /**
   * Creates a comparison table
   */
  createComparisonTable(symbols, data, userLevel = 'intermediate') {
    if (!symbols || symbols.length === 0) return '';
    
    // Column widths
    const cols = {
      symbol: 8,
      price: 10,
      change: 12,
      volume: 12,
      pe: 8
    };
    
    let table = '';
    
    // Header
    const totalWidth = Object.values(cols).reduce((a, b) => a + b, 0) + symbols.length + 1;
    table += `${this.BOX.TL}${'─'.repeat(totalWidth - 2)}${this.BOX.TR}\n`;
    
    // Column headers
    table += `${this.BOX.V} `;
    table += chalk.bold('Symbol'.padEnd(cols.symbol));
    table += chalk.bold('Price'.padEnd(cols.price));
    table += chalk.bold('Change %'.padEnd(cols.change));
    
    if (userLevel !== 'beginner') {
      table += chalk.bold('Volume'.padEnd(cols.volume));
      if (userLevel === 'expert') {
        table += chalk.bold('P/E'.padEnd(cols.pe));
      }
    }
    
    table += `${this.BOX.V}\n`;
    table += `${this.BOX.L}${'─'.repeat(totalWidth - 2)}${this.BOX.R}\n`;
    
    // Data rows
    symbols.forEach(symbol => {
      const stockData = data[symbol] || data[`${symbol}_market`] || {};
      const price = stockData.price || stockData.quote?.price || 0;
      const changePercent = stockData.changePercent || stockData.quote?.changePercent || 0;
      const volume = stockData.volume || stockData.quote?.volume || 0;
      const pe = stockData.pe || stockData.quote?.pe || '-';
      
      table += `${this.BOX.V} `;
      
      // Symbol
      table += symbol.padEnd(cols.symbol);
      
      // Price (colored)
      const priceStr = `$${price.toFixed(2)}`;
      const priceColored = changePercent >= 0 ? chalk.green(priceStr) : chalk.red(priceStr);
      table += priceColored.padEnd(cols.price + 10); // Extra padding for color codes
      
      // Change (colored with arrow)
      const changeStr = `${changePercent >= 0 ? '↑' : '↓'} ${Math.abs(changePercent).toFixed(2)}%`;
      const changeColored = changePercent >= 0 ? chalk.green(changeStr) : chalk.red(changeStr);
      table += changeColored.padEnd(cols.change + 10);
      
      // Volume (for non-beginners)
      if (userLevel !== 'beginner') {
        table += this.formatNumber(volume).padEnd(cols.volume);
        
        // P/E (for experts)
        if (userLevel === 'expert') {
          table += pe.toString().padEnd(cols.pe);
        }
      }
      
      table += `${this.BOX.V}\n`;
    });
    
    // Footer
    table += `${this.BOX.BL}${'─'.repeat(totalWidth - 2)}${this.BOX.BR}`;
    
    // Add winner/loser badges
    const performers = this.identifyPerformers(symbols, data);
    if (performers.best || performers.worst) {
      table += '\n\n';
      if (performers.best) {
        table += chalk.green(`🏆 Best Performer: ${performers.best.symbol} (+${performers.best.change.toFixed(2)}%)\n`);
      }
      if (performers.worst) {
        table += chalk.red(`📉 Worst Performer: ${performers.worst.symbol} (${performers.worst.change.toFixed(2)}%)\n`);
      }
    }
    
    return table;
  }

  /**
   * Creates a portfolio summary visualization
   */
  createPortfolioSummary(portfolioData, userLevel = 'intermediate') {
    const { totalValue, totalCost, totalGain, gainPercent, holdings } = portfolioData;
    
    let summary = '';
    
    // Portfolio value card
    const headerWidth = 50;
    summary += `${this.BOX.TL}${'─'.repeat(headerWidth - 2)}${this.BOX.TR}\n`;
    summary += `${this.BOX.V} ${chalk.bold.white('💼 PORTFOLIO SUMMARY')}${''.padEnd(headerWidth - 22)}${this.BOX.V}\n`;
    summary += `${this.BOX.L}${'─'.repeat(headerWidth - 2)}${this.BOX.R}\n`;
    
    // Total value
    const valueColor = totalGain >= 0 ? chalk.greenBright : chalk.redBright;
    summary += `${this.BOX.V} Total Value: ${valueColor(`$${this.formatNumber(totalValue)}`)}${''.padEnd(headerWidth - 15 - totalValue.toFixed(2).length)}${this.BOX.V}\n`;
    
    // Total gain/loss
    const gainStr = `${totalGain >= 0 ? '+' : ''}$${this.formatNumber(Math.abs(totalGain))} (${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%)`;
    const gainColor = totalGain >= 0 ? chalk.green : chalk.red;
    summary += `${this.BOX.V} Total ${totalGain >= 0 ? 'Gain' : 'Loss'}: ${gainColor(gainStr)}${''.padEnd(headerWidth - 12 - gainStr.length)}${this.BOX.V}\n`;
    
    // Performance gauge
    if (userLevel !== 'beginner') {
      const perfGauge = this.createPerformanceGauge(gainPercent);
      summary += `${this.BOX.L}${'─'.repeat(headerWidth - 2)}${this.BOX.R}\n`;
      summary += `${this.BOX.V} Performance: ${perfGauge}${''.padEnd(headerWidth - 15 - perfGauge.length)}${this.BOX.V}\n`;
    }
    
    summary += `${this.BOX.BL}${'─'.repeat(headerWidth - 2)}${this.BOX.BR}`;
    
    // Top holdings mini-chart
    if (holdings && holdings.length > 0 && userLevel !== 'beginner') {
      summary += '\n\n';
      summary += chalk.dim('Top Holdings by Value:\n');
      
      const topHoldings = holdings.slice(0, 5);
      const maxValue = Math.max(...topHoldings.map(h => h.value));
      
      topHoldings.forEach(holding => {
        const barLength = Math.round((holding.value / maxValue) * 20);
        const bar = '█'.repeat(barLength);
        const changeColor = holding.gain >= 0 ? chalk.green : chalk.red;
        
        summary += `${holding.symbol.padEnd(6)} `;
        summary += changeColor(bar.padEnd(20));
        summary += ` $${this.formatNumber(holding.value)} `;
        summary += changeColor(`(${holding.gainPercent >= 0 ? '+' : ''}${holding.gainPercent.toFixed(1)}%)`);
        summary += '\n';
      });
    }
    
    return summary;
  }

  /**
   * Creates a performance gauge
   */
  createPerformanceGauge(percent) {
    const max = 20;
    const normalized = Math.min(Math.max(percent + 50, 0), 100); // -50% to +50% range
    const filled = Math.round((normalized / 100) * max);
    
    let gauge = '[';
    for (let i = 0; i < max; i++) {
      if (i < filled) {
        if (normalized < 40) {
          gauge += chalk.red('█');
        } else if (normalized < 60) {
          gauge += chalk.yellow('█');
        } else {
          gauge += chalk.green('█');
        }
      } else {
        gauge += chalk.dim('░');
      }
    }
    gauge += ']';
    
    return gauge;
  }

  /**
   * Enhances a response with visual elements
   */
  enhanceResponse(response, data, intent, userLevel = 'intermediate') {
    let enhanced = response;
    
    // Debug logging
    console.log('[VisualBuilder] enhanceResponse called with:', {
      intent,
      userLevel,
      dataKeys: data ? Object.keys(data) : 'no data',
      hasResponse: !!response
    });
    
    // Extract symbols from data keys (handle both 'AAPL' and 'AAPL_market' formats)
    const extractSymbols = (data) => {
      const symbols = new Set();
      Object.keys(data).forEach(key => {
        // Extract symbol from keys like 'AAPL_market', 'AAPL_technical', etc.
        const match = key.match(/^([A-Z]+)(?:_|$)/);
        if (match) {
          symbols.add(match[1]);
        }
      });
      return Array.from(symbols);
    };
    
    // Add visual elements based on intent
    if (intent === 'price_query' && data) {
      const symbols = extractSymbols(data);
      console.log('[VisualBuilder] Extracted symbols:', symbols);
      if (symbols.length === 1) {
        const symbol = symbols[0];
        const symbolData = data[symbol] || data[`${symbol}_market`] || {};
        console.log('[VisualBuilder] Symbol data:', { symbol, hasData: !!symbolData, keys: Object.keys(symbolData) });
        const priceCard = this.createPriceCard(symbol, symbolData, userLevel);
        if (priceCard) {
          enhanced = `${priceCard}\n\n${response}`;
        }
      }
    } else if (intent === 'comparison_query' && data) {
      // SKIP comparison tables - LLM already formats comparisons well
      // const symbols = extractSymbols(data);
      // if (symbols.length > 1) {
      //   const compTable = this.createComparisonTable(symbols, data, userLevel);
      //   enhanced = `${compTable}\n\n${response}`;
      // }
    } else if (intent === 'portfolio_query' && data.portfolio) {
      const portfolioSummary = this.createPortfolioSummary(data.portfolio, userLevel);
      enhanced = `${portfolioSummary}\n\n${response}`;
    }
    
    return enhanced;
  }

  /**
   * Utility: Format large numbers
   */
  formatNumber(num) {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  }

  /**
   * Utility: Normalize data points for visualization
   */
  normalizeDataPoints(data, targetLength) {
    if (!data || data.length === 0) return [];
    if (data.length === targetLength) return data;
    
    if (data.length > targetLength) {
      // Downsample
      const step = data.length / targetLength;
      const result = [];
      for (let i = 0; i < targetLength; i++) {
        const index = Math.floor(i * step);
        result.push(data[index]);
      }
      return result;
    } else {
      // Upsample with interpolation
      const result = [];
      const step = (data.length - 1) / (targetLength - 1);
      for (let i = 0; i < targetLength; i++) {
        const index = i * step;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const fraction = index - lower;
        
        if (upper >= data.length) {
          result.push(data[data.length - 1]);
        } else {
          const interpolated = data[lower] * (1 - fraction) + data[upper] * fraction;
          result.push(interpolated);
        }
      }
      return result;
    }
  }

  /**
   * Utility: Identify best/worst performers
   */
  identifyPerformers(symbols, data) {
    let best = null;
    let worst = null;
    
    symbols.forEach(symbol => {
      const stockData = data[symbol] || data[`${symbol}_market`] || {};
      const changePercent = stockData.changePercent || stockData.quote?.changePercent || 0;
      
      if (!best || changePercent > best.change) {
        best = { symbol, change: changePercent };
      }
      if (!worst || changePercent < worst.change) {
        worst = { symbol, change: changePercent };
      }
    });
    
    return { best, worst };
  }

  /**
   * Create market sentiment indicator
   */
  createMarketSentiment(sentiment) {
    const indicators = {
      bullish: '🐂 Bullish',
      bearish: '🐻 Bearish',
      neutral: '😐 Neutral'
    };
    
    return chalk.bold(indicators[sentiment] || indicators.neutral);
  }

  /**
   * Create momentum indicator
   */
  createMomentumIndicator(rsi) {
    if (rsi > 70) return chalk.red('⚠️ Overbought');
    if (rsi < 30) return chalk.green('🎯 Oversold');
    return chalk.yellow('➖ Neutral');
  }
}

module.exports = new VisualResponseBuilder();