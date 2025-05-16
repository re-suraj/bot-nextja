import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { performanceTracker } from '../lib/performance';

export default function BacktestResults({ results }) {
  const [selectedInstrument, setSelectedInstrument] = useState('all');
  const [timeframe, setTimeframe] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [equityData, setEquityData] = useState(null);

  useEffect(() => {
    if (results) {
      processChartData();
      loadEquityData();
    }
  }, [results, selectedInstrument, timeframe]);

  const loadEquityData = () => {
    try {
      const data = localStorage.getItem(`equity_curve_${selectedInstrument}`);
      if (data) {
        setEquityData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading equity curve:', error);
    }
  };

  const processChartData = () => {
    const trades = results.trades.filter(trade => 
      selectedInstrument === 'all' || trade.instrument === selectedInstrument
    );

    const data = trades.reduce((acc, trade) => {
      const date = new Date(trade.timestamp).toISOString().split('T')[0];
      const existing = acc.find(d => d.date === date);
      
      if (existing) {
        existing.pnl += trade.pnl;
        existing.trades++;
        existing.wins += trade.pnl > 0 ? 1 : 0;
      } else {
        acc.push({
          date,
          pnl: trade.pnl,
          trades: 1,
          wins: trade.pnl > 0 ? 1 : 0
        });
      }
      
      return acc;
    }, []);

    // Calculate cumulative PnL
    let cumulativePnL = 0;
    data.forEach(d => {
      cumulativePnL += d.pnl;
      d.cumulativePnL = cumulativePnL;
      d.winRate = (d.wins / d.trades) * 100;
    });

    setChartData(data);
  };

  const instruments = ['all', ...new Set(results?.trades.map(t => t.instrument) || [])];

  if (!results || !results.trades || results.trades.length === 0) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Backtest Results</h2>
          <div className="p-8 border rounded bg-white shadow-sm">
            <svg 
              className="mx-auto h-12 w-12 text-blue-500 mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Backtest Data Available</h3>
            <p className="text-gray-600 mb-4">
              Run a backtest to see performance metrics and trade history.
            </p>
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Make sure you have:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Selected valid instruments</li>
                <li>Enabled at least one strategy</li>
                <li>Set appropriate date range</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-gray-700 rounded bg-gray-800 shadow-sm">
          <h3 className="text-xl font-bold mb-4 text-white">Performance Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Total Trades:</span>
              <span className="text-white font-semibold">{results.summary.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Win Rate:</span>
              <span className="text-white font-semibold">{results.summary.winRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Average P/L:</span>
              <span className={`font-semibold ${parseFloat(results.summary.avgPnL) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {results.summary.avgPnL}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Max Drawdown:</span>
              <span className="text-red-400 font-semibold">{results.summary.maxDrawdown}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Final Equity:</span>
              <span className="text-white font-semibold">{results.summary.currentBalance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Profit Factor:</span>
              <span className="text-white font-semibold">{results.summary.profitFactor}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border border-gray-700 rounded bg-gray-800 shadow-sm">
          <h3 className="text-xl font-bold mb-4 text-white">Controls</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Instrument</label>
              <select
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {instruments.map(instrument => (
                  <option key={instrument} value={instrument}>
                    {instrument === 'all' ? 'All Instruments' : instrument}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border border-gray-700 rounded bg-gray-800 shadow-sm">
        <h3 className="text-xl font-bold mb-4 text-white">Equity Curve</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.375rem',
                  color: '#fff'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulativePnL"
                stroke="#10B981"
                name="Cumulative P/L"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-4 border border-gray-700 rounded bg-gray-800 shadow-sm">
        <h3 className="text-xl font-bold mb-4 text-white">Win Rate</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.375rem',
                  color: '#fff'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="winRate"
                stroke="#3B82F6"
                name="Win Rate %"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-4 border border-gray-700 rounded bg-gray-800 shadow-sm">
        <h3 className="text-xl font-bold mb-4 text-white">Recent Trades</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-300 border-b border-gray-700">
                <th className="pb-2">Instrument</th>
                <th className="pb-2">Direction</th>
                <th className="pb-2">Entry</th>
                <th className="pb-2">Exit</th>
                <th className="pb-2">P/L</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {results.trades.slice(-10).map((trade) => (
                <tr key={trade.id} className="border-b border-gray-700">
                  <td className="py-2 text-white">{trade.instrument}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      trade.direction === 'buy' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 text-white">{trade.entryPrice.toFixed(5)}</td>
                  <td className="py-2 text-white">{trade.exitPrice?.toFixed(5) || '-'}</td>
                  <td className={`py-2 font-semibold ${trade.pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.pnl?.toFixed(2) || '-'}
                  </td>
                  <td className="py-2 text-gray-300">
                    {new Date(trade.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}