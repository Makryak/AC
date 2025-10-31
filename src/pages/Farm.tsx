import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Header from "@/components/layout/Header";
import { Sun, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import FarmZoneView from "@/components/farm/FarmZoneView";
import mathIcon from "@/assets/zone-math.png";
import physicsIcon from "@/assets/zone-physics.png";
import chemIcon from "@/assets/zone-chemistry.png";
import bioIcon from "@/assets/zone-biology.png";
import itIcon from "@/assets/zone-it.png";

interface FarmZone {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: string;
}

const Farm = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDaytime, setIsDaytime] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const farmZones: FarmZone[] = [
    {
      id: "8b156789-f1f0-4394-b4ae-94efbc93af14",
      name: "Биология",
      type: "biology",
      description: "Растения и животные",
      icon: bioIcon
    },
    {
      id: "375de249-4716-43a9-8cea-f08f25cde301",
      name: "Физика",
      type: "physics",
      description: "Цепочки производства",
      icon: physicsIcon
    },
    {
      id: "9fa4e3b1-f258-40d6-9c89-97bda85a6e1c",
      name: "Химия",
      type: "chemistry",
      description: "Бустеры производства",
      icon: chemIcon
    },
    {
      id: "af7a6238-06cd-4b24-8b67-ef1bc801655c",
      name: "Математика",
      type: "math",
      description: "Бустеры времени",
      icon: mathIcon
    },
    {
      id: "26e20433-7e0e-4b8d-890a-86f92252754d",
      name: "Информатика",
      type: "it",
      description: "Автоматизация",
      icon: itIcon
    },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const checkTime = () => {
      const hour = new Date().getHours();
      setIsDaytime(hour >= 6 && hour < 20);
    };
    
    checkTime();
    const interval = setInterval(checkTime, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  if (selectedZone) {
    const zone = farmZones.find(z => z.id === selectedZone);
    if (zone) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container py-8">
            <FarmZoneView
              zoneName={zone.name}
              zoneType={zone.type}
              zoneId={zone.id}
              onBack={() => setSelectedZone(null)}
            />
          </main>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Интерактивная <span className="gradient-text">Ферма</span>
              </h1>
              <p className="text-muted-foreground">
                Выращивай растения, заботься о животных и создавай продукты
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {isDaytime ? (
                <Sun className="h-6 w-6 text-yellow-500" />
              ) : (
                <Moon className="h-6 w-6 text-blue-400" />
              )}
              <span className="text-sm text-muted-foreground">
                {isDaytime ? "День" : "Ночь"}
              </span>
            </div>
          </div>

          {/* Farm Zones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {farmZones.map((zone) => (
              <Card
                key={zone.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 group"
                onClick={() => setSelectedZone(zone.id)}
              >
                <div className="space-y-4">
                  <div className="w-full h-32 bg-accent/20 rounded-lg flex items-center justify-center overflow-hidden">
                    <img 
                      src={zone.icon} 
                      alt={zone.name}
                      className="w-24 h-24 object-contain group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold gradient-text mb-1">
                      {zone.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {zone.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Выполняй задания, чтобы получить семена и ресурсы для развития фермы
          </p>
        </div>
      </main>
    </div>
  );
};

export default Farm;
