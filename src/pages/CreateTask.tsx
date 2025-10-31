import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";

interface Zone {
  id: string;
  name: string;
  zone_type: string;
}

const CreateTask = () => {
  const navigate = useNavigate();
  const { isTeacher, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [xpReward, setXpReward] = useState(100);
  const [targetGrades, setTargetGrades] = useState<number[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [newAttachment, setNewAttachment] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      if (!isTeacher && !roleLoading) {
        navigate("/dashboard");
        return;
      }
      loadZones();
    });
  }, [navigate, isTeacher, roleLoading]);

  const loadZones = async () => {
    const { data, error } = await supabase
      .from("farm_zones")
      .select("id, name, zone_type")
      .order("name");

    if (error) {
      console.error("Error loading zones:", error);
    } else {
      setZones(data || []);
    }
  };

  const toggleGrade = (grade: number) => {
    setTargetGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const addAttachment = () => {
    if (newAttachment.trim()) {
      setAttachmentUrls((prev) => [...prev, newAttachment.trim()]);
      setNewAttachment("");
    }
  };

  const removeAttachment = (index: number) => {
    setAttachmentUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !zoneId || targetGrades.length === 0) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      title,
      description,
      instructions,
      zone_id: zoneId,
      difficulty,
      experience_reward: xpReward,
      target_grades: targetGrades,
      attachment_urls: attachmentUrls,
      created_by: user.id,
    });

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать задание",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Успешно",
      description: "Задание создано",
    });

    navigate("/teacher");
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Создать задание</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Название задания *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Краткое описание</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Инструкции</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone">Предмет *</Label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите предмет" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Сложность (1-5)</Label>
                  <Input
                    id="difficulty"
                    type="number"
                    min="1"
                    max="5"
                    value={difficulty}
                    onChange={(e) => setDifficulty(parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="xp">Награда (XP)</Label>
                  <Input
                    id="xp"
                    type="number"
                    min="0"
                    value={xpReward}
                    onChange={(e) => setXpReward(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Классы *</Label>
                <div className="flex flex-wrap gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((grade) => (
                    <div key={grade} className="flex items-center space-x-2">
                      <Checkbox
                        id={`grade-${grade}`}
                        checked={targetGrades.includes(grade)}
                        onCheckedChange={() => toggleGrade(grade)}
                      />
                      <Label
                        htmlFor={`grade-${grade}`}
                        className="cursor-pointer"
                      >
                        {grade} класс
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Прикрепленные файлы (ссылки)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/file.pdf"
                    value={newAttachment}
                    onChange={(e) => setNewAttachment(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAttachment())}
                  />
                  <Button type="button" onClick={addAttachment} size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {attachmentUrls.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {attachmentUrls.map((url, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <span className="text-sm truncate flex-1">{url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  "Создать задание"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTask;
