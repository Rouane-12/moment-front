import { useState, useEffect, useRef, useCallback } from "react";
import { Star, Quote, MapPin } from "lucide-react";

const API_BASE = import.meta.env["VITE_API_URL"] || "http://localhost:5200";

interface Review {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  venue?: {
    name: string;
    category?: string;
    city?: string;
  };
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

export function ReviewsSlider() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/reviews?page=1&limit=20&sort=recent`
      );
      const data = await res.json();
      if (data.success) setReviews(data.reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (reviews.length <= 1 || paused) return;
    const el = scrollRef.current;
    if (!el) return;

    let animId: number;
    let lastTime = Date.now();
    const speed = 0.5; // px per ms

    const tick = () => {
      if (!el || paused) return;
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      el.scrollLeft += speed * dt;

      // Reset to start when we've scrolled past half (duplicated content)
      if (el.scrollLeft >= el.scrollWidth / 2) {
        el.scrollLeft = 0;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [reviews.length, paused]);

  if (loading) {
    return (
      <div className="py-12 px-5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-display text-2xl uppercase mb-8">
            Avis de la communauté
          </h2>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-white/5 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) return null;

  // Duplicate reviews for infinite scroll effect
  const doubledReviews = [...reviews, ...reviews];

  return (
    <div className="py-12 px-5 bg-black/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-display text-2xl uppercase mb-8">
          Avis de la communauté
        </h2>

        <div
          ref={scrollRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          className="flex gap-5 overflow-x-auto scrollbar-hide pb-4"
          style={{
            scrollBehavior: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {doubledReviews.map((review, index) => (
            <div
              key={`${review._id}-${index}`}
              className="flex-shrink-0 w-[340px] sm:w-[400px]"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full hover:bg-white/8 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold text-sm">
                      {review.user.firstName[0]}
                      {review.user.lastName[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {review.user.firstName} {review.user.lastName}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.rating
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {review.venue && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{review.venue.name}</span>
                  </div>
                )}

                <h3 className="font-semibold text-sm mb-1">{review.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">
                  <Quote className="h-3 w-3 inline mr-1 opacity-50" />
                  {review.comment}
                </p>

                <p className="mt-3 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                  {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
