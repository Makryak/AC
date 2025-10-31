import { Button } from "@/components/ui/button";
import { Menu, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User as UserType } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const { isTeacher } = useUserRole();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold">🌱</span>
            </div>
            <span className="text-xl font-bold gradient-text">Умная ферма</span>
          </div>
        </div>

        {user && (
          <nav className="hidden md:flex items-center gap-6">
            {isTeacher ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/teacher")}
                  className="text-sm font-medium"
                >
                  Кабинет учителя
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/tasks")}
                  className="text-sm font-medium"
                >
                  Управление заданиями
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/dashboard")}
                  className="text-sm font-medium"
                >
                  Дашборд
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/farm")}
                  className="text-sm font-medium"
                >
                  Ферма
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/pet")}
                  className="text-sm font-medium"
                >
                  Питомец
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/tasks")}
                  className="text-sm font-medium"
                >
                  Задания
                </Button>
              </>
            )}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden md:flex">
                  <User className="h-4 w-4 mr-2" />
                  {user.user_metadata?.full_name || user.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Профиль
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isTeacher ? (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/teacher")}>
                      Кабинет учителя
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/tasks")}>
                      Управление заданиями
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      Дашборд
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/farm")}>
                      Интерактивная ферма
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/pet")}>
                      Мой тамагочи
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/tasks")}>
                      Задания
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="outline" className="hidden md:flex" onClick={() => navigate("/auth")}>
                <User className="h-4 w-4 mr-2" />
                Войти
              </Button>
              <Button className="hidden md:flex" onClick={() => navigate("/auth")}>
                Начать
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
