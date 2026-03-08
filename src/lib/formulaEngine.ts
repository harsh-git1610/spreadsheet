/**
 * Formula Engine — Tokenizer, Parser, and Evaluator.
 *
 * Architecture:
 * 1. Tokenizer: formula string → token array
 * 2. Parser: token array → AST (recursive descent)
 * 3. Evaluator: AST → computed value (resolves cell references from CellMap)
 *
 * Supports:
 * - Arithmetic: +, -, *, /
 * - Cell references: A1, B2, AA10
 * - Functions: SUM(range), MIN(range), MAX(range), AVG(range), COUNT(range)
 * - Ranges: A1:A5
 * - Nested expressions and parentheses
 *
 * Error handling:
 * - Circular dependency detection via visited set
 * - Invalid syntax → "#ERROR!"
 * - Missing/invalid cell references → treats as 0
 * - Division by zero → "#DIV/0!"
 */

import type { FormulaToken, TokenType, ASTNode, CellRefNode, CellMap } from '@/types';

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Check if a value string is a formula (starts with '=') */
export function isFormula(value: string): boolean {
    return value.startsWith('=');
}

/** Convert column letter(s) to zero-based index: A=0, B=1, ..., Z=25, AA=26 */
export function colToIndex(col: string): number {
    let index = 0;
    const upper = col.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
        index = index * 26 + (upper.charCodeAt(i) - 64);
    }
    return index - 1;
}

/** Convert zero-based index to column letter(s): 0=A, 1=B, ..., 25=Z, 26=AA */
export function indexToCol(index: number): string {
    let col = '';
    let n = index + 1;
    while (n > 0) {
        n--;
        col = String.fromCharCode(65 + (n % 26)) + col;
        n = Math.floor(n / 26);
    }
    return col;
}

/** Build a cell key from column and row: ("A", 1) → "A-1" */
export function cellKey(col: string, row: number): string {
    return `${col.toUpperCase()}-${row}`;
}

/** Parse a cell key: "A-1" → { col: "A", row: 1 } */
export function parseCellKey(key: string): { col: string; row: number } | null {
    const match = key.match(/^([A-Z]+)-(\d+)$/);
    if (!match) return null;
    return { col: match[1], row: parseInt(match[2], 10) };
}

// ─── Tokenizer ───────────────────────────────────────────────────────────────

function tokenize(formula: string): FormulaToken[] {
    const tokens: FormulaToken[] = [];
    // Remove leading '='
    const input = formula.slice(1).trim();
    let i = 0;

    while (i < input.length) {
        const ch = input[i];

        // Skip whitespace
        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        // Numbers (including decimals)
        if (/\d/.test(ch)) {
            let num = '';
            while (i < input.length && (/\d/.test(input[i]) || input[i] === '.')) {
                num += input[i];
                i++;
            }
            tokens.push({ type: 'NUMBER', value: num });
            continue;
        }

        // Letters: could be a cell reference (e.g. A1, AA10) or a function name (e.g. SUM)
        if (/[A-Za-z]/.test(ch)) {
            let word = '';
            while (i < input.length && /[A-Za-z0-9]/.test(input[i])) {
                word += input[i];
                i++;
            }
            // If followed by '(' it's a function name
            if (i < input.length && input[i] === '(') {
                tokens.push({ type: 'FUNCTION', value: word.toUpperCase() });
            } else {
                // Check if it matches a cell reference pattern: letters followed by digits
                const cellMatch = word.match(/^([A-Za-z]+)(\d+)$/);
                if (cellMatch) {
                    tokens.push({ type: 'CELL_REF', value: word.toUpperCase() });
                } else {
                    // Unknown identifier — treat as cell ref attempt
                    tokens.push({ type: 'CELL_REF', value: word.toUpperCase() });
                }
            }
            continue;
        }

        // Operators
        if ('+-*/'.includes(ch)) {
            tokens.push({ type: 'OPERATOR', value: ch });
            i++;
            continue;
        }

        // Parentheses
        if (ch === '(') {
            tokens.push({ type: 'LPAREN', value: '(' });
            i++;
            continue;
        }
        if (ch === ')') {
            tokens.push({ type: 'RPAREN', value: ')' });
            i++;
            continue;
        }

        // Comma
        if (ch === ',') {
            tokens.push({ type: 'COMMA', value: ',' });
            i++;
            continue;
        }

        // Colon (range separator)
        if (ch === ':') {
            tokens.push({ type: 'COLON', value: ':' });
            i++;
            continue;
        }

        // Unknown character — skip
        i++;
    }

    tokens.push({ type: 'EOF', value: '' });
    return tokens;
}

// ─── Parser (Recursive Descent) ─────────────────────────────────────────────

class Parser {
    private tokens: FormulaToken[];
    private pos: number;

    constructor(tokens: FormulaToken[]) {
        this.tokens = tokens;
        this.pos = 0;
    }

    private current(): FormulaToken {
        return this.tokens[this.pos];
    }

    private peek(offset: number = 0): FormulaToken {
        const idx = this.pos + offset;
        if (idx < this.tokens.length) return this.tokens[idx];
        return { type: 'EOF', value: '' };
    }

    private consume(expectedType?: TokenType): FormulaToken {
        const token = this.current();
        if (expectedType && token.type !== expectedType) {
            throw new Error(`Expected ${expectedType} but got ${token.type} (${token.value})`);
        }
        this.pos++;
        return token;
    }

    parse(): ASTNode {
        const node = this.parseExpression();
        if (this.current().type !== 'EOF') {
            throw new Error(`Unexpected token: ${this.current().value}`);
        }
        return node;
    }

    /** Expression: term (('+' | '-') term)* */
    private parseExpression(): ASTNode {
        let left = this.parseTerm();
        while (this.current().type === 'OPERATOR' && (this.current().value === '+' || this.current().value === '-')) {
            const op = this.consume().value;
            const right = this.parseTerm();
            left = { kind: 'binaryOp', op, left, right };
        }
        return left;
    }

    /** Term: factor (('*' | '/') factor)* */
    private parseTerm(): ASTNode {
        let left = this.parseFactor();
        while (this.current().type === 'OPERATOR' && (this.current().value === '*' || this.current().value === '/')) {
            const op = this.consume().value;
            const right = this.parseFactor();
            left = { kind: 'binaryOp', op, left, right };
        }
        return left;
    }

    /** Factor: NUMBER | CELL_REF (':' CELL_REF)? | FUNCTION '(' args ')' | '(' expr ')' */
    private parseFactor(): ASTNode {
        const token = this.current();

        // Unary minus
        if (token.type === 'OPERATOR' && token.value === '-') {
            this.consume();
            const operand = this.parseFactor();
            return { kind: 'binaryOp', op: '-', left: { kind: 'number', value: 0 }, right: operand };
        }

        // Number literal
        if (token.type === 'NUMBER') {
            this.consume();
            return { kind: 'number', value: parseFloat(token.value) };
        }

        // Function call: SUM(...)
        if (token.type === 'FUNCTION') {
            const funcName = this.consume().value;
            this.consume('LPAREN');
            const args = this.parseArgList();
            this.consume('RPAREN');
            return { kind: 'functionCall', name: funcName, args };
        }

        // Cell reference (possibly a range)
        if (token.type === 'CELL_REF') {
            const cellRef = this.parseCellRef();
            // Check for range (colon)
            if (this.current().type === 'COLON') {
                this.consume();
                const endRef = this.parseCellRef();
                return { kind: 'range', start: cellRef, end: endRef };
            }
            return cellRef;
        }

        // Parenthesized expression
        if (token.type === 'LPAREN') {
            this.consume();
            const expr = this.parseExpression();
            this.consume('RPAREN');
            return expr;
        }

        throw new Error(`Unexpected token: ${token.type} (${token.value})`);
    }

    private parseCellRef(): CellRefNode {
        const token = this.consume('CELL_REF');
        const match = token.value.match(/^([A-Z]+)(\d+)$/);
        if (!match) {
            throw new Error(`Invalid cell reference: ${token.value}`);
        }
        return { kind: 'cellRef', col: match[1], row: parseInt(match[2], 10) };
    }

    private parseArgList(): ASTNode[] {
        const args: ASTNode[] = [];
        if (this.current().type === 'RPAREN') return args;
        args.push(this.parseExpression());
        while (this.current().type === 'COMMA') {
            this.consume();
            args.push(this.parseExpression());
        }
        return args;
    }
}

// ─── Evaluator ───────────────────────────────────────────────────────────────

/**
 * Evaluate a formula AST node against a CellMap.
 * @param visited - Set of cell keys currently in the evaluation stack (circular dep detection)
 */
function evaluate(
    node: ASTNode,
    cells: CellMap,
    visited: Set<string>
): number {
    switch (node.kind) {
        case 'number':
            return node.value;

        case 'string':
            return 0;

        case 'cellRef': {
            const key = cellKey(node.col, node.row);
            if (visited.has(key)) {
                throw new Error('#CIRCULAR!');
            }
            const cell = cells[key];
            if (!cell) return 0;

            // If the cell itself has a formula, evaluate it recursively
            if (cell.formula && isFormula(cell.formula)) {
                visited.add(key);
                const result = evaluateFormula(cell.formula, cells, new Set(visited));
                visited.delete(key);
                return typeof result === 'number' ? result : 0;
            }

            const num = parseFloat(cell.value);
            return isNaN(num) ? 0 : num;
        }

        case 'binaryOp': {
            const left = evaluate(node.left, cells, visited);
            const right = evaluate(node.right, cells, visited);
            switch (node.op) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/':
                    if (right === 0) throw new Error('#DIV/0!');
                    return left / right;
                default: throw new Error(`Unknown operator: ${node.op}`);
            }
        }

        case 'range': {
            // Expand range into array of values
            return expandRange(node.start, node.end, cells, visited).reduce((a, b) => a + b, 0);
        }

        case 'functionCall': {
            const values = resolveFunctionArgs(node.args, cells, visited);
            switch (node.name) {
                case 'SUM':
                    return values.reduce((a, b) => a + b, 0);
                case 'MIN':
                    return values.length > 0 ? Math.min(...values) : 0;
                case 'MAX':
                    return values.length > 0 ? Math.max(...values) : 0;
                case 'AVG':
                case 'AVERAGE':
                    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                case 'COUNT':
                    return values.length;
                default:
                    throw new Error(`Unknown function: ${node.name}`);
            }
        }
    }
}

/** Expand a range like A1:A5 into an array of numeric values */
function expandRange(
    start: CellRefNode,
    end: CellRefNode,
    cells: CellMap,
    visited: Set<string>
): number[] {
    const values: number[] = [];
    const startCol = colToIndex(start.col);
    const endCol = colToIndex(end.col);
    const startRow = start.row;
    const endRow = end.row;

    for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
        for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
            const col = indexToCol(c);
            const ref: CellRefNode = { kind: 'cellRef', col, row: r };
            values.push(evaluate(ref, cells, visited));
        }
    }
    return values;
}

/** Resolve function arguments: ranges get expanded, expressions get evaluated */
function resolveFunctionArgs(
    args: ASTNode[],
    cells: CellMap,
    visited: Set<string>
): number[] {
    const values: number[] = [];
    for (const arg of args) {
        if (arg.kind === 'range') {
            values.push(...expandRange(arg.start, arg.end, cells, visited));
        } else {
            values.push(evaluate(arg, cells, visited));
        }
    }
    return values;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Evaluate a formula string against a cell map.
 * Returns the computed numeric result, or an error string.
 */
export function evaluateFormula(
    formula: string,
    cells: CellMap,
    visited: Set<string> = new Set()
): number | string {
    try {
        if (!isFormula(formula)) {
            const num = parseFloat(formula);
            return isNaN(num) ? formula : num;
        }
        const tokens = tokenize(formula);
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const result = evaluate(ast, cells, visited);
        // Round to avoid floating point noise
        return Math.round(result * 1e10) / 1e10;
    } catch (err: unknown) {
        if (err instanceof Error) {
            // Return known error types as-is
            if (err.message.startsWith('#')) return err.message;
            return '#ERROR!';
        }
        return '#ERROR!';
    }
}

/**
 * Given a CellMap, recalculate all cells that contain formulas.
 * Returns a new CellMap with computedValue updated.
 */
export function recalculateAllCells(cells: CellMap): CellMap {
    const updated: CellMap = { ...cells };
    for (const key of Object.keys(updated)) {
        const cell = updated[key];
        if (cell.formula && isFormula(cell.formula)) {
            const computed = evaluateFormula(cell.formula, updated, new Set([key]));
            updated[key] = { ...cell, computedValue: computed };
        } else {
            // For non-formula cells, computedValue = parsed number or original string
            const num = parseFloat(cell.value);
            updated[key] = { ...cell, computedValue: isNaN(num) ? cell.value : num };
        }
    }
    return updated;
}
