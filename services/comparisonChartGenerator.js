const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} = require('chart.js');

const logger = require('../utils/logger');
const MarketDataService = require('../src/knowledge/market-data-service');

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

class ComparisonChartGenerator {
  constructor() {
    this.marketDataService = new MarketDataService();
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: 800, 
      height: 500,  // Taller for comparison charts
      backgroundColour: '#0a0e27'
    });
    
    // Distinct colors for each symbol
    this.colors = [
      '#00D4FF',  // Bright blue - BTC
      '#FFB800',  // Orange - ETH
      '#FF6B6B',  // Red - Others
      '#4ECDC4',  // Teal
      '#45B7D1',  // Light blue
      '#96CEB4',  // Green
      '#FFEAA7',  // Yellow
      '#DDA0DD'   // Plum
    ];
  }

  /**
   * Generate percentage-based comparison chart
   * Shows relative performance from a 100% baseline
   */
  async generateComparisonChart(symbols, timeframe = '7d', currentMarketData = {}) {
    try {
      logger.info(`[ComparisonChart] Generating comparison chart for symbols: ${symbols.join(', ')} (${timeframe})`);
      
      if (!symbols || symbols.length < 2) {
        throw new Error('Need at least 2 symbols for comparison');
      }
      
      // Limit to 5 symbols for readability
      const symbolsToChart = symbols.slice(0, 5);
      
      // Determine timeframe parameters
      const timeParams = this.getTimeframeParams(timeframe);
      
      // Fetch historical data for all symbols
      const historicalData = await this.fetchAllHistoricalData(symbolsToChart, timeParams);
      
      // Generate the chart configuration
      const chartConfig = this.buildComparisonChartConfig(symbolsToChart, historicalData, currentMarketData, timeframe);
      
      // Generate the chart image
      const chartBuffer = await this.chartJSNodeCanvas.renderToBuffer(chartConfig);
      
      // Return chart configuration for client-side rendering
      return {
        type: 'comparison',
        title: `${symbolsToChart.join(' vs ')} - ${timeframe.toUpperCase()} Performance Comparison`,
        subtitle: 'Percentage change from start (normalized to 100%)',
        data: chartConfig.data,
        options: chartConfig.options,
        buffer: chartBuffer,  // For server-side image generation
        metadata: {
          symbols: symbolsToChart,
          timeframe,
          generatedAt: new Date().toISOString(),
          baselineNote: 'All assets normalized to 100% at start of period'
        }
      };
      
    } catch (error) {
      logger.error(`[ComparisonChart] Error generating chart: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get timeframe parameters for data fetching
   */
  getTimeframeParams(timeframe) {
    const now = new Date();
    const params = {
      endDate: now,
      interval: '1d'
    };
    
    switch (timeframe.toLowerCase()) {
      case '7d':
        params.startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        params.interval = '1d';
        break;
      case '30d':
        params.startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        params.interval = '1d';
        break;
      case '90d':
        params.startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        params.interval = '1d';
        break;
      case '1y':
        params.startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        params.interval = '1wk';
        break;
      default:
        params.startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        params.interval = '1d';
    }
    
    return params;
  }

  /**
   * Fetch historical data for all symbols
   */
  async fetchAllHistoricalData(symbols, timeParams) {
    const data = {};
    
    for (const symbol of symbols) {
      try {
        // Try to get historical data
        const historicalData = await this.getHistoricalPrices(symbol, timeParams);
        data[symbol] = historicalData;
        
        logger.info(`[ComparisonChart] Fetched ${historicalData.length} data points for ${symbol}`);
        
      } catch (error) {
        logger.warn(`[ComparisonChart] Failed to fetch historical data for ${symbol}: ${error.message}`);
        
        // Generate mock data for symbols we can't fetch
        data[symbol] = this.generateMockHistoricalData(symbol, timeParams);
      }
    }
    
    return data;
  }

  /**
   * Generate mock historical data for symbols
   */
  generateMockHistoricalData(symbol, timeParams) {
    const data = [];
    const days = Math.ceil((timeParams.endDate - timeParams.startDate) / (24 * 60 * 60 * 1000));
    
    // Base prices for different asset types
    const basePrices = {
      'BTC': 118000, 'ETH': 3800, 'AAPL': 215, 'TSLA': 320, 'NVDA': 175,
      'MSFT': 430, 'GOOGL': 185, 'AMZN': 200, 'META': 580, 'GOLD': 3350
    };
    
    let currentPrice = basePrices[symbol] || 100;
    
    // Generate realistic price movements
    for (let i = 0; i <= days; i++) {
      const date = new Date(timeParams.startDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Random walk with different volatilities by asset type
      const volatility = this.getAssetVolatility(symbol);
      const change = (Math.random() - 0.5) * volatility;
      currentPrice *= (1 + change);
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: currentPrice,
        timestamp: date.getTime()
      });
    }
    
    return data;
  }

  /**
   * Get historical prices for a symbol
   */
  async getHistoricalPrices(symbol, timeParams) {
    // This would integrate with Yahoo Finance or other historical data providers
    // For now, generate realistic mock data
    return this.generateMockHistoricalData(symbol, timeParams);
  }

  /**
   * Get asset volatility for mock data generation
   */
  getAssetVolatility(symbol) {
    const volatilities = {
      'BTC': 0.04,    // 4% daily volatility
      'ETH': 0.045,   // 4.5%
      'TSLA': 0.035,  // 3.5%
      'NVDA': 0.03,   // 3%
      'AAPL': 0.02,   // 2%
      'MSFT': 0.018,  // 1.8%
      'GOLD': 0.015   // 1.5%
    };
    
    return volatilities[symbol] || 0.025; // Default 2.5%
  }

  /**
   * Build Chart.js configuration for comparison chart
   */
  buildComparisonChartConfig(symbols, historicalData, currentMarketData, timeframe) {
    // Normalize all data to percentage change from start (100% baseline)
    const normalizedData = this.normalizeToPercentage(symbols, historicalData);
    
    // Get dates from the first symbol's data
    const dates = historicalData[symbols[0]]?.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }) || [];

    // Create datasets for each symbol
    const datasets = symbols.map((symbol, index) => {
      const data = normalizedData[symbol] || [];
      const color = this.colors[index % this.colors.length];
      
      // Get current change for the symbol
      const currentChange = currentMarketData[`${symbol}_market`]?.changePercent || 0;
      
      return {
        label: `${symbol} ${currentChange >= 0 ? '+' : ''}${currentChange.toFixed(2)}%`,
        data: data,
        borderColor: color,
        backgroundColor: color + '20',  // 20% opacity for fill
        borderWidth: 3,
        fill: false,
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      };
    });

    return {
      type: 'line',
      data: {
        labels: dates,
        datasets: datasets
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          title: {
            display: true,
            text: `${symbols.join(' vs ')} - Performance Comparison`,
            color: '#ffffff',
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: 20
          },
          subtitle: {
            display: true,
            text: 'Percentage change from start (normalized to 100%)',
            color: '#cccccc',
            font: {
              size: 14
            }
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                size: 12,
                weight: 'bold'
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'line'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.9)',
            titleColor: '#ffffff',
            bodyColor: '#00D4FF',
            borderColor: '#00D4FF',
            borderWidth: 1,
            displayColors: true,
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                const symbol = context.dataset.label.split(' ')[0];
                const value = context.parsed.y;
                const change = value - 100;
                return `${symbol}: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: timeframe.toUpperCase() + ' Timeline',
              color: '#ffffff',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            ticks: {
              color: '#cccccc',
              maxTicksLimit: 8
            },
            grid: {
              color: '#2a2a3a',
              lineWidth: 1
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Percentage Change (%)',
              color: '#ffffff',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            ticks: {
              color: '#cccccc',
              callback: function(value) {
                const change = value - 100;
                return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
              }
            },
            grid: {
              color: '#2a2a3a',
              lineWidth: 1
            },
            // Add a reference line at 100% (no change)
            afterDataLimits: function(scale) {
              const range = scale.max - scale.min;
              scale.min = Math.min(scale.min, 100 - range * 0.1);
              scale.max = Math.max(scale.max, 100 + range * 0.1);
            }
          }
        },
        elements: {
          point: {
            hoverRadius: 8
          }
        }
      }
    };
  }

  /**
   * Normalize all historical data to percentage change from start
   */
  normalizeToPercentage(symbols, historicalData) {
    const normalized = {};
    
    symbols.forEach(symbol => {
      const data = historicalData[symbol];
      if (!data || data.length === 0) {
        normalized[symbol] = [];
        return;
      }
      
      const startPrice = data[0].price;
      normalized[symbol] = data.map(point => {
        return ((point.price / startPrice) * 100); // Convert to percentage with 100% baseline
      });
    });
    
    return normalized;
  }
}

module.exports = new ComparisonChartGenerator();