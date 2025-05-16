import { useState, useEffect } from "react";

export default function OandaInstruments() {
  const [instruments, setInstruments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchInstruments();
  }, []);

  const fetchInstruments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/oanda/account/instruments");
      if (!response.ok) {
        throw new Error("Failed to fetch instruments");
      }
      const data = await response.json();
      setInstruments(data.instruments);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInstruments = instruments.filter(
    (instrument) =>
      instrument.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instrument.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Tradable Instruments</h2>
        <div className="mt-2">
          <input
            type="text"
            placeholder="Search instruments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instrument
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Trade Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max Position Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Margin Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInstruments.map((instrument) => (
              <tr key={instrument.name} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {instrument.displayName}
                  </div>
                  <div className="text-sm text-gray-500">{instrument.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instrument.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instrument.minimumTradeSize}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instrument.maximumPositionSize}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(instrument.marginRate * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredInstruments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No instruments found matching your search.
        </div>
      )}
    </div>
  );
} 