import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationCenter } from "./NotificationCenter";
import { GlobalProgressCenter } from "./GlobalProgressCenter";

interface NavbarProps {
  user?: any;
  showAuth?: boolean;
}

export function Navbar({ user, showAuth = true }: NavbarProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Crown className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
          <span className="text-xl font-bold font-rajdhani text-foreground">
            AI ROYAL
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {user && (
            <>
              <GlobalProgressCenter />
              <NotificationCenter />
            </>
          )}
          {showAuth && (
            user ? (
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate("/auth")}
                className="shadow-glow"
              >
                Sign In
              </Button>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
