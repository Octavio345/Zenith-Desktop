export const DIAGNOSIS_CROPS = [
  {
    code: "soja",
    name: "Soja",
    description: "Folhas e lavouras de soja",
    icon: "eco"
  },
  {
    code: "trigo",
    name: "Trigo",
    description: "Folhas e lavouras de trigo",
    icon: "grass"
  }
]

export function cropName(code) {
  return DIAGNOSIS_CROPS.find((crop) => crop.code === code)?.name || "Cultura não definida"
}
