import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ClipboardCheck, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isTeacher, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingReviews: 0,
    reviewedToday: 0,
    avgGrade: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!roleLoading && !isTeacher) {
      toast({
        title: "Доступ запрещен",
        description: "Эта страница доступна только для учителей",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [isTeacher, roleLoading, navigate, toast]);

  useEffect(() => {
    const loadData = async () => {
      // Load submissions
      const { data: submissionsData } = await supabase
        .from("task_submissions")
        .select(`
          id,
          status,
          grade,
          submitted_at,
          user:profiles!task_submissions_user_id_fkey(full_name),
          task:tasks!task_submissions_task_id_fkey(title)
        `)
        .order("submitted_at", { ascending: false })
        .limit(10);

      const formattedSubmissions = submissionsData?.map((sub) => ({
        id: sub.id,
        studentName: sub.user?.full_name || "Неизвестный ученик",
        taskTitle: sub.task?.title || "Без названия",
        submittedAt: new Date(sub.submitted_at).toLocaleString("ru-RU"),
        status: sub.status,
        grade: sub.grade,
      })) || [];

      setSubmissions(formattedSubmissions);

      // Load students with their stats
      const { data: studentsData } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          user_roles!inner(role)
        `)
        .eq("user_roles.role", "student");

      const studentsWithStats = await Promise.all(
        studentsData?.map(async (student) => {
          // Get progress
          const { data: progress } = await supabase
            .from("user_zone_progress")
            .select("level, tasks_completed")
            .eq("user_id", student.id);

          const avgLevel = progress?.length 
            ? Math.floor(progress.reduce((sum, p) => sum + (p.level || 1), 0) / progress.length)
            : 1;
          
          const totalTasks = progress?.reduce((sum, p) => sum + (p.tasks_completed || 0), 0) || 0;

          // Get average grade
          const { data: subs } = await supabase
            .from("task_submissions")
            .select("grade")
            .eq("user_id", student.id)
            .not("grade", "is", null);

          const avgGrade = subs && subs.length > 0
            ? Math.round((subs.reduce((sum, s) => sum + (s.grade || 0), 0) / subs.length) * 10) / 10
            : 0;

          return {
            name: student.full_name || "Неизвестный ученик",
            level: avgLevel,
            tasksCompleted: totalTasks,
            avgGrade,
            lastActive: "—", // Can be calculated from last submission
          };
        }) || []
      );

      setStudents(studentsWithStats);

      // Calculate stats
      const pendingCount = submissionsData?.filter((s) => s.status === "pending").length || 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reviewedToday = submissionsData?.filter(
        (s) => s.status === "reviewed" && new Date(s.submitted_at) >= today
      ).length || 0;

      const allGrades = submissionsData?.filter((s) => s.grade !== null).map((s) => s.grade) || [];
      const avgGrade = allGrades.length > 0
        ? Math.round((allGrades.reduce((sum, g) => sum + (g || 0), 0) / allGrades.length) * 10) / 10
        : 0;

      setStats({
        totalStudents: studentsData?.length || 0,
        pendingReviews: pendingCount,
        reviewedToday,
        avgGrade,
      });
    };

    if (isTeacher && !roleLoading) {
      loadData();
    }
  }, [isTeacher, roleLoading]);

  if (loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  if (!isTeacher) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Кабинет <span className="gradient-text">учителя</span>
              </h1>
              <p className="text-muted-foreground">Управление заданиями и проверка работ учеников</p>
            </div>
            <Button onClick={() => navigate("/teacher/create-task")}>
              Создать задание
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего учеников</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Активных в системе
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">На проверке</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingReviews}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.pendingReviews > 0 ? "Требуют внимания" : "Все проверено!"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Проверено сегодня</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.reviewedToday}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.reviewedToday > 0 ? "Отличная работа!" : "Начните проверку"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Средний балл</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgGrade > 0 ? stats.avgGrade : "—"}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  По всем работам
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="submissions" className="w-full">
            <TabsList>
              <TabsTrigger value="submissions">Работы на проверке</TabsTrigger>
              <TabsTrigger value="students">Ученики</TabsTrigger>
              <TabsTrigger value="analytics">Аналитика</TabsTrigger>
            </TabsList>

            <TabsContent value="submissions" className="space-y-4 mt-6">
              {submissions.map((submission) => (
                <Card key={submission.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{submission.taskTitle}</CardTitle>
                        <CardDescription>
                          Ученик: {submission.studentName} • {submission.submittedAt}
                        </CardDescription>
                      </div>
                      {submission.status === "pending" ? (
                        <Badge variant="secondary">На проверке</Badge>
                      ) : (
                        <Badge className="bg-green-500">Проверено: {submission.grade}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end gap-2">
                      {submission.status === "pending" ? (
                        <>
                          <Button variant="outline">Просмотреть</Button>
                          <Button>Проверить</Button>
                        </>
                      ) : (
                        <Button variant="outline">Подробнее</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="students" className="space-y-4 mt-6">
              {students.map((student, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{student.name}</CardTitle>
                        <CardDescription>
                          Последняя активность: {student.lastActive}
                        </CardDescription>
                      </div>
                      <Badge>Уровень {student.level}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Заданий</p>
                          <p className="font-bold text-lg">{student.tasksCompleted}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Средний балл</p>
                          <p className="font-bold text-lg">{student.avgGrade}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Уровень</p>
                          <p className="font-bold text-lg">{student.level}</p>
                        </div>
                      </div>
                      <Button variant="outline">Профиль</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Аналитика</CardTitle>
                  <CardDescription>
                    Детальная статистика по успеваемости учеников
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Графики и диаграммы появятся здесь
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
