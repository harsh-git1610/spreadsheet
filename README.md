# Realtime Collaborative Spreadsheet

A lightweight, production-ready real-time collaborative spreadsheet built with **Next.js 14**, **TypeScript**, **Firebase**, **TailwindCSS**, and **Zustand**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwindcss)

---

## ✨ Features

- **📊 Spreadsheet Grid** — Virtualized grid with 26 columns × 100 rows, keyboard navigation, and cell editing
- **🔢 Formula Engine** — Custom tokenizer + recursive descent parser supporting `SUM`, `MIN`, `MAX`, `AVG`, `COUNT`, cell references, ranges, and arithmetic
- **⚡ Real-time Sync** — Firestore realtime listeners with optimistic local updates and debounced writes
- **👥 Multi-user Presence** — Live user avatars with heartbeat-based tracking
- **🔐 Identity System** — Anonymous guest access or Google OAuth via Firebase Auth
- **💾 Save Status** — Visual indicator (Saving → Saved → Error)
- **📝 Formula Bar** — Dedicated formula/value editor with cell reference display
- **🎨 Cell Formatting** — Bold, italic, and text color support
- **📥 Export** — CSV and JSON export
- **🚀 Vercel-ready** — Zero TypeScript errors, deployable as-is

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Client (Next.js)              │
│                                                 │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ Dashboard │  │  Editor   │  │  Auth Modal  │ │
│  └────┬─────┘  └─────┬─────┘  └──────┬───────┘ │
│       │              │               │          │
│  ┌────▼──────────────▼───────────────▼────────┐ │
│  │              Zustand Store                 │ │
│  │  cells · activeCell · users · saveStatus   │ │
│  └────┬──────────────┬───────────────┬────────┘ │
│       │              │               │          │
│  ┌────▼────┐  ┌──────▼──────┐  ┌────▼────────┐ │
│  │ Formula │  │  Realtime   │  │  Presence   │ │
│  │ Engine  │  │  Sync Hook  │  │  Hook       │ │
│  └─────────┘  └──────┬──────┘  └──────┬──────┘ │
│                      │               │          │
└──────────────────────┼───────────────┼──────────┘
                       │               │
              ┌────────▼───────────────▼──────────┐
              │         Firebase                  │
              │  Firestore · Auth · Realtime      │
              └───────────────────────────────────┘
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Dashboard
│   └── editor/[docId]/page.tsx # Spreadsheet editor
├── components/
│   ├── auth/AuthModal.tsx      # Sign-in modal
│   ├── spreadsheet/
│   │   ├── Grid.tsx            # Virtualized grid
│   │   ├── Cell.tsx            # Individual cell
│   │   ├── HeaderRow.tsx       # Column headers
│   │   ├── HeaderColumn.tsx    # Row headers
│   │   ├── FormulaBar.tsx      # Formula editor
│   │   └── Toolbar.tsx         # Toolbar
│   └── ui/
│       ├── Button.tsx          # Reusable button
│       ├── Avatar.tsx          # User avatar
│       └── StatusIndicator.tsx # Save status
├── hooks/
│   ├── useAuth.ts              # Firebase Auth
│   ├── usePresence.ts          # User presence
│   ├── useRealtimeSync.ts      # Firestore sync
│   └── useSpreadsheet.ts       # Keyboard nav
├── lib/
│   ├── firebase.ts             # Firebase init
│   ├── firestore.ts            # CRUD helpers
│   ├── formulaEngine.ts        # Formula engine
│   ├── cellUtils.ts            # Cell utilities
│   └── exportUtils.ts          # CSV/JSON export
├── store/
│   └── spreadsheetStore.ts     # Zustand store
└── types/
    └── index.ts                # TypeScript types
```

---

## 📐 Data Model (Firestore)

```
documents/{docId}
  ├── title: string
  ├── ownerId: string
  ├── ownerName: string
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

cells/{docId}/data/{cellKey}
  ├── value: string
  ├── formula?: string
  ├── computedValue?: string | number
  ├── updatedBy?: string
  ├── updatedAt?: Timestamp
  └── formatting?: { bold?, italic?, textColor? }

presence/{docId}/users/{userId}
  ├── userId: string
  ├── name: string
  ├── color: string
  ├── activeCell?: string
  └── lastSeen: Timestamp
```

---

## 🔢 Formula Engine

The formula engine is a **three-stage pipeline**:

1. **Tokenizer** — Converts formula string to token array
2. **Parser** — Recursive descent parser producing an AST
3. **Evaluator** — Walks AST, resolves cell refs, computes result

**Supported:**
- Arithmetic: `=A1 + B1`, `=A1 * 5`, `=A1 / B1`
- Functions: `=SUM(A1:A5)`, `=MIN(A1:A5)`, `=MAX(A1:A5)`, `=AVG(A1:A5)`, `=COUNT(A1:A5)`
- Nested: `=SUM(A1:A3) + B1 * 2`
- Error handling: `#ERROR!`, `#DIV/0!`, `#CIRCULAR!`

---

## ⚡ Real-time Sync

```
Client edits cell
      ↓
Optimistic local update (Zustand)
      ↓
Debounced write (300ms) to Firestore
      ↓
Firestore onSnapshot → other clients update
```

- **Conflict strategy**: Last write wins (timestamp-based)
- **Save indicator**: Shows Saving → Saved transitions

---

## 🚀 Deployment (Vercel)

### 1. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database**
3. Enable **Authentication** → Sign-in methods → Google + Anonymous
4. Copy your config values

### 2. Environment Variables

Create `.env.local` (see `.env.local.example`):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3. Deploy

```bash
# Install dependencies
pnpm install

# Verify build
pnpm build

# Deploy to Vercel
npx vercel --prod
```

Or connect your GitHub repo to Vercel and add the environment variables in the Vercel dashboard.

### 4. Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{docId} {
      allow read, write: if request.auth != null;
    }
    match /cells/{docId}/data/{cellId} {
      allow read, write: if request.auth != null;
    }
    match /presence/{docId}/users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🧪 Demo Instructions

1. Open the app in **two browser tabs**
2. Sign in on both tabs (same or different users)
3. Create or open a spreadsheet
4. Edit cells in one tab — see changes appear instantly in the other
5. See presence avatars showing both users
6. Try formulas: set A1=10, A2=20, A3=`=SUM(A1:A2)` → expect 30

---

## 🛠 Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📝 License

MIT
