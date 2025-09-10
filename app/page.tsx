
'use client';
// FIX: Changed import from "@/components/PublicLandingPage" to "@/pages/PublicLandingPage" to use the correct component version that accepts an `onLogin` prop.
import PublicLandingPage from "@/pages/PublicLandingPage";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();
    
    const handleLogin = () => {
        // Navigate with the 'tour' query parameter.
        // The dashboard layout will detect this and handle showing the welcome toast and starting the tour.
        router.push('/overview?tour=true');
    };

    return <PublicLandingPage onLogin={handleLogin} />;
}
