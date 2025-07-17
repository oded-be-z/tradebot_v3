const NumberFormatter = require("../utils/numberFormatter");
const CleanFormatter = require("../src/utils/cleanFormatter");

class ResponseFormatter {
  formatComparisonTable(data) {
    const { headers, rows } = data.data;
    
    // Create natural comparison header
    const naturalHeader = this.generateNaturalComparisonHeader(data.symbols);

    let result = `${naturalHeader}\n\n`;

    // Format as clean text table - NO MARKDOWN
    rows.forEach(row => {
      const metric = row[0];
      const values = row.slice(1);
      
      result += `${metric}: `;
      values.forEach((value, index) => {
        if (index > 0) result += ' vs ';
        result += value;
      });
      result += '\n';
    });

    // Add analysis if available
    if (data.analysis) {
      result += `\n${data.analysis}`;
    }

    return CleanFormatter.processResponse(result);
  }

  formatTrendAnalysis(data) {
    // Clean the response of all markdown formatting
    const response = data.explanation || data.response || `${data.symbol} analysis not available.`;
    return CleanFormatter.processResponse(response);
  }

  formatPortfolioAnalysis(data) {
    const { metrics, insights, recommendations } = data;

    let result = `Portfolio Analysis\n\n`;
    
    // Portfolio summary - NO MARKDOWN
    result += `Total Value: ${NumberFormatter.formatPrice(parseFloat(metrics.totalValue))}\n`;
    result += `Total Return: ${NumberFormatter.formatPercentage(parseFloat(metrics.totalGainPercent))} (${NumberFormatter.formatPrice(parseFloat(metrics.totalGain))})\n\n`;
    
    // Key insights
    result += `Key Insights\n`;
    result += `${insights.summary}\n\n`;
    
    // Performance highlights
    if (insights.performance.best) {
      result += `Best: ${insights.performance.best.symbol} (${NumberFormatter.formatPercentage(insights.performance.best.changePercent)})\n`;
      result += `Worst: ${insights.performance.worst.symbol} (${NumberFormatter.formatPercentage(insights.performance.worst.changePercent)})\n\n`;
    }
    
    result += `${insights.concentration.message}\n`;
    result += `${insights.risk.suggestion}\n\n`;
    
    // Recommendations
    if (recommendations.length > 0) {
      result += `Recommendations\n`;
      recommendations.forEach(rec => {
        result += `• ${rec.type.toUpperCase()}: ${rec.action}\n`;
      });
    }

    return CleanFormatter.processResponse(result);
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

    // Use CleanFormatter to remove all markdown instead of converting to HTML
    return CleanFormatter.processResponse(text);
  }
}

module.exports = new ResponseFormatter();
