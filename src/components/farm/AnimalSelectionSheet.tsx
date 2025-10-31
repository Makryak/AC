import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnimalSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoneId: string;
  userId: string;
  onAnimalSelected: () => void;
}

interface Animal {
  id: string;
  name: string;
  icon_emoji: string;
  production_time: number;
  unlock_tasks_required: number;
}

export default function AnimalSelectionSheet({
  open,
  onOpenChange,
  zoneId,
  userId,
  onAnimalSelected,
}: AnimalSelectionSheetProps) {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadAnimals();
      loadUserProgress();
    }
  }, [open, zoneId]);

  const loadAnimals = async () => {
    const { data, error } = await supabase
      .from("farm_animals")
      .select("*")
      .eq("zone_id", zoneId)
      .order("unlock_tasks_required", { ascending: true });

    if (error) {
      console.error("Error loading animals:", error);
      return;
    }

    setAnimals(data || []);
  };

  const loadUserProgress = async () => {
    const { data, error } = await supabase
      .from("user_zone_progress")
      .select("tasks_completed")
      .eq("user_id", userId)
      .eq("zone_id", zoneId)
      .maybeSingle();

    if (!error && data) {
      setTasksCompleted(data.tasks_completed || 0);
    }
  };

  const handleAddAnimal = async (animalId: string) => {
    const { error } = await supabase.from("user_farm_animals").insert({
      user_id: userId,
      animal_id: animalId,
    });

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить животное",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Успешно",
      description: "Животное добавлено на ферму",
    });
    onAnimalSelected();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Выберите животное</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {animals
            .filter((animal) => {
              const isUnlocked = tasksCompleted >= animal.unlock_tasks_required;
              // Show unlocked items and the next locked item
              if (isUnlocked) return true;
              // Find the next locked item (first one that's locked)
              const firstLocked = animals.find(a => a.unlock_tasks_required > tasksCompleted);
              return animal.id === firstLocked?.id;
            })
            .map((animal) => {
              const isUnlocked = tasksCompleted >= animal.unlock_tasks_required;
              return (
                <Card
                  key={animal.id}
                  className={`p-4 ${!isUnlocked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{animal.icon_emoji}</span>
                      <div>
                        <p className="font-medium">{animal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Производство: {Math.floor(animal.production_time / 60)} мин
                        </p>
                        {!isUnlocked && (
                          <p className="text-xs text-destructive">
                            Требуется {animal.unlock_tasks_required} заданий
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddAnimal(animal.id)}
                      disabled={!isUnlocked}
                      size="sm"
                    >
                      {isUnlocked ? "Добавить" : <Lock className="h-4 w-4" />}
                    </Button>
                  </div>
                </Card>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
