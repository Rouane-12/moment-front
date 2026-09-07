import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Star, Pencil, Trash2, MapPin, ArrowLeft } from "lucide-react";

const API_BASE = import.meta.env["VITE_API_URL"] || "http://localhost:5200";

type UserReview = {
  _id: string;
  venue: { _id: string; name: string; category: string; city?: string };
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  helpfulCount?: number;
};

export const Route = createFileRoute("/my-reviews")({
  component: MyReviews,
});

function MyReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ rating: 5, title: "", comment: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reviews/my-reviews`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setReviews(data.reviews);
    } catch (e) {
      console.error("Error fetching reviews:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reviews/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (data.success) {
        setReviews(reviews.map((r) => (r._id === id ? { ...r, ...data.review } : r)));
        setEditingId(null);
      }
    } catch (e) {
      console.error("Error editing review:", e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reviews/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setReviews(reviews.filter((r) => r._id !== id));
        setDeletingId(null);
      }
    } catch (e) {
      console.error("Error deleting review:", e);
    }
  };

  if (loading) {
    return (
      <div className="grain min-h-screen">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="grain min-h-screen pb-24">
      <div className="mx-auto max-w-3xl px-5 py-14">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/profile"
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-display text-3xl uppercase">Mes avis</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {reviews.length} avis publi{reviews.length > 1 ? "és" : "é"}
            </p>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="surface-panel p-12 text-center">
            <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Tu n&apos;as pas encore donné d&apos;avis.
            </p>
            <Link
              to="/explore"
              className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Explorer les lieux
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="surface-panel p-5">
                {editingId === review._id ? (
                  /* EDIT MODE */
                  <div className="space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditData({ ...editData, rating: s })}
                        >
                          <Star
                            className={`h-7 w-7 ${
                              s <= editData.rating
                                ? "fill-primary text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                      className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                    />
                    <textarea
                      value={editData.comment}
                      onChange={(e) =>
                        setEditData({ ...editData, comment: e.target.value })
                      }
                      className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(review._id)}
                        className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-input px-5 py-2 text-xs font-bold"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE */
                  <div>
                    {deletingId === review._id && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-3">
                        <p className="text-sm mb-3 font-medium">
                          Supprimer cet avis ?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(review._id)}
                            className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold text-white"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="rounded-full border border-input px-4 py-1.5 text-xs font-bold"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/venue/${review.venue._id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{review.venue.name}</span>
                        </a>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-primary text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <h3 className="font-semibold mt-2">{review.title}</h3>
                        <p className="text-muted-foreground text-sm mt-1 break-words">
                          {review.comment}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingId(review._id);
                            setEditData({
                              rating: review.rating,
                              title: review.title,
                              comment: review.comment,
                            });
                          }}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeletingId(review._id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
