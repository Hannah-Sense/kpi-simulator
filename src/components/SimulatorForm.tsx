import React from 'react';
import { BrandDistribution, OnboardingCost, StoreRange } from '../types';

interface SimulatorFormProps {
  brandDistribution: BrandDistribution[];
  onboardingCosts: OnboardingCost;
  onBrandDistributionChange: (distribution: BrandDistribution[]) => void;
  onOnboardingCostChange: (costs: OnboardingCost) => void;
  includeOnboarding: boolean;
  onIncludeOnboardingChange: (include: boolean) => void;
  allocatedBrands?: number;
}

export const SimulatorForm: React.FC<SimulatorFormProps> = ({
  brandDistribution,
  onboardingCosts,
  onBrandDistributionChange,
  onOnboardingCostChange,
  includeOnboarding,
  onIncludeOnboardingChange,
  allocatedBrands,
}) => {
  const handleBrandCountChange = (range: StoreRange, value: string) => {
    const count = parseInt(value.replace(/,/g, '') || '0');
    const updated = brandDistribution.map((d) =>
      d.range === range ? { ...d, count } : d
    );
    onBrandDistributionChange(updated);
  };

  const handleAvgStoresChange = (range: StoreRange, value: string) => {
    const avgStores = parseInt(value.replace(/,/g, '') || '0');
    const updated = brandDistribution.map((d) =>
      d.range === range ? { ...d, avgStores } : d
    );
    onBrandDistributionChange(updated);
  };

  const handleOnboardingCostChange = (range: StoreRange, value: string) => {
    const cost = parseInt(value.replace(/,/g, '') || '0');
    onOnboardingCostChange({
      ...onboardingCosts,
      [range]: cost,
    });
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR');
  };

  const totalBrands = brandDistribution.reduce((sum, d) => sum + d.count, 0);
  const totalStores = brandDistribution.reduce(
    (sum, d) => sum + d.count * d.avgStores,
    0
  );

  return (
    <div className="card">
      <h2 className="card-title">📊 브랜드 분포 설정</h2>

      <div className="alert alert-info">
        <strong>총 {totalBrands.toLocaleString()}개 브랜드(분포)</strong> | {totalStores.toLocaleString()}개 매장(분포)
        {typeof allocatedBrands === 'number' ? (
          <>
            <br />
            <strong>패키지 배분 브랜드:</strong> {allocatedBrands.toLocaleString()}개
          </>
        ) : null}
      </div>

      <div className="grid-5">
        {brandDistribution.map((dist) => (
          <div key={dist.range} className="input-group">
            <label>
              {dist.range}개 매장
              <br />
              <small style={{ color: '#999', fontWeight: 400 }}>
                평균 {dist.avgStores}개
              </small>
            </label>
            <input
              type="text"
              value={formatNumber(dist.count)}
              onChange={(e) =>
                handleBrandCountChange(dist.range, e.target.value)
              }
              placeholder="0"
            />
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              브랜드 수 (개)
            </div>
            <input
              type="text"
              value={formatNumber(dist.avgStores)}
              onChange={(e) =>
                handleAvgStoresChange(dist.range, e.target.value)
              }
              placeholder="0"
              style={{ marginTop: '8px' }}
            />
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              평균 매장 (개)
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px' }}>
        <div
          className="switch"
          onClick={() => onIncludeOnboardingChange(!includeOnboarding)}
        >
          <div className={`switch-input ${includeOnboarding ? 'checked' : ''}`}>
            <div className="switch-slider"></div>
          </div>
          <span className="switch-label">온보딩 비용 포함</span>
        </div>
      </div>

      {includeOnboarding && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#555' }}>
            💰 온보딩 비용 설정
          </h3>
          <div className="grid-5">
            {brandDistribution.map((dist) => (
              <div key={dist.range} className="input-group">
                <label>{dist.range}개 매장</label>
                <input
                  type="text"
                  value={formatNumber(onboardingCosts[dist.range])}
                  onChange={(e) =>
                    handleOnboardingCostChange(dist.range, e.target.value)
                  }
                  placeholder="0"
                />
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  초기 구축비 (원)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

