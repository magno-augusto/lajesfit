import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchProfiles, type ProfileSearchResult } from "@/features/profile/search-api";
import { adminSetParticipantWeight } from "./challenges-api";

export function AdminParticipantsCard({
  challengeId,
  currentUserId,
  onSaved,
}: {
  challengeId: string;
  currentUserId: string;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ProfileSearchResult | null>(null);
  const [startWeight, setStartWeight] = useState("");
  const [endWeight, setEndWeight] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);
    setSearching(true);
    try {
      const found = await searchProfiles(value, currentUserId);
      setResults(found);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function selectUser(profile: ProfileSearchResult) {
    setSelected(profile);
    setResults([]);
    setQuery("");
    setStartWeight("");
    setEndWeight("");
  }

  async function handleSave() {
    if (!selected) return;
    const parsedStart = Number(startWeight.trim().replace(",", "."));
    if (!Number.isFinite(parsedStart) || parsedStart <= 0) {
      toast.error("Informe um peso inicial valido em kg");
      return;
    }

    const trimmedEnd = endWeight.trim().replace(",", ".");
    const parsedEnd = trimmedEnd ? Number(trimmedEnd) : null;
    if (parsedEnd !== null && (!Number.isFinite(parsedEnd) || parsedEnd <= 0)) {
      toast.error("Informe um peso final valido em kg, ou deixe em branco");
      return;
    }

    setSaving(true);
    try {
      await adminSetParticipantWeight(challengeId, selected.id, parsedStart, parsedEnd);
      toast.success(`Peso de ${selected.display_name} salvo`);
      setSelected(null);
      setStartWeight("");
      setEndWeight("");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o peso");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Definir peso de participante (admin)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selected ? (
          <div className="space-y-2">
            <Label htmlFor="admin-participant-search">Buscar usuario</Label>
            <Input
              id="admin-participant-search"
              value={query}
              onChange={(e) => void handleSearch(e.target.value)}
              placeholder="Nome ou usuario..."
            />
            {searching && <p className="text-xs text-muted-foreground">Buscando...</p>}
            {results.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {results.map((profile) => (
                  <li key={profile.id}>
                    <button
                      type="button"
                      onClick={() => selectUser(profile)}
                      className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted/50"
                    >
                      <Avatar className="size-8">
                        <AvatarImage src={profile.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {profile.display_name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {profile.display_name}{" "}
                        <span className="text-muted-foreground">@{profile.username}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarImage src={selected.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {selected.display_name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{selected.display_name}</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Trocar
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="admin-start-weight">Peso inicial (kg)</Label>
                <Input
                  id="admin-start-weight"
                  type="number"
                  min="1"
                  step="0.1"
                  inputMode="decimal"
                  value={startWeight}
                  onChange={(e) => setStartWeight(e.target.value)}
                  placeholder="Ex: 72.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-end-weight">Peso final (kg, opcional)</Label>
                <Input
                  id="admin-end-weight"
                  type="number"
                  min="1"
                  step="0.1"
                  inputMode="decimal"
                  value={endWeight}
                  onChange={(e) => setEndWeight(e.target.value)}
                  placeholder="Ex: 70.0"
                />
              </div>
            </div>

            <Button type="button" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar peso"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
