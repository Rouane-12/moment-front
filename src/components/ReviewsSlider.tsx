import { useState, useEffect, useRef } from "react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/reviews?page=1&limit=20&sort=recent`
      );
      const data = await res.json();
      if (data.success) setReviews(data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-slide every 4 seconds — single card at a time, infinite loop
  useEffect(() => {
    if (reviews.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reviews.length]);

  if (loading) {
    return (
      <div className="py-12 px-5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-display text-2xl uppercase mb-8">
            Avis de la communauté
          </h2>
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-white/5 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) return null;

  const review = reviews[currentIndex];

  return (
    <div className="py-12 px-5 bg-black/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-display text-2xl uppercase mb-8">
          Avis de la communauté
        </h2>

        <div className="flex justify-center">
          <div
            className="w-[75vw] sm:w-[420px] max-w-[420px]"
            key={review._id + "-" + currentIndex}
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 transition-all duration-500 ease-in-out">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-base">
                    {review.user.firstName[0]}
                    {review.user.lastName[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {review.user.firstName} {review.user.lastName}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
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
                </div>
              </div>

              {review.venue && (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{review.venue.name}</span>
                </div>
              )}

              <h3 className="font-semibold text-base mb-2">{review.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-4">
                <Quote className="h-3.5 w-3.5 inline mr-1 opacity-50" />
                {review.comment}
              </p>

              <p className="mt-4 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Dots indicator */}
        {reviews.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? "bg-primary w-6"
                    : "bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
