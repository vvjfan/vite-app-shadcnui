// Simulated-backend timing seam. Every mock service awaits these helpers so loading
// and error states are real, and so signatures stay identical once a real backend
// replaces the service internals. Concept-agnostic - safe to use from any service.

const MIN_LATENCY_MS = 150
const MAX_LATENCY_MS = 500

// Tests run with zero latency so suites stay fast and deterministic.
const isTest = import.meta.env.MODE === "test"

/** Resolve after a realistic delay (0ms in tests). Pass `ms` to pin a specific delay. */
export function simulateLatency(ms?: number): Promise<void> {
  if (isTest) return Promise.resolve()
  const delay =
    ms ?? MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS)
  return new Promise((resolve) => setTimeout(resolve, delay))
}

/** Error thrown by opt-in simulated failures, so error paths are demonstrable. */
export class SimulatedError extends Error {
  constructor(message = "Simulated backend failure") {
    super(message)
    this.name = "SimulatedError"
  }
}

/** Throw a SimulatedError (after latency) when `shouldFail` is true. Off by default. */
export async function simulateFailure(
  shouldFail: boolean,
  message?: string
): Promise<void> {
  await simulateLatency()
  if (shouldFail) throw new SimulatedError(message)
}
