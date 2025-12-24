import React, { useEffect, useMemo, useState } from 'react';
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
  const [includeOnboarding, setIncludeOnboarding] = useState(false); // 기본값 false
  const [targetRevenue] = useState(1000000000); // 10억원
  const [saveMessage, setSaveMessage] = useState<string>('');

  const STORAGE_KEY = 'frandy-kpi-simulator-state-v1';

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

  const [allocations, setAllocations] = useState<PackageAllocation[]>(initializeAllocations());

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

  // (중요) 브랜드 분포 변경 시 allocation을 자동으로 덮어쓰지 않습니다.
  // 사용자가 패키지 배분을 세팅해둔 값을 유지하고, 필요할 때만 "배분 자동 맞춤" 버튼으로 조정합니다.

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

  const allocatedBrands = useMemo(
    () => allocations.reduce((sum, a) => sum + Object.values(a.distribution).reduce((s, c) => s + c, 0), 0),
    [allocations]
  );

  // 자동 불러오기 제거 - 사용자가 명시적으로 불러오기 버튼을 눌러야 함

  // 자동 저장 제거 - 수동 저장만 사용

  // 저장 슬롯 관리
  const [currentSlot, setCurrentSlot] = useState<number>(1);
  const [savedSlots, setSavedSlots] = useState<Record<number, { timestamp: string; name: string }>>({});

  const getSlotKey = (slot: number) => `frandy-kpi-slot-${slot}`;

  // 저장된 슬롯 목록 불러오기
  useEffect(() => {
    const slots: Record<number, { timestamp: string; name: string }> = {};
    for (let i = 1; i <= 5; i++) {
      const slotKey = getSlotKey(i);
      const saved = localStorage.getItem(slotKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          slots[i] = {
            timestamp: parsed.timestamp || '알 수 없음',
            name: parsed.name || `슬롯 ${i}`,
          };
        } catch {
          // ignore
        }
      }
    }
    setSavedSlots(slots);
  }, []);

  // 현재 설정을 슬롯에 저장
  const handleSaveToSlot = (slot: number, customName?: string) => {
    try {
      const timestamp = new Date().toLocaleString('ko-KR');
      const slotData = {
        timestamp,
        name: customName || `슬롯 ${slot}`,
        brandDistribution,
        packages,
        onboardingCosts,
        includeOnboarding,
        allocations,
      };
      localStorage.setItem(getSlotKey(slot), JSON.stringify(slotData));
      
      setSavedSlots(prev => ({
        ...prev,
        [slot]: { timestamp, name: customName || `슬롯 ${slot}` },
      }));
      
      setCurrentSlot(slot);
      setSaveMessage(`✅ ${customName || `슬롯 ${slot}`}에 저장 완료!`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ 저장 실패');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // 슬롯에서 불러오기
  const handleLoadFromSlot = (slot: number) => {
    try {
      const saved = localStorage.getItem(getSlotKey(slot));
      if (!saved) {
        setSaveMessage(`❌ 슬롯 ${slot}에 저장된 데이터가 없습니다`);
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      const parsed = JSON.parse(saved);
      if (parsed?.brandDistribution) setBrandDistribution(parsed.brandDistribution);
      if (parsed?.packages) setPackages(parsed.packages);
      if (parsed?.onboardingCosts) setOnboardingCosts(parsed.onboardingCosts);
      if (typeof parsed?.includeOnboarding === 'boolean') setIncludeOnboarding(parsed.includeOnboarding);
      if (parsed?.allocations) setAllocations(parsed.allocations);

      setCurrentSlot(slot);
      setSaveMessage(`✅ ${parsed.name || `슬롯 ${slot}`} 불러오기 완료!`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ 불러오기 실패');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // 빠른 저장 (현재 슬롯에)
  const handleQuickSave = () => {
    handleSaveToSlot(currentSlot);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
          <div>
            <h1>🚀 프랜디 2026 KPI 시뮬레이터</h1>
            <p>
              브랜드 분포, 패키지 구성, 가격 전략을 조정하여 목표 매출 달성 시나리오를
              시뮬레이션하세요.
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            minWidth: '350px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '14px', color: '#495057' }}>💾 저장 관리</strong>
              {saveMessage && (
                <span style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: saveMessage.includes('완료') ? '#d4edda' : '#f8d7da',
                  color: saveMessage.includes('완료') ? '#155724' : '#721c24',
                  borderRadius: '6px',
                }}>
                  {saveMessage}
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map(slot => (
                <div key={slot} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px',
                  padding: '8px',
                  backgroundColor: currentSlot === slot ? '#e3f2fd' : 'white',
                  borderRadius: '8px',
                  border: currentSlot === slot ? '2px solid #2196F3' : '1px solid #dee2e6',
                  flex: '1 1 calc(33% - 8px)',
                  minWidth: '100px'
                }}>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 'bold' }}>
                    슬롯 {slot} {currentSlot === slot && '(현재)'}
                  </div>
                  {savedSlots[slot] && (
                    <div style={{ fontSize: '10px', color: '#868e96' }}>
                      {new Date(savedSlots[slot].timestamp).toLocaleString('ko-KR', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleSaveToSlot(slot)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      저장
                    </button>
                    {savedSlots[slot] && (
                      <button
                        onClick={() => handleLoadFromSlot(slot)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        불러오기
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleQuickSave}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 'bold',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              ⚡ 빠른 저장 (슬롯 {currentSlot})
            </button>
          </div>
        </div>
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
              allocatedBrands={allocatedBrands}
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

