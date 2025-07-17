class CleanFormatter {
  static removeAllMarkdown(text) {
    if (!text) return '';
    
    // Remove all bold markdown
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Remove all italic markdown
    text = text.replace(/\*(.*?)\*/g, '$1');
    
    // Remove all headers
    text = text.replace(/^#+\s+/gm, '');
    
    // Remove structured patterns
    text = text.replace(/^(Summary|Key\s+Insights?|Recommendations?|Analysis):\s*/gim, '');
    
    // Clean up excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    
    return text;
  }
  
  static formatNaturalResponse(data) {
    // Convert structured data to natural language
    if (typeof data === 'object' && data.type) {
      switch(data.type) {
        case 'portfolio_analysis':
          return this.formatPortfolioNatural(data);
        case 'comparison':
          return this.formatComparisonNatural(data);
        case 'trend_analysis':
          return this.formatTrendNatural(data);
        default:
          return this.removeAllMarkdown(data.content || data.response || data.analysis || '');
      }
    }
    
    return this.removeAllMarkdown(data);
  }
  
  static formatPortfolioNatural(data) {
    const { totalValue, totalGainPercent, holdings } = data;
    
    let response = `Your portfolio is valued at ${totalValue} `;
    response += totalGainPercent > 0 
      ? `and showing gains of ${totalGainPercent}%. ` 
      : `with a current loss of ${Math.abs(totalGainPercent)}%. `;
    
    response += `You're holding ${holdings.length} different positions. `;
    
    if (data.recommendations && data.recommendations.length > 0) {
      response += `Based on my analysis, ${data.recommendations[0]}. `;
      if (data.recommendations.length > 1) {
        response += `Additionally, ${data.recommendations[1]}.`;
      }
    }
    
    return response;
  }
  
  static formatComparisonNatural(data) {
    const [symbol1, symbol2] = data.symbols;
    const [data1, data2] = data.data;
    
    let response = `Comparing ${symbol1} and ${symbol2}: `;
    response += `${symbol1} is trading at ${data1.price} `;
    response += data1.changePercent > 0 ? `up ${data1.changePercent}% ` : `down ${Math.abs(data1.changePercent)}% `;
    response += `while ${symbol2} is at ${data2.price} `;
    response += data2.changePercent > 0 ? `up ${data2.changePercent}%.` : `down ${Math.abs(data2.changePercent)}%.`;
    
    return response;
  }
  
  static formatTrendNatural(data) {
    const { symbol, trend, currentPrice } = data;
    
    let response = `${symbol} is currently trading at ${currentPrice} `;
    response += `and showing a ${trend.direction} trend with ${Math.abs(trend.change)}% movement. `;
    response += `Technical analysis suggests support near ${trend.support} and resistance around ${trend.resistance}.`;
    
    return response;
  }

  static cleanVolumeFormatting(text) {
    if (!text) return text;
    
    // Fix volume formatting - remove dollar signs from volume
    text = text.replace(/\$(\d+\.?\d*[MBK]?)\s+(shares|contracts|BTC|ETH)/gi, '$1 $2');
    
    // Ensure proper volume units
    text = text.replace(/(\d+\.?\d*[MBK]?)\s+shares/gi, '$1 shares');
    text = text.replace(/(\d+\.?\d*[MBK]?)\s+contracts/gi, '$1 contracts');
    text = text.replace(/(\d+\.?\d*[MBK]?)\s+BTC/gi, '$1 BTC');
    text = text.replace(/(\d+\.?\d*[MBK]?)\s+ETH/gi, '$1 ETH');
    
    return text;
  }
  
  static processResponse(response) {
    if (!response) return '';
    
    let cleanedResponse = response;
    
    // Remove all markdown formatting
    cleanedResponse = this.removeAllMarkdown(cleanedResponse);
    
    // Fix volume formatting issues
    cleanedResponse = this.cleanVolumeFormatting(cleanedResponse);
    
    // Remove any remaining bold patterns
    cleanedResponse = cleanedResponse.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleanedResponse = cleanedResponse.replace(/\*([^*]+)\*/g, '$1');
    
    // Clean up redundant whitespace
    cleanedResponse = cleanedResponse.replace(/\n{3,}/g, '\n\n');
    cleanedResponse = cleanedResponse.trim();
    
    return cleanedResponse;
  }
}

module.exports = CleanFormatter;