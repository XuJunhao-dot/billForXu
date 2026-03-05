export type AssetType =
  | 'CASH'
  | 'TIME_DEPOSIT'
  | 'FIXED_INCOME'
  | 'OTC_FUND'
  | 'ETF'
  | 'STOCK'
  | 'FX'
  | 'OTHER_ASSET';

export type LiabilityType = 'CREDIT_CARD' | 'CONSUMER_LOAN' | 'MORTGAGE' | 'CAR_LOAN' | 'OTHER_LIABILITY';

export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string; hint?: string }[] = [
  { value: 'CASH', label: '现金/活期', hint: '零钱、活期、支付宝余额' },
  { value: 'TIME_DEPOSIT', label: '定期存款', hint: '定期/大额存单' },
  { value: 'FIXED_INCOME', label: '固收', hint: '理财、债基、固收+等' },
  { value: 'OTC_FUND', label: '场外基金', hint: '开放式基金、指数基金等' },
  { value: 'ETF', label: '场内 ETF', hint: '交易所 ETF/LOF' },
  { value: 'STOCK', label: '股票', hint: 'A股/港股/美股' },
  { value: 'FX', label: '外汇/现金外币', hint: 'USD/EUR 等' },
  { value: 'OTHER_ASSET', label: '其他资产' }
];

export const LIABILITY_TYPE_OPTIONS: { value: LiabilityType; label: string }[] = [
  { value: 'CREDIT_CARD', label: '信用卡' },
  { value: 'CONSUMER_LOAN', label: '消费贷/网贷' },
  { value: 'MORTGAGE', label: '房贷' },
  { value: 'CAR_LOAN', label: '车贷' },
  { value: 'OTHER_LIABILITY', label: '其他负债' }
];

export const QUICK_ADD_ASSETS: { itemType: AssetType; itemName: string }[] = [
  { itemType: 'CASH', itemName: '现金' },
  { itemType: 'CASH', itemName: '银行卡活期' },
  { itemType: 'TIME_DEPOSIT', itemName: '定期存款' },
  { itemType: 'FIXED_INCOME', itemName: '固收理财' },
  { itemType: 'OTC_FUND', itemName: '场外基金' },
  { itemType: 'ETF', itemName: '场内ETF' },
  { itemType: 'STOCK', itemName: '股票' },
  { itemType: 'FX', itemName: '外汇' }
];

export const QUICK_ADD_LIABILITIES: { itemType: LiabilityType; itemName: string }[] = [
  { itemType: 'CREDIT_CARD', itemName: '信用卡' },
  { itemType: 'CONSUMER_LOAN', itemName: '消费贷/网贷' },
  { itemType: 'MORTGAGE', itemName: '房贷' },
  { itemType: 'CAR_LOAN', itemName: '车贷' }
];
