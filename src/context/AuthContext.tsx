import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'; // Import useRef
import { supabase } from '../lib/supabase';
import type { Profile } from '../types'; // Use Profile type

// Define a User type that includes essential auth info and profile data
type User = Profile & {
  email: string; // Ensure email is part of the user object
};

interface AuthContextType {
  user: User | null; // Use the combined User type
  loading: boolean; // Represents the initial auth check loading state
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); // Use the combined User type
  // State specifically for the initial authentication check
  const [initialLoading, setInitialLoading] = useState(true);

  // Function to fetch user profile
  const fetchUserProfile = useCallback(async (userId: string, userEmail: string) => {
    // Removed START log
    let profileData: any = null;
    let profileError: any = null;

    try {
      // Removed Preparing log
      // Directly await the Supabase query
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Removed resolved log
      profileData = result.data;
      profileError = result.error;

      // Removed finished log

      if (profileError) {
        // Keep error log for actual errors
        console.error('[fetchUserProfile] Error during profile fetch:', profileError.message);
        // Removed setting user null log
        setUser(null);
      } else if (profileData) {
        // --- Success Case ---
        // Removed received log
        const typedProfile = profileData as Profile;
        const userRole = typedProfile.role ?? 'doctor';
        // Removed role log
        const userData = { ...typedProfile, role: userRole, email: userEmail };
        // Removed preparing setUser log
        setUser(userData);
        // Removed setUser called log
      } else {
         // Keep warn log for missing profile
         console.warn(`[fetchUserProfile] Profile query succeeded but returned no data for user: ${userId}`);
         // Removed setting user null log
         setUser(null);
      }
    } catch (e: any) {
      // Keep unexpected exception log
      console.error(`[fetchUserProfile] UNEXPECTED EXCEPTION caught:`, e.message);
      // Removed setting user null log
      setUser(null);
    }
    // Removed FINISHED log
  }, []);


  const initialEventProcessedRef = useRef(false);

  useEffect(() => {
    // Removed useEffect running log
    initialEventProcessedRef.current = false;
    // Removed Initializing ref log
    let isMounted = true;

    const handleAuthStateChange = async (_event: string, session: any | null) => {
      if (!isMounted) {
        // Removed unmounted log
        return;
      }

      // Removed handleAuthStateChange processing log

      if (_event === 'TOKEN_REFRESHED') {
        // Keep token refreshed log
        console.log('[AuthContext] Token refreshed successfully.');
      } else if (_event === 'SIGNED_OUT') {
         // Keep signed out log
        console.log('[AuthContext] SIGNED_OUT event received. Setting user to null.');
        setUser(null);
      } else if (session?.user) {
        // Removed Session found log
        if (!user || user.id !== session.user.id) {
          await fetchUserProfile(session.user.id, session.user.email!);
          // Removed Profile fetch attempt finished log
        } else {
          // Removed Profile already loaded log
        }
      } else {
        if (_event === 'INITIAL_SESSION' && !initialEventProcessedRef.current) {
          // Removed No session initial load log
          setUser(null);
        } else {
          // Removed No session post-initial log
        }
      }

      // --- Centralized initialLoading logic ---
      if (!initialEventProcessedRef.current) {
        // Removed First event processed log
        setInitialLoading(false);
        initialEventProcessedRef.current = true;
        // Removed Set ref true log
      } else {
         // Removed Not first event log
      }
    };

    // Removed Setting up listener log
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthStateChange(event, session).catch(error => {
         // Keep error log
         console.error(`[AuthContext] Error in handleAuthStateChange for Event: ${event}`, error);
         if (isMounted) {
             setUser(null);
             if (!initialEventProcessedRef.current) {
                 setInitialLoading(false);
                 initialEventProcessedRef.current = true;
             }
         }
      });
    });

    return () => {
      // Removed useEffect cleanup log
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const value = {
    user,
    loading: initialLoading, // Expose the initialLoading state as 'loading'
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
      signOut: async () => {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      if (error) {
        // Keep error log
        console.error("Error signing out:", error);
        throw error;
      }
      // Removed signed out successfully log
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


