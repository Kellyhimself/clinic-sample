// components/pharmacy/ReportsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';

interface ReportData {
  sales: { id: string; quantity: number; sale_date: string; medication: { name: string } }[];
  revenue: { totalRevenue: number; receipts: { total_cost: number; created_at: string }[] };
  topSelling: { medication_id: string; medication_name: string; total_quantity: number }[];
  stockMovement: { medication_id: string; transaction_type: string; quantity: number; created_at: string }[];
}

export default function ReportsDashboard() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const [salesRes, revenueRes, topSellingRes, stockRes] = await Promise.all([
          fetch(`/api/pharmacy/reports/sales?period=${period}`).then((res) => res.json()),
          fetch(`/api/pharmacy/reports/revenue?period=${period}`).then((res) => res.json()),
          fetch('/api/pharmacy/reports/top-selling').then((res) => res.json()),
          fetch('/api/pharmacy/reports/stock-movement').then((res) => res.json()),
        ]);

        setReportData({
          sales: salesRes,
          revenue: revenueRes,
          topSelling: topSellingRes,
          stockMovement: stockRes,
        });
      } catch {
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [period]);

  if (loading) return <div className="p-4">Loading reports...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!reportData) return null;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Pharmacy Reports</h1>

      <div className="mb-4">
        <label className="mr-2">Period:</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
          className="border p-2 rounded"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-semibold mb-2">Recent Sales</h2>
          <ul>
            {reportData.sales.slice(0, 5).map((sale) => (
              <li key={sale.id}>
                {sale.medication.name} - {sale.quantity} units on {new Date(sale.sale_date).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-semibold mb-2">Revenue (KSh)</h2>
          <p>Total: KSh {reportData.revenue.totalRevenue.toLocaleString()}</p>
          <ul>
            {reportData.revenue.receipts.slice(0, 5).map((receipt, idx) => (
              <li key={idx}>
                KSh {receipt.total_cost} on {new Date(receipt.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-semibold mb-2">Top Selling Medications</h2>
          <ul>
            {reportData.topSelling.map((item) => (
              <li key={item.medication_id}>
                {item.medication_name} - {item.total_quantity} units
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-semibold mb-2">Stock Movement</h2>
          <ul>
            {reportData.stockMovement.slice(0, 5).map((move, idx) => (
              <li key={idx}>
                {move.transaction_type} - {move.quantity} units on{' '}
                {new Date(move.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}