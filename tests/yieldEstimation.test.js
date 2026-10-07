import test from "node:test"
import assert from "node:assert/strict"
import { calculateSoybeanYield, calculateWheatYield, getSoybeanPlantsPerM2, parseYieldNumber } from "../src/services/yieldEstimation.js"

test("trigo: 400 espigas, 30 grãos e PMG 35 produzem 4.200 kg/ha e 70 sc/ha", () => {
  const result = calculateWheatYield({ spikesPerM2: 400, grainsPerSpike: 30, thousandGrainWeightG: 35, areaHa: 42.7 })
  assert.equal(result.adjustedYieldKgHa, 4200)
  assert.equal(result.yieldBagsHa, 70)
  assert.equal(result.totalBags, 2989)
})

test("soja: 15 plantas, 50 vagens, 2,4 grãos e PMG 180 produzem 3.240 kg/ha e 54 sc/ha", () => {
  const result = calculateSoybeanYield({ plantsPerM2: 15, podsPerPlant: 50, grainsPerPod: 2.4, thousandGrainWeightG: 180, areaHa: 42.7 })
  assert.equal(result.adjustedYieldKgHa, 3240)
  assert.equal(result.yieldBagsHa, 54)
  assert.equal(result.totalBags, 2305.8)
  assert.equal(result.totalKg, 138348)
})

test("soja: população por metro linear e espaçamento", () => {
  assert.equal(getSoybeanPlantsPerM2(7.5, 0.5), 15)
  const result = calculateSoybeanYield({ populationMode: "linear", plantsPerLinearMeter: "7,5", rowSpacingMeters: "0,50", podsPerPlant: 50, grainsPerPod: "2,4", thousandGrainWeightG: 180, areaHa: "42,7" })
  assert.equal(result.plantsPerM2, 15)
  assert.equal(result.yieldBagsHa, 54)
})

test("5% de perdas ajustam 3.240 para 3.078 kg/ha e 51,3 sc/ha", () => {
  const result = calculateSoybeanYield({ plantsPerM2: 15, podsPerPlant: 50, grainsPerPod: 2.4, thousandGrainWeightG: 180, lossPercent: 5, areaHa: 1 })
  assert.equal(result.theoreticalYieldKgHa, 3240)
  assert.equal(result.adjustedYieldKgHa, 3078)
  assert.equal(result.yieldBagsHa, 51.3)
})

test("validação rejeita dados ausentes, negativos, zero e perdas acima de 100%", () => {
  assert.equal(parseYieldNumber("1.000"), 1000)
  assert.equal(parseYieldNumber("2,4"), 2.4)
  assert.ok(Number.isNaN(parseYieldNumber("2,4,5")))
  assert.throws(() => calculateWheatYield({ spikesPerM2: 0, grainsPerSpike: 30, thousandGrainWeightG: 35, areaHa: 1 }), RangeError)
  assert.throws(() => calculateWheatYield({ spikesPerM2: 400, grainsPerSpike: -1, thousandGrainWeightG: 35, areaHa: 1 }), RangeError)
  assert.throws(() => calculateWheatYield({ spikesPerM2: 400, grainsPerSpike: 30, thousandGrainWeightG: 35, lossPercent: 101, areaHa: 1 }), RangeError)
  assert.throws(() => calculateSoybeanYield({ plantsPerM2: 15, podsPerPlant: 50, grainsPerPod: 2.4, thousandGrainWeightG: 180, areaHa: 0 }), RangeError)
})
