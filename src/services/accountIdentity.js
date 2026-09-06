import { collection, deleteField, doc, getDocs, query, runTransaction, serverTimestamp, where } from "firebase/firestore"
import { db } from "./firebase"

export const normalizeAccountDocument = (value) => String(value || "").replace(/\D/g, "")
export const normalizeAccountPhone = (value) => String(value || "").replace(/\D/g, "")

export const maskAccountDocument = (value) => {
  const digits = normalizeAccountDocument(value)
  return digits.length === 11 ? `***.***.***-${digits.slice(-2)}` : `**.***.***/****-${digits.slice(-2)}`
}

export const maskAccountPhone = (value) => {
  const digits = normalizeAccountPhone(value)
  return digits.length >= 10 ? `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}` : "Telefone protegido"
}

async function identifierId(kind, value) {
  const bytes = new TextEncoder().encode(`zenith:spark:v1:${kind}:${value}`)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return `${kind}_${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

function duplicateError(kind) {
  const error = new Error("Identificador já cadastrado.")
  error.code = kind === "phone" ? "account/phone-already-in-use" : "account/document-already-in-use"
  return error
}

export async function createProfileWithUniqueIdentifiers({ profileCollection, userId, profileData }) {
  const documentValue = normalizeAccountDocument(profileData.document)
  const phone = normalizeAccountPhone(profileData.phone)
  const safeProfile = { ...profileData }
  delete safeProfile.document
  delete safeProfile.phone

  const identities = [["document", documentValue], ...(phone ? [["phone", phone]] : [])]
  const claimIds = await Promise.all(identities.map(([kind, value]) => identifierId(kind, value)))
  const profileRef = doc(db, profileCollection, userId)
  const claimRefs = claimIds.map((id) => doc(db, "accountIdentifiers", id))

  await runTransaction(db, async (transaction) => {
    const [profileSnapshot, ...claimSnapshots] = await Promise.all([
      transaction.get(profileRef),
      ...claimRefs.map((reference) => transaction.get(reference)),
    ])
    if (profileSnapshot.exists()) {
      const error = new Error("Esta conta já possui um perfil.")
      error.code = "account/profile-already-exists"
      throw error
    }
    claimSnapshots.forEach((snapshot, index) => {
      if (snapshot.exists() && snapshot.data()?.userId !== userId) throw duplicateError(identities[index][0])
    })

    transaction.set(profileRef, {
      ...safeProfile,
      documentMasked: maskAccountDocument(documentValue),
      documentLast4: documentValue.slice(-4),
      ...(phone ? { phoneMasked: maskAccountPhone(phone), phoneLast4: phone.slice(-4) } : {}),
      identityProtectionVersion: "spark-v1",
    })
    claimRefs.forEach((reference, index) => transaction.set(reference, {
      userId,
      ownerId: safeProfile.ownerId || userId,
      kind: identities[index][0],
      profileCollection,
      createdAt: serverTimestamp(),
    }))
  })
}

export async function attachUniquePhoneToProfile({ profileCollection = "owners", userId, phone }) {
  const phoneValue = normalizeAccountPhone(phone)
  const claimId = await identifierId("phone", phoneValue)
  const profileRef = doc(db, profileCollection, userId)
  const claimRef = doc(db, "accountIdentifiers", claimId)

  await runTransaction(db, async (transaction) => {
    const [profile, claim] = await Promise.all([transaction.get(profileRef), transaction.get(claimRef)])
    if (!profile.exists()) throw new Error("Perfil não encontrado.")
    if (claim.exists() && claim.data()?.userId !== userId) throw duplicateError("phone")
    transaction.set(profileRef, {
      phoneMasked: maskAccountPhone(phoneValue),
      phoneLast4: phoneValue.slice(-4),
      identityProtectionVersion: "spark-v1",
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    transaction.set(claimRef, {
      userId,
      ownerId: profile.data()?.ownerId || userId,
      kind: "phone",
      profileCollection,
      createdAt: serverTimestamp(),
    })
  })
}

async function protectExistingRecord({ reference, userId, ownerId, profileCollection, documentValue, phoneValue, documentField = "document", phoneField = "phone", documentMaskedField = "documentMasked", phoneMaskedField = "phoneMasked" }) {
  const identities = [
    ...(documentValue ? [["document", normalizeAccountDocument(documentValue)]] : []),
    ...(phoneValue ? [["phone", normalizeAccountPhone(phoneValue)]] : []),
  ].filter(([, value]) => value)
  if (!identities.length) return
  const claimIds = await Promise.all(identities.map(([kind, value]) => identifierId(kind, value)))
  const claimRefs = claimIds.map((id) => doc(db, "accountIdentifiers", id))

  await runTransaction(db, async (transaction) => {
    const claims = await Promise.all(claimRefs.map((claim) => transaction.get(claim)))
    const update = { identityProtectionVersion: "spark-v1", updatedAt: new Date().toISOString() }
    if (documentValue) {
      const digits = normalizeAccountDocument(documentValue)
      update[documentField] = deleteField()
      update[documentMaskedField] = maskAccountDocument(digits)
      update.documentLast4 = digits.slice(-4)
    }
    if (phoneValue) {
      const digits = normalizeAccountPhone(phoneValue)
      update[phoneField] = deleteField()
      update[phoneMaskedField] = maskAccountPhone(digits)
      update.phoneLast4 = digits.slice(-4)
    }
    transaction.update(reference, update)
    claims.forEach((claim, index) => {
      if (claim.exists() && claim.data()?.userId !== userId) return
      transaction.set(claimRefs[index], {
        userId,
        ownerId,
        kind: identities[index][0],
        profileCollection,
        createdAt: serverTimestamp(),
      })
    })
  })
}

export async function protectCurrentIdentityData(profile, userId) {
  if (!profile || !userId) return
  const profileCollection = profile.profileCollection || (profile.ownerId ? "employees" : "owners")
  await protectExistingRecord({
    reference: doc(db, profileCollection, userId),
    userId,
    ownerId: profile.ownerId || userId,
    profileCollection,
    documentValue: profile.document,
    phoneValue: profile.phone,
  })
  if (profileCollection !== "owners") return
  const farms = await getDocs(query(collection(db, "farms"), where("ownerId", "==", userId)))
  for (const farm of farms.docs) {
    const data = farm.data()
    await protectExistingRecord({
      reference: farm.ref,
      userId,
      ownerId: userId,
      profileCollection: "farms",
      documentValue: data.documento_proprietario,
      phoneValue: data.telefone,
      documentField: "documento_proprietario",
      phoneField: "telefone",
      documentMaskedField: "documento_proprietario_mascarado",
      phoneMaskedField: "telefone_mascarado",
    })
  }
}

export function accountIdentifierMessage(error) {
  if (error?.code === "account/document-already-in-use") return "Este CPF ou CNPJ já está cadastrado em outra conta."
  if (error?.code === "account/phone-already-in-use") return "Este número de telefone já está cadastrado em outra conta."
  if (error?.code === "auth/email-already-in-use") return "Este email já está cadastrado em outra conta."
  if (error?.code === "permission-denied" || error?.code === "firestore/permission-denied") return "Não foi possível validar os dados. Atualize a página e tente novamente."
  return ""
}
