# Plan: Wire React Router between Homepage and AAPL Transaction Page

## Context

The homepage (`src/App.tsx`) was built as a standalone page, overwriting the existing AAPL Transaction detail page. The user wants both pages to coexist with navigation: clicking a decision or watch-list row on the homepage navigates to the Transaction detail page, and the back button on that page returns home.

`react-router-dom` is not currently installed. Routing needs to be added from scratch.

---

## Implementation Steps

### 1. Install react-router-dom
```
pnpm add react-router-dom
```

### 2. Wrap the app with `<BrowserRouter>` in `src/main.tsx`
```tsx
import { BrowserRouter } from "react-router-dom";
// wrap <App /> with <BrowserRouter>
```

### 3. Create `src/pages/Home.tsx`
Move all homepage content (TopNav, Hero, RecentDecisions, JudgmentAccordion, WatchList, Footer) out of `src/App.tsx` into a dedicated file. The AAPL decision row and AAPL watch-list row get a `<Link to="/transaction/aapl">` wrapper so they navigate on click.

### 4. Create `src/pages/TransactionDetail.tsx`
Re-export (or thin-wrap) `AaplTransactionPage` from `src/imports/AaplTransactionPage/index.tsx`. Wire the `BackButton` with `useNavigate(-1)` so it goes back to the homepage.

The transaction page currently uses the `BackButton` component defined inside the imports file. The simplest fix: pass an `onBack` prop or use `useNavigate` directly inside `src/imports/AaplTransactionPage/index.tsx` by importing from react-router-dom there.

### 5. Update `src/App.tsx` to define routes
```tsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import TransactionDetail from "./pages/TransactionDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/transaction/aapl" element={<TransactionDetail />} />
    </Routes>
  );
}
```

### 6. Navigation hookup on the homepage
In `RecentDecisions`, the AAPL BUY row (Aug 27) gets `<Link to="/transaction/aapl">` wrapping the row div.  
In `WatchList`, the AAPL row also gets the same link.  
Other rows (NVDA, GOOGL) stay as non-navigable stubs for now.

### 7. BackButton in transaction page
In `src/imports/AaplTransactionPage/index.tsx`, update `BackButton` to call `useNavigate(-1)` from react-router-dom on click.

---

## Files Modified

| File | Change |
|---|---|
| `src/main.tsx` | Wrap `<App>` with `<BrowserRouter>` |
| `src/App.tsx` | Replace with `<Routes>` shell |
| `src/pages/Home.tsx` | New — move homepage code here, add Link on AAPL rows |
| `src/pages/TransactionDetail.tsx` | New — thin wrapper around AaplTransactionPage |
| `src/imports/AaplTransactionPage/index.tsx` | Wire BackButton with `useNavigate(-1)` |

---

## Verification

1. Open `/` — homepage loads with all 4 sections intact
2. Click the AAPL row in Recent Decisions — navigates to `/transaction/aapl`
3. Click the AAPL row in Watch List — same navigation
4. On the transaction detail page, click the back arrow — returns to `/`
5. `npx tsc --noEmit` exits clean
