import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, Target, Award, Sprout, Heart } from "lucide-react";
import FarmZoneCard from "@/components/farm/FarmZoneCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import zonePhysics from "@/assets/zone-physics.png";
import zoneBiology from "@/assets/zone-biology.png";
import zoneChemistry from "@/assets/zone-chemistry.png";
import zoneMath from "@/assets/zone-math.png";
import zoneIT from "@/assets/zone-it.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalLevel: 0,
    totalExp: 0,
    expToNextLevel: 1000,
    tasksCompleted: 0,
    avgGrade: 0,
    achievementsCount: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);

      // Load zones with progress
      const { data: zonesData } = await supabase
        .from("farm_zones")
        .select(`
          id,
          name,
          description,
          icon_url,
          zone_type
        `)
        .order("name");

      // Load user progress for each zone
      const { data: progressData } = await supabase
        .from("user_zone_progress")
        .select("*")
        .eq("user_id", session.user.id);

      // Combine zones with progress
      const zonesWithProgress = zonesData?.map((zone) => {
        const progress = progressData?.find((p) => p.zone_id === zone.id);
        const level = progress?.level || 1;
        const exp = progress?.experience || 0;
        const tasksCompleted = progress?.tasks_completed || 0;
        
        // Calculate progress to next level (1000 XP per level)
        const progressPercent = (exp % 1000) / 10;

        // Map zone type to image
        const iconMap: Record<string, string> = {
          physics: zonePhysics,
          biology: zoneBiology,
          chemistry: zoneChemistry,
          math: zoneMath,
          it: zoneIT,
        };

        return {
          title: zone.name,
          description: zone.description,
          icon: iconMap[zone.zone_type] || zonePhysics,
          level,
          progress: progressPercent,
          tasksCompleted,
          totalTasks: 20, // Can be calculated based on actual tasks
          isLocked: !progress?.is_unlocked,
        };
      }) || [];

      setZones(zonesWithProgress);

      // Calculate total stats
      const totalLevel = progressData?.reduce((sum, p) => sum + (p.level || 1), 0) || 0;
      const totalExp = progressData?.reduce((sum, p) => sum + (p.experience || 0), 0) || 0;
      const tasksCompleted = progressData?.reduce((sum, p) => sum + (p.tasks_completed || 0), 0) || 0;

      // Get submissions for grade calculation
      const { data: submissions } = await supabase
        .from("task_submissions")
        .select("grade")
        .eq("user_id", session.user.id)
        .not("grade", "is", null);

      const avgGrade = submissions && submissions.length > 0
        ? submissions.reduce((sum, s) => sum + (s.grade || 0), 0) / submissions.length
        : 0;

      // Get achievements count
      const { count: achievementsCount } = await supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      setStats({
        totalLevel: Math.floor(totalLevel / (progressData?.length || 1)),
        totalExp: totalExp % 1000,
        expToNextLevel: 1000,
        tasksCompleted,
        avgGrade: Math.round(avgGrade * 10) / 10,
        achievementsCount: achievementsCount || 0,
      });

      setLoading(false);
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Добро пожаловать, <span className="gradient-text">{user?.user_metadata?.full_name || "Ученик"}!</span>
            </h1>
            <p className="text-muted-foreground">Продолжай развивать свою ферму и изучать новое</p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Средний уровень</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLevel}</div>
                <Progress value={(stats.totalExp / stats.expToNextLevel) * 100} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.totalExp}/{stats.expToNextLevel} XP до следующего уровня
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Выполнено заданий</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tasksCompleted}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Продолжай в том же духе!
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Средний балл</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgGrade > 0 ? stats.avgGrade : "—"}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.avgGrade >= 4.5 ? "Отличная работа!" : "Есть куда расти!"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Достижения</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.achievementsCount}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Собрано уникальных ачивок
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Zones Carousel */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Зоны развития</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Используй стрелки для перехода между предметными зонами. 
                Выполняй задания, чтобы разблокировать новые уровни и апгрейды.
              </p>
            </div>

            <Carousel
              opts={{
                align: "center",
                loop: true,
              }}
              className="w-full max-w-6xl mx-auto"
            >
              <CarouselContent className="-ml-4">
                {zones.map((zone, index) => (
                  <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/2">
                    <div className="p-1">
                      <FarmZoneCard {...zone} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-12 h-12 w-12" />
              <CarouselNext className="-right-12 h-12 w-12" />
            </Carousel>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => navigate("/farm")}>
              <Sprout className="mr-2 h-4 w-4" />
              Интерактивная ферма
            </Button>
            <Button onClick={() => navigate("/pet")}>
              <Heart className="mr-2 h-4 w-4" />
              Мой тамагочи
            </Button>
            <Button onClick={() => navigate("/tasks")}>
              <BookOpen className="mr-2 h-4 w-4" />
              Перейти к заданиям
            </Button>
            <Button variant="outline">
              <Trophy className="mr-2 h-4 w-4" />
              Мои достижения
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
