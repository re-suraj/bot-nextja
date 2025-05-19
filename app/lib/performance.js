// Performance tracking and reporting module

class PerformanceTracker {
  constructor() {
    this.trades = [];
    this.dailyStats = {
      trades: 0,
      wins: 0,
      losses: 0,
      profit: 0,
      maxDrawdown: 0,
      peakBalance: 0,
      currentBalance: 0,
      lastReset: new Date().toDateString()
    };
  }

  addTrade(trade) {
    this.trades.push({
      ...trade,
      timestamp: new Date().toISOString(),
      instrument: trade.instrument,
      direction: trade.direction,
      entryPrice: trade.price,
      units: trade.units,
      exitPrice: null,
      pnl: 0,
      pnlPct: 0,
      duration: 0
    });
  }

  updateTrade(tradeId, exitPrice, pnl) {
    const trade = this.trades.find(t => t.id === tradeId);
    if (trade) {
      trade.exitPrice = exitPrice;
      trade.pnl = pnl;
      trade.pnlPct = (pnl / (Math.abs(trade.units) * trade.entryPrice)) * 100;
      trade.duration = new Date() - new Date(trade.timestamp);
      
      // Update daily stats
      this.dailyStats.trades++;
      if (pnl > 0) {
        this.dailyStats.wins++;
      } else {
        this.dailyStats.losses++;
      }
      this.dailyStats.profit += pnl;
      
      // Update balance and drawdown
      this.dailyStats.currentBalance += pnl;
      if (this.dailyStats.currentBalance > this.dailyStats.peakBalance) {
        this.dailyStats.peakBalance = this.dailyStats.currentBalance;
      }
      const currentDrawdown = (this.dailyStats.peakBalance - this.dailyStats.currentBalance) / this.dailyStats.peakBalance * 100;
      this.dailyStats.maxDrawdown = Math.max(this.dailyStats.maxDrawdown, currentDrawdown);
    }
  }

  getPerformanceReport() {
    const totalTrades = this.trades.length;
    const winningTrades = this.trades.filter(t => t.pnl > 0).length;
    const losingTrades = this.trades.filter(t => t.pnl < 0).length;
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgPnL = totalTrades > 0 ? this.trades.reduce((sum, t) => sum + t.pnl, 0) / totalTrades : 0;
    const avgWin = winningTrades > 0 ? this.trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? this.trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / losingTrades : 0;
    
    const profitFactor = Math.abs(avgWin / avgLoss) || 0;
    
    return {
      summary: {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: winRate.toFixed(2),
        avgPnL: avgPnL.toFixed(2),
        avgWin: avgWin.toFixed(2),
        avgLoss: avgLoss.toFixed(2),
        profitFactor: profitFactor.toFixed(2),
        maxDrawdown: this.dailyStats.maxDrawdown.toFixed(2),
        currentBalance: this.dailyStats.currentBalance.toFixed(2),
        peakBalance: this.dailyStats.peakBalance.toFixed(2)
      },
      dailyStats: this.dailyStats,
      trades: this.trades
    };
  }

  getInstrumentStats() {
    const instrumentStats = {};
    
    this.trades.forEach(trade => {
      if (!instrumentStats[trade.instrument]) {
        instrumentStats[trade.instrument] = {
          trades: 0,
          wins: 0,
          losses: 0,
          profit: 0,
          winRate: 0,
          avgPnL: 0
        };
      }
      
      const stats = instrumentStats[trade.instrument];
      stats.trades++;
      if (trade.pnl > 0) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      stats.profit += trade.pnl;
    });
    
    // Calculate averages
    Object.keys(instrumentStats).forEach(instrument => {
      const stats = instrumentStats[instrument];
      stats.winRate = (stats.wins / stats.trades) * 100;
      stats.avgPnL = stats.profit / stats.trades;
    });
    
    return instrumentStats;
  }

  reset() {
    this.trades = [];
    this.dailyStats = {
      trades: 0,
      wins: 0,
      losses: 0,
      profit: 0,
      maxDrawdown: 0,
      peakBalance: 0,
      currentBalance: 0,
      lastReset: new Date().toDateString()
    };
  }
}

export const performanceTracker = new PerformanceTracker(); 