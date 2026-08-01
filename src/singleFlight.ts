export interface SingleFlightGuard {
  isActive: () => boolean
  run: (task: () => Promise<void>) => Promise<boolean>
}
export function createSingleFlightGuard(): SingleFlightGuard {
  let active = false
  return {
    isActive: () => active,
    async run(task) {
      if (active) return false
      active = true
      try {
        await task()
        return true
      } finally {
        active = false
      }
    },
  }
}
