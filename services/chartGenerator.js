class SmartChartGenerator {
  constructor() {
    console.log("[ChartGenerator] Initialized");
  }

  async generateSmartChart(symbol, type = "price") {
    try {
      // Generate mock historical data for the chart
      const data = this.generateMockChartData(symbol, type);

      return {
        type: "chart_data",
        symbol: symbol,
        chartType: type,
        data: data,
        config: {
          type: "line",
          symbol: symbol,
          title: `${symbol} - ${type === "trend" ? "Trend Analysis" : "Price Chart"}`,
          timeframe: "30d",
        },
        imageUrl: this.generateChartImage(symbol, data, type),
      };
    } catch (error) {
      console.error("[ChartGenerator] Error:", error);
      return null;
    }
  }

  generateChartImage(symbol, data, type) {
    // For now, return a placeholder image URL
    // In a full implementation, this would use a library like Chart.js with node-canvas
    // to generate actual chart images
    const width = 800;
    const height = 400;
    const title = `${symbol} - ${type === "trend" ? "Trend Analysis" : "Price Chart"}`;

    // Generate a simple SVG chart placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa"/>
        <text x="50%" y="30" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold">${title}</text>
        <line x1="80" y1="80" x2="720" y2="80" stroke="#333" stroke-width="2"/>
        <line x1="80" y1="80" x2="80" y2="350" stroke="#333" stroke-width="2"/>
        <polyline points="${this.generateSVGPoints(data.prices)}" fill="none" stroke="#007bff" stroke-width="3"/>
        <text x="400" y="380" text-anchor="middle" font-family="Arial" font-size="14">Time (30 days)</text>
        <text x="20" y="200" text-anchor="middle" font-family="Arial" font-size="14" transform="rotate(-90 20 200)">Price ($)</text>
      </svg>
    `;

    // Convert SVG to data URL
    const base64 = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  }

  generateSVGPoints(prices) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    return prices
      .map((price, index) => {
        const x = 80 + (index * 640) / (prices.length - 1);
        const y = 350 - ((price - minPrice) / priceRange) * 270;
        return `${x},${y}`;
      })
      .join(" ");
  }

  generateMockChartData(symbol, type) {
    const basePrice = 100 + Math.random() * 500; // Random base price
    const dataPoints = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const volatility = 0.02; // 2% daily volatility
      const randomChange = (Math.random() - 0.5) * volatility;
      const price = basePrice * (1 + (randomChange * (30 - i)) / 30); // Slight trend

      dataPoints.push({
        date: date.toISOString().split("T")[0],
        price: price.toFixed(2),
        volume: Math.floor(Math.random() * 50000000) + 10000000,
      });
    }

    return {
      labels: dataPoints.map((d) => d.date),
      prices: dataPoints.map((d) => parseFloat(d.price)),
      volumes: dataPoints.map((d) => d.volume),
    };
  }

  async generatePortfolioChart(metrics) {
    try {
      const allocation = metrics.allocation.slice(0, 8); // Top 8 holdings

      return {
        type: "chart_data",
        chartType: "portfolio",
        data: {
          labels: allocation.map((a) => a.symbol),
          values: allocation.map((a) => parseFloat(a.percent)),
          colors: this.generateColors(allocation.length),
        },
        config: {
          type: "doughnut",
          title: "Portfolio Allocation",
          responsive: true,
        },
      };
    } catch (error) {
      console.error("[ChartGenerator] Portfolio chart error:", error);
      return null;
    }
  }

  generateColors(count) {
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#FF6384",
      "#36A2EB",
    ];
    return colors.slice(0, count);
  }
}

module.exports = new SmartChartGenerator();
