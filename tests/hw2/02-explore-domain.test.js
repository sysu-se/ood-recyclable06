import { describe, expect, it } from 'vitest'
import { loadDomainApi } from '../hw1/helpers/domain-api.js'

describe('HW2 explore behavior', () => {
	it('supports start/abort explore without polluting main board', async () => {
		const { createGame, createSudoku } = await loadDomainApi()
		const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))
		const game = createGame({ sudoku: createSudoku(puzzle) })

		const before = game.getSudoku().getGrid()

		expect(game.startExplore()).toEqual({ ok: true })
		expect(game.isExploring()).toBe(true)

		game.guess({ row: 0, col: 0, value: 5 })
		expect(game.getSudoku().getGrid()[0][0]).toBe(5)

		expect(game.abortExplore()).toEqual({ ok: true })
		expect(game.isExploring()).toBe(false)
		expect(game.getSudoku().getGrid()).toEqual(before)
	})

	it('supports independent undo/redo inside explore session', async () => {
		const { createGame, createSudoku } = await loadDomainApi()
		const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))
		const game = createGame({ sudoku: createSudoku(puzzle) })

		game.startExplore()
		game.guess({ row: 0, col: 0, value: 7 })

		expect(game.canUndo()).toBe(true)
		expect(game.getSudoku().getGrid()[0][0]).toBe(7)

		game.undo()
		expect(game.getSudoku().getGrid()[0][0]).toBe(0)
		expect(game.canRedo()).toBe(true)

		game.redo()
		expect(game.getSudoku().getGrid()[0][0]).toBe(7)
	})

	it('detects conflict and remembers failed path in current explore session', async () => {
		const { createGame, createSudoku } = await loadDomainApi()
		const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))
		const game = createGame({ sudoku: createSudoku(puzzle) })

		game.startExplore()
		game.guess({ row: 0, col: 0, value: 1 })
		game.guess({ row: 0, col: 1, value: 1 })

		let status = game.getExploreStatus()
		expect(status.active).toBe(true)
		expect(status.conflict).toBe(true)
		expect(status.knownFailed).toBe(true)
		expect(status.failedCount).toBe(1)

		game.rollbackExplore()
		game.guess({ row: 0, col: 0, value: 1 })
		game.guess({ row: 0, col: 1, value: 1 })

		status = game.getExploreStatus()
		expect(status.knownFailed).toBe(true)
		expect(status.failedCount).toBe(1)
	})

	it('commits explore result as one main history item with undo/redo', async () => {
		const { createGame, createSudoku } = await loadDomainApi()
		const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))
		const game = createGame({ sudoku: createSudoku(puzzle) })

		game.startExplore()
		game.guess({ row: 0, col: 0, value: 4 })
		game.guess({ row: 1, col: 1, value: 6 })

		expect(game.commitExplore()).toEqual({ ok: true })
		expect(game.isExploring()).toBe(false)
		expect(game.getSudoku().getGrid()[0][0]).toBe(4)
		expect(game.getSudoku().getGrid()[1][1]).toBe(6)
		expect(game.canUndo()).toBe(true)

		game.undo()
		expect(game.getSudoku().getGrid()[0][0]).toBe(0)
		expect(game.getSudoku().getGrid()[1][1]).toBe(0)

		game.redo()
		expect(game.getSudoku().getGrid()[0][0]).toBe(4)
		expect(game.getSudoku().getGrid()[1][1]).toBe(6)
	})
})
