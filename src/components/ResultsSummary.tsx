import React from 'react';
import { SimulationResult } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculator';

interface ResultsSummaryProps {
  result: SimulationResult;
  targetRevenue: number;
  defaultExpanded?: boolean;
  forceCompact?: boolean;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({
  result,
  targetRevenue,
  defaultExpanded = false,
  forceCompact = false,
}) => {
  const achievementRate = (result.totalRevenue / targetRevenue) * 100;
  const isSuccess = achievementRate >= 100;
  const [showDetails, setShowDetails] = React.useState<boolean>(defaultExpanded);
  const effectiveShowDetails = forceCompact ? false : showDetails;

  return (
    <div className="card">
      <h2 className="card-title">🎯 시뮬레이션 결과</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">총 연간 매출</div>
          <div className="stat-value">{formatCurrency(result.totalRevenue)}</div>
          <div className="stat-subvalue">
            목표 대비 {achievementRate.toFixed(1)}%
          </div>
        </div>

        <div className="stat-card secondary">
          <div className="stat-label">구독 매출</div>
          <div className="stat-value">
            {formatCurrency(result.subscriptionRevenue)}
          </div>
          <div className="stat-subvalue">
            {((result.subscriptionRevenue / result.totalRevenue) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="stat-card tertiary">
          <div className="stat-label">온보딩 매출</div>
          <div className="stat-value">
            {formatCurrency(result.onboardingRevenue)}
          </div>
          <div className="stat-subvalue">
            {((result.onboardingRevenue / result.totalRevenue) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {isSuccess ? (
        <div className="alert alert-success">
          ✅ 목표 매출 {formatCurrency(targetRevenue)} 달성!
        </div>
      ) : (
        <div className="alert alert-warning">
          ⚠️ 목표 매출까지 {formatCurrency(targetRevenue - result.totalRevenue)} 부족합니다.
        </div>
      )}

      <div className="btn-group" style={{ marginTop: '12px' }}>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          disabled={forceCompact}
          title={forceCompact ? '차트 구간에서는 요약만 표시됩니다.' : undefined}
        >
          {effectiveShowDetails ? '상세 접기' : '상세 펼치기'}
        </button>
      </div>

      <h3 style={{ fontSize: '18px', marginTop: '32px', marginBottom: '16px' }}>
        📅 분기별 매출
      </h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>분기</th>
              <th className="text-right">신규 브랜드 (개)</th>
              <th className="text-right">누적 브랜드 (개)</th>
              <th className="text-right">구독 매출 (원)</th>
              <th className="text-right">온보딩 매출 (원)</th>
              <th className="text-right">분기 총 매출 (원)</th>
            </tr>
          </thead>
          <tbody>
            {result.quarterlyBreakdown.map((q) => {
              return (
                <tr key={q.quarter}>
                  <td>
                    <span className="badge badge-info">{q.quarter}</span>
                  </td>
                  <td className="text-right">{q.newBrands.toLocaleString()}개</td>
                  <td className="text-right">{q.cumulativeBrands.toLocaleString()}개</td>
                  <td className="text-right">
                    {formatNumber(q.subscriptionRevenue)}원
                  </td>
                  <td className="text-right">
                    {formatNumber(q.onboardingRevenue)}원
                  </td>
                  <td className="text-right">
                    <strong>{formatNumber(q.revenue)}원</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={{ background: '#f3f4f6', fontWeight: 600 }}>
            <tr>
              <td style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>전체 합계</strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {result.quarterlyBreakdown
                    .reduce((sum, q) => sum + q.newBrands, 0)
                    .toLocaleString()}개
                </strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {result.quarterlyBreakdown[result.quarterlyBreakdown.length - 1]?.cumulativeBrands.toLocaleString() || 0}개
                </strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {formatNumber(
                    result.quarterlyBreakdown.reduce((sum, q) => sum + q.subscriptionRevenue, 0)
                  )}원
                </strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {formatNumber(
                    result.quarterlyBreakdown.reduce((sum, q) => sum + q.onboardingRevenue, 0)
                  )}원
                </strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {formatNumber(
                    result.quarterlyBreakdown.reduce((sum, q) => sum + q.revenue, 0)
                  )}원
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!effectiveShowDetails ? null : (
        <>
      <h3 style={{ fontSize: '18px', marginTop: '32px', marginBottom: '16px' }}>
        📦 패키지별 분석
      </h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>패키지</th>
              <th className="text-right">브랜드 수 (개)</th>
              <th className="text-right">총 매장 수 (개)</th>
              <th className="text-right">월 매출 (원)</th>
              <th className="text-right">연 매출 (원)</th>
            </tr>
          </thead>
          <tbody>
            {result.packageBreakdown.map((p) => (
              <tr key={p.package}>
                <td>
                  <strong>{p.package}</strong>
                </td>
                <td className="text-right">{p.brands.toLocaleString()}개</td>
                <td className="text-right">{formatNumber(p.stores)}개</td>
                <td className="text-right">{formatNumber(p.monthlyRevenue)}원</td>
                <td className="text-right">
                  <strong>{formatCurrency(p.annualRevenue)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ background: '#f3f4f6', fontWeight: 600 }}>
            <tr>
              <td style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>전체 합계</strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {result.packageBreakdown
                    .reduce((sum, p) => sum + p.brands, 0)
                    .toLocaleString()}개
                </strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {formatNumber(
                    result.packageBreakdown.reduce((sum, p) => sum + p.stores, 0)
                  )}개
                </strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {formatNumber(
                    result.packageBreakdown.reduce((sum, p) => sum + p.monthlyRevenue, 0)
                  )}원
                </strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>{formatCurrency(result.subscriptionRevenue)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h3 style={{ fontSize: '18px', marginTop: '32px', marginBottom: '16px' }}>
        📊 매장 규모별 분석
      </h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>매장 규모 (개)</th>
              <th className="text-right">브랜드 수 (개)</th>
              <th className="text-right">총 매장 수 (개)</th>
              <th className="text-right">연 매출 (원)</th>
              <th className="text-right">매출 비중 (%)</th>
            </tr>
          </thead>
          <tbody>
            {result.storeRangeBreakdown.map((s) => (
              <tr key={s.range}>
                <td>{s.range}</td>
                <td className="text-right">{s.brands.toLocaleString()}개</td>
                <td className="text-right">{formatNumber(s.stores)}개</td>
                <td className="text-right">{formatNumber(s.revenue)}원</td>
                <td className="text-right">
                  {((s.revenue / result.subscriptionRevenue) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ background: '#f3f4f6', fontWeight: 600 }}>
            <tr>
              <td style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>전체 합계</strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {result.storeRangeBreakdown
                    .reduce((sum, s) => sum + s.brands, 0)
                    .toLocaleString()}개
                </strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>
                  {formatNumber(
                    result.storeRangeBreakdown.reduce((sum, s) => sum + s.stores, 0)
                  )}개
                </strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>{formatNumber(result.subscriptionRevenue)}원</strong>
              </td>
              <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                <strong>100.0%</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
        </>
      )}
    </div>
  );
};

