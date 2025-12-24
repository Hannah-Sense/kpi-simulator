import {
  BrandDistribution,
  Package,
  PackageAllocation,
  OnboardingCost,
  SimulationResult,
  QuarterlyContract,
  StoreRange,
  PackageType,
  Quarter,
} from '../types';
import { QUARTERLY_BRAND_INFLUX, PACKAGE_AVAILABILITY } from '../constants';

// 매장당 가격 계산
export const calculatePricePerStore = (
  totalPrice: number,
  avgStores: number
): number => {
  return Math.round(totalPrice / avgStores);
};

// 특정 구간의 총 매장 수 계산
export const calculateTotalStores = (
  brandCount: number,
  avgStores: number
): number => {
  return brandCount * avgStores;
};

// 패키지별 월간 매출 계산
export const calculatePackageMonthlyRevenue = (
  pkg: Package,
  allocation: PackageAllocation,
  brandDistribution: BrandDistribution[]
): number => {
  let total = 0;
  
  Object.entries(allocation.distribution).forEach(([range, count]) => {
    if (count > 0) {
      const price = pkg.pricing[range as StoreRange];
      total += price * count;
    }
  });
  
  return total;
};

// 분기별 계약 시뮬레이션
export const simulateQuarterlyContracts = (
  totalBrands: number,
  packages: Package[],
  allocations: PackageAllocation[],
  brandDistribution: BrandDistribution[],
  onboardingCosts: OnboardingCost,
  includeOnboarding: boolean
): QuarterlyContract[] => {
  const quarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const results: QuarterlyContract[] = [];
  let cumulativeBrands = 0;

  quarters.forEach((quarter, idx) => {
    const quarterMonth = (idx + 1) * 3; // Q1=3, Q2=6, Q3=9, Q4=12
    const influxRate = QUARTERLY_BRAND_INFLUX[quarter];
    const newBrands = Math.round(totalBrands * influxRate);
    cumulativeBrands += newBrands;

    // 해당 분기에 사용 가능한 패키지 필터링
    const availablePackages = packages.filter(
      (pkg) => PACKAGE_AVAILABILITY[pkg.name] <= quarterMonth
    );

    // 분기 구독 매출 계산 (누적 브랜드 기준, 월간 * 3개월)
    let subscriptionRevenue = 0;
    allocations.forEach((allocation) => {
      const pkg = availablePackages.find((p) => p.name === allocation.package);
      if (pkg) {
        const monthlyRev = calculatePackageMonthlyRevenue(
          pkg,
          allocation,
          brandDistribution
        );
        // 해당 분기의 평균 브랜드 수를 고려 (분기 시작 + 분기 끝) / 2
        const avgBrandsInQuarter = cumulativeBrands - newBrands / 2;
        const proportion = avgBrandsInQuarter / totalBrands;
        subscriptionRevenue += monthlyRev * 3 * proportion;
      }
    });

    // 온보딩 매출 (신규 브랜드만, 실제 배분된 비율로 계산)
    let onboardingRevenue = 0;
    if (includeOnboarding && newBrands > 0) {
      brandDistribution.forEach((dist) => {
        // 해당 구간에 실제 배분된 브랜드 수
        const allocatedInRange = allocations.reduce((sum, alloc) => {
          return sum + alloc.distribution[dist.range];
        }, 0);
        
        // 비율 계산
        const brandsInRange = Math.round((allocatedInRange / totalBrands) * newBrands);
        onboardingRevenue += brandsInRange * onboardingCosts[dist.range];
      });
    }

    results.push({
      quarter,
      newBrands,
      cumulativeBrands,
      subscriptionRevenue,
      revenue: subscriptionRevenue + onboardingRevenue,
      onboardingRevenue,
    });
  });

  return results;
};

// 전체 시뮬레이션 실행
export const runSimulation = (
  packages: Package[],
  allocations: PackageAllocation[],
  brandDistribution: BrandDistribution[],
  onboardingCosts: OnboardingCost,
  includeOnboarding: boolean
): SimulationResult => {
  // 실제 배분된 브랜드 수 계산
  const totalBrands = allocations.reduce((sum, alloc) => {
    return sum + Object.values(alloc.distribution).reduce((s, count) => s + count, 0);
  }, 0);

  // 분기별 계약
  const quarterlyBreakdown = simulateQuarterlyContracts(
    totalBrands,
    packages,
    allocations,
    brandDistribution,
    onboardingCosts,
    includeOnboarding
  );

  // (참고용) 패키지별 월 매출(연말 풀-도입 가정)
  const packageBreakdown = allocations.map((allocation) => {
    const pkg = packages.find((p) => p.name === allocation.package)!;
    
    let brands = 0;
    let stores = 0;
    let monthlyRevenue = 0;

    Object.entries(allocation.distribution).forEach(([range, count]) => {
      const dist = brandDistribution.find((d) => d.range === range);
      if (dist && count > 0) {
        brands += count;
        stores += count * dist.avgStores;
        monthlyRevenue += pkg.pricing[range as StoreRange] * count;
      }
    });

    return {
      package: allocation.package,
      brands,
      stores,
      monthlyRevenue,
      // annualRevenue는 아래에서 "실현 기준(분기 합)"으로 덮어씁니다.
      annualRevenue: 0,
    };
  });

  // "실현 기준" 연간 구독/온보딩/총 매출: 분기 합으로 통일
  const realizedSubscriptionRevenue = quarterlyBreakdown.reduce(
    (sum, q) => sum + q.subscriptionRevenue,
    0
  );
  const realizedOnboardingRevenue = includeOnboarding
    ? quarterlyBreakdown.reduce((sum, q) => sum + q.onboardingRevenue, 0)
    : 0;
  const realizedTotalRevenue = quarterlyBreakdown.reduce((sum, q) => sum + q.revenue, 0);

  // 패키지별 "실현 연매출" 계산 (분기별 가용 패키지 + 브랜드 유입 비율 반영)
  // 분기별 proportion 로직은 simulateQuarterlyContracts와 동일하게 맞춥니다.
  const quarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  let cumBrands = 0;
  const quarterMeta = quarters.map((q, idx) => {
    const influxRate = QUARTERLY_BRAND_INFLUX[q];
    const newBrands = Math.round(totalBrands * influxRate);
    cumBrands += newBrands;
    const avgBrandsInQuarter = cumBrands - newBrands / 2;
    const proportion = totalBrands > 0 ? avgBrandsInQuarter / totalBrands : 0;
    const quarterMonth = (idx + 1) * 3;
    return { q, proportion, quarterMonth };
  });

  const pkgAnnualRealizedMap = new Map<PackageType, number>();
  allocations.forEach((allocation) => {
    const pkg = packages.find((p) => p.name === allocation.package)!;
    const monthlyRevFull = calculatePackageMonthlyRevenue(pkg, allocation, brandDistribution);
    const annualRealized = quarterMeta.reduce((sum, meta) => {
      if (PACKAGE_AVAILABILITY[pkg.name] > meta.quarterMonth) return sum; // 분기 내 미출시
      return sum + monthlyRevFull * 3 * meta.proportion;
    }, 0);
    pkgAnnualRealizedMap.set(pkg.name, annualRealized);
  });

  // packageBreakdown에 annualRevenue(실현 기준) 주입
  packageBreakdown.forEach((p) => {
    p.annualRevenue = pkgAnnualRealizedMap.get(p.package) ?? 0;
  });

  // 매장 규모별 분석도 "실현 기준"으로 통일
  const storeRangeBreakdown = brandDistribution.map((dist) => {
    const brandsInRange = allocations.reduce((sum, alloc) => sum + alloc.distribution[dist.range], 0);
    const stores = brandsInRange * dist.avgStores;

    const revenue = allocations.reduce((sum, allocation) => {
      const pkg = packages.find((p) => p.name === allocation.package)!;
      const brandCount = allocation.distribution[dist.range];
      if (brandCount <= 0) return sum;

      const monthlyRevForRange = pkg.pricing[dist.range] * brandCount;
      const annualRealizedForRange = quarterMeta.reduce((acc, meta) => {
        if (PACKAGE_AVAILABILITY[pkg.name] > meta.quarterMonth) return acc;
        return acc + monthlyRevForRange * 3 * meta.proportion;
      }, 0);

      return sum + annualRealizedForRange;
    }, 0);

    return {
      range: dist.range,
      brands: brandsInRange,
      stores,
      revenue,
    };
  });

  return {
    totalRevenue: realizedTotalRevenue,
    subscriptionRevenue: realizedSubscriptionRevenue,
    onboardingRevenue: realizedOnboardingRevenue,
    quarterlyBreakdown,
    packageBreakdown,
    storeRangeBreakdown,
  };
};

// 숫자 포맷팅 유틸리티
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export const formatCurrency = (num: number): string => {
  const billion = num / 100000000;
  if (billion >= 1) {
    return `${billion.toFixed(2)}억원`;
  }
  const million = num / 10000;
  return `${Math.round(million)}만원`;
};

export const formatPercent = (num: number): string => {
  return `${(num * 100).toFixed(1)}%`;
};

