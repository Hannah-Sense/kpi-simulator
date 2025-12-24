import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { SimulationResult } from '../types';
import { formatCurrency } from '../utils/calculator';

interface ChartsSectionProps {
  result: SimulationResult;
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];

export const ChartsSection: React.FC<ChartsSectionProps> = ({ result }) => {
  // 분기별 데이터
  const quarterlyData = result.quarterlyBreakdown.map((q) => ({
    name: q.quarter,
    구독매출: Math.round((q.revenue - q.onboardingRevenue) / 10000),
    온보딩매출: Math.round(q.onboardingRevenue / 10000),
    누적브랜드: q.cumulativeBrands,
  }));

  // 패키지별 데이터
  const packageData = result.packageBreakdown.map((p) => ({
    name: p.package,
    value: Math.round(p.annualRevenue / 10000),
    brands: p.brands,
  }));

  // 매장 규모별 데이터
  const storeRangeData = result.storeRangeBreakdown.map((s) => ({
    name: s.range,
    매출: Math.round(s.revenue / 10000),
    브랜드수: s.brands,
  }));

  return (
    <div className="card">
      <h2 className="card-title">📈 시각화 분석</h2>

      <div style={{ marginBottom: '48px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>분기별 매출 추이</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: '단위: 만원', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()}만원`,
                  name,
                ]}
              />
              <Legend />
              <Bar dataKey="구독매출" stackId="a" fill="#667eea" />
              <Bar dataKey="온보딩매출" stackId="a" fill="#f5576c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '48px' }}>
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>패키지별 매출 비중</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={packageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name} (${entry.brands.toLocaleString()}개)`}
                >
                  {packageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toLocaleString()}만원`,
                    '연 매출',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>
            매장 규모별 매출 분포
          </h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storeRangeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" label={{ value: '매장 규모', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: '단위: 만원', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()}만원`,
                    name === '매출' ? '연 매출' : name,
                  ]}
                />
                <Bar dataKey="매출" fill="#764ba2">
                  {storeRangeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>
          분기별 브랜드 누적 현황
        </h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: '단위: 개', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value: number) => [
                  `${value.toLocaleString()}개`,
                  '누적 브랜드 수',
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="누적브랜드"
                stroke="#667eea"
                strokeWidth={3}
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

