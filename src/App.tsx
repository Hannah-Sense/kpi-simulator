import React, { useState } from 'react';
import {
  BrandDistribution,
  Package,
  PackageAllocation,
  OnboardingCost,
  PackageType,
  StoreRange,
} from './types';
import {
  DEFAULT_BRAND_DISTRIBUTION,
  BASE_PACKAGES,
  BASE_ONBOARDING_COST,
  OPTIONS,
  DEFAULT_PACKAGE_ALLOCATION,
} from './constants';
import { runSimulation } from './utils/calculator';
import { SimulatorForm } from './components/SimulatorForm';
import { PackageConfig } from './components/PackageConfig';
import { ResultsSummary } from './components/ResultsSummary';
import { ChartsSection } from './components/ChartsSection';
import { OptionsComparison } from './components/OptionsComparison';

type TabType = 'simulator' | 'comparison';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('simulator');
  const [brandDistribution, setBrandDistribution] = useState<BrandDistribution[]>(
    DEFAULT_BRAND_DISTRIBUTION
  );
  const [packages, setPackages] = useState<Package[]>(BASE_PACKAGES);
  const [onboardingCosts, setOnboardingCosts] =
    useState<OnboardingCost>(BASE_ONBOARDING_COST);
  const [includeOnboarding, setIncludeOnboarding] = useState(true);
  const [targetRevenue] = useState(1000000000); // 10억원

  // 패키지별 브랜드 배분 초기화
  const initializeAllocations = (): PackageAllocation[] => {
    const totalBrands = brandDistribution.reduce((sum, d) => sum + d.count, 0);

    return BASE_PACKAGES.map((pkg) => {
      const allocation: PackageAllocation = {
        package: pkg.name,
        distribution: {
          '1-50': 0,
          '51-100': 0,
          '101-200': 0,
          '201-400': 0,
          '400+': 0,
        },
      };

      // 각 패키지의 기본 배분 비율에 따라 브랜드 할당
      const packageRatio = DEFAULT_PACKAGE_ALLOCATION[pkg.name] || 0;

      brandDistribution.forEach((dist) => {
        const brandsInRange = dist.count;
        const allocatedBrands = Math.round(brandsInRange * packageRatio);
        allocation.distribution[dist.range] = allocatedBrands;
      });

      return allocation;
    });
  };

  const [allocations, setAllocations] = useState<PackageAllocation[]>(
    initializeAllocations()
  );

  const rebalanceAllocations = () => {
    // 각 매장 규모(range)별로 "총 배분 브랜드 수"가 brandDistribution의 count와 정확히 일치하도록 재배분
    const ratios: Record<PackageType, number> = {
      베이직: DEFAULT_PACKAGE_ALLOCATION.베이직,
      프로1: DEFAULT_PACKAGE_ALLOCATION.프로1,
      프로2: DEFAULT_PACKAGE_ALLOCATION.프로2,
      프로3: DEFAULT_PACKAGE_ALLOCATION.프로3,
      프리미엄: DEFAULT_PACKAGE_ALLOCATION.프리미엄,
    };

    const packageNames: PackageType[] = ['베이직', '프로1', '프로2', '프로3', '프리미엄'];

    const base: PackageAllocation[] = packageNames.map((p) => ({
      package: p,
      distribution: { '1-50': 0, '51-100': 0, '101-200': 0, '201-400': 0, '400+': 0 },
    }));

    brandDistribution.forEach((dist) => {
      const total = dist.count;
      const floats = packageNames.map((p) => ({
        p,
        raw: total * (ratios[p] ?? 0),
      }));
      const floors = floats.map((x) => ({ ...x, floor: Math.floor(x.raw), frac: x.raw - Math.floor(x.raw) }));
      const floorSum = floors.reduce((s, x) => s + x.floor, 0);
      let remainder = total - floorSum;

      // remainder를 소수점 큰 순서로 분배
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

      base.forEach((alloc) => {
        const floorVal = floors.find((x) => x.p === alloc.package)?.floor ?? 0;
        const addVal = addMap.get(alloc.package) ?? 0;
        alloc.distribution[dist.range] = floorVal + addVal;
      });
    });

    setAllocations(base);
  };

  // 브랜드 분포 변경 시 allocation 재조정
  React.useEffect(() => {
    setAllocations(initializeAllocations());
  }, [brandDistribution]);

  const handlePriceChange = (
    packageName: string,
    range: StoreRange,
    price: number
  ) => {
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.name === packageName
          ? {
              ...pkg,
              pricing: {
                ...pkg.pricing,
                [range]: price,
              },
            }
          : pkg
      )
    );
  };

  // 시뮬레이션 실행
  const simulationResult = runSimulation(
    packages,
    allocations,
    brandDistribution,
    onboardingCosts,
    includeOnboarding
  );

  return (
    <div className="app-container">
      <div className="header">
        <h1>🚀 프랜디 2026 KPI 시뮬레이터</h1>
        <p>
          브랜드 분포, 패키지 구성, 가격 전략을 조정하여 목표 매출 달성 시나리오를
          시뮬레이션하세요.
        </p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          📊 시뮬레이터
        </button>
        <button
          className={`tab ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          🔀 옵션 비교
        </button>
      </div>

      {activeTab === 'simulator' ? (
        <div className="simulator-layout">
          <div className="simulator-col">
            <SimulatorForm
              brandDistribution={brandDistribution}
              onboardingCosts={onboardingCosts}
              onBrandDistributionChange={setBrandDistribution}
              onOnboardingCostChange={setOnboardingCosts}
              includeOnboarding={includeOnboarding}
              onIncludeOnboardingChange={setIncludeOnboarding}
            />

            <PackageConfig
              packages={packages}
              allocations={allocations}
              brandDistribution={brandDistribution}
              onAllocationChange={setAllocations}
              onPriceChange={handlePriceChange}
              onRebalance={rebalanceAllocations}
            />

            {/* 시각화는 좌측 컬럼에만 배치 */}
            <ChartsSection result={simulationResult} />
          </div>

          <div className="simulator-col">
            <ResultsSummary
              result={simulationResult}
              targetRevenue={targetRevenue}
              defaultExpanded={false}
            />
          </div>
        </div>
      ) : (
        <OptionsComparison
          basePackages={packages}
          baseBrandDistribution={brandDistribution}
          allocations={allocations}
          onboardingCosts={onboardingCosts}
          includeOnboarding={includeOnboarding}
          options={OPTIONS}
          targetRevenue={targetRevenue}
        />
      )}

      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '12px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#666',
        }}
      >
        <p>
          💡 <strong>Tip:</strong> 패키지 가격과 브랜드 배분을 실시간으로 조정하면서
          최적의 전략을 찾아보세요.
        </p>
        <p style={{ marginTop: '8px', fontSize: '13px' }}>
          제품 출시 일정: QSC (3월), 매출집계 (7월), 수발주 (2026년 미출시)
        </p>
      </div>
    </div>
  );
}

export default App;

