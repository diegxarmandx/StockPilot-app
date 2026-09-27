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

export interface HealthResponse {
  status: 'UP'
}
