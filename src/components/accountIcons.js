
import {
  Banknote,
  Landmark,
  Ticket,
  PiggyBank,
  CreditCard,
  ChartNoAxesCombined,
  Smartphone,
  CircleDollarSign,
  Utensils,
  Sparkles,
  CarFront,
  House,
  HeartPulse,
  BookOpen,
  Zap,
  Gift,
  Handshake,
  TrainFront,
  Package,
  Building ,
  Wallet,
  Laptop,
  Coins
} from 'lucide-vue-next'

export const accountIcons = {
  現金: Banknote,
  銀行: Landmark,
  金券系: Ticket,
  特別予算: PiggyBank,
  カード: CreditCard,
  証券: ChartNoAxesCombined,
  電子マネー: Smartphone,
  その他: CircleDollarSign,
  食費: Utensils,
  美容: Sparkles,
  車費: CarFront,
  住居: House,
  医療: HeartPulse,
  教養・娯楽: BookOpen,
  光熱水道通信: Zap,
  特別費: Gift,
  交際費: Handshake,
  交通費: TrainFront,
  雑費: Package,
  税金保険:Building  ,
  給料: Wallet,
  副業: Laptop,
  雑収入: Coins

}

// 大項目が対応表にない場合は「その他」を表示
export const getAccountIcon = (large) => {
  return accountIcons[large] || accountIcons['その他']
}
