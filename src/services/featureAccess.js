import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore"
import { auth, db } from "./firebase"

export const FEATURE_LIMIT = 3

export const FULL_ACCESS_EMAILS = new Set([
  "oarsilva6@gmail.com",
  "leocarrilhom@gmail.com",
  "samuel.vieirafreitas@outlook.com",
  "zenith.agroia@gmail.com"
])

const COUNTERS = {
  diagnosis: "diagnosisUses",
  monitoring: "monitoringUses"
}

export class FeatureLimitError extends Error {
  constructor(feature) {
    super("Você já utilizou as três análises disponíveis para este recurso.")
    this.name = "FeatureLimitError"
    this.code = "feature-limit-reached"
    this.feature = feature
  }
}

export function hasFullFeatureAccess(user = auth.currentUser) {
  return FULL_ACCESS_EMAILS.has(String(user?.email || "").trim().toLowerCase())
}

function accessResult(feature, used, fullAccess = false) {
  return {
    feature,
    fullAccess,
    used: fullAccess ? 0 : Math.max(0, Number(used) || 0),
    remaining: fullAccess ? null : Math.max(0, FEATURE_LIMIT - (Number(used) || 0))
  }
}

function requireUser() {
  const user = auth.currentUser
  if (!user?.uid) throw new Error("Entre novamente na sua conta para continuar.")
  return user
}

export async function getFeatureAccess(feature) {
  const counter = COUNTERS[feature]
  if (!counter) throw new Error("Recurso de acesso desconhecido.")
  const user = requireUser()
  if (hasFullFeatureAccess(user)) return accessResult(feature, 0, true)

  const snapshot = await getDoc(doc(db, "featureUsage", user.uid))
  return accessResult(feature, snapshot.exists() ? snapshot.data()?.[counter] : 0)
}

export async function consumeFeatureUse(feature) {
  const counter = COUNTERS[feature]
  if (!counter) throw new Error("Recurso de acesso desconhecido.")
  const user = requireUser()
  if (hasFullFeatureAccess(user)) return accessResult(feature, 0, true)

  const usageRef = doc(db, "featureUsage", user.uid)
  const used = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(usageRef)
    const current = Math.max(0, Number(snapshot.data()?.[counter]) || 0)
    if (current >= FEATURE_LIMIT) throw new FeatureLimitError(feature)
    const next = current + 1
    transaction.set(usageRef, { [counter]: next, updatedAt: serverTimestamp() }, { merge: true })
    return next
  })

  return accessResult(feature, used)
}
