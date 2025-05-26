'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();

// Fungsi async untuk ambil data user
const fetchUserDetails = async (userId: string): Promise<Partial<IUser> | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, avatar, description, links')
    .eq('id', userId)
    .single();

 if (error) {
  console.error('[Supabase Error] Failed to fetch user details:', error);

  // Bikin pesan error yang lebih jelas
  const errorMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? error.message
      : JSON.stringify(error) || 'Failed to fetch user data';

  throw new Error(errorMessage);
}


  return data;
};

export const useCurrentUser = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error('[Supabase Error] Failed to get session:', error);
          setUserId(null);
        } else {
          setUserId(data.session?.user.id ?? null);
        }
      } catch (err) {
        console.error('[App Error] Unexpected session fetch error:', err);
        setUserId(null);
      } finally {
        setSessionLoading(false);
      }
    };

    getSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const {
    data: user,
    isLoading: userLoading,
    error,
  } = useQuery<Partial<IUser> | null, Error>({
    queryKey: ['currentUser', userId],
    queryFn: () => fetchUserDetails(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 menit
    cacheTime: 1000 * 60 * 30, // 30 menit
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user,
    isLoading: sessionLoading || userLoading,
    error,
  };
};
