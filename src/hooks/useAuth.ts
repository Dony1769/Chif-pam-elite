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
        fetchProfile();

        // Écouter les changements en temps réel sur la table profiles
        const channel = supabase
            .channel('profile_updates')
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'profiles' }, 
                (payload) => {
                    if (userProfile && payload.new.id === userProfile.id) {
                        setUserProfile(payload.new);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return { userProfile, loading, refreshProfile: fetchProfile };
}

