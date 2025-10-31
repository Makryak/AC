import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  school_name: string | null;
  grade: number | null;
  bio: string | null;
  avatar_url: string | null;
}

interface Zone {
  id: string;
  name: string;
  zone_type: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      loadProfile(session.user.id);
      loadZones();
      if (role === "teacher" || role === "admin") {
        loadTeacherSubjects(session.user.id);
      }
    });
  }, [navigate, role]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

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

  const loadTeacherSubjects = async (userId: string) => {
    const { data, error } = await supabase
      .from("teacher_subjects")
      .select("zone_id")
      .eq("teacher_id", userId);

    if (error) {
      console.error("Error loading teacher subjects:", error);
    } else {
      setSelectedSubjects((data || []).map((s) => s.zone_id));
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        school_name: profile.school_name,
        grade: profile.grade,
      })
      .eq("id", profile.id);

    if (profileError) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить профиль",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    // Update teacher subjects if teacher
    if (role === "teacher" || role === "admin") {
      // Delete all existing subjects
      await supabase
        .from("teacher_subjects")
        .delete()
        .eq("teacher_id", profile.id);

      // Insert new subjects
      if (selectedSubjects.length > 0) {
        const subjectsToInsert = selectedSubjects.map((zoneId) => ({
          teacher_id: profile.id,
          zone_id: zoneId,
        }));

        const { error: subjectsError } = await supabase
          .from("teacher_subjects")
          .insert(subjectsToInsert);

        if (subjectsError) {
          toast({
            title: "Ошибка",
            description: "Не удалось сохранить предметы",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }
    }

    toast({
      title: "Успешно",
      description: "Профиль сохранен",
    });
    setSaving(false);
  };

  const toggleSubject = (zoneId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(zoneId)
        ? prev.filter((id) => id !== zoneId)
        : [...prev, zoneId]
    );
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Полное имя</Label>
              <Input
                id="full_name"
                value={profile?.full_name || ""}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, full_name: e.target.value } : null
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_name">Школа</Label>
              <Input
                id="school_name"
                value={profile?.school_name || ""}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, school_name: e.target.value } : null
                  )
                }
              />
            </div>

            {role === "student" && (
              <div className="space-y-2">
                <Label htmlFor="grade">Класс</Label>
                <Input
                  id="grade"
                  type="number"
                  min="1"
                  max="11"
                  value={profile?.grade || ""}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev
                        ? { ...prev, grade: parseInt(e.target.value) || null }
                        : null
                    )
                  }
                />
              </div>
            )}

            {(role === "teacher" || role === "admin") && (
              <div className="space-y-2">
                <Label>Преподаваемые предметы</Label>
                <div className="space-y-2">
                  {zones.map((zone) => (
                    <div key={zone.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={zone.id}
                        checked={selectedSubjects.includes(zone.id)}
                        onCheckedChange={() => toggleSubject(zone.id)}
                      />
                      <Label htmlFor={zone.id} className="cursor-pointer">
                        {zone.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
