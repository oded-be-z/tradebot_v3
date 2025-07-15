// Performance monitoring utility for FinanceBot Pro

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      totalRequests: 0,
      errors: 0,
    };

    this.startTime = Date.now();
  }

  recordApiCall(endpoint, duration, success = true) {
    if (!this.metrics.apiCalls.has(endpoint)) {
      this.metrics.apiCalls.set(endpoint, {
        count: 0,
        totalDuration: 0,
        errors: 0,
      });
    }

    const stats = this.metrics.apiCalls.get(endpoint);
    stats.count++;
    stats.totalDuration += duration;
    if (!success) stats.errors++;

    this.metrics.totalRequests++;
    if (!success) this.metrics.errors++;

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) +
        duration) /
      this.metrics.totalRequests;
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  getCacheHitRate() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total === 0 ? 0 : (this.metrics.cacheHits / total) * 100;
  }

  getUptime() {
    return Date.now() - this.startTime;
  }

  getReport() {
    const uptime = this.getUptime();
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);

    const apiStats = [];
    for (const [endpoint, stats] of this.metrics.apiCalls) {
      apiStats.push({
        endpoint,
        calls: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        errorRate: (stats.errors / stats.count) * 100,
      });
    }

    return {
      uptime: `${hours}h ${minutes}m`,
      totalRequests: this.metrics.totalRequests,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      cacheHitRate: this.getCacheHitRate().toFixed(2) + "%",
      errorRate:
        ((this.metrics.errors / this.metrics.totalRequests) * 100).toFixed(2) +
        "%",
      apiEndpoints: apiStats.sort((a, b) => b.calls - a.calls).slice(0, 10),
    };
  }

  reset() {
    this.metrics = {
      apiCalls: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      totalRequests: 0,
      errors: 0,
    };
  }
}

module.exports = PerformanceMonitor;
