import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAuth() {
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setUserProfile(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        let isMounted = true;
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const bootstrap = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                if (isMounted) setLoading(false);
                return;
            }

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (isMounted) {
                setUserProfile(data);
                setLoading(false);
            }

            // Écouter seulement les updates du profil utilisateur courant
            channel = supabase
                .channel(`profile_updates_${user.id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
                    (payload) => {
                        if (isMounted) {
                            setUserProfile(payload.new);
                        }
                    }
                )
                .subscribe();
        };

        bootstrap();

        return () => {
            isMounted = false;
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    return { userProfile, loading, refreshProfile: fetchProfile };
}

