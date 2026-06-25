import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "@/features/feed/FeedPage";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed - Lajes Fit" }] }),
  component: FeedPage,
});
