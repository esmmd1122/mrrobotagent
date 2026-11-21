import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateAssistantMotion,
  evaluateBlinkEyeScale,
  type AssistantAnimState,
} from './assistant-state.ts'

test('evaluateAssistantMotion handles all 5 assistant states with distinct responses', () => {
  const states: AssistantAnimState[] = ['idle', 'attention', 'listening', 'thinking', 'speaking']
  const outputs = Object.fromEntries(
    states.map((s) => [s, evaluateAssistantMotion(s, 1.25, 0.2, false, true)]),
  )

  assert.ok(outputs.attention.eyeGlowMultiplier > outputs.idle.eyeGlowMultiplier)
  assert.ok(outputs.thinking.haloSpinSpeed > outputs.idle.haloSpinSpeed)
  assert.ok(outputs.listening.headYawOffset > 0)
  assert.notEqual(outputs.speaking.headPitchOffset, 0)
  assert.equal(outputs.idle.bodyPitchOffset, 0)
})

test('evaluateAssistantMotion respects reducedMotion preference', () => {
  const full = evaluateAssistantMotion('thinking', 2.1, 0.4, false, true)
  const reduced = evaluateAssistantMotion('thinking', 2.1, 0.4, true, true)

  assert.ok(reduced.haloSpinSpeed < full.haloSpinSpeed)
  assert.ok(Math.abs(reduced.headYawOffset) < Math.abs(full.headYawOffset))
})

test('evaluateBlinkEyeScale closes cleanly at mid-blink and stays open otherwise', () => {
  assert.equal(evaluateBlinkEyeScale(0, false), 1.0)
  assert.equal(evaluateBlinkEyeScale(Math.PI / 2, true), 0.05)
  assert.equal(evaluateBlinkEyeScale(Math.PI, true), 1.0)
})
