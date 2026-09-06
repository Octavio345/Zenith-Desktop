import crypto from "node:crypto"
import { initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { FieldValue, getFirestore } from "firebase-admin/firestore"
import { defineSecret } from "firebase-functions/params"
import { HttpsError, onCall } from "firebase-functions/v2/https"

initializeApp()

const db = getFirestore()
const identityPepper = defineSecret("ACCOUNT_IDENTITY_PEPPER")
const REGION = "southamerica-east1"
const PROFILE_COLLECTIONS = new Set(["owners", "employees"])
const MIGRATION_ADMINS = new Set([
  "oarsilva6@gmail.com",
  "leocarrilhom@gmail.com",
  "samuel.vieirafreitas@outlook.com"
])
const PROFILE_FIELDS = new Set([
  "name", "age", "type", "email", "role", "plan", "planName", "hectares", "profileIcon",
  "employmentType", "position", "sector", "droneModel", "ownerId", "teamId", "status", "entry",
  "exit", "hours", "delays", "absences", "lastActivity", "inviteStatus", "authProvider", "createdAt"
])

const digitsOnly = (value) => String(value || "").replace(/\D/g, "")
const cleanProfile = (value) => Object.fromEntries(
  Object.entries(value && typeof value === "object" ? value : {})
    .filter(([key, item]) => PROFILE_FIELDS.has(key) && ["string", "number", "boolean"].includes(typeof item))
)

function requireAuth(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Entre novamente para continuar.")
  return request.auth.uid
}

function identifierHash(kind, value) {
  const pepper = identityPepper.value()
  if (!pepper || pepper.length < 32) throw new HttpsError("failed-precondition", "Proteção de identidade não configurada.")
  return crypto.createHmac("sha256", pepper).update(`zenith:v1:${kind}:${value}`).digest("hex")
}

function maskDocument(value) {
  return value.length === 11 ? `***.***.***-${value.slice(-2)}` : `**.***.***/****-${value.slice(-2)}`
}

function maskPhone(value) {
  return value.length >= 10 ? `(${value.slice(0, 2)}) *****-${value.slice(-4)}` : "Telefone protegido"
}

function isValidCPF(value) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false
  const digit = (base, factor) => { const sum = [...base].reduce((total, number) => total + Number(number) * factor--, 0); const result = (sum * 10) % 11; return result === 10 ? 0 : result }
  return digit(value.slice(0, 9), 10) === Number(value[9]) && digit(value.slice(0, 10), 11) === Number(value[10])
}

function isValidCNPJ(value) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1+$/.test(value)) return false
  const digit = (base, weights) => { const sum = [...base].reduce((total, number, index) => total + Number(number) * weights[index], 0); const rest = sum % 11; return rest < 2 ? 0 : 11 - rest }
  return digit(value.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]) === Number(value[12])
    && digit(value.slice(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]) === Number(value[13])
}

function validateDocument(value, type) {
  if (type === "PJ" ? !isValidCNPJ(value) : !isValidCPF(value)) {
    throw new HttpsError("invalid-argument", type === "PJ" ? "CNPJ inválido." : "CPF inválido.")
  }
}

function validatePhone(value) {
  if (!/^[1-9]{2}9?\d{8}$/.test(value) || /^(\d)\1+$/.test(value)) {
    throw new HttpsError("invalid-argument", "Telefone inválido.")
  }
}

function duplicate(kind) {
  throw new HttpsError("already-exists", "Identificador já cadastrado.", { identityCode: `${kind}-already-in-use` })
}

async function authorizeProfileWrite(callerId, profileCollection, userId, profileData) {
  if (!PROFILE_COLLECTIONS.has(profileCollection) || !userId) throw new HttpsError("invalid-argument", "Conta inválida.")
  const targetAuth = await getAuth().getUser(userId)
  if (profileCollection === "owners") {
    if (callerId !== userId || targetAuth.email?.toLowerCase() !== String(profileData.email || "").toLowerCase()) throw new HttpsError("permission-denied", "Operação não autorizada.")
    return
  }
  const owner = await db.doc(`owners/${callerId}`).get()
  if (!owner.exists || profileData.ownerId !== callerId || profileData.teamId !== callerId) throw new HttpsError("permission-denied", "Somente o gestor pode criar este acesso.")
  if (targetAuth.email?.toLowerCase() !== String(profileData.email || "").toLowerCase()) throw new HttpsError("permission-denied", "O email não corresponde à conta criada.")
}

function claimRef(kind, value) {
  return db.doc(`accountIdentifiers/${kind}_${identifierHash(kind, value)}`)
}

async function rejectLegacyDuplicate(kind, value, userId) {
  const targets = kind === "document"
    ? [["owners", "document"], ["employees", "document"], ["users", "document"], ["farms", "documento_proprietario"]]
    : [["owners", "phone"], ["employees", "phone"], ["users", "phone"], ["farms", "telefone"]]
  const snapshots = await Promise.all(targets.map(([collectionName, field]) => (
    db.collection(collectionName).where(field, "==", value).limit(2).get()
  )))
  const usedByAnotherAccount = snapshots.some((snapshot, index) => snapshot.docs.some((record) => (
    targets[index][0] === "farms" ? record.data().ownerId !== userId : record.id !== userId
  )))
  if (usedByAnotherAccount) duplicate(kind)
}

export const createUniqueAccountProfile = onCall({ region: REGION, secrets: [identityPepper] }, async (request) => {
  const callerId = requireAuth(request)
  const { profileCollection, userId } = request.data || {}
  const profileData = cleanProfile(request.data?.profileData)
  const documentValue = digitsOnly(request.data?.document)
  const phone = digitsOnly(request.data?.phone)
  validateDocument(documentValue, profileData.type)
  if (phone) validatePhone(phone)
  await authorizeProfileWrite(callerId, profileCollection, userId, profileData)
  await Promise.all([
    rejectLegacyDuplicate("document", documentValue, userId),
    ...(phone ? [rejectLegacyDuplicate("phone", phone, userId)] : [])
  ])

  const claims = [["document", documentValue], ...(phone ? [["phone", phone]] : [])]
  await db.runTransaction(async (transaction) => {
    const profileRef = db.doc(`${profileCollection}/${userId}`)
    const references = claims.map(([kind, value]) => claimRef(kind, value))
    const [profileSnapshot, ...snapshots] = await Promise.all([
      transaction.get(profileRef),
      ...references.map((reference) => transaction.get(reference))
    ])
    if (profileSnapshot.exists) throw new HttpsError("already-exists", "Esta conta já possui um perfil.")
    snapshots.forEach((snapshot, index) => {
      if (snapshot.exists && snapshot.data()?.userId !== userId) duplicate(claims[index][0])
    })

    const protectedProfile = {
      ...profileData,
      documentMasked: maskDocument(documentValue),
      documentLast4: documentValue.slice(-4),
      ...(phone ? { phoneMasked: maskPhone(phone), phoneLast4: phone.slice(-4) } : {}),
      identityProtectionVersion: 1
    }
    transaction.set(profileRef, protectedProfile)
    references.forEach((reference, index) => transaction.set(reference, {
      userId,
      kind: claims[index][0],
      profileCollection,
      createdAt: FieldValue.serverTimestamp()
    }))
  })
  return { ok: true }
})

export const attachUniqueAccountPhone = onCall({ region: REGION, secrets: [identityPepper] }, async (request) => {
  const callerId = requireAuth(request)
  const { profileCollection, userId } = request.data || {}
  const phone = digitsOnly(request.data?.phone)
  validatePhone(phone)
  if (profileCollection !== "owners" || callerId !== userId) throw new HttpsError("permission-denied", "Operação não autorizada.")
  const profileRef = db.doc(`owners/${userId}`)
  const phoneRef = claimRef("phone", phone)

  await db.runTransaction(async (transaction) => {
    const [profile, claim] = await Promise.all([transaction.get(profileRef), transaction.get(phoneRef)])
    if (!profile.exists) throw new HttpsError("not-found", "Perfil não encontrado.")
    if (claim.exists && claim.data()?.userId !== userId) duplicate("phone")
    transaction.set(profileRef, {
      phoneMasked: maskPhone(phone),
      phoneLast4: phone.slice(-4),
      identityProtectionVersion: 1,
      updatedAt: new Date().toISOString()
    }, { merge: true })
    transaction.set(phoneRef, { userId, kind: "phone", profileCollection: "owners", createdAt: FieldValue.serverTimestamp() })
  })
  return { ok: true }
})

async function protectLegacyRecord(reference, data, userId, profileCollection, fields) {
  const documentValue = digitsOnly(data[fields.document])
  const phone = digitsOnly(data[fields.phone])
  if (!documentValue && !phone) return { migrated: false, conflicts: 0 }
  const identities = [
    ...(documentValue && [11, 14].includes(documentValue.length) ? [["document", documentValue]] : []),
    ...(phone && /^\d{10,11}$/.test(phone) ? [["phone", phone]] : [])
  ]
  let conflicts = 0
  await db.runTransaction(async (transaction) => {
    const references = identities.map(([kind, value]) => claimRef(kind, value))
    const snapshots = await Promise.all(references.map((item) => transaction.get(item)))
    const update = {
      identityProtectionVersion: 1,
      updatedAt: new Date().toISOString(),
      [fields.document]: FieldValue.delete(),
      [fields.phone]: FieldValue.delete()
    }
    if (documentValue) {
      update[fields.documentMasked] = maskDocument(documentValue)
      update.documentLast4 = documentValue.slice(-4)
    }
    if (phone) {
      update[fields.phoneMasked] = maskPhone(phone)
      update.phoneLast4 = phone.slice(-4)
    }
    transaction.update(reference, update)
    snapshots.forEach((snapshot, index) => {
      if (snapshot.exists && snapshot.data()?.userId !== userId) {
        conflicts += 1
        return
      }
      transaction.set(references[index], {
        userId,
        kind: identities[index][0],
        profileCollection,
        createdAt: snapshot.exists ? snapshot.data().createdAt : FieldValue.serverTimestamp()
      })
    })
  })
  return { migrated: true, conflicts }
}

export const protectLegacyIdentityData = onCall({
  region: REGION,
  secrets: [identityPepper],
  timeoutSeconds: 540,
  memory: "512MiB"
}, async (request) => {
  requireAuth(request)
  const email = String(request.auth?.token?.email || "").toLowerCase()
  if (!MIGRATION_ADMINS.has(email)) throw new HttpsError("permission-denied", "Operação não autorizada.")
  const markerRef = db.doc("systemMigrations/identityProtectionV1")
  if ((await markerRef.get()).exists) return { ok: true, alreadyComplete: true }

  let migrated = 0
  let conflicts = 0
  for (const collectionName of ["owners", "employees", "users"]) {
    const snapshot = await db.collection(collectionName).get()
    for (const record of snapshot.docs) {
      const result = await protectLegacyRecord(record.ref, record.data(), record.id, collectionName, {
        document: "document", phone: "phone", documentMasked: "documentMasked", phoneMasked: "phoneMasked"
      })
      if (result.migrated) migrated += 1
      conflicts += result.conflicts
    }
  }
  const farms = await db.collection("farms").get()
  for (const farm of farms.docs) {
    const data = farm.data()
    const result = await protectLegacyRecord(farm.ref, data, data.ownerId || farm.id, "farms", {
      document: "documento_proprietario", phone: "telefone",
      documentMasked: "documento_proprietario_mascarado", phoneMasked: "telefone_mascarado"
    })
    if (result.migrated) migrated += 1
    conflicts += result.conflicts
  }
  await markerRef.set({ completedAt: FieldValue.serverTimestamp(), migrated, conflicts, version: 1 })
  return { ok: true, migrated, conflicts }
})
