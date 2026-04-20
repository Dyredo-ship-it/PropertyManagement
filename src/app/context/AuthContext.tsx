import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "tenant";
  organizationId: string | null;
  tenantId: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (params: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, organization_id, tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    name: data.full_name ?? data.email,
    role: data.role,
    organizationId: data.organization_id,
    tenantId: data.tenant_id,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    setSession(s);
    if (s?.user) {
      const profile = await loadProfile(s.user.id);
      setUser(profile);
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let lastLoadedUid: string | null = null;

    async function hydrate(s: Session | null) {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        if (lastLoadedUid === s.user.id) return; // skip re-loads on token refresh
        const profile = await loadProfile(s.user.id);
        if (!mounted) return;
        lastLoadedUid = s.user.id;
        setUser(profile);
      } else {
        lastLoadedUid = null;
        setUser(null);
      }
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      await hydrate(data.session);
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      void hydrate(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      await refreshProfile();
      return { ok: true };
    },
    [refreshProfile],
  );

  const signup = useCallback(
    async ({
      email,
      password,
      fullName,
      organizationName,
    }: {
      email: string;
      password: string;
      fullName: string;
      organizationName: string;
    }) => {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) return { ok: false, error: signUpError.message };
      const newUser = signUpData.user;
      if (!newUser) return { ok: false, error: "Signup returned no user" };

      // Session may not exist if email confirmations are on. Ensure we have a session.
      if (!signUpData.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          return {
            ok: false,
            error:
              "Compte créé. Vérifie ton email pour confirmer puis reconnecte-toi. (" +
              signInErr.message +
              ")",
          };
        }
      }

      // Create org + profile + subscription atomically via RPC (bypasses RLS chicken-and-egg)
      const { error: rpcErr } = await supabase.rpc("create_organization_with_profile", {
        org_name: organizationName,
        user_full_name: fullName,
      });
      if (rpcErr) return { ok: false, error: rpcErr.message };

      await refreshProfile();
      return { ok: true };
    },
    [refreshProfile],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!user && !!session,
        login,
        signup,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
