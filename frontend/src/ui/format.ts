const zl = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 })

export const formatZl = (amount: number): string => `${zl.format(amount)} zł`
