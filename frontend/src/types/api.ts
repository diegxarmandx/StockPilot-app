export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE'

export interface Product {
  id: number
  sku: string
  name: string
  description: string | null
  unitCost: string
  quantityOnHand: number
  reorderPoint: number
  active: boolean
  createdAt: string
  updatedAt: string
  stockStatus: StockStatus
}

export interface ProductInput {
  sku: string
  name: string
  description: string | null
  unitCost: string
  quantityOnHand: number
  reorderPoint: number
  active: boolean
}

export interface Vendor {
  id: number
  name: string
  email: string | null
  phone: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface VendorInput {
  name: string
  email: string | null
  phone: string | null
  active: boolean
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface ErrorResponse {
  timestamp: string
  status: number
  code: string
  message: string
  errors: Record<string, string>
}

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'CANCELLED' | 'RECEIVED'
export type VendorChoice = Pick<Vendor, 'id' | 'name' | 'active'>
export type ProductChoice = Pick<Product, 'id' | 'name' | 'sku' | 'active' | 'unitCost'>
export interface PurchaseOrderItem {
  id: number
  productId: number
  sku: string
  productName: string
  productActive: boolean
  quantity: number
  unitCost: string
  lineTotal: string
}
export interface PurchaseOrderSummary {
  id: number
  poNumber: string
  vendor: VendorChoice
  status: PurchaseOrderStatus
  itemCount: number
  subtotal: string
  total: string
  createdAt: string
  updatedAt: string
  orderedAt: string | null
  receivedAt: string | null
}
export interface PurchaseOrder extends Omit<PurchaseOrderSummary, 'itemCount'> {
  items: PurchaseOrderItem[]
}
export interface PurchaseOrderInput {
  vendorId: number
  items: { productId: number; quantity: number }[]
}

export type ProductUpdateInput = Omit<ProductInput, 'quantityOnHand'>
export interface InventoryTransaction {
  id: number
  productId: number
  sku: string
  productName: string
  type: 'PURCHASE_RECEIPT'
  quantity: number
  balanceBefore: number
  balanceAfter: number
  referenceType: 'PURCHASE_ORDER'
  referenceId: string
  createdAt: string
}
export interface Dashboard {
  products: number
  openPurchaseOrders: number
  inventoryValue: string
  lowStockItems: number
  recentInventoryActivity: InventoryTransaction[]
}
