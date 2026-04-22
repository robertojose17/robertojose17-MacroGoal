import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useUserProfile() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      try {
        console.log('[useUserProfile] Fetching user profile from Supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[useUserProfile] No authenticated user, isPremium=false');
          if (mounted) { setIsPremium(false); setLoading(false); }
          return;
        }
        const { data } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();
        const premium = data?.user_type === 'premium';
        console.log('[useUserProfile] user_type:', data?.user_type, '=> isPremium:', premium);
        if (mounted) {
          setIsPremium(premium);
          setLoading(false);
        }
      } catch (e) {
        console.warn('[useUserProfile] Error fetching profile:', e);
        if (mounted) { setIsPremium(false); setLoading(false); }
      }
    }

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[useUserProfile] Auth state change:', event);
      if (event === 'SIGNED_IN') fetchProfile();
      if (event === 'SIGNED_OUT') {
        if (mounted) { setIsPremium(false); setLoading(false); }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isPremium, loading };
}
