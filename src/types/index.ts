/**
 * Core type definitions for the Realtime Collaborative Spreadsheet.
 *
 * Architecture: All shared types are co-located here for single-source-of-truth.
 * Firestore documents map directly to these interfaces.
 */

import { Timestamp } from 'firebase/firestore';

// ─── Document Types ──────────────────────────────────────────────────────────

/** Represents a spreadsheet document in Firestore `documents/` collection */
export interface SpreadsheetDocument {
    id: string;
    title: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    ownerId: string;
    ownerName: string;
}

/** Data for creating a new document (server assigns timestamps) */
export interface CreateDocumentInput {
    title: string;
    ownerId: string;
    ownerName: string;
}

// ─── Cell Types ──────────────────────────────────────────────────────────────

/** Formatting options for a cell */
export interface CellFormatting {
    bold?: boolean;
    italic?: boolean;
    textColor?: string;
}

/** Represents a single cell's data in Firestore `cells/{docId}/data/{cellId}` */
export interface CellData {
    /** The raw value entered by the user (could be a number, text, or formula string) */
    value: string;
    /** The formula string if the cell contains a formula (starts with '=') */
    formula?: string;
    /** The computed value after formula evaluation */
    computedValue?: string | number;
    /** User ID of the last editor */
    updatedBy?: string;
    /** Timestamp of the last update */
    updatedAt?: Timestamp;
    /** Cell formatting */
    formatting?: CellFormatting;
}

/** Map of cell key ("A-1") to CellData */
export type CellMap = Record<string, CellData>;

/** Parsed cell reference, e.g. { col: "A", row: 1 } */
export interface CellRef {
    col: string;
    row: number;
}

// ─── Presence Types ──────────────────────────────────────────────────────────

/** Represents a user's presence in a document */
export interface UserPresence {
    userId: string;
    name: string;
    color: string;
    activeCell?: string;
    lastSeen: Timestamp;
}

// ─── Identity / Auth Types ──────────────────────────────────────────────────

/** The local session representation of the current user */
export interface UserSession {
    userId: string;
    name: string;
    color: string;
    isAnonymous: boolean;
    email?: string;
    photoURL?: string;
}

// ─── Formula Engine Types ────────────────────────────────────────────────────

export type TokenType =
    | 'NUMBER'
    | 'CELL_REF'
    | 'OPERATOR'
    | 'FUNCTION'
    | 'LPAREN'
    | 'RPAREN'
    | 'COMMA'
    | 'COLON'
    | 'EOF';

export interface FormulaToken {
    type: TokenType;
    value: string;
}

/** AST node types for the formula parser */
export type ASTNode =
    | NumberLiteral
    | StringLiteral
    | CellRefNode
    | BinaryOpNode
    | FunctionCallNode
    | RangeNode;

export interface NumberLiteral {
    kind: 'number';
    value: number;
}

export interface StringLiteral {
    kind: 'string';
    value: string;
}

export interface CellRefNode {
    kind: 'cellRef';
    col: string;
    row: number;
}

export interface BinaryOpNode {
    kind: 'binaryOp';
    op: string;
    left: ASTNode;
    right: ASTNode;
}

export interface FunctionCallNode {
    kind: 'functionCall';
    name: string;
    args: ASTNode[];
}

export interface RangeNode {
    kind: 'range';
    start: CellRefNode;
    end: CellRefNode;
}

// ─── Store Types ─────────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SpreadsheetState {
    /** The current document metadata */
    document: SpreadsheetDocument | null;
    /** All cells keyed by "COL-ROW" e.g. "A-1" */
    cells: CellMap;
    /** Currently selected cell key */
    activeCell: string | null;
    /** Cell currently being edited */
    editingCell: string | null;
    /** Value shown in the formula bar */
    formulaBarValue: string;
    /** Connected users' presence */
    users: Record<string, UserPresence>;
    /** Write status indicator */
    saveStatus: SaveStatus;

    // Actions
    setDocument: (doc: SpreadsheetDocument | null) => void;
    setCells: (cells: CellMap) => void;
    setCell: (key: string, data: CellData) => void;
    removeCell: (key: string) => void;
    setActiveCell: (key: string | null) => void;
    startEditing: (key: string) => void;
    stopEditing: () => void;
    setFormulaBarValue: (value: string) => void;
    setUsers: (users: Record<string, UserPresence>) => void;
    setSaveStatus: (status: SaveStatus) => void;
    recalculateAll: () => void;
}
