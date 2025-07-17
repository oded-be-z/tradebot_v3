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
  BarElement,
  ArcElement,
  Filler
} = require('chart.js');

const logger = require('../utils/logger');

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  Filler
);

class SmartChartGenerator {
  constructor() {
    logger.debug("[ChartGenerator] Initialized with professional chart generation");
    // UNIFIED dimensions for all charts
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: 800, 
      height: 400,  // Consistent 2:1 aspect ratio
      backgroundColour: '#0a0e27'
    });
  }

  async generateSmartChart(symbol, type = "price", historicalData = null, currentPrice = null) {
    try {
      logger.debug(`[ChartGenerator] Generating professional chart for ${symbol}, type: ${type}, currentPrice: ${currentPrice}`);
      
      // CRITICAL: Fetch real historical data if not provided
      let data;
      if (!historicalData) {
        logger.debug(`[ChartGenerator] Fetching real historical data for ${symbol}`);
        data = await this.fetchRealHistoricalData(symbol, type);
        if (!data) {
          logger.error(`[ChartGenerator] ERROR: Failed to fetch historical data for ${symbol}`);
          return null;
        }
      } else {
        data = historicalData;
      }
      
      // Double-check the last price matches exactly
      if (currentPrice && data && data.prices && data.prices.length > 0) {
        logger.debug(`[ChartGenerator] Ensuring exact price match: $${currentPrice}`);
        
        // Validate price consistency
        const chartEndPrice = data.prices[data.prices.length - 1];
        if (Math.abs(chartEndPrice - currentPrice) > 0.01) {
          logger.warn(`[ChartGenerator] ⚠️ PRICE MISMATCH DETECTED!`);
          logger.warn(`[ChartGenerator] Text shows: $${currentPrice}`);
          logger.warn(`[ChartGenerator] Chart generated with: $${chartEndPrice}`);
          logger.warn(`[ChartGenerator] Forcing correction to match text price`);
        }
        
        // Force exact match to ensure consistency
        data.prices[data.prices.length - 1] = currentPrice;
        data.currentPrice = currentPrice;
      }
      
      // Validate data before charting
      if (!data || !data.prices || data.prices.length === 0) {
        logger.error(`[ChartGenerator] ERROR: No data available for ${symbol}`);
        logger.error(`[ChartGenerator] Data validation failed:`, {
          hasData: !!data,
          hasPrices: !!(data && data.prices),
          priceCount: data && data.prices ? data.prices.length : 0
        });
        throw new Error(`No data available for ${symbol}`);
      }
      
      logger.debug(`[ChartGenerator] Data validation passed for ${symbol}:`, {
        priceCount: data.prices.length,
        dateCount: data.dates ? data.dates.length : 0,
        firstPrice: data.prices[0],
        lastPrice: data.prices[data.prices.length - 1],
        currentPrice: data.currentPrice
      });

      // Create chart configuration
      const chartConfig = this.createChartConfig(symbol, data, type);
      
      // Generate actual chart image
      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(chartConfig);
      const base64Image = imageBuffer.toString('base64');
      
      return {
        type: "image",
        symbol: symbol,
        chartType: type,
        data: data,
        config: chartConfig,
        imageUrl: `data:image/png;base64,${base64Image}`,
        title: `${symbol} - ${this.getChartTitle(type)}`,
        timestamp: Date.now(),
        currentPrice: currentPrice || data.prices[data.prices.length - 1]
      };
    } catch (error) {
      logger.error("[ChartGenerator] Error generating chart:", error);
      return null;
    }
  }

  createChartConfig(symbol, data, type) {
    const labels = this.formatDateLabels(data.dates);
    const prices = data.prices;
    const symbolColor = this.getProfessionalColor(symbol);
    
    // UNIFIED configuration - clean line charts for all assets
    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: symbol,
          data: prices,
          borderColor: symbolColor.border,
          backgroundColor: 'transparent', // No fill for cleaner look
          borderWidth: 2, // Consistent line width
          fill: false,  // No gradient fill for consistency
          tension: 0.1, // Slight curve for smooth lines
          pointRadius: prices.map((_, index) => index === prices.length - 1 ? 8 : 0), // Only show current price point
          pointHoverRadius: 6,
          pointBackgroundColor: prices.map((_, index) => index === prices.length - 1 ? '#ff4444' : symbolColor.border),
          pointBorderColor: '#ffffff',
          pointBorderWidth: prices.map((_, index) => index === prices.length - 1 ? 3 : 2),
          pointHitRadius: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 20,
            right: 30,
            bottom: 20,
            left: 30
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          title: {
            display: true,
            text: `${symbol} - ${this.getChartTitle(type)}`,
            font: {
              size: 18,
              weight: 'bold',
              family: 'Inter, sans-serif'
            },
            color: '#ffffff',
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 14,
                family: 'Inter, sans-serif'
              },
              color: '#ffffff',
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: symbolColor.border,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `${symbol}: ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date',
              font: {
                size: 14,
                weight: 'bold',
                family: 'Inter, sans-serif'
              },
              color: 'rgba(255, 255, 255, 0.9)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              font: {
                size: 11,
                family: 'Inter, sans-serif'
              },
              color: 'rgba(255, 255, 255, 0.8)',
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 5  // Reduce to 5 for cleaner appearance
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Price (USD)',
              font: {
                size: 14,
                weight: 'bold',
                family: 'Inter, sans-serif'
              },
              color: 'rgba(255, 255, 255, 0.9)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              font: {
                size: 12,
                family: 'Inter, sans-serif'
              },
              color: 'rgba(255, 255, 255, 0.8)',
              callback: (value) => this.formatCurrency(value)
            }
          }
        }
      }
    };

    return config;
  }

  async generateComparisonChart(symbols, dataArray = null) {
    try {
      logger.debug(`[ChartGenerator] Generating professional comparison chart for ${symbols.join(' vs ')}`);
      
      // If no data provided, fetch real historical data
      if (!dataArray) {
        dataArray = [];
        for (const symbol of symbols) {
          const data = await this.fetchRealHistoricalData(symbol);
          if (data) {
            dataArray.push(data);
          } else {
            logger.error(`[ChartGenerator] Failed to fetch data for ${symbol}`);
            return null;
          }
        }
      }
      
      if (!symbols || symbols.length < 2 || !dataArray || dataArray.length < 2) {
        logger.error("[ChartGenerator] Insufficient data for comparison chart");
        return null;
      }

      const labels = this.formatDateLabels(dataArray[0].dates);
      
      // Convert to percentage change comparison for better readability
      const percentageDataArray = this.convertToPercentageChange(dataArray);
      const needsDualAxis = false; // Always use single axis for percentage comparison
      
      const datasets = symbols.map((symbol, index) => {
        const symbolColor = this.getProfessionalColor(symbol);
        const percentageData = percentageDataArray[index];
        return {
          label: `${symbol} (% Change)`,
          data: percentageData,
          borderColor: symbolColor.border,
          backgroundColor: 'transparent', // Consistent with single charts
          borderWidth: 2, // Consistent line width
          fill: false,
          tension: 0.1, // Match single chart tension
          pointRadius: percentageData.map((_, priceIndex) => priceIndex === percentageData.length - 1 ? 8 : 0), // Match single chart point size
          pointHoverRadius: 6,
          pointBackgroundColor: percentageData.map((_, priceIndex) => priceIndex === percentageData.length - 1 ? '#ff4444' : symbolColor.border),
          pointBorderColor: '#ffffff',
          pointBorderWidth: percentageData.map((_, priceIndex) => priceIndex === percentageData.length - 1 ? 3 : 2),
          yAxisID: 'y'
        };
      });

      const chartConfig = {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 20,
              right: needsDualAxis ? 50 : 30,
              bottom: 20,
              left: 50
            }
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            title: {
              display: true,
              text: `${symbols.join(' vs ')} Performance Comparison`,
              font: {
                size: 18,
                weight: 'bold',
                family: 'Inter, sans-serif'
              },
              color: '#ffffff',
              padding: {
                top: 10,
                bottom: 20
              }
            },
            legend: {
              display: true,
              position: 'top',
              labels: {
                font: {
                  size: 14,
                  family: 'Inter, sans-serif'
                },
                color: '#ffffff',
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              borderColor: '#ffffff',
              borderWidth: 1,
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y;
                  return `${context.dataset.label}: ${this.formatCurrency(value)}`;
                }
              }
            }
          },
          scales: this.createPercentageComparisonScales(symbols)
        }
      };

      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(chartConfig);
      
      return {
        type: "image",
        symbols: symbols,
        chartType: "comparison",
        imageUrl: `data:image/png;base64,${imageBuffer.toString('base64')}`,
        title: `${symbols.join(' vs ')} Performance Comparison Chart`,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error("[ChartGenerator] Error generating comparison chart:", error);
      return null;
    }
  }

  convertToPercentageChange(dataArray) {
    return dataArray.map(data => {
      const basePrices = data.prices;
      const basePrice = basePrices[0];
      return basePrices.map(price => ((price - basePrice) / basePrice) * 100);
    });
  }

  createPercentageComparisonScales(symbols) {
    const scales = {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 14,
            weight: 'bold',
            family: 'Inter, sans-serif'
          },
          color: 'rgba(255, 255, 255, 0.9)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          },
          color: 'rgba(255, 255, 255, 0.8)',
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 5
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Performance (%)',
          font: {
            size: 14,
            weight: 'bold',
            family: 'Inter, sans-serif'
          },
          color: 'rgba(255, 255, 255, 0.9)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          color: 'rgba(255, 255, 255, 0.8)',
          callback: (value) => `${value.toFixed(1)}%`
        }
      }
    };

    return scales;
  }

  createComparisonScales(needsDualAxis, dataArray, symbols) {
    const scales = {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 14,
            weight: 'bold',
            family: 'Inter, sans-serif'
          },
          color: 'rgba(255, 255, 255, 0.9)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          color: 'rgba(255, 255, 255, 0.9)',
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 8
        }
      },
      y: {
        position: 'left',
        display: true,
        title: {
          display: true,
          text: needsDualAxis ? `${symbols[0]} Price (USD)` : 'Price (USD)',
          font: {
            size: 14,
            weight: 'bold',
            family: 'Inter, sans-serif'
          },
          color: needsDualAxis ? this.getProfessionalColor(symbols[0]).border : '#8b92a3'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          color: needsDualAxis ? this.getProfessionalColor(symbols[0]).border : '#8b92a3',
          callback: (value) => this.formatCurrency(value)
        }
      }
    };

    if (needsDualAxis) {
      scales.y1 = {
        position: 'right',
        display: true,
        title: {
          display: true,
          text: `${symbols[1]} Price (USD)`,
          font: {
            size: 14,
            weight: 'bold',
            family: 'Inter, sans-serif'
          },
          color: this.getProfessionalColor(symbols[1]).border
        },
        grid: {
          drawOnChartArea: false,
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          color: this.getProfessionalColor(symbols[1]).border,
          callback: (value) => this.formatCurrency(value)
        }
      };
    }

    return scales;
  }

  shouldUseDualAxis(dataArray) {
    if (dataArray.length < 2) return false;
    
    const prices1 = dataArray[0].prices;
    const prices2 = dataArray[1].prices;
    
    const avg1 = prices1.reduce((sum, price) => sum + price, 0) / prices1.length;
    const avg2 = prices2.reduce((sum, price) => sum + price, 0) / prices2.length;
    
    const ratio = Math.max(avg1, avg2) / Math.min(avg1, avg2);
    
    // Use dual axis if the ratio is greater than 10 (e.g., Gold $2000 vs Silver $30)
    return ratio > 10;
  }

  async generatePortfolioChart(portfolioData) {
    try {
      logger.debug("[ChartGenerator] Generating professional portfolio allocation chart");
      
      if (!portfolioData || !portfolioData.allocation || portfolioData.allocation.length === 0) {
        logger.error("[ChartGenerator] No portfolio data for chart generation");
        return null;
      }

      const labels = portfolioData.allocation.map(item => item.symbol);
      const values = portfolioData.allocation.map(item => parseFloat(item.percent));
      const colors = labels.map((symbol, index) => this.getProfessionalColor(symbol, index));

      const chartConfig = {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors.map(c => c.border),
            borderColor: '#0a0e27',
            borderWidth: 3,
            hoverBorderWidth: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Portfolio Allocation',
              font: {
                size: 18,
                weight: 'bold',
                family: 'Inter, sans-serif'
              },
              color: '#ffffff',
              padding: {
                top: 10,
                bottom: 20
              }
            },
            legend: {
              display: true,
              position: 'right',
              labels: {
                font: {
                  size: 14,
                  family: 'Inter, sans-serif'
                },
                color: '#ffffff',
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 15
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              borderColor: '#ffffff',
              borderWidth: 1,
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed;
                  return `${label}: ${value.toFixed(1)}%`;
                }
              }
            }
          }
        }
      };

      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(chartConfig);
      
      return {
        type: "image",
        chartType: "portfolio",
        imageUrl: `data:image/png;base64,${imageBuffer.toString('base64')}`,
        title: "Portfolio Allocation Chart",
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error("[ChartGenerator] Error generating portfolio chart:", error);
      return null;
    }
  }

  getProfessionalColor(symbol, index = 0) {
    const colorMap = {
      // Crypto
      'BTC': {
        border: '#F7931A',
        gradient: 'rgba(247, 147, 26, 0.2)'
      },
      'ETH': {
        border: '#627EEA',
        gradient: 'rgba(98, 126, 234, 0.2)'
      },
      'DOGE': {
        border: '#C2A633',
        gradient: 'rgba(194, 166, 51, 0.2)'
      },
      
      // Commodities
      'GC': {
        border: '#FFD700',
        gradient: 'rgba(255, 215, 0, 0.2)'
      },
      'SI': {
        border: '#C0C0C0',
        gradient: 'rgba(192, 192, 192, 0.2)'
      },
      'CL': {
        border: '#000000',
        gradient: 'rgba(0, 0, 0, 0.2)'
      },
      'NG': {
        border: '#4169E1',
        gradient: 'rgba(65, 105, 225, 0.2)'
      },
      'HG': {
        border: '#B87333',
        gradient: 'rgba(184, 115, 51, 0.2)'
      },
      
      // Major Stocks
      'AAPL': {
        border: '#007AFF',
        gradient: 'rgba(0, 122, 255, 0.2)'
      },
      'MSFT': {
        border: '#00BCF2',
        gradient: 'rgba(0, 188, 242, 0.2)'
      },
      'GOOGL': {
        border: '#4285F4',
        gradient: 'rgba(66, 133, 244, 0.2)'
      },
      'AMZN': {
        border: '#FF9900',
        gradient: 'rgba(255, 153, 0, 0.2)'
      },
      'TSLA': {
        border: '#CC0000',
        gradient: 'rgba(204, 0, 0, 0.2)'
      },
      'NVDA': {
        border: '#76B900',
        gradient: 'rgba(118, 185, 0, 0.2)'
      },
      'META': {
        border: '#1877F2',
        gradient: 'rgba(24, 119, 242, 0.2)'
      }
    };

    if (colorMap[symbol]) {
      return colorMap[symbol];
    }

    // Professional default color palette
    const defaultColors = [
      { border: '#00D4FF', gradient: 'rgba(0, 212, 255, 0.2)' },    // Primary blue
      { border: '#00FF88', gradient: 'rgba(0, 255, 136, 0.2)' },    // Success green
      { border: '#FF3366', gradient: 'rgba(255, 51, 102, 0.2)' },   // Danger red
      { border: '#FFD700', gradient: 'rgba(255, 215, 0, 0.2)' },    // Gold
      { border: '#FF8C00', gradient: 'rgba(255, 140, 0, 0.2)' },    // Orange
      { border: '#9932CC', gradient: 'rgba(153, 50, 204, 0.2)' },   // Purple
      { border: '#20B2AA', gradient: 'rgba(32, 178, 170, 0.2)' },   // Teal
      { border: '#DC143C', gradient: 'rgba(220, 20, 60, 0.2)' }     // Crimson
    ];

    return defaultColors[index % defaultColors.length];
  }

  formatCurrency(value) {
    if (typeof value !== 'number') return '$0.00';
    
    // Handle large numbers with k/M notation for better readability
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 10000) {
      return `$${(value / 1000).toFixed(0)}k`;
    } else if (value >= 1000) {
      // Use locale string for thousands separator
      return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else if (value < 0.01) {
      return '$' + value.toFixed(6);
    } else if (value < 1) {
      return '$' + value.toFixed(4);
    } else {
      return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  formatDateLabels(dates) {
    if (!dates || dates.length === 0) {
      return Array.from({length: 30}, (_, i) => `Day ${i + 1}`);
    }
    
    // Show maximum 5 date labels for clean appearance
    const totalDates = dates.length;
    const step = Math.ceil(totalDates / 5);
    
    return dates.map((dateStr, index) => {
      // Show label at intervals and always show the last date
      if (index % step !== 0 && index !== dates.length - 1) {
        return ''; // Empty string for dates we don't want to show
      }
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return `Day ${index + 1}`;
      }
      
      // Format as "Jan 15" for past dates, "TODAY" for current date
      if (index === dates.length - 1) {
        return '🔥 TODAY';
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    });
  }

  getChartTitle(type) {
    const titleMap = {
      'price': 'Price History',
      'trend': 'Trend Analysis',
      'comparison': 'Comparison',
      'portfolio': 'Portfolio Allocation',
      'volume': 'Volume Analysis'
    };

    return titleMap[type] || 'Market Analysis';
  }

  async fetchRealHistoricalData(symbol, type = "price") {
    try {
      // Detect asset type
      const assetType = this.detectAssetType(symbol);
      
      if (assetType === 'crypto') {
        return await this.fetchCryptoHistoricalData(symbol);
      } else if (assetType === 'stock') {
        return await this.fetchStockHistoricalData(symbol);
      } else if (assetType === 'commodity') {
        return await this.fetchCommodityHistoricalData(symbol);
      }
      
      throw new Error(`Unknown asset type for ${symbol}`);
    } catch (error) {
      logger.error(`[ChartGenerator] Failed to fetch historical data:`, error);
      return null;
    }
  }

  async fetchCryptoHistoricalData(symbol) {
    const axios = require('axios');
    const days = 30;
    
    // Map crypto symbols to CoinGecko IDs
    const coinGeckoIds = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'DOGE': 'dogecoin',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'ADA': 'cardano',
      'XRP': 'ripple',
      'MATIC': 'matic-network',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink'
    };
    
    const coinId = coinGeckoIds[symbol] || symbol.toLowerCase();
    
    try {
      logger.debug(`[ChartGenerator] Fetching ${days}-day data from CoinGecko for ${coinId}`);
      
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
        {
          params: {
            vs_currency: 'usd',
            days: days,
            interval: 'daily'
          }
        }
      );
      
      if (response.data && response.data.prices) {
        // Transform CoinGecko data to our format
        const prices = response.data.prices.map(p => p[1]);
        const dates = response.data.prices.map(p => new Date(p[0]).toISOString());
        
        return {
          symbol: symbol,
          prices: prices,
          dates: dates,
          currentPrice: prices[prices.length - 1]
        };
      }
    } catch (error) {
      logger.error(`[ChartGenerator] CoinGecko API error:`, error.message);
    }
    
    return null;
  }

  async fetchStockHistoricalData(symbol) {
    // Use MarketDataService for stocks
    try {
      const MarketDataService = require('../src/knowledge/market-data-service');
      const marketDataService = new MarketDataService();
      
      const historicalData = await marketDataService.fetchHistoricalData(symbol, 30, '1d', 'stock');
      
      if (historicalData && historicalData.length > 0) {
        // Filter out days with missing or invalid data
        const validData = historicalData.filter(d => {
          const price = d.close || d.price;
          return price && !isNaN(price) && price > 0;
        });
        
        if (validData.length === 0) {
          logger.error(`[ChartGenerator] No valid price data for ${symbol}`);
          return null;
        }
        
        // Use only valid data points (stocks typically don't need interpolation)
        return {
          symbol: symbol,
          prices: validData.map(d => d.close || d.price),
          dates: validData.map(d => d.date),
          currentPrice: validData[validData.length - 1].close || validData[validData.length - 1].price
        };
      }
    } catch (error) {
      logger.error(`[ChartGenerator] Stock data fetch error:`, error.message);
    }
    
    return null;
  }

  async fetchCommodityHistoricalData(symbol) {
    // Use MarketDataService for commodities
    try {
      const MarketDataService = require('../src/knowledge/market-data-service');
      const marketDataService = new MarketDataService();
      
      const historicalData = await marketDataService.fetchHistoricalData(symbol, 30, '1d', 'commodity');
      
      if (historicalData && historicalData.length > 0) {
        // Filter out days with missing or invalid data
        const validData = historicalData.filter(d => {
          const price = d.close || d.price;
          return price && !isNaN(price) && price > 0;
        });
        
        if (validData.length === 0) {
          logger.error(`[ChartGenerator] No valid price data for ${symbol}`);
          return null;
        }
        
        // If we have gaps, interpolate missing data
        let prices = [];
        let dates = [];
        
        for (let i = 0; i < historicalData.length; i++) {
          const current = historicalData[i];
          const price = current.close || current.price;
          
          if (price && !isNaN(price) && price > 0) {
            prices.push(price);
            dates.push(current.date);
          } else if (i > 0 && i < historicalData.length - 1) {
            // Interpolate missing data
            const prevValid = prices[prices.length - 1];
            const nextValidIndex = historicalData.findIndex((d, idx) => 
              idx > i && d.close && !isNaN(d.close) && d.close > 0
            );
            
            if (nextValidIndex > -1) {
              const nextValid = historicalData[nextValidIndex].close;
              const interpolated = prevValid + ((nextValid - prevValid) / (nextValidIndex - i + 1));
              prices.push(interpolated);
              dates.push(current.date);
              logger.debug(`[ChartGenerator] Interpolated missing data for ${current.date}: $${interpolated.toFixed(2)}`);
            }
          }
        }
        
        return {
          symbol: symbol,
          prices: prices,
          dates: dates,
          currentPrice: prices[prices.length - 1]
        };
      }
    } catch (error) {
      logger.error(`[ChartGenerator] Commodity data fetch error:`, error.message);
    }
    
    return null;
  }

  detectAssetType(symbol) {
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'MATIC', 'AVAX', 'LINK'];
    const commoditySymbols = ['GC', 'SI', 'CL', 'NG', 'HG', 'ZW', 'ZC', 'ZS', 'KC', 'SB'];
    
    if (cryptoSymbols.includes(symbol)) return 'crypto';
    if (commoditySymbols.includes(symbol)) return 'commodity';
    return 'stock';
  }

  // Legacy method for backward compatibility
  generateChartImage(symbol, data, type) {
    logger.debug(`[ChartGenerator] Legacy generateChartImage called for ${symbol}`);
    return `data:image/svg+xml;base64,${Buffer.from(this.generateSVGChart(symbol, data, type)).toString('base64')}`;
  }

  generateSVGChart(symbol, data, type) {
    const width = 800;
    const height = 400;
    const title = `${symbol} - ${this.getChartTitle(type)}`;
    
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0a0e27"/>
        <text x="50%" y="30" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">${title}</text>
        <line x1="80" y1="80" x2="720" y2="80" stroke="#ffffff" stroke-width="1" opacity="0.2"/>
        <line x1="80" y1="80" x2="80" y2="350" stroke="#ffffff" stroke-width="1" opacity="0.2"/>
        <polyline points="${this.generateSVGPoints(data.prices)}" fill="none" stroke="#00d4ff" stroke-width="3"/>
        <text x="400" y="380" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="#8b92a3">Time Period</text>
        <text x="20" y="200" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="#8b92a3" transform="rotate(-90 20 200)">Price (USD)</text>
      </svg>
    `;
    
    return svg;
  }

  generateSVGPoints(prices) {
    if (!prices || prices.length === 0) return '';
    
    const chartWidth = 640; // 720 - 80
    const chartHeight = 270; // 350 - 80
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1; // Avoid division by zero
    
    return prices.map((price, index) => {
      const x = 80 + (index * chartWidth / (prices.length - 1));
      const y = 80 + chartHeight - ((price - minPrice) / priceRange * chartHeight);
      return `${x},${y}`;
    }).join(' ');
  }
}

module.exports = new SmartChartGenerator();