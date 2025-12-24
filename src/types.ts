// 매장 규모 구간
export type StoreRange = '1-50' | '51-100' | '101-200' | '201-400' | '400+';

// 패키지 타입
export type PackageType = '베이직' | '프로1' | '프로2' | '프로3' | '프리미엄';

// 분기
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

// 브랜드 규모별 정보
export interface BrandDistribution {
  range: StoreRange;
  count: number;
  avgStores: number;
}

// 패키지 정보
export interface Package {
  name: PackageType;
  modules: string[];
  pricing: {
    [key in StoreRange]: number;
  };
  pricePerStore?: {
    [key in StoreRange]: number;
  };
}

// 패키지별 브랜드 배분
export interface PackageAllocation {
  package: PackageType;
  distribution: {
    [key in StoreRange]: number;
  };
}

// 온보딩 비용
export interface OnboardingCost {
  [key in StoreRange]: number;
}

// 분기별 계약 정보
export interface QuarterlyContract {
  quarter: Quarter;
  newBrands: number;
  cumulativeBrands: number;
  subscriptionRevenue: number;
  revenue: number;
  onboardingRevenue: number;
}

// 시뮬레이션 결과
export interface SimulationResult {
  totalRevenue: number;
  subscriptionRevenue: number;
  onboardingRevenue: number;
  quarterlyBreakdown: QuarterlyContract[];
  packageBreakdown: {
    package: PackageType;
    brands: number;
    stores: number;
    monthlyRevenue: number;
    annualRevenue: number;
  }[];
  storeRangeBreakdown: {
    range: StoreRange;
    brands: number;
    stores: number;
    revenue: number;
  }[];
}

// 옵션 설정
export interface OptionConfig {
  name: string;
  priceMultiplier: number;
  brandDistribution: BrandDistribution[];
  onboardingMultiplier: number;
  description: string;
}

