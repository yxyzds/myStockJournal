import { Router, Routes } from "./router";
import Home from "./pages/Home";
import AaplTransactionPage from "./imports/AaplTransactionPage";
import ValuationPage from "./pages/ValuationPage";
import LogoPage from "./pages/LogoPage";

export default function App() {
  return (
    <Router>
      <Routes
        routes={[
          { path: "/", element: <Home /> },
          { path: "/transaction/aapl", element: <AaplTransactionPage /> },
          { path: "/valuation/aapl", element: <ValuationPage /> },
          { path: "/logo", element: <LogoPage /> },
        ]}
      />
    </Router>
  );
}
