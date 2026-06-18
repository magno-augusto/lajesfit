import { createFileRoute } from "@tanstack/react-router";
import { PostCard } from "@/components/post-card";
import { type FeedPost } from "@/lib/feed";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed - Lajes Fit" }] }),
  component: FeedPage,
});

function FeedPage() {
  const posts: FeedPost[] = [
    {
      id: "sample-1",
      user_id: "ana",
      type: "diet",
      content:
        "Almoco organizado para manter o foco: arroz, feijao, frango grelhado e salada. Total aproximado: 612 kcal.",
      media_urls: [],
      created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      workout_id: null,
      profile: { username: "anafit", display_name: "Ana Souza", avatar_url: null },
      workout: null,
      likes_count: 12,
      comments_count: 3,
      liked_by_me: false,
    },
    {
      id: "sample-2",
      user_id: "bruno",
      type: "workout",
      content: "Corrida leve no fim da tarde. Ritmo tranquilo, mas saiu!",
      media_urls: [],
      created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      workout_id: "workout-1",
      profile: { username: "brunocorre", display_name: "Bruno Lima", avatar_url: null },
      workout: {
        activity_type: "Corrida",
        distance_meters: 5200,
        duration_seconds: 1860,
        calories: 410,
        name: "Volta da praca",
      },
      likes_count: 18,
      comments_count: 5,
      liked_by_me: false,
    },
    {
      id: "sample-3",
      user_id: "carla",
      type: "diet",
      content:
        "Lanche pos-treino com banana, iogurte natural e ovo cozido. Simples e resolveu bem.",
      media_urls: [],
      created_at: new Date(Date.now() - 1000 * 60 * 100).toISOString(),
      workout_id: null,
      profile: { username: "carlareis", display_name: "Carla Reis", avatar_url: null },
      workout: null,
      likes_count: 9,
      comments_count: 1,
      liked_by_me: false,
    },
    {
      id: "sample-4",
      user_id: "diego",
      type: "workout",
      content: "Musculacao completa hoje: peito, ombro e triceps.",
      media_urls: [],
      created_at: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
      workout_id: "workout-2",
      profile: { username: "diegomatos", display_name: "Diego Matos", avatar_url: null },
      workout: {
        activity_type: "Musculacao",
        distance_meters: null,
        duration_seconds: 3600,
        calories: 290,
        name: "Treino superior",
      },
      likes_count: 21,
      comments_count: 4,
      liked_by_me: false,
    },
    {
      id: "sample-5",
      user_id: "elisa",
      type: "diet",
      content:
        "Jantar simples: batata doce, carne grelhada e legumes. Fechando o dia sem complicar.",
      media_urls: [],
      created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      workout_id: null,
      profile: { username: "elisarocha", display_name: "Elisa Rocha", avatar_url: null },
      workout: null,
      likes_count: 15,
      comments_count: 2,
      liked_by_me: false,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={null} />
      ))}
    </div>
  );
}
