import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PlantData {
  id: string;
  slotIndex: number;
  seedName: string;
  seedEmoji: string;
  plantedAt: string;
  growthTime: number;
  outputEmoji: string;
  needsWater: boolean;
  seedItemId: string;
}

export interface AnimalData {
  id: string;
  slotIndex: number;
  name: string;
  emoji: string;
  lastFedAt: string;
  lastCollectedAt: string;
  happiness: number;
  productionTime: number;
  productionEmoji: string;
  animalId: string;
}

export interface ProductionData {
  id: string;
  slotIndex: number;
  chainName: string;
  outputEmoji: string;
  finishAt: string;
  startedAt: string;
  chainId: string;
}

export const useFarmData = (zoneId: string | null, userId: string | null) => {
  const [plants, setPlants] = useState<PlantData[]>([]);
  const [animals, setAnimals] = useState<AnimalData[]>([]);
  const [productions, setProductions] = useState<ProductionData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!zoneId || !userId) {
      setLoading(false);
      return;
    }

    loadData();
  }, [zoneId, userId]);

  const loadData = async () => {
    if (!zoneId || !userId) return;

    try {
      setLoading(true);

      // Load plants
      const { data: plantsData, error: plantsError } = await supabase
        .from("user_plants")
        .select(`
          id,
          slot_index,
          planted_at,
          needs_water,
          seed_item:farm_items!user_plants_seed_item_id_fkey(
            name,
            icon_emoji,
            production_time
          )
        `)
        .eq("user_id", userId)
        .eq("zone_id", zoneId);

      if (plantsError) throw plantsError;

      const formattedPlants = (plantsData || []).map((p: any) => ({
        id: p.id,
        slotIndex: p.slot_index,
        seedName: p.seed_item.name,
        seedEmoji: p.seed_item.icon_emoji,
        plantedAt: p.planted_at,
        growthTime: p.seed_item.production_time || 120,
        outputEmoji: p.seed_item.icon_emoji,
        needsWater: p.needs_water,
        seedItemId: p.seed_item_id
      }));

      setPlants(formattedPlants);

      // Load animals
      const { data: animalsData, error: animalsError } = await supabase
        .from("user_farm_animals")
        .select(`
          id,
          happiness,
          last_fed_at,
          last_collected_at,
          animal:farm_animals!user_farm_animals_animal_id_fkey(
            id,
            name,
            icon_emoji,
            production_time,
            production_item:farm_items!farm_animals_production_item_id_fkey(icon_emoji)
          )
        `)
        .eq("user_id", userId);

      if (animalsError) throw animalsError;

      const formattedAnimals = (animalsData || []).map((a: any, index: number) => ({
        id: a.id,
        slotIndex: index,
        name: a.animal.name,
        emoji: a.animal.icon_emoji,
        lastFedAt: a.last_fed_at,
        lastCollectedAt: a.last_collected_at,
        happiness: a.happiness,
        productionTime: a.animal.production_time,
        productionEmoji: a.animal.production_item.icon_emoji,
        animalId: a.animal.id
      }));

      setAnimals(formattedAnimals);

      // Load productions
      const { data: productionsData, error: productionsError } = await supabase
        .from("user_productions")
        .select(`
          id,
          slot_index,
          started_at,
          finish_at,
          chain:production_chains!user_productions_chain_id_fkey(
            id,
            name,
            output_item:farm_items!production_chains_output_item_id_fkey(icon_emoji)
          )
        `)
        .eq("user_id", userId)
        .eq("zone_id", zoneId);

      if (productionsError) throw productionsError;

      const formattedProductions = (productionsData || []).map((p: any) => ({
        id: p.id,
        slotIndex: p.slot_index,
        chainName: p.chain.name,
        outputEmoji: p.chain.output_item.icon_emoji,
        finishAt: p.finish_at,
        startedAt: p.started_at,
        chainId: p.chain.id
      }));

      setProductions(formattedProductions);

    } catch (error: any) {
      console.error("Error loading farm data:", error);
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const harvestPlant = async (plantId: string) => {
    try {
      // Get plant info first
      const { data: plantData, error: plantError } = await supabase
        .from("user_plants")
        .select("seed_item_id, user_id")
        .eq("id", plantId)
        .single();

      if (plantError) throw plantError;

      // Add to inventory
      const { data: existing } = await supabase
        .from("user_inventory")
        .select("id, quantity")
        .eq("user_id", plantData.user_id)
        .eq("item_id", plantData.seed_item_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_inventory")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_inventory")
          .insert({
            user_id: plantData.user_id,
            item_id: plantData.seed_item_id,
            quantity: 1
          });
      }

      // Delete plant
      const { error } = await supabase
        .from("user_plants")
        .delete()
        .eq("id", plantId);

      if (error) throw error;

      toast({
        title: "Собрано! 🌾",
        description: "Урожай добавлен в инвентарь",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const collectProduction = async (productionId: string) => {
    try {
      // Get production info first
      const { data: prodData, error: prodError } = await supabase
        .from("user_productions")
        .select(`
          user_id,
          chain:production_chains!user_productions_chain_id_fkey(
            output_item_id,
            output_quantity
          )
        `)
        .eq("id", productionId)
        .single();

      if (prodError) throw prodError;

      const outputQuantity = prodData.chain.output_quantity || 1;

      // Add to inventory
      const { data: existing } = await supabase
        .from("user_inventory")
        .select("id, quantity")
        .eq("user_id", prodData.user_id)
        .eq("item_id", prodData.chain.output_item_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_inventory")
          .update({ quantity: existing.quantity + outputQuantity })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_inventory")
          .insert({
            user_id: prodData.user_id,
            item_id: prodData.chain.output_item_id,
            quantity: outputQuantity
          });
      }

      // Delete production
      const { error } = await supabase
        .from("user_productions")
        .delete()
        .eq("id", productionId);

      if (error) throw error;

      toast({
        title: "Собрано! 📦",
        description: "Продукт добавлен в инвентарь",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const collectFromAnimal = async (animalId: string) => {
    try {
      // Get animal info first
      const { data: animalData, error: animalError } = await supabase
        .from("user_farm_animals")
        .select(`
          user_id,
          animal:farm_animals!user_farm_animals_animal_id_fkey(
            production_item_id
          )
        `)
        .eq("id", animalId)
        .single();

      if (animalError) throw animalError;

      // Add to inventory
      const { data: existing } = await supabase
        .from("user_inventory")
        .select("id, quantity")
        .eq("user_id", animalData.user_id)
        .eq("item_id", animalData.animal.production_item_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_inventory")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_inventory")
          .insert({
            user_id: animalData.user_id,
            item_id: animalData.animal.production_item_id,
            quantity: 1
          });
      }

      // Update last collected time
      const { error } = await supabase
        .from("user_farm_animals")
        .update({ last_collected_at: new Date().toISOString() })
        .eq("id", animalId);

      if (error) throw error;

      toast({
        title: "Собрано! 🥛",
        description: "Продукт добавлен в инвентарь",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    plants,
    animals,
    productions,
    loading,
    harvestPlant,
    collectProduction,
    collectFromAnimal,
    refreshData: loadData
  };
};
