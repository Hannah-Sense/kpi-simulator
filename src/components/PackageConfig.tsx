import React from 'react';
import { Package, PackageAllocation, BrandDistribution, StoreRange } from '../types';
import { calculatePricePerStore } from '../utils/calculator';

interface PackageConfigProps {
  packages: Package[];
  allocations: PackageAllocation[];
  brandDistribution: BrandDistribution[];
  onAllocationChange: (allocations: PackageAllocation[]) => void;
  onPriceChange: (packageName: string, range: StoreRange, price: number) => void;
  onRebalance?: () => void;
}

export const PackageConfig: React.FC<PackageConfigProps> = ({
  packages,
  allocations,
  brandDistribution,
  onAllocationChange,
  onPriceChange,
  onRebalance,
}) => {
  const handleAllocationChange = (
    packageName: string,
    range: StoreRange,
    value: string
  ) => {
    const count = parseInt(value.replace(/,/g, '') || '0');
    const updated = allocations.map((a) =>
      a.package === packageName
        ? {
            ...a,
            distribution: {
              ...a.distribution,
              [range]: count,
            },
          }
        : a
    );
    onAllocationChange(updated);
  };

  const handlePriceChangeInternal = (
    packageName: string,
    range: StoreRange,
    value: string
  ) => {
    const price = parseInt(value.replace(/,/g, '') || '0');
    onPriceChange(packageName, range, price);
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR');
  };

  const totalBrands = brandDistribution.reduce((sum, d) => sum + d.count, 0);
  const allocatedBrands = allocations.reduce(
    (sum, a) =>
      sum + Object.values(a.distribution).reduce((s, c) => s + c, 0),
    0
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>📦 패키지 구성 & 가격 설정</h2>
        {onRebalance ? (
          <button className="btn btn-secondary" type="button" onClick={onRebalance}>
            배분 자동 맞춤
          </button>
        ) : null}
      </div>

      {allocatedBrands !== totalBrands && (
        <div className="alert alert-warning">
          ⚠️ 배분된 브랜드({allocatedBrands.toLocaleString()}개)가 전체 브랜드({totalBrands.toLocaleString()}개)와 다릅니다!
        </div>
      )}

      {packages.map((pkg) => {
        const allocation = allocations.find((a) => a.package === pkg.name)!;

        return (
          <div key={pkg.name} style={{ marginBottom: '32px' }}>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '16px',
                color: '#667eea',
              }}
            >
              {pkg.name}
            </h3>
            <div
              style={{
                fontSize: '13px',
                color: '#666',
                marginBottom: '12px',
              }}
            >
              포함 모듈: {pkg.modules.join(', ')}
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>매장 규모</th>
                    <th className="text-right">월 가격 (원)</th>
                    <th className="text-right">매장당 가격 (원)</th>
                    <th className="text-right">배분 브랜드 (개)</th>
                  </tr>
                </thead>
                <tbody>
                  {brandDistribution.map((dist) => {
                    const price = pkg.pricing[dist.range];
                    const pricePerStore = calculatePricePerStore(
                      price,
                      dist.avgStores
                    );
                    const count = allocation.distribution[dist.range];

                    return (
                      <tr key={dist.range}>
                        <td>{dist.range}개</td>
                        <td className="text-right">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <input
                              type="text"
                              value={formatNumber(price)}
                              onChange={(e) =>
                                handlePriceChangeInternal(
                                  pkg.name,
                                  dist.range,
                                  e.target.value
                                )
                              }
                              style={{
                                width: '140px',
                                textAlign: 'right',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                padding: '6px 10px',
                              }}
                            />
                            <span style={{ fontSize: '12px', color: '#999' }}>원</span>
                          </div>
                        </td>
                        <td className="text-right">
                          {pricePerStore.toLocaleString()}원
                        </td>
                        <td className="text-right">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <input
                              type="text"
                              value={formatNumber(count)}
                              onChange={(e) =>
                                handleAllocationChange(
                                  pkg.name,
                                  dist.range,
                                  e.target.value
                                )
                              }
                              style={{
                                width: '80px',
                                textAlign: 'right',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                padding: '6px 10px',
                              }}
                            />
                            <span style={{ fontSize: '12px', color: '#999' }}>개</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot style={{ background: '#f9fafb', fontWeight: 600 }}>
                  <tr>
                    <td style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                      <strong>패키지 합계</strong>
                    </td>
                    <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                      {(() => {
                        // 실제 배분된 브랜드 수를 고려한 월 가격 합산
                        const totalPrice = brandDistribution.reduce(
                          (sum, dist) => {
                            const brandCount = allocation.distribution[dist.range];
                            return sum + (pkg.pricing[dist.range] * brandCount);
                          },
                          0
                        );
                        return <strong>{formatNumber(totalPrice)}원</strong>;
                      })()}
                    </td>
                    <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                      {/* 매장당 평균 가격 제거 */}
                    </td>
                    <td className="text-right" style={{ padding: '14px 16px', borderTop: '2px solid #e5e7eb' }}>
                      {(() => {
                        const totalBrands = Object.values(allocation.distribution).reduce(
                          (sum, count) => sum + count,
                          0
                        );
                        return <strong>{formatNumber(totalBrands)}개</strong>;
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

