import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { formatFcfa } from "@/lib/moment-engine";
import { api } from "@/lib/api";
import { Dice5 } from "lucide-react";

export const Route = createFileRoute("/moments")({
  head: () => ({
    meta: [
      { title: "Mes moments — MOMENT" },
      {
        name: "description",
        content:
          "Tes sorties à venir, en cours et terminées : parcours, budget, billets et QR codes.",
      },
      { property: "og:title", content: "Mes moments — MOMENT" },
      {
        property: "og:description",
        content: "Tes sorties à venir, en cours et terminées, au même endroit.",
      },
    ],
  }),
  component: Moments,
});

const TABS = ["À venir", "En cours", "Terminés", "Annulés"] as const;

type ApiMoment = {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  peopleCount: number;
  totalPrice: number;
  score: number;
  status: string;
  createdAt: string;
  theme?: { emoji?: string; icon?: string; label?: string };
  steps?: Array<{
    venue?: {
      media?: Array<{ url?: string }>;
    };
  }>;
};

function Moments() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("À venir");
  const [moments, setMoments] = useState<ApiMoment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMoments = async () => {
      try {
        const response = await api.moments.list();
        if (response.success && response['moments']) {
          setMoments(response['moments']);
        }
      } catch (error) {
        console.error("Failed to fetch moments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMoments();
  }, []);

  const statusMap: Record<string, (typeof TABS)[number]> = {
    generated: "À venir",
    booked: "À venir",
    in_progress: "En cours",
    completed: "Terminés",
    cancelled: "Annulés",
  };

  const list = moments.filter((m) => statusMap[m.status] === tab);

  return (
    <ProtectedRoute>
      <div className="grain min-h-screen pb-24">
        <div className="relative mx-auto max-w-4xl px-4 md:px-5 py-8 md:py-12">
          <div className="pattern-adinkra pointer-events-none fixed inset-0" />
          <div className="relative">
            <p className="label-mono text-sm md:text-base">Historique</p>
            <h1 className="text-display mt-4 text-3xl md:text-5xl uppercase">Mes moments</h1>

            <div className="mt-6 md:mt-8 flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full border px-3 md:px-5 py-2 text-xs md:text-sm transition-colors ${
                    tab === t
                      ? "border-primary bg-primary font-semibold text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-8 md:mt-10 space-y-4 md:space-y-5">
              {loading ? (
                <div className="text-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-3 md:mt-4 text-sm md:text-base">Chargement des moments...</p>
                </div>
              ) : list.length > 0 ? (
                list.map((m) => (
                  <Link
                    key={m._id}
                    to="/moment/$id"
                    params={{ id: m._id }}
                    className="hover-lift surface-panel flex flex-col gap-4 md:gap-5 overflow-hidden sm:flex-row"
                  >
                    <img
                      src={m.steps?.[0]?.venue?.media?.[0]?.url || beach}
                      loading="lazy"
                      width={1200}
                      height={800}
                      alt={m.title}
                      className="h-32 md:h-40 w-full object-cover sm:w-56"
                    />
                    <div className="flex-1 p-4 md:p-5">
                      <p className="label-mono text-xs">
                        {m._id.slice(-6)} · {m.date} · {m.startTime}
                      </p>
                      <h2 className="mt-2 text-xl md:text-2xl">{m.title}</h2>
                      <p className="mt-2 text-xs md:text-sm text-muted-foreground">
                        <Dice5 className="inline h-3 w-3 mr-1" /> {m.steps?.length || 0} étapes · Score: {m.score}%
                      </p>
                      <p className="mt-3 text-xs md:text-sm">
                        {m.peopleCount} personnes · {formatFcfa(m.totalPrice)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="surface-panel p-6 md:p-10 text-center">
                  <p className="text-sm md:text-base text-muted-foreground">Rien dans cette catégorie.</p>
                  <Link
                    to="/moment/create"
                    className="mt-4 md:mt-6 inline-flex rounded-full bg-primary px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
                  >
                    🎲 Lancer un moment
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
