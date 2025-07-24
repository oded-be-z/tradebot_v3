const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');
const logger = require('./logger');

class PortfolioChartGenerator {
  async generateAllocationChart(portfolio) {
    try {
      const width = 400;
      const height = 400;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      const totalValue = portfolio.reduce((sum, h) => sum + (h.value || 0), 0);
      if (totalValue === 0) {
        logger.warn('[PortfolioChartGenerator] Total portfolio value is 0');
        return null;
      }
      
      const data = portfolio.map(h => h.value || 0);
      const labels = portfolio.map(h => 
        `${h.symbol} (${((h.value/totalValue)*100).toFixed(1)}%)`
      );
      
      // Professional color palette
      const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
        '#FFA500', '#32CD32', '#DC143C', '#4169E1', '#FFD700'
      ];
      
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors.slice(0, data.length),
            borderWidth: 2,
            borderColor: '#1a1a2e'
          }]
        },
        options: {
          responsive: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { 
                color: '#ffffff', 
                font: { size: 12 },
                padding: 15
              }
            },
            title: {
              display: true,
              text: 'Portfolio Allocation',
              color: '#ffffff',
              font: { size: 16, weight: 'bold' }
            }
          }
        }
      });
      
      const buffer = await canvas.toBuffer('image/png');
      logger.info('[PortfolioChartGenerator] Allocation chart generated successfully');
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
      logger.error('[PortfolioChartGenerator] Failed to generate allocation chart:', error);
      return null;
    }
  }

  async generatePerformanceChart(portfolio) {
    try {
      const width = 600;
      const height = 300;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Sort by return percentage
      const sorted = [...portfolio].sort((a, b) => (b.percentReturn || 0) - (a.percentReturn || 0));
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sorted.map(h => h.symbol),
          datasets: [{
            label: 'Return %',
            data: sorted.map(h => h.percentReturn || 0),
            backgroundColor: sorted.map(h => 
              (h.percentReturn || 0) >= 0 ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)'
            ),
            borderColor: sorted.map(h => 
              (h.percentReturn || 0) >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'
            ),
            borderWidth: 2
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Performance by Position',
              color: '#ffffff',
              font: { size: 16, weight: 'bold' }
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              title: {
                display: true,
                text: 'Return %',
                color: '#ffffff'
              },
              ticks: { 
                color: '#ffffff',
                callback: value => `${value}%`
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              ticks: { 
                color: '#ffffff',
                maxRotation: 45,
                minRotation: 45
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          }
        }
      });
      
      const buffer = await canvas.toBuffer('image/png');
      logger.info('[PortfolioChartGenerator] Performance chart generated successfully');
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
      logger.error('[PortfolioChartGenerator] Failed to generate performance chart:', error);
      return null;
    }
  }

  async generateRiskChart(portfolio) {
    try {
      const width = 500;
      const height = 300;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Calculate risk metrics for each holding
      const riskData = portfolio.map(h => ({
        symbol: h.symbol,
        allocation: ((h.value / portfolio.reduce((sum, h2) => sum + h2.value, 0)) * 100),
        volatility: h.volatility || Math.random() * 30 + 10 // Mock volatility if not available
      }));
      
      new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Risk vs Allocation',
            data: riskData.map(d => ({
              x: d.allocation,
              y: d.volatility,
              label: d.symbol
            })),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            pointRadius: 8,
            pointHoverRadius: 10
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Risk Analysis: Volatility vs Allocation',
              color: '#ffffff',
              font: { size: 16, weight: 'bold' }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const point = context.raw;
                  return `${point.label}: ${point.x.toFixed(1)}% allocation, ${point.y.toFixed(1)}% volatility`;
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Portfolio Allocation %',
                color: '#ffffff'
              },
              ticks: { 
                color: '#ffffff',
                callback: value => `${value}%`
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Volatility %',
                color: '#ffffff'
              },
              ticks: { 
                color: '#ffffff',
                callback: value => `${value}%`
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          }
        }
      });
      
      const buffer = await canvas.toBuffer('image/png');
      logger.info('[PortfolioChartGenerator] Risk chart generated successfully');
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
      logger.error('[PortfolioChartGenerator] Failed to generate risk chart:', error);
      return null;
    }
  }
}

module.exports = new PortfolioChartGenerator();