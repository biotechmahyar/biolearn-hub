// Logo dropdown component that shows user avatar and provides navigation
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Home, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router";

export function LogoDropdown() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const userInitial = (user?.name ?? user?.email ?? "G")[0]?.toUpperCase() ?? "G";
  const hasAvatar = !!user?.image;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full overflow-hidden">
          {hasAvatar ? (
            <img
              src={user!.image}
              alt={user?.name ?? "User"}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
              {userInitial}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {user && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-sm font-bold truncate">{user.name || user.email}</p>
              {user.email && (
                <p className="text-xs text-muted-foreground truncate" dir="ltr">{user.email}</p>
              )}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleGoHome} className="cursor-pointer">
          <Home className="mr-2 h-4 w-4" />
          صفحه اصلی
        </DropdownMenuItem>
        {isAuthenticated && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              خروج از حساب
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
