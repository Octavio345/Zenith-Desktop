import { useCallback, useEffect, useRef, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../services/firebase"
import { consumeFeatureUse, FeatureLimitError, getFeatureAccess } from "../services/featureAccess"

export function useFeatureAccess(feature) {
  const [access, setAccess] = useState({ loading: true, fullAccess: false, used: 0, remaining: 0, error: "" })
  const claimingRef = useRef(false)

  const refresh = useCallback(async () => {
    setAccess((current) => ({ ...current, loading: true, error: "" }))
    try {
      const next = await getFeatureAccess(feature)
      setAccess({ ...next, loading: false, error: "" })
      return next
    } catch (error) {
      setAccess({ loading: false, fullAccess: false, used: 0, remaining: 0, error: error?.message || "Não foi possível verificar o acesso agora." })
      return null
    }
  }, [feature])

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (user) refresh()
    else setAccess({ loading: false, fullAccess: false, used: 0, remaining: 0, error: "Entre novamente na sua conta para continuar." })
  }), [refresh])

  const consume = useCallback(async () => {
    if (claimingRef.current) return { allowed: false, pending: true }
    claimingRef.current = true
    try {
      const next = await consumeFeatureUse(feature)
      setAccess({ ...next, loading: false, error: "" })
      return { allowed: true, access: next }
    } catch (error) {
      if (error instanceof FeatureLimitError || error?.code === "feature-limit-reached") {
        setAccess((current) => ({ ...current, loading: false, used: 3, remaining: 0, error: "" }))
        return { allowed: false, limitReached: true }
      }
      setAccess((current) => ({ ...current, loading: false, error: error?.message || "Não foi possível verificar o acesso agora." }))
      return { allowed: false, error }
    } finally {
      claimingRef.current = false
    }
  }, [feature])

  return { ...access, consume, refresh }
}
