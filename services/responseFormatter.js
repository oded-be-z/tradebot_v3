const NumberFormatter = require("../utils/numberFormatter");

class ResponseFormatter {
  formatComparisonTable(data) {
    const { headers, rows } = data.data;
    
    // Create natural comparison header
    const naturalHeader = this.generateNaturalComparisonHeader(data.symbols);

    let html = `
      <div class="comparison-container">
        <h3>${naturalHeader}</h3>
        <table class="comparison-table">
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>${row
                .map(
                  (cell, i) =>
                    `<td class="${i === 0 ? "metric-label" : "metric-value"}">${cell}</td>`,
                )
                .join("")}</tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        ${
          data.analysis
            ? `
          <div class="analysis-section">
            <h4>Analysis</h4>
            <p>${data.analysis}</p>
          </div>
        `
            : ""
        }
      </div>
    `;

    return html;
  }

  formatTrendAnalysis(data) {
    // Handle null price gracefully
    const currentPrice = data.currentPrice || data.trend?.resistance || "N/A";
    const priceDisplay =
      currentPrice === "N/A"
        ? "Price Unavailable"
        : `$${parseFloat(currentPrice).toFixed(2)}`;

    return `
      <div class="trend-analysis">
        <h3>${data.symbol} Trend Analysis</h3>
        <div class="trend-summary">
          <span class="trend-direction ${data.trend.direction}">
            ${data.trend.direction === "up" ? "📈" : "📉"} 
            ${data.trend.direction.toUpperCase()} ${NumberFormatter.formatPercentage(Math.abs(data.trend.change))}
          </span>
          <span class="current-price">Current: ${priceDisplay}</span>
        </div>
        <div class="trend-levels">
          <span class="support">Support: ${NumberFormatter.formatPrice(data.trend.support)}</span>
          <span class="resistance">Resistance: ${NumberFormatter.formatPrice(data.trend.resistance)}</span>
        </div>
        <div class="trend-explanation">
          ${data.explanation}
        </div>
      </div>
    `;
  }

  formatPortfolioAnalysis(data) {
    const { metrics, insights, recommendations } = data;

    return `
      <div class="portfolio-analysis">
        <h3>Portfolio Analysis</h3>
        
        <div class="portfolio-summary">
          <div class="metric-card">
            <span class="label">Total Value</span>
            <span class="value">${NumberFormatter.formatPrice(parseFloat(metrics.totalValue))}</span>
          </div>
          <div class="metric-card ${parseFloat(metrics.totalGainPercent) >= 0 ? "positive" : "negative"}">
            <span class="label">Total Return</span>
            <span class="value">${NumberFormatter.formatPercentage(parseFloat(metrics.totalGainPercent))}</span>
            <span class="sub-value">${NumberFormatter.formatPrice(parseFloat(metrics.totalGain))}</span>
          </div>
        </div>
        
        <div class="portfolio-insights">
          <h4>Key Insights</h4>
          <p>${insights.summary}</p>
          
          ${
            insights.performance.best
              ? `
            <div class="performance-highlight">
              <span class="best">Best: ${insights.performance.best.symbol} (${NumberFormatter.formatPercentage(insights.performance.best.changePercent)})</span>
              <span class="worst">Worst: ${insights.performance.worst.symbol} (${NumberFormatter.formatPercentage(insights.performance.worst.changePercent)})</span>
            </div>
          `
              : ""
          }
          
          <p>${insights.concentration.message}</p>
          <p>${insights.risk.suggestion}</p>
        </div>
        
        ${
          recommendations.length > 0
            ? `
          <div class="portfolio-recommendations">
            <h4>Recommendations</h4>
            ${recommendations
              .map(
                (rec) => `
              <div class="recommendation ${rec.type}">
                <span class="rec-type">${rec.type.toUpperCase()}</span>
                <span class="rec-action">${rec.action}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  generateNaturalComparisonHeader(symbols) {
    if (!symbols || symbols.length < 2) {
      return "Asset Comparison";
    }

    const symbol1 = symbols[0];
    const symbol2 = symbols[1];

    // Create natural comparison headers based on asset types
    const naturalHeaders = [
      `Comparing ${symbol1} and ${symbol2}`,
      `${symbol1} vs ${symbol2}: Side-by-Side Analysis`,
      `How ${symbol1} Stacks Up Against ${symbol2}`,
      `${symbol1} and ${symbol2} Head-to-Head`,
      `Side-by-Side: ${symbol1} vs ${symbol2}`
    ];

    // Use first natural header for consistency
    return naturalHeaders[0];
  }

  formatStandardMessage(text) {
    if (!text) return "";

    // Convert markdown-style formatting to HTML
    let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  }
}

module.exports = new ResponseFormatter();
