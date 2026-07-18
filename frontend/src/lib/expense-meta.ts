import {
  Car,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Plane,
  ReceiptText,
  Repeat2,
  Shapes,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import type { ExpenseCategory } from '@/types/expense'

/** Shared category metadata for Expenses and Insights. */
export const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory,
  { icon: LucideIcon; color: string; softBg: string }
> = {
  Food: { icon: Utensils, color: '#F97316', softBg: '#FFF7ED' },
  Transportation: { icon: Car, color: '#1D70E8', softBg: '#E2EEFC' },
  Bills: { icon: ReceiptText, color: '#8B5CF6', softBg: '#F5F3FF' },
  Shopping: { icon: ShoppingBag, color: '#EC4899', softBg: '#FDF2F8' },
  Entertainment: { icon: Clapperboard, color: '#14B8A6', softBg: '#F0FDFA' },
  Education: { icon: GraduationCap, color: '#0EA5E9', softBg: '#F0F9FF' },
  Healthcare: { icon: HeartPulse, color: '#EF4444', softBg: '#FEF2F2' },
  Travel: { icon: Plane, color: '#67B2F5', softBg: '#EFF6FF' },
  Subscription: { icon: Repeat2, color: '#6366F1', softBg: '#EEF2FF' },
  Others: { icon: Shapes, color: '#64748B', softBg: '#F1F5F9' },
}
