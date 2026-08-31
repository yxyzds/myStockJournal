import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

// ─── Router context ───────────────────────────────────────────────────────────

type RouterCtx = {
  path: string;
  navigate: (to: string) => void;
  back: () => void;
};

const Ctx = createContext<RouterCtx>({ path: "/", navigate: () => {}, back: () => {} });

function getPath() {
  return window.location.pathname || "/";
}

export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState(null, "", to);
    setPath(to);
  }, []);

  const back = useCallback(() => {
    window.history.back();
  }, []);

  return <Ctx.Provider value={{ path, navigate, back }}>{children}</Ctx.Provider>;
}

export function useRouter() {
  return useContext(Ctx);
}

// ─── Link ─────────────────────────────────────────────────────────────────────

type LinkProps = {
  to: string;
  children: ReactNode;
  className?: string;
};

export function Link({ to, children, className }: LinkProps) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      className={className}
      onClick={e => {
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

// ─── Routes / Route ───────────────────────────────────────────────────────────

type RouteProps = {
  path: string;
  element: ReactNode;
};

export function Routes({ routes }: { routes: RouteProps[] }) {
  const { path } = useRouter();
  const match = routes.find(r => r.path === path) ?? routes.find(r => r.path === "*");
  return <>{match?.element ?? null}</>;
}
