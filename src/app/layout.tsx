"use client";  
import { useEffect, useState } from 'react';  
import { supabase } from '@/lib/supabase';  
import { useRouter } from 'next/navigation';  
import { Loader2 } from 'lucide-react';  
  
export default function ClientLayout({ children }: { children: React.ReactNode }) {  
  const router = useRouter();  
  const [loading, setLoading] = useState(true);  
  
  useEffect(() => {  
    const checkUser = async () => {  
      const { data: { session } } = await supabase.auth.getSession();  
      if (!session) {  
        router.replace('/connexion');  
      } else {  
        setLoading(false);  
      }  
    };  
    checkUser();  
  }, [router]);  
  
  if (loading) {  
    return (  
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">  
        <Loader2 className="animate-spin text-emerald-500" size={32} />  
      </div>  
    );  
  }  
  
  return <>{children}</>;  
}  
