import React from 'react';
import {
  Package,
  PackageAllocation,
  OnboardingCost,
  SimulationResult,
  OptionConfig,
  BrandDistribution,
  StoreRange,
  PackageType,
} from '../types';
import { runSimulation, formatCurrency } from '../utils/calculator';

interface OptionsComparisonProps {
  basePackages: Package[];
  baseBrandDistribution: BrandDistribution[];
  allocations: PackageAllocation[];
  onboardingCosts: OnboardingCost;
  includeOnboarding: boolean;
  options: OptionConfig[];
  targetRevenue: number;
}

export const OptionsComparison: React.FC<OptionsComparisonProps> = ({
  basePackages,
  baseBrandDistribution,
  allocations,
  onboardingCosts,
  includeOnboarding,
  options,
  targetRevenue,
}) => {
  const packageNames: PackageType[] = ['베이직', '프로1', '프로2', '프로3', '프리미엄'];
  const ranges: StoreRange[] = ['1-50', '51-100', '101-200', '201-400', '400+'];

  const baseRangeTotals: Record<StoreRange, number> = ranges.reduce((acc, r) => {
    acc[r] = allocations.reduce((sum, a) => sum + a.distribution[r], 0);
    return acc;
  }, {} as Record<StoreRange, number>);

  const buildAllocationsForDistribution = (
    newBrandDistribution: BrandDistribution[]
  ): PackageAllocation[] => {
    // 목표 range별 총 브랜드 수
    const targetRangeTotals: Record<StoreRange, number> = ranges.reduce((acc, r) => {
      acc[r] = newBrandDistribution.find((d) => d.range === r)?.count ?? 0;
      return acc;
    }, {} as Record<StoreRange, number>);

    // range별로 패키지 share(기존 배분 비율)를 유지하며 new totals에 맞춰 재배분
    const newAllocs: PackageAllocation[] = packageNames.map((p) => ({
      package: p,
      distribution: { '1-50': 0, '51-100': 0, '101-200': 0, '201-400': 0, '400+': 0 },
    }));

    ranges.forEach((range) => {
      const baseTotal = baseRangeTotals[range];
      const targetTotal = targetRangeTotals[range];

      if (targetTotal === 0) {
        // 전부 0 유지
        return;
      }

      // baseTotal이 0이면, 현재 allocations에서 해당 range가 비어있는 상태이므로
      // 패키지별 share를 균등 분배로 처리
      const shares = packageNames.map((p) => {
        const baseCount = allocations.find((a) => a.package === p)?.distribution[range] ?? 0;
        const share = baseTotal > 0 ? baseCount / baseTotal : 1 / packageNames.length;
        return { p, share };
      });

      // floor + remainder 방식으로 총합 정확히 맞추기
      const floats = shares.map((s) => ({ ...s, raw: targetTotal * s.share }));
      const floors = floats.map((x) => ({
        p: x.p,
        floor: Math.floor(x.raw),
        frac: x.raw - Math.floor(x.raw),
      }));
      const floorSum = floors.reduce((sum, x) => sum + x.floor, 0);
      let remainder = targetTotal - floorSum;

      floors.sort((a, b) => b.frac - a.frac);
      const addMap = new Map<PackageType, number>();
      packageNames.forEach((p) => addMap.set(p, 0));
      let i = 0;
      while (remainder > 0 && i < floors.length * 10) {
        const p = floors[i % floors.length].p;
        addMap.set(p, (addMap.get(p) ?? 0) + 1);
        remainder -= 1;
        i += 1;
      }

      newAllocs.forEach((a) => {
        const base = floors.find((x) => x.p === a.package)?.floor ?? 0;
        const add = addMap.get(a.package) ?? 0;
        a.distribution[range] = base + add;
      });
    });

    return newAllocs;
  };

  const optionResults = options.map((option) => {
    // 옵션별 브랜드 분포:
    // - 옵션3(대형 브랜드 집중): 옵션 정의 분포 사용
    // - 그 외: 현재 시뮬레이터의 브랜드 분포 사용
    const optionBrandDistribution =
      option.name.includes('옵션3') ? option.brandDistribution : baseBrandDistribution;

    // 가격 조정
    const adjustedPackages = basePackages.map((pkg) => ({
      ...pkg,
      pricing: {
        '1-50': Math.round(pkg.pricing['1-50'] * option.priceMultiplier),
        '51-100': Math.round(pkg.pricing['51-100'] * option.priceMultiplier),
        '101-200': Math.round(pkg.pricing['101-200'] * option.priceMultiplier),
        '201-400': Math.round(pkg.pricing['201-400'] * option.priceMultiplier),
        '400+': Math.round(pkg.pricing['400+'] * option.priceMultiplier),
      },
    }));

    // 온보딩 비용 조정
    const adjustedOnboarding = {
      '1-50': Math.round(onboardingCosts['1-50'] * option.onboardingMultiplier),
      '51-100': Math.round(
        onboardingCosts['51-100'] * option.onboardingMultiplier
      ),
      '101-200': Math.round(
        onboardingCosts['101-200'] * option.onboardingMultiplier
      ),
      '201-400': Math.round(
        onboardingCosts['201-400'] * option.onboardingMultiplier
      ),
      '400+': Math.round(onboardingCosts['400+'] * option.onboardingMultiplier),
    };

    // 옵션 브랜드 분포에 맞춰 패키지 배분도 자동으로 재스케일(총합 정확히 맞춤)
    const adjustedAllocations = buildAllocationsForDistribution(optionBrandDistribution);

    const result = runSimulation(
      adjustedPackages,
      adjustedAllocations,
      optionBrandDistribution,
      adjustedOnboarding,
      includeOnboarding
    );

    const achievementRate = (result.totalRevenue / targetRevenue) * 100;

    return {
      option,
      result,
      achievementRate,
      isRecommended: achievementRate >= 100 && achievementRate <= 110,
    };
  });

  return (
    <div className="card">
      <h2 className="card-title">🔀 전략 옵션 비교</h2>

      <div className="alert alert-info" style={{ marginBottom: '24px' }}>
        <strong>목표 매출: {formatCurrency(targetRevenue)}</strong>
        <br />각 옵션별 시뮬레이션 결과를 비교하여 최적의 전략을 선택하세요.
      </div>

      <div className="comparison-grid">
        {optionResults.map(({ option, result, achievementRate, isRecommended }) => (
          <div
            key={option.name}
            className={`comparison-card ${isRecommended ? 'recommended' : ''}`}
          >
            <div className="comparison-card-header">
              <div className="comparison-card-title">{option.name}</div>
              {isRecommended && (
                <span className="badge badge-success">추천</span>
              )}
            </div>

            <div className="comparison-card-body">
              <p style={{ marginBottom: '12px', fontSize: '13px' }}>
                {option.description}
              </p>

              <div
                style={{
                  background: '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: achievementRate >= 100 ? '#10b981' : '#f59e0b',
                    marginBottom: '4px',
                  }}
                >
                  {formatCurrency(result.totalRevenue)}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  목표 대비 {achievementRate.toFixed(1)}%
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>구독 매출 (원):</span>
                  <strong>{formatCurrency(result.subscriptionRevenue)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>온보딩 매출 (원):</span>
                  <strong>{formatCurrency(result.onboardingRevenue)}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #e5e7eb',
                  }}
                >
                  <span>총 브랜드 (개):</span>
                  <strong>
                    {option.brandDistribution.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
                    개
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>가격 배수 (배):</span>
                  <strong>{option.priceMultiplier}x</strong>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#999',
                    marginBottom: '8px',
                  }}
                >
                  브랜드 분포 (개)
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '4px',
                    fontSize: '11px',
                  }}
                >
                  {option.brandDistribution.map((dist) => (
                    <div
                      key={dist.range}
                      style={{
                        background: '#f3f4f6',
                        padding: '6px',
                        borderRadius: '4px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{dist.count}</div>
                      <div style={{ color: '#999', fontSize: '10px' }}>
                        {dist.range}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
          📊 옵션별 상세 비교
        </h3>
        <div className="table-container">
          <table>
          <thead>
            <tr>
              <th>옵션</th>
              <th className="text-right">총 매출 (원)</th>
              <th className="text-right">구독 매출 (원)</th>
              <th className="text-right">온보딩 매출 (원)</th>
              <th className="text-right">목표 달성률 (%)</th>
              <th className="text-center">상태</th>
            </tr>
          </thead>
            <tbody>
              {optionResults.map(({ option, result, achievementRate, isRecommended }) => (
                <tr key={option.name}>
                  <td>
                    <strong>{option.name}</strong>
                  </td>
                  <td className="text-right">
                    <strong>{formatCurrency(result.totalRevenue)}</strong>
                  </td>
                  <td className="text-right">
                    {formatCurrency(result.subscriptionRevenue)}
                  </td>
                  <td className="text-right">
                    {formatCurrency(result.onboardingRevenue)}
                  </td>
                  <td className="text-right">
                    <strong
                      style={{
                        color: achievementRate >= 100 ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {achievementRate.toFixed(1)}%
                    </strong>
                  </td>
                  <td className="text-center">
                    {achievementRate >= 100 ? (
                      <span className="badge badge-success">달성</span>
                    ) : (
                      <span className="badge badge-warning">미달</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

