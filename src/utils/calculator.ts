import {
  BrandDistribution,
  Package,
  PackageAllocation,
  OnboardingCost,
  SimulationResult,
  StoreRange,
  PackageType,
  Month,
  MonthlyContract,
} from '../types';
import { MONTHLY_BRAND_INFLUX, PACKAGE_AVAILABILITY } from '../constants';

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

const allocateByWeights = (
  total: number,
  weights: number[]
): number[] => {
  if (weights.length === 0) return [];
  if (total <= 0) return weights.map(() => 0);
  const sumW = weights.reduce((s, w) => s + w, 0);
  if (sumW <= 0) {
    // 균등 분배
    const base = Math.floor(total / weights.length);
    let rem = total - base * weights.length;
    return weights.map((_, i) => base + (rem-- > 0 ? 1 : 0));
  }

  const raws = weights.map((w) => (total * w) / sumW);
  const floors = raws.map((r) => Math.floor(r));
  const fracs = raws.map((r, i) => ({ i, frac: r - floors[i] })).filter(f => f.frac > 0);
  const floorSum = floors.reduce((s, v) => s + v, 0);
  let rem = total - floorSum;
  
  if (fracs.length === 0) {
    // 모든 값이 정수로 떨어짐, 남은 값 균등 분배
    let idx = 0;
    while (rem > 0) {
      floors[idx % floors.length] += 1;
      idx += 1;
      rem -= 1;
    }
  } else {
    fracs.sort((a, b) => b.frac - a.frac);
    let idx = 0;
    while (rem > 0) {
      floors[fracs[idx % fracs.length].i] += 1;
      idx += 1;
      rem -= 1;
    }
  }
  return floors;
};

type RangeCounts = Record<StoreRange, number>;
type PkgRangeCounts = Record<PackageType, RangeCounts>;

const STORE_RANGES: StoreRange[] = ['1-50', '51-100', '101-200', '201-400', '400+'];
const PACKAGE_TYPES: PackageType[] = ['베이직', '프로1', '프로2', '프로3', '프리미엄'];

const emptyRangeCounts = (): RangeCounts => ({
  '1-50': 0,
  '51-100': 0,
  '101-200': 0,
  '201-400': 0,
  '400+': 0,
});

const initPkgRangeCounts = (): PkgRangeCounts => ({
  베이직: emptyRangeCounts(),
  프로1: emptyRangeCounts(),
  프로2: emptyRangeCounts(),
  프로3: emptyRangeCounts(),
  프리미엄: emptyRangeCounts(),
});

/**
 * 월별 매출 시뮬레이션 (패키지 출시월 기준)
 *
 * - 각 패키지에 배정된 브랜드는 해당 패키지 출시월(PACKAGE_AVAILABILITY)에 즉시 전부 활성화
 * - 예: 베이직(1월 출시) 4개 → 1월에 4개 즉시 활성화
 *       프로1(3월 출시) 10개 → 3월에 10개 즉시 활성화
 * - 월 구독 매출 = Σ(활성화된 패키지별 브랜드 수 × 월 가격)
 * - 월 온보딩 매출 = Σ(해당 월 신규 활성화 브랜드 수 × 매장규모별 온보딩 비용)
 */
export const simulateMonthlyRevenueByPackage = (
  totalBrands: number,
  packages: Package[],
  allocations: PackageAllocation[],
  brandDistribution: BrandDistribution[],
  onboardingCosts: OnboardingCost,
  includeOnboarding: boolean
): {
  monthlyBreakdown: MonthlyContract[];
  annualSubscriptionByPackage: Record<PackageType, number>;
  annualSubscriptionByRange: Record<StoreRange, number>;
} => {
  const months: Month[] = [1,2,3,4,5,6,7,8,9,10,11,12];

  const pkgByName = new Map<PackageType, Package>();
  packages.forEach((p) => pkgByName.set(p.name, p));

  // 패키지별 × 매장규모별 배정 브랜드 수
  const packageAllocations: PkgRangeCounts = initPkgRangeCounts();
  allocations.forEach((a) => {
    STORE_RANGES.forEach((r) => {
      packageAllocations[a.package][r] = a.distribution[r] ?? 0;
    });
  });

  // 패키지별로 출시월 그룹핑 (어느 월에 어떤 패키지가 출시되는지)
  const launchByMonth = new Map<Month, PackageType[]>();
  PACKAGE_TYPES.forEach((pkgName) => {
    const launchMonth = PACKAGE_AVAILABILITY[pkgName] ?? 1;
    if (!launchByMonth.has(launchMonth)) {
      launchByMonth.set(launchMonth, []);
    }
    launchByMonth.get(launchMonth)!.push(pkgName);
  });

  const annualSubscriptionByPackage: Record<PackageType, number> = {
    베이직: 0,
    프로1: 0,
    프로2: 0,
    프로3: 0,
    프리미엄: 0,
  };
  const annualSubscriptionByRange: Record<StoreRange, number> = {
    '1-50': 0,
    '51-100': 0,
    '101-200': 0,
    '201-400': 0,
    '400+': 0,
  };

  // 활성화된 브랜드 추적 (월별로 누적)
  const active: PkgRangeCounts = initPkgRangeCounts();

  const monthlyBreakdown: MonthlyContract[] = [];
  let cumulativeBrands = 0;

  months.forEach((month) => {
    // 이번 달에 출시되는 패키지들의 브랜드를 즉시 활성화
    const launchingPackages = launchByMonth.get(month) ?? [];
    let onboardingRevenue = 0;
    let newBrandsThisMonth = 0;

    launchingPackages.forEach((pkgName) => {
      STORE_RANGES.forEach((range) => {
        const brandCount = packageAllocations[pkgName][range];
        if (brandCount > 0) {
          active[pkgName][range] = brandCount;
          newBrandsThisMonth += brandCount;
          if (includeOnboarding) {
            onboardingRevenue += brandCount * onboardingCosts[range];
          }
        }
      });
    });

    cumulativeBrands += newBrandsThisMonth;

    // 이번 달 구독 매출 계산 (출시된 모든 패키지의 활성 브랜드)
    let subscriptionRevenue = 0;
    PACKAGE_TYPES.forEach((pkgName) => {
      const pkg = pkgByName.get(pkgName);
      if (!pkg) return;

      // 아직 출시 안 된 패키지는 스킵
      const launchMonth = PACKAGE_AVAILABILITY[pkgName] ?? 1;
      if (launchMonth > month) return;

      let pkgMonthly = 0;
      STORE_RANGES.forEach((range) => {
        const cnt = active[pkgName][range];
        if (cnt <= 0) return;
        const rev = cnt * (pkg.pricing[range] ?? 0);
        pkgMonthly += rev;
        annualSubscriptionByRange[range] += rev;
      });

      subscriptionRevenue += pkgMonthly;
      annualSubscriptionByPackage[pkgName] += pkgMonthly;
    });

    monthlyBreakdown.push({
      month,
      newBrands: newBrandsThisMonth,
      cumulativeBrands,
      subscriptionRevenue,
      onboardingRevenue,
      revenue: subscriptionRevenue + onboardingRevenue,
    });
  });

  return { monthlyBreakdown, annualSubscriptionByPackage, annualSubscriptionByRange };
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

  // 월별 계약/매출 (패키지 출시월 반영)
  const { monthlyBreakdown, annualSubscriptionByPackage, annualSubscriptionByRange } =
    simulateMonthlyRevenueByPackage(
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
      annualRevenue: annualSubscriptionByPackage[allocation.package] ?? 0,
    };
  });

  // 매장 규모별 분석도 "실현 기준"으로 통일
  const storeRangeBreakdown = brandDistribution.map((dist) => {
    const brandsInRange = allocations.reduce((sum, alloc) => sum + alloc.distribution[dist.range], 0);
    const stores = brandsInRange * dist.avgStores;
    const revenue = annualSubscriptionByRange[dist.range] ?? 0;

    return {
      range: dist.range,
      brands: brandsInRange,
      stores,
      revenue,
    };
  });

  // "실현 기준" 연간 구독/온보딩/총 매출: 월 합
  const realizedSubscriptionRevenue = monthlyBreakdown.reduce((sum, m) => sum + m.subscriptionRevenue, 0);
  const realizedOnboardingRevenue = includeOnboarding
    ? monthlyBreakdown.reduce((sum, m) => sum + m.onboardingRevenue, 0)
    : 0;
  const realizedTotalRevenue = monthlyBreakdown.reduce((sum, m) => sum + m.revenue, 0);

  return {
    totalRevenue: realizedTotalRevenue,
    subscriptionRevenue: realizedSubscriptionRevenue,
    onboardingRevenue: realizedOnboardingRevenue,
    monthlyBreakdown,
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

