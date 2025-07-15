class ResponseFormatter {
  formatComparisonTable(data) {
    const { headers, rows } = data.data;

    let html = `
      <div class="comparison-container">
        <h3>${data.symbols.join(" vs ")} Comparison</h3>
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
            ${data.trend.direction.toUpperCase()} ${Math.abs(data.trend.change)}%
          </span>
          <span class="current-price">Current: ${priceDisplay}</span>
        </div>
        <div class="trend-levels">
          <span class="support">Support: $${data.trend.support.toFixed(2)}</span>
          <span class="resistance">Resistance: $${data.trend.resistance.toFixed(2)}</span>
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
            <span class="value">$${parseFloat(metrics.totalValue).toLocaleString()}</span>
          </div>
          <div class="metric-card ${parseFloat(metrics.totalGainPercent) >= 0 ? "positive" : "negative"}">
            <span class="label">Total Return</span>
            <span class="value">${metrics.totalGainPercent}%</span>
            <span class="sub-value">$${parseFloat(metrics.totalGain).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="portfolio-insights">
          <h4>Key Insights</h4>
          <p>${insights.summary}</p>
          
          ${
            insights.performance.best
              ? `
            <div class="performance-highlight">
              <span class="best">Best: ${insights.performance.best.symbol} (+${insights.performance.best.changePercent}%)</span>
              <span class="worst">Worst: ${insights.performance.worst.symbol} (${insights.performance.worst.changePercent}%)</span>
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
