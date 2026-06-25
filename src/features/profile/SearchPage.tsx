import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocalAuth } from "@/features/auth/auth";
import { searchProfiles, type ProfileSearchResult } from "./search-api";

export function SearchPage() {
  const { user } = useLocalAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    let mounted = true;
    const timeout = setTimeout(() => {
      setLoading(true);
      searchProfiles(trimmed, user.id)
        .then((nextResults) => {
          if (mounted) setResults(nextResults);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "Nao foi possivel buscar pessoas");
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [query, user]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-4xl">BUSCAR PESSOAS</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por usuario ou nome..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Buscando...</p>
      ) : query.trim().length < 2 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Digite pelo menos 2 letras para buscar.
        </p>
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma pessoa encontrada com esse nome.
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map((profile) => (
            <li key={profile.id}>
              <Link to="/profile/$username" params={{ username: profile.username }}>
                <Card className="flex items-center gap-3 p-3 transition hover:bg-muted/40">
                  <Avatar className="size-10">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {profile.display_name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{profile.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
