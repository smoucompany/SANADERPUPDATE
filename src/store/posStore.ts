import { create } from 'zustand'
import type { CartItem, Customer, Shift, DiscountType, PaymentMethod } from '@/types'
import { calculateDiscount, calculateVat } from '@/lib/utils'

interface POSState {
  cart: CartItem[]
  customer: Customer | null
  shift: Shift | null
  paymentMethod: PaymentMethod
  discountType: DiscountType
  discountValue: number
  notes: string
  heldInvoices: { id: string; customer: Customer | null; cart: CartItem[]; notes: string }[]
  // Computed
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  // Actions
  setShift: (shift: Shift | null) => void
  setCustomer: (customer: Customer | null) => void
  addToCart: (item: Omit<CartItem, 'id'>) => void
  updateCartItem: (id: string, updates: Partial<CartItem>) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  setPaymentMethod: (method: PaymentMethod) => void
  setDiscount: (type: DiscountType, value: number) => void
  setNotes: (notes: string) => void
  holdInvoice: () => void
  recallInvoice: (id: string) => void
  deleteHeldInvoice: (id: string) => void
  recalculate: () => void
}

const computeTotals = (cart: CartItem[], discountType: DiscountType, discountValue: number) => {
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price - item.discount_amount), 0)
  const discountAmount = calculateDiscount(subtotal, discountType, discountValue)
  const afterDiscount = subtotal - discountAmount
  const taxAmount = cart.reduce((sum, item) => {
    const itemAfterDiscount = item.quantity * item.unit_price - item.discount_amount
    return sum + (itemAfterDiscount * item.vat_rate / 100)
  }, 0)
  const total = afterDiscount + taxAmount
  return { subtotal, discountAmount, taxAmount, total }
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  customer: null,
  shift: null,
  paymentMethod: 'cash',
  discountType: 'percentage',
  discountValue: 0,
  notes: '',
  heldInvoices: [],
  subtotal: 0,
  discountAmount: 0,
  taxAmount: 0,
  total: 0,

  setShift: (shift) => set({ shift }),
  setCustomer: (customer) => set({ customer }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setNotes: (notes) => set({ notes }),

  setDiscount: (type, value) => {
    set({ discountType: type, discountValue: value })
    get().recalculate()
  },

  addToCart: (item) => {
    const state = get()
    const existingIndex = state.cart.findIndex(
      c => c.product_id === item.product_id
    )

    let newCart: CartItem[]
    if (existingIndex >= 0) {
      newCart = state.cart.map((c, i) => {
        if (i !== existingIndex) return c
        const newQty = c.quantity + item.quantity
        const discountAmount = calculateDiscount(newQty * c.unit_price, c.discount_type, c.discount_value)
        const { vatAmount } = calculateVat(newQty * c.unit_price - discountAmount, c.vat_rate)
        return {
          ...c,
          quantity: newQty,
          discount_amount: discountAmount,
          vat_amount: vatAmount,
          total: newQty * c.unit_price - discountAmount + vatAmount
        }
      })
    } else {
      const id = crypto.randomUUID()
      const discountAmount = calculateDiscount(item.quantity * item.unit_price, item.discount_type, item.discount_value)
      const { vatAmount } = calculateVat(item.quantity * item.unit_price - discountAmount, item.vat_rate)
      newCart = [...state.cart, {
        ...item,
        id,
        discount_amount: discountAmount,
        vat_amount: vatAmount,
        total: item.quantity * item.unit_price - discountAmount + vatAmount
      }]
    }

    const totals = computeTotals(newCart, state.discountType, state.discountValue)
    set({ cart: newCart, ...totals })
  },

  updateCartItem: (id, updates) => {
    const state = get()
    const newCart = state.cart.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, ...updates }
      const discountAmount = calculateDiscount(
        updated.quantity * updated.unit_price,
        updated.discount_type,
        updated.discount_value
      )
      const { vatAmount } = calculateVat(
        updated.quantity * updated.unit_price - discountAmount,
        updated.vat_rate
      )
      return {
        ...updated,
        discount_amount: discountAmount,
        vat_amount: vatAmount,
        total: updated.quantity * updated.unit_price - discountAmount + vatAmount
      }
    })
    const totals = computeTotals(newCart, state.discountType, state.discountValue)
    set({ cart: newCart, ...totals })
  },

  removeFromCart: (id) => {
    const state = get()
    const newCart = state.cart.filter(item => item.id !== id)
    const totals = computeTotals(newCart, state.discountType, state.discountValue)
    set({ cart: newCart, ...totals })
  },

  clearCart: () => {
    set({
      cart: [],
      customer: null,
      paymentMethod: 'cash',
      discountType: 'percentage',
      discountValue: 0,
      notes: '',
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 0
    })
  },

  holdInvoice: () => {
    const state = get()
    if (state.cart.length === 0) return
    const held = {
      id: crypto.randomUUID(),
      customer: state.customer,
      cart: [...state.cart],
      notes: state.notes
    }
    set({ heldInvoices: [...state.heldInvoices, held] })
    get().clearCart()
  },

  recallInvoice: (id) => {
    const state = get()
    const invoice = state.heldInvoices.find(inv => inv.id === id)
    if (!invoice) return
    const totals = computeTotals(invoice.cart, state.discountType, state.discountValue)
    set({
      cart: invoice.cart,
      customer: invoice.customer,
      notes: invoice.notes,
      heldInvoices: state.heldInvoices.filter(inv => inv.id !== id),
      ...totals
    })
  },

  deleteHeldInvoice: (id) => {
    set(state => ({ heldInvoices: state.heldInvoices.filter(inv => inv.id !== id) }))
  },

  recalculate: () => {
    const state = get()
    const totals = computeTotals(state.cart, state.discountType, state.discountValue)
    set(totals)
  }
}))
