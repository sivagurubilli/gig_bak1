interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
}

interface SystemHealth {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  errorRate: number;
  avgResponseTime: number;
  requestsPerMinute: number;
}

interface ErrorLog {
  id: string;
  timestamp: number;
  error: string;
  stack?: string;
  endpoint: string;
  userId?: string;
  context: Record<string, any>;
}

class MonitoringService {
  private metrics: APIMetrics[] = [];
  private errors: ErrorLog[] = [];
  private startTime = Date.now();
  private activeConnections = 0;

  // Track API endpoint performance
  logAPICall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string,
    req?: any
  ): void {
    const metric: APIMetrics = {
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: Date.now(),
      userId,
      userAgent: req?.headers['user-agent'],
      ip: req?.ip
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log slow requests
    if (responseTime > 5000) {
      console.warn(`🐌 Slow API call detected: ${method} ${endpoint} took ${responseTime}ms`);
    }

    // Log errors
    if (statusCode >= 400) {
      console.error(`❌ API Error: ${method} ${endpoint} returned ${statusCode}`);
    }
  }

  // Track errors with context
  logError(
    error: Error | string,
    endpoint: string,
    userId?: string,
    context: Record<string, any> = {}
  ): void {
    const errorLog: ErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      endpoint,
      userId,
      context
    };

    this.errors.push(errorLog);

    // Keep only last 500 errors
    if (this.errors.length > 500) {
      this.errors = this.errors.slice(-500);
    }

    console.error(`🚨 Error logged:`, {
      id: errorLog.id,
      error: errorLog.error,
      endpoint,
      userId
    });
  }

  // Get system health metrics
  getSystemHealth(): SystemHealth {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Filter recent metrics
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    const recentErrors = this.errors.filter(e => e.timestamp > oneMinuteAgo);

    // Calculate metrics
    const totalRequests = recentMetrics.length;
    const errorCount = recentErrors.length;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
    
    const avgResponseTime = totalRequests > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
      : 0;

    return {
      uptime: now - this.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage().user,
      activeConnections: this.activeConnections,
      errorRate,
      avgResponseTime,
      requestsPerMinute: totalRequests
    };
  }

  // Get endpoint performance statistics
  getEndpointStats(timeframeMinutes: number = 60): Record<string, any> {
    const cutoff = Date.now() - (timeframeMinutes * 60000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    const endpointStats: Record<string, any> = {};

    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      
      if (!endpointStats[key]) {
        endpointStats[key] = {
          totalRequests: 0,
          totalResponseTime: 0,
          errors: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          statusCodes: {}
        };
      }

      const stats = endpointStats[key];
      stats.totalRequests++;
      stats.totalResponseTime += metric.responseTime;
      stats.minResponseTime = Math.min(stats.minResponseTime, metric.responseTime);
      stats.maxResponseTime = Math.max(stats.maxResponseTime, metric.responseTime);

      if (metric.statusCode >= 400) {
        stats.errors++;
      }

      stats.statusCodes[metric.statusCode] = (stats.statusCodes[metric.statusCode] || 0) + 1;
    });

    // Calculate averages
    Object.keys(endpointStats).forEach(key => {
      const stats = endpointStats[key];
      stats.avgResponseTime = stats.totalResponseTime / stats.totalRequests;
      stats.errorRate = stats.errors / stats.totalRequests;
      stats.requestsPerMinute = stats.totalRequests / timeframeMinutes;
    });

    return endpointStats;
  }

  // Get recent errors
  getRecentErrors(limit: number = 50): ErrorLog[] {
    return this.errors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Get user activity patterns
  getUserActivityStats(timeframeMinutes: number = 60): Record<string, any> {
    const cutoff = Date.now() - (timeframeMinutes * 60000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff && m.userId);

    const userStats: Record<string, any> = {};

    recentMetrics.forEach(metric => {
      const userId = metric.userId!;
      
      if (!userStats[userId]) {
        userStats[userId] = {
          totalRequests: 0,
          endpoints: new Set(),
          errors: 0,
          avgResponseTime: 0,
          totalResponseTime: 0,
          lastActivity: 0
        };
      }

      const stats = userStats[userId];
      stats.totalRequests++;
      stats.endpoints.add(`${metric.method} ${metric.endpoint}`);
      stats.totalResponseTime += metric.responseTime;
      stats.lastActivity = Math.max(stats.lastActivity, metric.timestamp);

      if (metric.statusCode >= 400) {
        stats.errors++;
      }
    });

    // Calculate averages and convert Sets to arrays
    Object.keys(userStats).forEach(userId => {
      const stats = userStats[userId];
      stats.avgResponseTime = stats.totalResponseTime / stats.totalRequests;
      stats.errorRate = stats.errors / stats.totalRequests;
      stats.uniqueEndpoints = stats.endpoints.size;
      stats.endpoints = Array.from(stats.endpoints);
    });

    return userStats;
  }

  // Track active connections
  incrementConnections(): void {
    this.activeConnections++;
  }

  decrementConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  // Generate monitoring report
  generateReport(): {
    systemHealth: SystemHealth;
    endpointStats: Record<string, any>;
    recentErrors: ErrorLog[];
    userActivity: Record<string, any>;
    alerts: string[];
  } {
    const systemHealth = this.getSystemHealth();
    const endpointStats = this.getEndpointStats();
    const recentErrors = this.getRecentErrors(10);
    const userActivity = this.getUserActivityStats();

    // Generate alerts based on metrics
    const alerts: string[] = [];

    if (systemHealth.errorRate > 0.1) {
      alerts.push(`High error rate: ${(systemHealth.errorRate * 100).toFixed(2)}%`);
    }

    if (systemHealth.avgResponseTime > 3000) {
      alerts.push(`High average response time: ${systemHealth.avgResponseTime.toFixed(0)}ms`);
    }

    if (systemHealth.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      alerts.push(`High memory usage: ${(systemHealth.memoryUsage.heapUsed / 1024 / 1024).toFixed(0)}MB`);
    }

    if (systemHealth.requestsPerMinute > 1000) {
      alerts.push(`High traffic: ${systemHealth.requestsPerMinute} requests/minute`);
    }

    return {
      systemHealth,
      endpointStats,
      recentErrors,
      userActivity,
      alerts
    };
  }

  // Clear old data to prevent memory leaks
  cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
  }
}

export const monitoringService = new MonitoringService();

// Middleware to track API performance
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  monitoringService.incrementConnections();

  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    monitoringService.logAPICall(
      req.path,
      req.method,
      responseTime,
      res.statusCode,
      req.user?.id?.toString(),
      req
    );

    monitoringService.decrementConnections();
    
    return originalJson.call(this, data);
  };

  next();
};

// Cleanup old monitoring data every hour
setInterval(() => {
  monitoringService.cleanup();
  console.log('📊 Monitoring data cleanup completed');
}, 60 * 60 * 1000);