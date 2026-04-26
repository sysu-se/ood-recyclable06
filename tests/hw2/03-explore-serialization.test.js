import { describe, expect, it } from 'vitest'
import { loadDomainApi } from '../hw1/helpers/domain-api.js'

describe('HW2 explore serialization', () => {
	it('preserves active explore session across game serialization round-trip', async () => {
		const { createGame, createGameFromJSON, createSudoku } = await loadDomainApi()
		const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))

		const game = createGame({ sudoku: createSudoku(puzzle) })
		game.startExplore()
		game.guess({ row: 0, col: 0, value: 5 })
		game.guess({ row: 0, col: 1, value: 5 })

		const snapshot = JSON.parse(JSON.stringify(game.toJSON()))
		const restored = createGameFromJSON(snapshot)

		expect(restored.isExploring()).toBe(true)
		const status = restored.getExploreStatus()
		expect(status.active).toBe(true)
		expect(status.conflict).toBe(true)
		expect(status.failedCount).toBeGreaterThan(0)

		// 探索局面应被恢复
		expect(restored.getSudoku().getGrid()[0][0]).toBe(5)
		expect(restored.getSudoku().getGrid()[0][1]).toBe(5)

		// 放弃探索后主局面仍为初始状态
		restored.abortExplore()
		expect(restored.isExploring()).toBe(false)
		expect(restored.getSudoku().getGrid()[0][0]).toBe(0)
		expect(restored.getSudoku().getGrid()[0][1]).toBe(0)
	})
})
