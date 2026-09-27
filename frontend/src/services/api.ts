import type { ErrorResponse, Product, ProductInput, Vendor, VendorInput } from '../types/api'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError(
      0,
      'Unable to reach the API. Check that the backend is running and try again.',
    )
  }
  if (!response.ok) {
    const body: Partial<ErrorResponse> | null = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      body?.message || `Request failed (${response.status})`,
      body?.errors,
    )
  }
  return response.json() as Promise<T>
}

export const productApi = {
  create: (input: ProductInput) =>
    request<Product>('/api/products', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: ProductInput) =>
    request<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deactivate: (id: number) =>
    request<Product>(`/api/products/${id}/deactivate`, { method: 'PATCH' }),
}

export const vendorApi = {
  create: (input: VendorInput) =>
    request<Vendor>('/api/vendors', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: VendorInput) =>
    request<Vendor>(`/api/vendors/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deactivate: (id: number) => request<Vendor>(`/api/vendors/${id}/deactivate`, { method: 'PATCH' }),
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
