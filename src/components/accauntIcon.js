
import {
  Banknote,
  Landmark,
  Ticket,
  PiggyBank,
  CreditCard,
  ChartNoAxesCombined,
  Smartphone,
  CircleDollarSign
} from 'lucide-vue-next'

export const accountIcons = {
  現金: Banknote,
  銀行: Landmark,
  金券系: Ticket,
  特別予算: PiggyBank,
  カード: CreditCard,
  証券: ChartNoAxesCombined,
  電子マネー: Smartphone,
  その他: CircleDollarSign
}

// 大項目が対応表にない場合は「その他」を表示
export const getAccountIcon = (large) => {
  return accountIcons[large] || accountIcons['その他']
}
