import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductionSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoneId: string;
  userId: string;
  slotIndex: number;
  onProductionSelected: () => void;
}

interface ProductionChain {
  id: string;
  name: string;
  base_time: number;
  unlock_tasks_required: number;
  output_item: {
    icon_emoji: string;
  };
  ingredients: Array<{
    item: {
      id: string;
      name: string;
      icon_emoji: string;
    };
    quantity_needed: number;
  }>;
}

export default function ProductionSelectionSheet({
  open,
  onOpenChange,
  zoneId,
  userId,
  slotIndex,
  onProductionSelected,
}: ProductionSelectionSheetProps) {
  const [chains, setChains] = useState<ProductionChain[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProductionChains();
      loadUserProgress();
    }
  }, [open, zoneId]);

  const loadProductionChains = async () => {
    const { data, error } = await supabase
      .from("production_chains")
      .select(`
        *,
        output_item:farm_items!production_chains_output_item_id_fkey(icon_emoji),
        ingredients:production_chain_ingredients(
          quantity_needed,
          item:farm_items(id, name, icon_emoji)
        )
      `)
      .eq("zone_id", zoneId)
      .order("unlock_tasks_required", { ascending: true });

    if (error) {
      console.error("Error loading production chains:", error);
      return;
    }

    setChains(data || []);
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

  const handleStartProduction = async (chainId: string, baseTime: number) => {
    const chain = chains.find((c) => c.id === chainId);
    if (!chain) return;

    // Check inventory for all ingredients
    const { data: inventory, error: invError } = await supabase
      .from("user_inventory")
      .select("item_id, quantity")
      .eq("user_id", userId);

    if (invError) {
      toast({
        title: "Ошибка",
        description: "Не удалось проверить инвентарь",
        variant: "destructive",
      });
      return;
    }

    // Check if user has all ingredients
    const missingIngredients = [];
    for (const ingredient of chain.ingredients) {
      const userItem = inventory?.find((i) => i.item_id === ingredient.item.id);
      const available = userItem?.quantity || 0;
      if (available < ingredient.quantity_needed) {
        missingIngredients.push(
          `${ingredient.item.name} (есть: ${available}, нужно: ${ingredient.quantity_needed})`
        );
      }
    }

    if (missingIngredients.length > 0) {
      toast({
        title: "Недостаточно ресурсов",
        description: `Не хватает: ${missingIngredients.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Deduct ingredients from inventory
    for (const ingredient of chain.ingredients) {
      const userItem = inventory?.find((i) => i.item_id === ingredient.item.id);
      if (userItem) {
        const newQuantity = userItem.quantity - ingredient.quantity_needed;
        const { error: updateError } = await supabase
          .from("user_inventory")
          .update({ quantity: newQuantity })
          .eq("user_id", userId)
          .eq("item_id", ingredient.item.id);

        if (updateError) {
          toast({
            title: "Ошибка",
            description: "Не удалось обновить инвентарь",
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Start production
    const finishAt = new Date();
    finishAt.setSeconds(finishAt.getSeconds() + baseTime);

    const { error } = await supabase.from("user_productions").insert({
      user_id: userId,
      zone_id: zoneId,
      chain_id: chainId,
      slot_index: slotIndex,
      finish_at: finishAt.toISOString(),
    });

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось начать производство",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Успешно",
      description: "Производство запущено",
    });
    onProductionSelected();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Выберите рецепт</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {chains
            .filter((chain) => {
              const isUnlocked = tasksCompleted >= chain.unlock_tasks_required;
              // Show unlocked items and the next locked item
              if (isUnlocked) return true;
              // Find the next locked item (first one that's locked)
              const firstLocked = chains.find(c => c.unlock_tasks_required > tasksCompleted);
              return chain.id === firstLocked?.id;
            })
            .map((chain) => {
              const isUnlocked = tasksCompleted >= chain.unlock_tasks_required;
              return (
                <Card
                  key={chain.id}
                  className={`p-4 ${!isUnlocked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{chain.output_item.icon_emoji}</span>
                        <div>
                          <p className="font-medium">{chain.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Время: {Math.floor(chain.base_time / 60)} мин
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Требуется:{" "}
                        {chain.ingredients.map((ing, i) => (
                          <span key={i}>
                            {ing.quantity_needed}x {ing.item.icon_emoji} {ing.item.name}
                            {i < chain.ingredients.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                      {!isUnlocked && (
                        <p className="text-xs text-destructive mt-1">
                          Требуется {chain.unlock_tasks_required} заданий
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleStartProduction(chain.id, chain.base_time)}
                      disabled={!isUnlocked}
                      size="sm"
                    >
                      {isUnlocked ? "Начать" : <Lock className="h-4 w-4" />}
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
