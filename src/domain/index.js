import { cloneDeep } from 'lodash'

const BOX_SIZE = 3;
const SUDOKU_SIZE = 9;

function isValidSudokuGrid(grid) {
    if (!Array.isArray(grid) || grid.length !== SUDOKU_SIZE) return false;

    for (let row = 0; row < SUDOKU_SIZE; row++) {
        if (!Array.isArray(grid[row]) || grid[row].length !== SUDOKU_SIZE) return false;

        for (let col = 0; col < SUDOKU_SIZE; col++) {
            const value = grid[row][col];
            if (!Number.isInteger(value) || value < 0 || value > 9) return false;
        }
    }

    return true;
}

function gridsEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;

    for (let row = 0; row < a.length; row++) {
        if (!Array.isArray(a[row]) || !Array.isArray(b[row]) || a[row].length !== b[row].length) return false;
        for (let col = 0; col < a[row].length; col++) {
            if (a[row][col] !== b[row][col]) return false;
        }
    }

    return true;
}

/**
 * 数独盘面
 */
class Sudoku {
    /**
     * 初始化数独盘面
     * @param {number[][]} grid 9x9 的二维数字数组 数组元素为0~9
     */
    constructor(grid, initialGrid = null) {
        if (!isValidSudokuGrid(grid)) {
            throw new Error('Invalid Sudoku grid dimensions');
        }

        if (initialGrid !== null && !isValidSudokuGrid(initialGrid)) {
            throw new Error('Invalid initial Sudoku grid dimensions');
        }

        this.grid = cloneDeep(grid);
        this.initialGrid = initialGrid ? cloneDeep(initialGrid) : cloneDeep(grid);
    }

    /**
     * 获取当前数独盘面的数据
     * @returns {number[][]} 数据的深拷贝
     */
    getGrid() {
        return cloneDeep(this.grid);
    }

    /**
     * 获取当前盘面签名，用于失败路径记忆
     * @returns {string}
     */
    getSignature() {
        return this.grid.flat().join('');
    }

    /**
     * 当前盘面是否存在冲突
     * @returns {boolean}
     */
    hasConflict() {
        return this.getInvalidCells().length > 0;
    }

    /**
     * 获取指定空格的候选数字
     * @param {number} row 行坐标 (0-8)
     * @param {number} col 列坐标 (0-8)
     * @returns {number[]} 升序候选数组；若非空格或参数越界则返回 []
     */
    getCandidates(row, col) {
        if (!Number.isInteger(row) || !Number.isInteger(col)) return [];
        if (row < 0 || row >= SUDOKU_SIZE || col < 0 || col >= SUDOKU_SIZE) return [];
        if (this.grid[row][col] !== 0) return [];

        const used = new Set();

        for (let i = 0; i < SUDOKU_SIZE; i++) {
            if (this.grid[row][i] !== 0) used.add(this.grid[row][i]);
            if (this.grid[i][col] !== 0) used.add(this.grid[i][col]);
        }

        const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
        for (let r = startRow; r < startRow + BOX_SIZE; r++) {
            for (let c = startCol; c < startCol + BOX_SIZE; c++) {
                if (this.grid[r][c] !== 0) used.add(this.grid[r][c]);
            }
        }

        const candidates = [];
        for (let value = 1; value <= 9; value++) {
            if (!used.has(value)) candidates.push(value);
        }

        return candidates;
    }

    /**
     * 规则推导下一步提示：先找裸单元（naked single），再找隐藏单元（hidden single）
     * @returns {{row:number,col:number,value:number,reason:string}|null}
     */
    findNextHint() {
        const candidateMap = new Map();

        for (let row = 0; row < SUDOKU_SIZE; row++) {
            for (let col = 0; col < SUDOKU_SIZE; col++) {
                if (this.grid[row][col] !== 0) continue;
                const candidates = this.getCandidates(row, col);
                candidateMap.set(`${row},${col}`, candidates);
            }
        }

        for (const [key, candidates] of candidateMap.entries()) {
            if (candidates.length === 1) {
                const [row, col] = key.split(',').map(Number);
                return { row, col, value: candidates[0], reason: 'NAKED_SINGLE' };
            }
        }

        for (let row = 0; row < SUDOKU_SIZE; row++) {
            const positionsByValue = Array.from({ length: 10 }, () => []);
            for (let col = 0; col < SUDOKU_SIZE; col++) {
                const candidates = candidateMap.get(`${row},${col}`) || [];
                for (const value of candidates) {
                    positionsByValue[value].push({ row, col });
                }
            }

            for (let value = 1; value <= 9; value++) {
                if (positionsByValue[value].length === 1) {
                    const pos = positionsByValue[value][0];
                    return { row: pos.row, col: pos.col, value, reason: 'HIDDEN_SINGLE_ROW' };
                }
            }
        }

        for (let col = 0; col < SUDOKU_SIZE; col++) {
            const positionsByValue = Array.from({ length: 10 }, () => []);
            for (let row = 0; row < SUDOKU_SIZE; row++) {
                const candidates = candidateMap.get(`${row},${col}`) || [];
                for (const value of candidates) {
                    positionsByValue[value].push({ row, col });
                }
            }

            for (let value = 1; value <= 9; value++) {
                if (positionsByValue[value].length === 1) {
                    const pos = positionsByValue[value][0];
                    return { row: pos.row, col: pos.col, value, reason: 'HIDDEN_SINGLE_COL' };
                }
            }
        }

        for (let boxRow = 0; boxRow < SUDOKU_SIZE; boxRow += BOX_SIZE) {
            for (let boxCol = 0; boxCol < SUDOKU_SIZE; boxCol += BOX_SIZE) {
                const positionsByValue = Array.from({ length: 10 }, () => []);

                for (let row = boxRow; row < boxRow + BOX_SIZE; row++) {
                    for (let col = boxCol; col < boxCol + BOX_SIZE; col++) {
                        const candidates = candidateMap.get(`${row},${col}`) || [];
                        for (const value of candidates) {
                            positionsByValue[value].push({ row, col });
                        }
                    }
                }

                for (let value = 1; value <= 9; value++) {
                    if (positionsByValue[value].length === 1) {
                        const pos = positionsByValue[value][0];
                        return { row: pos.row, col: pos.col, value, reason: 'HIDDEN_SINGLE_BOX' };
                    }
                }
            }
        }

        return null;
    }

    /**
     * 获取当前盘面中的冲突格子坐标列表，格式为 "x,y"
     * @returns {string[]}
     */
    getInvalidCells() {
        const invalid = [];

        const addInvalid = (x, y) => {
            const xy = `${x},${y}`;
            if (!invalid.includes(xy)) invalid.push(xy);
        };

        for (let y = 0; y < SUDOKU_SIZE; y++) {
            for (let x = 0; x < SUDOKU_SIZE; x++) {
                const value = this.grid[y][x];
                if (value === 0) continue;

                for (let i = 0; i < SUDOKU_SIZE; i++) {
                    if (i !== x && this.grid[y][i] === value) {
                        addInvalid(x, y);
                    }
                    if (i !== y && this.grid[i][x] === value) {
                        addInvalid(x, y);
                    }
                }

                const startY = Math.floor(y / BOX_SIZE) * BOX_SIZE;
                const endY = startY + BOX_SIZE;
                const startX = Math.floor(x / BOX_SIZE) * BOX_SIZE;
                const endX = startX + BOX_SIZE;

                for (let row = startY; row < endY; row++) {
                    for (let col = startX; col < endX; col++) {
                        if (row === y && col === x) continue;
                        if (this.grid[row][col] === value) {
                            addInvalid(x, y);
                        }
                    }
                }
            }
        }

        return invalid;
    }

    /**
     * 判断当前盘面是否已完成（填满且无冲突）
     * @returns {boolean}
     */
    isSolved() {
        for (let row = 0; row < SUDOKU_SIZE; row++) {
            for (let col = 0; col < SUDOKU_SIZE; col++) {
                if (this.grid[row][col] === 0) return false;
            }
        }

        return this.getInvalidCells().length === 0;
    }

    /**
     * 执行落子操作
     * @param {Object} move 动作对象
     */
    guess(move) {
        const { row, col, value } = move;

        if (row < 0 || row > 8 || col < 0 || col > 8) return false;
        if (value < 0 || value > 9) return false;

        if (this.initialGrid[row][col] !== 0) return false;

        if (this.grid[row][col] === value) return false;

        this.grid[row][col] = value;
        return true;
    }

    /**
     * 判断落子操作是否符合数独规则
     * @param {number} row 行坐标 (0-8)
     * @param {number} col 列坐标 (0-8)
     * @param {number} value 填入的数字 (1-9，0为空)
     */
    isValidMove(row, col, value) {
        if (value === 0) return true;

        for (let i = 0; i < 9; i++) {
            if (i !== col && this.grid[row][i] === value) return false;
            if (i !== row && this.grid[i][col] === value) return false;
        }

        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const r = startRow + i;
                const c = startCol + j;
                if (r !== row && c !== col && this.grid[r][c] === value) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 克隆当前的数独盘面
     * @returns {Sudoku} 一个深拷贝的新 Sudoku 实例
     */
    clone() {
        return new Sudoku(cloneDeep(this.grid), cloneDeep(this.initialGrid));
    }

    /**
     * 序列化接口
     * @returns {Object} 纯数据对象
     */
    toJSON() {
        return {
            grid: this.getGrid(),
            initialGrid: cloneDeep(this.initialGrid)
        };
    }

    /**
     * 可读的外表化（复用）
     * @returns {string} 格式化的字符串
     */
    toString() {
        let out = '╔═══════╤═══════╤═══════╗\n';

        for (let row = 0; row < SUDOKU_SIZE; row++) {
            if (row !== 0 && row % BOX_SIZE === 0) {
                out += '╟───────┼───────┼───────╢\n';
            }

            for (let col = 0; col < SUDOKU_SIZE; col++) {
                if (col === 0) {
                    out += '║ ';
                } else if (col % BOX_SIZE === 0) {
                    out += '│ ';
                }

                out += (this.grid[row][col] === 0 ? '·' : this.grid[row][col]) + ' ';

                if (col === SUDOKU_SIZE - 1) {
                    out += '║';
                }
            }

            out += '\n';
        }

        out += '╚═══════╧═══════╧═══════╝';

        return out;
    }
}

/**
 * 游戏管理器
 */
class Game {
    /**
     * 初始化游戏会话
     * @param {Sudoku} sudokuInitial 初始数独
     * @param {Object[]} [undoStack=[]] 撤销栈
     * @param {Object[]} [redoStack=[]] 重做栈
     */
    constructor(sudokuInitial, undoStackInitial = [], redoStackInitial = []) {
        this.cur_sudoku = sudokuInitial.clone();
        this.undoStack = cloneDeep(undoStackInitial);
        this.redoStack = cloneDeep(redoStackInitial);
        this.explore = null;
    }

    _getLiveGame() {
        return this.isExploring() ? this.explore.sessionGame : this;
    }

    _guessOnCurrentTimeline(move) {
        const oldValue = this.cur_sudoku.getGrid()[move.row][move.col];
        const success = this.cur_sudoku.guess(move);

        if (success) {
            this.undoStack.push({
                row: move.row,
                col: move.col,
                oldValue,
                newValue: move.value,
            });
            this.redoStack = [];
        }

        return success;
    }

    _replaceCurrentGrid(newGrid) {
        const initialGrid = this.cur_sudoku.toJSON().initialGrid;
        this.cur_sudoku = new Sudoku(newGrid, initialGrid);
    }

    _updateExploreStateFlags() {
        if (!this.isExploring()) return;

        const sessionSudoku = this.explore.sessionGame.cur_sudoku;
        const signature = sessionSudoku.getSignature();
        const conflict = sessionSudoku.hasConflict();

        if (conflict) {
            this.explore.failedSignatures.add(signature);
        }

        this.explore.lastStatus = {
            conflict,
            knownFailed: this.explore.failedSignatures.has(signature),
            signature,
        };
    }

    /**
     * 获取当前游戏的数独实例（探索中返回探索局面）
     * @returns {Sudoku}
     */
    getSudoku() {
        return this._getLiveGame().cur_sudoku.clone();
    }

    /**
     * 获取指定位置候选
     * @param {{row:number,col:number}|{x:number,y:number}} pos
     * @returns {number[]}
     */
    getCellCandidates(pos) {
        if (!pos) return [];
        const row = Number.isInteger(pos.row) ? pos.row : pos.y;
        const col = Number.isInteger(pos.col) ? pos.col : pos.x;
        return this._getLiveGame().cur_sudoku.getCandidates(row, col);
    }

    /**
     * 获取下一步规则提示（探索中针对探索局面）
     * @returns {{row:number,col:number,value:number,reason:string}|null}
     */
    getNextHint() {
        return this._getLiveGame().cur_sudoku.findNextHint();
    }

    /**
     * 应用下一步规则提示
     * @returns {{ok:true,move:{row:number,col:number,value:number,reason:string}}|{ok:false,reason:string,hint?:Object}}
     */
    applyNextHint() {
        const hint = this.getNextHint();
        if (!hint) {
            return { ok: false, reason: 'NO_DEDUCIBLE_MOVE' };
        }

        const success = this.guess({ row: hint.row, col: hint.col, value: hint.value });
        if (!success) {
            return { ok: false, reason: 'APPLY_FAILED', hint };
        }

        return { ok: true, move: hint };
    }

    /**
     * 进入探索模式（子会话 + 深拷贝）
     * @returns {{ok:boolean,reason?:string}}
     */
    startExplore() {
        if (this.isExploring()) {
            return { ok: false, reason: 'EXPLORE_ALREADY_ACTIVE' };
        }

        const startSudoku = this.cur_sudoku.clone();
        this.explore = {
            startSudoku,
            sessionGame: new Game(startSudoku.clone()),
            failedSignatures: new Set(),
            lastStatus: {
                conflict: false,
                knownFailed: false,
                signature: startSudoku.getSignature(),
            },
        };

        return { ok: true };
    }

    /**
     * 当前是否处于探索模式
     * @returns {boolean}
     */
    isExploring() {
        return !!this.explore;
    }

    /**
     * 获取探索状态
     * @returns {{active:boolean,conflict:boolean,knownFailed:boolean,failedCount:number}}
     */
    getExploreStatus() {
        if (!this.isExploring()) {
            return {
                active: false,
                conflict: false,
                knownFailed: false,
                failedCount: 0,
            };
        }

        return {
            active: true,
            conflict: this.explore.lastStatus.conflict,
            knownFailed: this.explore.lastStatus.knownFailed,
            failedCount: this.explore.failedSignatures.size,
        };
    }

    /**
     * 回到探索起点（保留当前探索会话内的失败记忆）
     * @returns {{ok:boolean,reason?:string}}
     */
    rollbackExplore() {
        if (!this.isExploring()) {
            return { ok: false, reason: 'EXPLORE_NOT_ACTIVE' };
        }

        const startSudoku = this.explore.startSudoku.clone();
        this.explore.sessionGame = new Game(startSudoku);
        this.explore.lastStatus = {
            conflict: false,
            knownFailed: this.explore.failedSignatures.has(startSudoku.getSignature()),
            signature: startSudoku.getSignature(),
        };

        return { ok: true };
    }

    /**
     * 放弃探索结果
     * @returns {{ok:boolean,reason?:string}}
     */
    abortExplore() {
        if (!this.isExploring()) {
            return { ok: false, reason: 'EXPLORE_NOT_ACTIVE' };
        }

        this.explore = null;
        return { ok: true };
    }

    /**
     * 提交探索结果到主会话，主 history 压缩为 1 条
     * @returns {{ok:boolean,reason?:string}}
     */
    commitExplore() {
        if (!this.isExploring()) {
            return { ok: false, reason: 'EXPLORE_NOT_ACTIVE' };
        }

        if (this.explore.lastStatus.conflict) {
            return { ok: false, reason: 'EXPLORE_CONFLICT' };
        }

        const beforeGrid = this.cur_sudoku.getGrid();
        const afterGrid = this.explore.sessionGame.cur_sudoku.getGrid();

        if (gridsEqual(beforeGrid, afterGrid)) {
            this.explore = null;
            return { ok: false, reason: 'EXPLORE_NO_CHANGES' };
        }

        this._replaceCurrentGrid(afterGrid);
        this.undoStack.push({
            type: 'EXPLORE_COMMIT',
            beforeGrid: cloneDeep(beforeGrid),
            afterGrid: cloneDeep(afterGrid),
        });
        this.redoStack = [];

        this.explore = null;
        return { ok: true };
    }

    /**
     * 获取当前局面的冲突格子列表
     * @returns {string[]}
     */
    getInvalidCells() {
        return this._getLiveGame().cur_sudoku.getInvalidCells();
    }

    /**
     * 判断当前游戏是否胜利
     * @returns {boolean}
     */
    isWon() {
        return this._getLiveGame().cur_sudoku.isSolved();
    }

    /**
     * 执行落子并记录
     * @param {Object} move 动作对象
     */
    guess(move) {
        if (this.isExploring()) {
            const success = this.explore.sessionGame._guessOnCurrentTimeline(move);
            if (success) {
                this._updateExploreStateFlags();
            }
            return success;
        }

        return this._guessOnCurrentTimeline(move);
    }

    /**
     * 撤销上一步操作
     */
    undo() {
        const target = this._getLiveGame();
        if (!target.canUndo()) return;

        const lastMove = target.undoStack.pop();
        if (lastMove.type === 'EXPLORE_COMMIT') {
            target._replaceCurrentGrid(lastMove.beforeGrid);
        } else {
            target.cur_sudoku.guess({ row: lastMove.row, col: lastMove.col, value: lastMove.oldValue });
        }
        target.redoStack.push(lastMove);

        if (this.isExploring()) {
            this._updateExploreStateFlags();
        }
    }

    /**
     * 重做被撤销操作
     */
    redo() {
        const target = this._getLiveGame();
        if (!target.canRedo()) return;

        const nextMove = target.redoStack.pop();
        if (nextMove.type === 'EXPLORE_COMMIT') {
            target._replaceCurrentGrid(nextMove.afterGrid);
        } else {
            target.cur_sudoku.guess({ row: nextMove.row, col: nextMove.col, value: nextMove.newValue });
        }
        target.undoStack.push(nextMove);

        if (this.isExploring()) {
            this._updateExploreStateFlags();
        }
    }

    /**
     * 检查是否可以撤销
     * @return {boolean}
     */
    canUndo() {
        return this._getLiveGame().undoStack.length > 0;
    }

    /**
     * 检查是否可以重做
     * @returns {boolean}
     */
    canRedo() {
        return this._getLiveGame().redoStack.length > 0;
    }

    /**
     * 序列化整个游戏状态（包含探索临时态）
     * @returns {Object}
     */
    toJSON() {
        let explore = null;
        if (this.explore) {
            explore = {
                startSudoku: this.explore.startSudoku.toJSON(),
                sessionGame: this.explore.sessionGame.toJSON(),
                failedSignatures: Array.from(this.explore.failedSignatures),
                lastStatus: cloneDeep(this.explore.lastStatus),
            };
        }

        return {
            cur_sudoku: this.cur_sudoku.toJSON(),
            undoStack: cloneDeep(this.undoStack),
            redoStack: cloneDeep(this.redoStack),
            explore,
        };
    }
}

/**
 * 创建一个新的 Sudoku 实例
 * @param {number[][]} input 9x9 的二维数组 数组元素为0~9
 * @returns {Sudoku}
 */
export function createSudoku(input) {
    return new Sudoku(input);
}

/**
 * 从 JSON 数据中恢复 Sudoku 实例
 * @param {Object} json 纯数据对象
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
    return new Sudoku(json.grid, json.initialGrid);
}

/**
 * 创建一个新的 Game 实例
 * @param {Object} params 配置参数
 * @param {Sudoku} params.sudoku Sudoku 实例
 * @returns {Game}
 */
export function createGame({ sudoku }) {
    return new Game(sudoku);
}

/**
 * 从 JSON 数据中恢复 Game 状态
 * @param {Object} json 序列化的游戏状态对象
 * @returns {Game} Game 实例
 */
export function createGameFromJSON(json) {
    const sudokuInitial = createSudokuFromJSON(json.cur_sudoku);
    const undoStack = cloneDeep(json.undoStack || []);
    const redoStack = cloneDeep(json.redoStack || []);
    const game = new Game(sudokuInitial, undoStack, redoStack);

    if (json.explore) {
        const startSudoku = createSudokuFromJSON(json.explore.startSudoku);
        const sessionGame = createGameFromJSON(json.explore.sessionGame);
        game.explore = {
            startSudoku,
            sessionGame,
            failedSignatures: new Set(json.explore.failedSignatures || []),
            lastStatus: cloneDeep(json.explore.lastStatus || {
                conflict: false,
                knownFailed: false,
                signature: startSudoku.getSignature(),
            }),
        };
    }

    return game;
}