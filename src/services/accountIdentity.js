import { getFunctions, httpsCallable } from "firebase/functions"
import app from "./firebase"

const functions = getFunctions(app, "southamerica-east1")
const createUniqueProfile = httpsCallable(functions, "createUniqueAccountProfile")
const attachUniquePhone = httpsCallable(functions, "attachUniqueAccountPhone")
const protectLegacyData = httpsCallable(functions, "protectLegacyIdentityData", { timeout: 540000 })

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

function mapIdentityError(error) {
  const detailsCode = error?.details?.identityCode
  if (detailsCode === "document-already-in-use") error.code = "account/document-already-in-use"
  if (detailsCode === "phone-already-in-use") error.code = "account/phone-already-in-use"
  return error
}

export async function createProfileWithUniqueIdentifiers({ profileCollection, userId, profileData }) {
  const documentValue = normalizeAccountDocument(profileData.document)
  const phone = normalizeAccountPhone(profileData.phone)
  const safeProfile = { ...profileData }
  delete safeProfile.document
  delete safeProfile.phone
  try {
    await createUniqueProfile({ profileCollection, userId, profileData: safeProfile, document: documentValue, phone })
  } catch (error) {
    throw mapIdentityError(error)
  }
}

export async function attachUniquePhoneToProfile({ profileCollection = "owners", userId, phone, updates = {} }) {
  try {
    await attachUniquePhone({ profileCollection, userId, phone: normalizeAccountPhone(phone), updates })
  } catch (error) {
    throw mapIdentityError(error)
  }
}

export function accountIdentifierMessage(error) {
  if (error?.code === "account/document-already-in-use") return "Este CPF ou CNPJ já está cadastrado em outra conta."
  if (error?.code === "account/phone-already-in-use") return "Este número de telefone já está cadastrado em outra conta."
  if (error?.code === "auth/email-already-in-use") return "Este email já está cadastrado em outra conta."
  if (error?.code === "functions/failed-precondition") return "A proteção dos dados da conta ainda não está configurada. Tente novamente mais tarde."
  if (error?.code === "functions/unavailable") return "Não foi possível validar CPF e telefone agora. Confira sua conexão e tente novamente."
  return ""
}

export async function runIdentityProtectionMigration(email) {
  const allowed = new Set(["oarsilva6@gmail.com", "leocarrilhom@gmail.com", "samuel.vieirafreitas@outlook.com"])
  if (!allowed.has(String(email || "").trim().toLowerCase())) return
  await protectLegacyData()
}
