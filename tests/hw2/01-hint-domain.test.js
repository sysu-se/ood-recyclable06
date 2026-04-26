import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 hint behavior', () => {
	it('Sudoku.getCandidates returns candidates for an empty cell', async () => {
		const { createSudoku } = await loadDomainApi()
		const sudoku = createSudoku(makePuzzle())

		const candidates = sudoku.getCandidates(0, 2)

		expect(candidates).toEqual([1, 2, 4])
	})

	it('Game.getNextHint finds a deducible move', async () => {
		const { createGame, createSudoku } = await loadDomainApi()
		const puzzle = [
			[0, 3, 4, 6, 7, 8, 9, 1, 2],
			[6, 7, 2, 1, 9, 5, 3, 4, 8],
			[1, 9, 8, 3, 4, 2, 5, 6, 7],
			[8, 5, 9, 7, 6, 1, 4, 2, 3],
			[4, 2, 6, 8, 5, 3, 7, 9, 1],
			[7, 1, 3, 9, 2, 4, 8, 5, 6],
			[9, 6, 1, 5, 3, 7, 2, 8, 4],
			[2, 8, 7, 4, 1, 9, 6, 3, 5],
			[3, 4, 5, 2, 8, 6, 1, 7, 9],
		]

		const game = createGame({ sudoku: createSudoku(puzzle) })
		const hint = game.getNextHint()

		expect(hint).toBeTruthy()
		expect(hint).toMatchObject({ row: 0, col: 0, value: 5 })
	})

	it('Game.applyNextHint applies move and creates undo history', async () => {
		const { createGame, createSudoku } = await loadDomainApi()
		const puzzle = [
			[0, 3, 4, 6, 7, 8, 9, 1, 2],
			[6, 7, 2, 1, 9, 5, 3, 4, 8],
			[1, 9, 8, 3, 4, 2, 5, 6, 7],
			[8, 5, 9, 7, 6, 1, 4, 2, 3],
			[4, 2, 6, 8, 5, 3, 7, 9, 1],
			[7, 1, 3, 9, 2, 4, 8, 5, 6],
			[9, 6, 1, 5, 3, 7, 2, 8, 4],
			[2, 8, 7, 4, 1, 9, 6, 3, 5],
			[3, 4, 5, 2, 8, 6, 1, 7, 9],
		]

		const game = createGame({ sudoku: createSudoku(puzzle) })
		const result = game.applyNextHint()

		expect(result.ok).toBe(true)
		expect(game.getSudoku().getGrid()[0][0]).toBe(5)
		expect(game.canUndo()).toBe(true)
	})

	it('Game.applyNextHint returns NO_DEDUCIBLE_MOVE when no step exists', async () => {
		const { createGame, createSudoku } = await loadDomainApi()
		const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))
		const game = createGame({ sudoku: createSudoku(puzzle) })

		const result = game.applyNextHint()

		expect(result).toEqual({ ok: false, reason: 'NO_DEDUCIBLE_MOVE' })
		expect(game.canUndo()).toBe(false)
	})
})
