import { BrandDistribution, Package, OnboardingCost, OptionConfig } from './types';

// 기본 브랜드 분포
export const DEFAULT_BRAND_DISTRIBUTION: BrandDistribution[] = [
  { range: '1-50', count: 2, avgStores: 25 },
  { range: '51-100', count: 15, avgStores: 75 },
  { range: '101-200', count: 15, avgStores: 150 },
  { range: '201-400', count: 10, avgStores: 250 },
  { range: '400+', count: 3, avgStores: 400 },
];

// 기본 패키지 정의 (슬롯1 저장 값 기준)
export const BASE_PACKAGES: Package[] = [
  {
    name: '베이직',
    modules: ['AI', '메뉴정제', '대시보드'],
    pricing: {
      '1-50': 200000,
      '51-100': 550000,
      '101-200': 850000,
      '201-400': 1400000,
      '400+': 2200000,
    },
  },
  {
    name: '프로1',
    modules: ['베이직', 'QSC'],
    pricing: {
      '1-50': 300000,
      '51-100': 550000,
      '101-200': 1000000,
      '201-400': 1800000,
      '400+': 3000000,
    },
  },
  {
    name: '프로2',
    modules: ['베이직', '매출집계'],
    pricing: {
      '1-50': 300000,
      '51-100': 550000,
      '101-200': 1000000,
      '201-400': 1800000,
      '400+': 3000000,
    },
  },
  {
    name: '프로3',
    modules: ['베이직', 'QSC', '매출집계'],
    pricing: {
      '1-50': 450000,
      '51-100': 1150000,
      '101-200': 2100000,
      '201-400': 3200000,
      '400+': 4500000,
    },
  },
  {
    name: '프리미엄',
    modules: ['All'],
    pricing: {
      '1-50': 600000,
      '51-100': 1100000,
      '101-200': 2000000,
      '201-400': 3500000,
      '400+': 5500000,
    },
  },
];

// 기본 온보딩 비용
export const BASE_ONBOARDING_COST: OnboardingCost = {
  '1-50': 2000000,
  '51-100': 3000000,
  '101-200': 4000000,
  '201-400': 5000000,
  '400+': 8000000,
};

// 옵션 설정
export const OPTIONS: OptionConfig[] = [
  {
    name: '옵션1: 가격 2배 인상',
    priceMultiplier: 2.0,
    onboardingMultiplier: 1.0,
    brandDistribution: DEFAULT_BRAND_DISTRIBUTION,
    description: '구독료를 2배로 인상하여 수익성 개선',
  },
  {
    name: '옵션2: 가격 2.2배 인상',
    priceMultiplier: 2.2,
    onboardingMultiplier: 1.0,
    brandDistribution: DEFAULT_BRAND_DISTRIBUTION,
    description: '구독료를 2.2배로 인상하여 더 높은 수익 확보',
  },
  {
    name: '옵션3: 대형 브랜드 집중',
    priceMultiplier: 1.8,
    onboardingMultiplier: 1.0,
    brandDistribution: [
      { range: '1-50', count: 0, avgStores: 25 },
      { range: '51-100', count: 5, avgStores: 75 },
      { range: '101-200', count: 15, avgStores: 150 },
      { range: '201-400', count: 15, avgStores: 250 },
      { range: '400+', count: 10, avgStores: 400 },
    ],
    description: '대형 브랜드(200개 이상) 25개 확보 전략',
  },
];

// 패키지별 기본 배분 비율 (배포 사이트 기준 - 총 42개)
export const DEFAULT_PACKAGE_ALLOCATION = {
  베이직: 0.0714,   // 3개
  프로1: 0.1429,    // 6개
  프로2: 0.0714,    // 3개
  프로3: 0.7143,    // 30개
  프리미엄: 0.0,    // 0개
};

// 분기별 브랜드 유입 비율 (제품 출시 일정 반영)
// 월별 브랜드 유입 비율 (합계 1.0)
// - Q1(1~3월): 5%  (1%, 1%, 3%)  * 3월 QSC 출시
// - Q2(4~6월): 15% (5%, 5%, 5%) * 7월 매출집계 출시 전
// - Q3(7~9월): 40% (13.33%, 13.33%, 13.34%) * 7월 매출집계 출시
// - Q4(10~12월): 40% (13.33%, 13.33%, 13.34%)
export const MONTHLY_BRAND_INFLUX: number[] = [
  0.01, // 1월
  0.01, // 2월
  0.03, // 3월
  0.05, // 4월
  0.05, // 5월
  0.05, // 6월
  0.1333, // 7월
  0.1333, // 8월
  0.1334, // 9월
  0.1333, // 10월
  0.1333, // 11월
  0.1334, // 12월
];

// 제품 출시 일정에 따른 패키지 가용성 (월 기준)
export const PACKAGE_AVAILABILITY = {
  베이직: 1,    // 1월부터 가능
  프로1: 3,     // 3월부터 가능 (QSC)
  프로2: 7,     // 7월부터 가능 (매출집계)
  프로3: 7,     // 7월부터 가능 (QSC + 매출집계)
  프리미엄: 7,  // 7월부터 가능 (전체)
};


