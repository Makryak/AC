import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlantSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoneId: string;
  userId: string;
  slotIndex: number;
  onPlantSelected: () => void;
}

interface SeedItem {
  id: string;
  name: string;
  icon_emoji: string;
  production_time: number;
  unlock_tasks_required: number;
}

export default function PlantSelectionSheet({
  open,
  onOpenChange,
  zoneId,
  userId,
  slotIndex,
  onPlantSelected,
}: PlantSelectionSheetProps) {
  const [seeds, setSeeds] = useState<SeedItem[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSeeds();
      loadUserProgress();
    }
  }, [open, zoneId]);

  const loadSeeds = async () => {
    const { data, error } = await supabase
      .from("farm_items")
      .select("*")
      .eq("category", "seed")
      .eq("zone_id", zoneId)
      .order("unlock_tasks_required", { ascending: true });

    if (error) {
      console.error("Error loading seeds:", error);
      return;
    }

    setSeeds(data || []);
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

  const handlePlantSeed = async (seedId: string) => {
    const { error } = await supabase.from("user_plants").insert({
      user_id: userId,
      zone_id: zoneId,
      slot_index: slotIndex,
      seed_item_id: seedId,
      planted_at: new Date().toISOString(),
    });

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось посадить растение",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Успешно",
      description: "Растение посажено",
    });
    onPlantSelected();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Выберите растение</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {seeds
            .filter((seed) => {
              const isUnlocked = tasksCompleted >= seed.unlock_tasks_required;
              // Show unlocked items and the next locked item
              if (isUnlocked) return true;
              // Find the next locked item (first one that's locked)
              const firstLocked = seeds.find(s => s.unlock_tasks_required > tasksCompleted);
              return seed.id === firstLocked?.id;
            })
            .map((seed) => {
              const isUnlocked = tasksCompleted >= seed.unlock_tasks_required;
              return (
                <Card
                  key={seed.id}
                  className={`p-4 ${!isUnlocked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{seed.icon_emoji}</span>
                      <div>
                        <p className="font-medium">{seed.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Время роста: {Math.floor(seed.production_time / 60)} мин
                        </p>
                        {!isUnlocked && (
                          <p className="text-xs text-destructive">
                            Требуется {seed.unlock_tasks_required} заданий
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePlantSeed(seed.id)}
                      disabled={!isUnlocked}
                      size="sm"
                    >
                      {isUnlocked ? "Посадить" : <Lock className="h-4 w-4" />}
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
