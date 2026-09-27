import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { NoticeContext } from '../hooks/useNotice'

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string; time: number } | null>(null)
  const notify = useCallback((message: string) => setNotice({ message, time: Date.now() }), [])
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 6000)
    return () => window.clearTimeout(timeout)
  }, [notice])
  return (
    <NoticeContext.Provider value={notify}>
      {children}
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{notice.message}</span>
          <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </NoticeContext.Provider>
  )
}
