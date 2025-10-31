import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Apple, Droplet, Smile, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Pet {
  id: string;
  name: string;
  type: "cow" | "chicken" | "sheep";
  hunger: number;
  thirst: number;
  happiness: number;
  created_at: string;
  last_fed_at: string;
  last_watered_at: string;
  last_played_at: string;
  ran_away_at: string | null;
}

const Pet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pet, setPet] = useState<Pet | null>(null);
  const [petName, setPetName] = useState("");
  const [selectedType, setSelectedType] = useState<"cow" | "chicken" | "sheep" | null>(null);

  const petTypes = [
    { type: "cow" as const, emoji: "🐄", name: "Корова" },
    { type: "chicken" as const, emoji: "🐔", name: "Курица" },
    { type: "sheep" as const, emoji: "🐑", name: "Овца" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadPet(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        loadPet(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Периодически обновляем статистики питомца
  useEffect(() => {
    if (!pet || pet.ran_away_at) return;

    const interval = setInterval(() => {
      updatePetStats(pet);
    }, 10000); // Каждые 10 секунд

    return () => clearInterval(interval);
  }, [pet]);

  const loadPet = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading pet:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить питомца",
        variant: "destructive",
      });
    } else if (data) {
      setPet(data as Pet);
      updatePetStats(data as Pet);
    }
    setLoading(false);
  };

  // Функция для подсчета активных часов (8:00-20:00) между двумя датами
  const countActiveHours = (startDate: Date, endDate: Date): number => {
    let activeHours = 0;
    const current = new Date(startDate);
    
    while (current < endDate) {
      const hour = current.getHours();
      // Считаем только часы с 8 до 20
      if (hour >= 8 && hour < 20) {
        const nextHour = new Date(current);
        nextHour.setHours(current.getHours() + 1, 0, 0, 0);
        
        if (nextHour > endDate) {
          // Частичный час
          activeHours += (endDate.getTime() - current.getTime()) / (1000 * 60 * 60);
        } else {
          activeHours += 1;
        }
      }
      
      current.setHours(current.getHours() + 1, 0, 0, 0);
    }
    
    return Math.floor(activeHours);
  };

  const updatePetStats = async (petData: Pet) => {
    const now = new Date();
    const lastFed = new Date(petData.last_fed_at);
    const lastWatered = new Date(petData.last_watered_at);
    const lastPlayed = new Date(petData.last_played_at);

    // Уменьшаем статистики только за активные часы (8:00-20:00)
    const activeHoursSinceFed = countActiveHours(lastFed, now);
    const activeHoursSinceWatered = countActiveHours(lastWatered, now);
    const activeHoursSincePlayed = countActiveHours(lastPlayed, now);

    const newHunger = Math.max(0, petData.hunger - activeHoursSinceFed);
    const newThirst = Math.max(0, petData.thirst - activeHoursSinceWatered);
    const newHappiness = Math.max(0, petData.happiness - activeHoursSincePlayed);

    if (newHunger !== petData.hunger || newThirst !== petData.thirst || newHappiness !== petData.happiness) {
      await updatePetInDb({ hunger: newHunger, thirst: newThirst, happiness: newHappiness });
    }
  };

  const updatePetInDb = async (updates: Partial<Pet>) => {
    if (!user || !pet) return;

    const { data, error } = await supabase
      .from("pets")
      .update(updates)
      .eq("id", pet.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating pet:", error);
    } else if (data) {
      setPet(data as Pet);
    }
  };

  const createPet = async () => {
    if (!user || !petName.trim() || !selectedType) {
      toast({
        title: "Ошибка",
        description: "Введите имя питомца и выберите тип",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("pets")
      .insert({
        user_id: user.id,
        name: petName.trim(),
        type: selectedType,
        hunger: 100,
        thirst: 100,
        happiness: 100,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating pet:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать питомца. У вас уже может быть питомец.",
        variant: "destructive",
      });
    } else {
      setPet(data as Pet);
      setPetName("");
      setSelectedType(null);
      toast({
        title: "Поздравляем!",
        description: `Вы завели питомца ${petName}!`,
      });
    }
  };

  const handleAction = async (action: "feed" | "water" | "play") => {
    if (!user || !pet || pet.ran_away_at) return;

    const updates: Partial<Pet> = {};
    
    switch (action) {
      case "feed":
        updates.hunger = Math.min(100, pet.hunger + 20);
        updates.last_fed_at = new Date().toISOString();
        break;
      case "water":
        updates.thirst = Math.min(100, pet.thirst + 20);
        updates.last_watered_at = new Date().toISOString();
        break;
      case "play":
        updates.happiness = Math.min(100, pet.happiness + 20);
        updates.last_played_at = new Date().toISOString();
        break;
    }

    await updatePetInDb(updates);

    toast({
      title: "Готово!",
      description: `Вы ${action === "feed" ? "покормили" : action === "water" ? "напоили" : "поиграли с"} питомца`,
    });
  };

  const resetPet = async () => {
    if (!user || !pet) return;

    const { error } = await supabase
      .from("pets")
      .delete()
      .eq("id", pet.id);

    if (error) {
      console.error("Error deleting pet:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить питомца",
        variant: "destructive",
      });
    } else {
      setPet(null);
      toast({
        title: "Питомец удален",
        description: "Вы можете завести нового питомца",
      });
    }
  };

  const getHealthStatus = () => {
    if (!pet || pet.ran_away_at) return { text: "Сбежал", color: "bg-gray-500" };
    const avgStat = (pet.hunger + pet.thirst + pet.happiness) / 3;
    if (avgStat >= 70) return { text: "Отлично", color: "bg-green-500" };
    if (avgStat >= 40) return { text: "Нормально", color: "bg-yellow-500" };
    return { text: "Плохо", color: "bg-red-500" };
  };

  const getDaysSinceCreation = () => {
    if (!pet) return 0;
    const now = new Date();
    const created = new Date(pet.created_at);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Мой <span className="gradient-text">Тамагочи</span>
              </h1>
              <p className="text-muted-foreground">
                Заботься о своём питомце каждый день
              </p>
            </div>
          </div>

          {!pet || pet.ran_away_at ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {pet?.ran_away_at ? "Питомец сбежал 😢" : "Выбери своего питомца"}
                </CardTitle>
                <CardDescription>
                  {pet?.ran_away_at
                    ? "Вы не заботились о питомце более 2 недель, и он сбежал. Заведите нового!"
                    : "Выбери одного из трёх животных и дай ему имя"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="petName">Имя питомца</Label>
                    <Input
                      id="petName"
                      placeholder="Введите имя..."
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      maxLength={20}
                    />
                  </div>
                  
                  <div>
                    <Label>Выберите тип</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      {petTypes.map((petType) => (
                        <Card 
                          key={petType.type}
                          className={`cursor-pointer hover:bg-accent transition-colors text-center p-6 ${
                            selectedType === petType.type ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedType(petType.type)}
                        >
                          <span className="text-4xl block mb-2">{petType.emoji}</span>
                          <p className="text-sm font-medium">{petType.name}</p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Button onClick={createPet} className="w-full" disabled={!petName.trim() || !selectedType}>
                    Создать питомца
                  </Button>
                  
                  {pet?.ran_away_at && (
                    <Button onClick={resetPet} variant="outline" className="w-full">
                      Удалить старого питомца
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {pet.name}
                        <span className="text-4xl">
                          {petTypes.find((p) => p.type === pet.type)?.emoji}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {petTypes.find((p) => p.type === pet.type)?.name} • Живёт {getDaysSinceCreation()} дней
                      </CardDescription>
                    </div>
                    <Badge className={getHealthStatus().color}>
                      {getHealthStatus().text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Apple className="h-4 w-4" />
                          <span className="text-sm font-medium">Голод</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {pet.hunger}%
                        </span>
                      </div>
                      <Progress value={pet.hunger} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Droplet className="h-4 w-4" />
                          <span className="text-sm font-medium">Жажда</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {pet.thirst}%
                        </span>
                      </div>
                      <Progress value={pet.thirst} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Smile className="h-4 w-4" />
                          <span className="text-sm font-medium">Счастье</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {pet.happiness}%
                        </span>
                      </div>
                      <Progress value={pet.happiness} />
                    </div>
                  </div>

                  {(pet.hunger < 30 || pet.thirst < 30 || pet.happiness < 30) && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <p className="text-sm text-yellow-500">
                        Питомец нуждается в заботе! Если не заботиться о нём 2 недели, он сбежит.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Действия</CardTitle>
                  <CardDescription>
                    Заботься о питомце, чтобы он не сбежал
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      onClick={() => handleAction("feed")}
                      variant="outline"
                      className="h-20"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Apple className="h-6 w-6" />
                        <span>Покормить</span>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleAction("water")}
                      variant="outline"
                      className="h-20"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Droplet className="h-6 w-6" />
                        <span>Напоить</span>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleAction("play")}
                      variant="outline"
                      className="h-20"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Smile className="h-6 w-6" />
                        <span>Поиграть</span>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Pet;
