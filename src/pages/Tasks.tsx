import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Lock, CheckCircle, Clock } from "lucide-react";

const Tasks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setLoading(false);
    });
  }, [navigate]);

  const tasks = [
    {
      id: 1,
      title: "Законы Ньютона в действии",
      description: "Проведи эксперимент с падением тел разной массы",
      zone: "Физика",
      difficulty: 2,
      xp: 150,
      status: "available",
      requiredLevel: 1,
    },
    {
      id: 2,
      title: "Фотосинтез растений",
      description: "Изучи процесс фотосинтеза и создай схему",
      zone: "Биология",
      difficulty: 1,
      xp: 100,
      status: "completed",
      requiredLevel: 1,
    },
    {
      id: 3,
      title: "Реакция нейтрализации",
      description: "Проведи опыт с кислотой и щелочью",
      zone: "Химия",
      difficulty: 3,
      xp: 200,
      status: "locked",
      requiredLevel: 5,
    },
    {
      id: 4,
      title: "Системы линейных уравнений",
      description: "Реши систему уравнений графическим методом",
      zone: "Математика",
      difficulty: 2,
      xp: 150,
      status: "available",
      requiredLevel: 2,
    },
    {
      id: 5,
      title: "Автоматизация полива",
      description: "Напиши программу для управления поливом",
      zone: "IT",
      difficulty: 4,
      xp: 300,
      status: "in_progress",
      requiredLevel: 3,
    },
  ];

  const getDifficultyBadge = (difficulty: number) => {
    const variants = {
      1: { label: "Легко", className: "bg-green-500" },
      2: { label: "Средне", className: "bg-yellow-500" },
      3: { label: "Сложно", className: "bg-orange-500" },
      4: { label: "Очень сложно", className: "bg-red-500" },
    };
    const variant = variants[difficulty as keyof typeof variants] || variants[1];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "locked":
        return <Lock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <BookOpen className="h-5 w-5 text-primary" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Завершено";
      case "in_progress":
        return "В процессе";
      case "locked":
        return "Заблокировано";
      default:
        return "Доступно";
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Задания</h1>
            <p className="text-muted-foreground">
              Выполняй задания, получай опыт и развивай свою ферму
            </p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">Все задания</TabsTrigger>
              <TabsTrigger value="available">Доступные</TabsTrigger>
              <TabsTrigger value="in_progress">В процессе</TabsTrigger>
              <TabsTrigger value="completed">Завершенные</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {tasks.map((task) => (
                <Card key={task.id} className={task.status === "locked" ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <CardTitle className="text-xl">{task.title}</CardTitle>
                        </div>
                        <CardDescription>{task.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getDifficultyBadge(task.difficulty)}
                        <Badge variant="outline">{task.zone}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>💎 {task.xp} XP</span>
                        <span>⭐ Уровень {task.requiredLevel}+</span>
                        <span className="font-medium text-foreground">{getStatusText(task.status)}</span>
                      </div>
                      <Button
                        disabled={task.status === "locked" || task.status === "completed"}
                        variant={task.status === "in_progress" ? "default" : "outline"}
                      >
                        {task.status === "completed" && "Завершено"}
                        {task.status === "locked" && "Заблокировано"}
                        {task.status === "in_progress" && "Продолжить"}
                        {task.status === "available" && "Начать"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="available" className="space-y-4 mt-6">
              {tasks.filter(t => t.status === "available").map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{task.title}</CardTitle>
                        <CardDescription>{task.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getDifficultyBadge(task.difficulty)}
                        <Badge variant="outline">{task.zone}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>💎 {task.xp} XP</span>
                        <span>⭐ Уровень {task.requiredLevel}+</span>
                      </div>
                      <Button>Начать</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4 mt-6">
              {tasks.filter(t => t.status === "in_progress").map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{task.title}</CardTitle>
                        <CardDescription>{task.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getDifficultyBadge(task.difficulty)}
                        <Badge variant="outline">{task.zone}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>💎 {task.xp} XP</span>
                      </div>
                      <Button>Продолжить</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-6">
              {tasks.filter(t => t.status === "completed").map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{task.title}</CardTitle>
                        <CardDescription>{task.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getDifficultyBadge(task.difficulty)}
                        <Badge variant="outline">{task.zone}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">💎 {task.xp} XP получено</span>
                      </div>
                      <Button disabled>Завершено</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Tasks;
