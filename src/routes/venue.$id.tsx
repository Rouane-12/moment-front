import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { SiteNav } from "@/components/moment/SiteNav";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { CATEGORY_META, formatFcfa } from "@/lib/moment-engine";
import * as LucideIcons from "lucide-react";

const { Star, MapPin, Clock, Phone, ExternalLink, Trash2, Pencil, X } = LucideIcons;

const API_BASE = import.meta.env['VITE_API_URL'] || 'http://localhost:5200';

function getIcon(name: string) {
  return (LucideIcons as any)[name] || MapPin;
}

export const Route = createFileRoute("/venue/$id")({
  component: VenueDetail,
});

type Venue = {
  _id: string;
  name: string;
  description?: string;
  category: string;
  district?: string;
  city: string;
  rating: number;
  reviewCount: number;
  priceRange?: { average?: number };
  media?: { url?: string }[];
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
};

type Review = {
  _id: string;
  user: { firstName: string; lastName: string; avatar?: string };
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  helpfulCount?: number;
  reply?: { text: string; repliedBy: { firstName: string; lastName: string } };
};

function VenueDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editData, setEditData] = useState({ rating: 5, title: '', comment: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews/venue/${id}?page=1&limit=20&sort=recent`);
      const data = await res.json();
      if (data.success) setReviews(data.reviews);
    } catch {}
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [venueRes, reviewsRes] = await Promise.all([
          api.venues.get(id),
          fetch(`${API_BASE}/api/reviews/venue/${id}?page=1&limit=20&sort=recent`)
            .then(r => r.json())
        ]);
        if (venueRes.success) setVenue(venueRes['venue']);
        if (reviewsRes.success) setReviews(reviewsRes['reviews']);
      } catch (error) {
        console.error('Error fetching venue data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          venueId: id,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviews([data.review, ...reviews]);
        setShowReviewForm(false);
        setReviewData({ rating: 5, title: '', comment: '' });
      } else {
        console.error('Review error:', data.message);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReview = async (reviewId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (data.success) {
        setReviews(reviews.map(r => r._id === reviewId ? data.review : r));
        setEditingReview(null);
      }
    } catch (error) {
      console.error('Error editing review:', error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setDeletingId(reviewId);
  };

  const confirmDelete = async (reviewId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setReviews(reviews.filter(r => r._id !== reviewId));
        setDeletingId(null);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  if (loading) {
    return (
      <div className="grain min-h-screen">
        <SiteNav />
        <div className="mx-auto max-w-4xl px-5 py-14">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="grain min-h-screen">
        <SiteNav />
        <div className="mx-auto max-w-4xl px-5 py-14">
          <p className="text-center text-muted-foreground">Lieu non trouvé</p>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[venue.category as keyof typeof CATEGORY_META] || CATEGORY_META.culture;
  const googleMapsUrl = venue.latitude && venue.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`
    : null;

  return (
    <div className="grain min-h-screen pb-24">
      <SiteNav />
      <div className="mx-auto max-w-4xl px-5 py-14">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />
        
        <div className="relative">
          {/* HERO IMAGE */}
          {venue.media?.[0]?.url && (
            <div className="relative h-64 md:h-80 overflow-hidden rounded-2xl mb-8">
              <img
                src={venue.media[0].url}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
          )}

          {/* HEADER */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="label-mono">
                {(() => { const I = getIcon(meta.icon); return <><I className="inline h-4 w-4 mr-1" /></>; })()} {meta.label} · {venue.district || venue.city}
              </p>
              <h1 className="text-display text-4xl md:text-5xl uppercase mt-2">{venue.name}</h1>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-primary text-primary" />
                <span className="text-2xl font-semibold">{venue.rating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{venue.reviewCount} avis</p>
            </div>
          </div>

          {/* INFO */}
          <div className="surface-panel p-6 mb-8 space-y-4">
            {venue.description && (
              <p className="text-muted-foreground">{venue.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              {venue.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{venue.address}</span>
                </div>
              )}
              {venue.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{venue.phone}</span>
                </div>
              )}
              {venue.priceRange?.average && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatFcfa(venue.priceRange.average)} / personne</span>
                </div>
              )}
            </div>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Localiser sur Google Maps
              </a>
            )}
          </div>

          {/* REVIEWS SECTION */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-display text-2xl uppercase">Avis</h2>
              <ProtectedRoute>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
                >
                  {showReviewForm ? 'Annuler' : 'Ajouter un avis'}
                </button>
              </ProtectedRoute>
            </div>

            {/* REVIEW FORM */}
            {showReviewForm && (
              <ProtectedRoute>
                <div className="surface-panel p-6">
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Note</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewData({ ...reviewData, rating: star })}
                            className="text-2xl"
                          >
                            <Star
                              className={`h-8 w-8 ${
                                star <= reviewData.rating
                                  ? 'fill-primary text-primary'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Titre</label>
                      <input
                        type="text"
                        value={reviewData.title}
                        onChange={(e) => setReviewData({ ...reviewData, title: e.target.value })}
                        className="w-full rounded-lg border border-input bg-surface px-4 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Commentaire</label>
                      <textarea
                        value={reviewData.comment}
                        onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                        className="w-full rounded-lg border border-input bg-surface px-4 py-2 min-h-[100px]"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50"
                    >
                      {submitting ? 'Envoi...' : 'Publier mon avis'}
                    </button>
                  </form>
                </div>
              </ProtectedRoute>
            )}

            {/* REVIEWS LIST */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review._id} className="surface-panel p-6">
                    {editingReview === review._id ? (
                      /* EDIT MODE */
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          {[1,2,3,4,5].map(s => (
                            <button key={s} type="button" onClick={() => setEditData({...editData, rating: s})}>
                              <Star className={`h-7 w-7 ${s <= editData.rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                            </button>
                          ))}
                        </div>
                        <input type="text" value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm" />
                        <textarea value={editData.comment} onChange={e => setEditData({...editData, comment: e.target.value})} className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm min-h-[80px]" />
                        <div className="flex gap-2">
                          <button onClick={() => handleEditReview(review._id)} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Enregistrer</button>
                          <button onClick={() => setEditingReview(null)} className="rounded-full border border-input px-4 py-2 text-xs font-bold">Annuler</button>
                        </div>
                      </div>
                    ) : (
                      /* VIEW MODE */
                      <div>
                        {deletingId === review._id && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-3">
                            <p className="text-sm mb-3">Supprimer cet avis ?</p>
                            <div className="flex gap-2">
                              <button onClick={() => confirmDelete(review._id)} className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold text-white">Supprimer</button>
                              <button onClick={() => setDeletingId(null)} className="rounded-full border border-input px-4 py-1.5 text-xs font-bold">Annuler</button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-semibold text-sm">
                              {review.user.firstName[0]}{review.user.lastName[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-semibold">
                                {review.user.firstName} {review.user.lastName}
                              </span>
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString('fr-FR')}</span>
                              {user && (user as any)._id === (review.user as any)._id && (
                                <div className="flex gap-1 ml-auto">
                                  <button onClick={() => { setEditingReview(review._id); setEditData({ rating: review.rating, title: review.title, comment: review.comment }); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>
                                  <button onClick={() => handleDeleteReview(review._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <h3 className="font-semibold mb-1">{review.title}</h3>
                            <p className="text-muted-foreground text-sm mb-3 break-words">{review.comment}</p>
                            {review.reply && (
                              <div className="bg-primary/10 rounded-lg p-3 mt-3">
                                <p className="text-xs font-semibold text-primary mb-1">
                                  Réponse de {review.reply.repliedBy.firstName} {review.reply.repliedBy.lastName}
                                </p>
                                <p className="text-sm">{review.reply.text}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="surface-panel p-8 text-center">
                <p className="text-muted-foreground">Aucun avis pour le moment. Sois le premier à donner ton avis !</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
