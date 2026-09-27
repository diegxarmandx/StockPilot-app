import { createContext, useContext } from 'react'

export const NoticeContext = createContext<(message: string) => void>(() => {})
export function useNotice() {
  return useContext(NoticeContext)
}
