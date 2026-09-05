import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import mask from "@/assets/mask.jpg";
import nightCity from "@/assets/night-city.jpg";
import beach from "@/assets/beach.jpg";
import rooftop from "@/assets/rooftop.jpg";
import { Dice } from "@/components/moment/DiceRoll";
import { SiteNav } from "@/components/moment/SiteNav";
import { ReviewsSlider } from "@/components/ReviewsSlider";
import { useAuth } from "@/contexts/AuthContext";
import * as LucideIcons from "lucide-react";
const {
  Umbrella, Utensils, Gamepad2, Film, Mic, MapPin, Users, Clock, Star,
  ArrowRight, Sparkles, Zap, Shield, Heart, Check, Target, Compass,
  Calendar, Music, Coffee, Camera, Plane, ChevronDown, ChevronUp,
  CreditCard, Smartphone, HelpCircle, MessageCircle, Percent
} = LucideIcons;

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MOMENT — Lance ton moment à Cotonou" },
      {
        name: "description",
        content:
          "Dis-nous où, quand, avec qui et combien. MOMENT compose ta sortie : lieux, horaires, trajet et budget. Lance le dé.",
      },
      { property: "og:title", content: "MOMENT — Lance ton moment à Cotonou" },
      {
        property: "og:description",
        content:
          "Le moteur qui compose tes sorties : plage, food, gaming, concerts. Un dé, un parcours, une soirée.",
      },
    ],
  }),
  component: Landing,
});

const PHRASES = [
  "L'AFRIQUE N'EST PAS UN LIEU À VISITER.",
  "C'EST UN MOMENT À VIVRE.",
];

/* ── FAQ Data ── */
const FAQ_ITEMS = [
  {
    q: "Comment fonctionne MOMENT ?",
    a: "Tu nous donnes la ville, le nombre de personnes, ton budget, le créneau et l'ambiance souhaitée. MOMENT compose automatiquement un parcours optimal : lieux, ordre, horaires, distances et budget. C'est un dé qui décide de la direction de ta soirée.",
  },
  {
    q: "Combien ça coûte ?",
    a: "MOMENT est gratuit pour les utilisateurs. La seule somme à payer est de 200 FCFA par moment créé, c'est un petit frais de service qui couvre l'analyse et la composition de ton parcours.",
  },
  {
    q: "Quels sont les moyens de paiement ?",
    a: "Nous utilisons Kkiapay, une solution de paiement sécurisée au Bénin. Tu peux payer par mobile money (Moov, MTN), carte bancaire ou virement. Le paiement est instantané et sécurisé.",
  },
  {
    q: "Puis-je utiliser MOMENT gratuitement ?",
    a: "Oui ! Les nouveaux utilisateurs disposent de 20 moments gratuits sans inscription. Tu peux essayer avant de créer un compte. Ensuite, chaque moment coûte seulement 200 FCFA.",
  },
  {
    q: "Comment devenir partenaire ?",
    a: "Si tu es gérant d'un lieu à Cotonou, Porto-Novo, Ouidah ou une autre ville du Bénin, tu peux faire une demande via ton dashboard partenaire. L'admin examine ta demande, tu paies les frais, et ton lieu est ajouté à MOMENT.",
  },
  {
    q: "Quelles villes sont couvertes ?",
    a: "MOMENT couvre actuellement 6 villes au Bénin : Cotonou (21 lieux), Porto-Novo (10 lieux), Ouidah (5 lieux), Grand-Popo (6 lieux), Abomey (6 lieux) et Parakou (9 lieux). De nouvelles villes arrivent bientôt.",
  },
];

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-3xl">
        <p className="label-mono">Questions fréquentes</p>
        <h2 className="text-display mt-5 text-4xl uppercase md:text-5xl">
          Besoin d'aide ?
        </h2>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="surface-panel overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <span className="font-semibold text-base pr-4">{item.q}</span>
                {openIdx === i ? (
                  <ChevronUp className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </button>
              {openIdx === i && (
                <div className="px-5 pb-5 animate-rise">
                  <div className="h-px bg-border mb-4" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Landing() {
  const { user, isAuthenticated, isAdmin, isPartner } = useAuth();
  const navigate = useNavigate();
  const [line, setLine] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect ALL authenticated users — landing page is only for guests
  useEffect(() => {
    if (mounted && isAuthenticated) {
      if (isAdmin) {
        navigate({ to: "/admin", replace: true });
      } else if (isPartner) {
        navigate({ to: "/partner", replace: true });
      } else {
        navigate({ to: "/home", replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, isPartner, navigate, mounted]);

  // Don't render landing page during SSR or for authenticated users
  if (!mounted || isAuthenticated) {
    return null;
  }

  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % PHRASES.length), 3600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grain min-h-screen">
      <SiteNav />

      {/* ═══════════════════════════════════════════
         HERO
         ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 pb-24 pt-16 md:pt-24">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />
        <div className="ember-glow pointer-events-none absolute -top-40 left-1/2 size-[900px] -translate-x-1/2" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
          <div className="animate-rise">
            <p className="label-mono">Cotonou · Bénin</p>
            <h1 className="text-display mt-6 text-6xl uppercase md:text-8xl">
              Qu'est-ce
              <br />
              qu'on fait
              <br />
              <span className="text-primary">ce soir ?</span>
            </h1>
            <p className="mt-8 max-w-md text-lg text-muted-foreground">
              Donne-nous le lieu, le budget et les personnes. MOMENT compose le reste : les
              lieux, l'ordre, les horaires et le trajet.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/moment/create"
                className="group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-4 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground transition-transform hover:scale-[1.03]"
              >
                Créer mon moment
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-4 text-sm uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Explorer sans compte
              </Link>
            </div>

            <p className="mt-10 h-6 overflow-hidden text-xs uppercase tracking-[0.4em] text-muted-foreground">
              <span key={line} className="animate-rise block">
                {PHRASES[line]}
              </span>
            </p>
          </div>

          <div className="relative flex justify-center">
            <div className="ember-glow absolute inset-0 scale-125" />
            <img
              src={mask}
              width={1200}
              height={1200}
              alt="Masque sculpté d'Afrique de l'Ouest, identité visuelle de MOMENT"
              className="animate-float-slow relative w-[78%] max-w-md object-contain"
              style={{
                maskImage:
                  "radial-gradient(circle at 50% 48%, black 52%, transparent 72%)",
                WebkitMaskImage:
                  "radial-gradient(circle at 50% 48%, black 52%, transparent 72%)",
              }}
            />
            <div className="grain-overlay pointer-events-none absolute inset-0" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         ROLL — L'interaction du dé
         ═══════════════════════════════════════════ */}
      <section className="relative border-y border-border bg-surface/40 px-5 py-24">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 text-center">
          <p className="label-mono">Interaction signature</p>
          <h2 className="text-display text-5xl uppercase md:text-7xl">
            Ne planifie pas.
            <br />
            <span className="text-primary">Lance-le.</span>
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Le dé choisit la direction de ta soirée. Le moteur, lui, choisit uniquement dans ce
            qui est réellement ouvert, disponible et dans ton budget.
          </p>
          <div className="my-4">
            <Dice size={150} value={4} spinning={false} />
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["1", "Chill", Umbrella],
              ["2", "Food", Utensils],
              ["3", "Fun", Gamepad2],
              ["4", "Divertissement", Film],
              ["5", "Night", Mic],
              ["6", "Surprise", Sparkles],
            ].map(([n, l, Icon]) => (
              <div key={n} className="surface-panel px-4 py-5 text-left">
                <p className="text-display text-3xl text-primary">{n}</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  <span>{l}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         FEATURES — Pourquoi MOMENT
         ═══════════════════════════════════════════ */}
      <section className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="label-mono">Pourquoi MOMENT</p>
          <h2 className="text-display mt-5 max-w-2xl text-4xl uppercase md:text-6xl">
            La nuit, sans le stress
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Instantané",
                desc: "Pas de planification. Tu donnes le contexte, on te donne le parcours.",
              },
              {
                icon: Target,
                title: "Précis",
                desc: "Horaires réels, disponibilité vérifiée, budget respecté.",
              },
              {
                icon: Compass,
                title: "Local",
                desc: "57 lieux à Cotonou, Porto-Novo, Ouidah et plus.",
              },
              {
                icon: Shield,
                title: "Sécurisé",
                desc: "Lieux vérifiés, avis authentiques, support 24/7.",
              },
            ].map((feature, i) => (
              <div key={i} className="surface-panel p-6 hover-lift">
                <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         CITIES — Nos villes
         ═══════════════════════════════════════════ */}
      <section className="relative border-y border-border bg-surface/40 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="label-mono">Nos villes</p>
          <h2 className="text-display mt-5 max-w-2xl text-4xl uppercase md:text-6xl">
            Explore le Bénin
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { city: "Cotonou", count: 21, desc: "Hub urbain, littoral, nightlife" },
              { city: "Porto-Novo", count: 10, desc: "Capitale, patrimoine afro-brésilien" },
              { city: "Ouidah", count: 5, desc: "Route des Esclaves, culture vodoun" },
              { city: "Grand-Popo", count: 6, desc: "Plages, écotourisme, fleuve Mono" },
              { city: "Abomey", count: 6, desc: "Palais royaux, UNESCO, histoire" },
              { city: "Parakou", count: 9, desc: "Culture du Borgou, marché Arzèkè" },
            ].map((city) => (
              <Link
                key={city.city}
                to="/explore"
                className="surface-panel p-6 hover-lift group cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">{city.city}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{city.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 text-primary">
                    <MapPin className="h-5 w-5" />
                    <span className="text-lg font-bold">{city.count}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         HOW IT WORKS
         ═══════════════════════════════════════════ */}
      <section className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="label-mono">Comment ça marche</p>
          <h2 className="text-display mt-5 max-w-2xl text-4xl uppercase md:text-6xl">
            Tu ne cherches pas un restaurant. Tu cherches une soirée.
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Tu donnes le contexte",
                d: "Ville, personnes, budget par tête, créneau, vibe et moyen de transport.",
                img: nightCity,
              },
              {
                n: "02",
                t: "Tu lances le dé",
                d: "Le dé décide de la direction. Le moteur filtre les possibilités réelles.",
                img: undefined,
              },
              {
                n: "03",
                t: "Tu suis le parcours",
                d: "Séquence optimisée, horaires, distances, budget et carte animée.",
                img: beach,
              },
            ].map((c) => (
              <article
                key={c.n}
                className="hover-lift surface-panel overflow-hidden"
              >
                {c.img ? (
                  <img
                    src={c.img}
                    loading="lazy"
                    width={1200}
                    height={800}
                    alt={c.t}
                    className="h-48 w-full object-cover opacity-80"
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-primary/10">
                    <Dice size={100} value={1} spinning={false} />
                  </div>
                )}
                <div className="p-6">
                  <p className="label-mono">{c.n}</p>
                  <h3 className="mt-3 text-2xl">{c.t}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{c.d}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         EXPERIENCES
         ═══════════════════════════════════════════ */}
      <section className="relative border-y border-border bg-surface/40 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="label-mono">Expériences</p>
          <h2 className="text-display mt-5 max-w-2xl text-4xl uppercase md:text-6xl">
            Des moments uniques
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Music, title: "Concerts Live", desc: "Africa Sound City, Hall des Arts, espaces culturels" },
              { icon: Coffee, title: "Rooftops", desc: "The Garden, Sky Lounge, Hi Five, vues nocturnes" },
              { icon: Camera, title: "Culture", desc: "Musées, sites historiques, patrimoine UNESCO" },
              { icon: Plane, title: "Écotourisme", desc: "Grand-Popo, mangroves, fleuve Mono, nature" },
              { icon: Calendar, title: "Événements", desc: "Vodun Days, festivals, programmation culturelle" },
              { icon: Heart, title: "Gastronomie", desc: "Restaurants locaux, cuisine béninoise, street food" },
            ].map((exp, i) => (
              <div key={i} className="surface-panel p-6 hover-lift">
                <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10">
                  <exp.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{exp.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{exp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         TESTIMONIALS
         ═══════════════════════════════════════════ */}
      <section className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="label-mono">Témoignages</p>
          <h2 className="text-display mt-5 max-w-2xl text-4xl uppercase md:text-6xl">
            Ce qu'ils en disent
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Marc K.",
                role: "Cotonou",
                text: "Fini les heures à chercher où sortir. MOMENT m'a trouvé un rooftop parfait pour mon anniversaire.",
              },
              {
                name: "Sarah A.",
                role: "Porto-Novo",
                text: "J'ai découvert des endroits incroyables dans ma ville que je ne connaissais même pas.",
              },
              {
                name: "Jean-Paul M.",
                role: "Ouidah",
                text: "Le dé a choisi la plage, et c'était exactement ce qu'il me fallait pour me détendre.",
              },
            ].map((testimonial, i) => (
              <div key={i} className="surface-panel p-6 hover-lift">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-4 w-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-sm mb-4">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS SLIDER */}
      <ReviewsSlider />

      {/* ═══════════════════════════════════════════
         FAQ
         ═══════════════════════════════════════════ */}
      <FAQSection />

      {/* ═══════════════════════════════════════════
         CTA
         ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 pb-28">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border">
          <img
            src={rooftop}
            loading="lazy"
            width={1200}
            height={800}
            alt="Rooftop de Cotonou la nuit"
            className="h-[420px] w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/50 px-6 text-center">
            <h2 className="text-display text-4xl uppercase md:text-6xl">
              Lance ton moment
            </h2>
            <p className="max-w-md text-muted-foreground">
              4 personnes, 40 000 FCFA, ce soir. On s'occupe du reste.
            </p>
            <Link
              to="/moment/create"
              className="inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
            >
              <Sparkles className="h-5 w-5" />
              Lance ton moment
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         STATS
         ═══════════════════════════════════════════ */}
      <section className="border-y border-border bg-surface/40 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4 text-center">
            <div>
              <p className="text-display text-5xl text-primary">57</p>
              <p className="mt-2 text-sm text-muted-foreground">Lieux vérifiés</p>
            </div>
            <div>
              <p className="text-display text-5xl text-primary">6</p>
              <p className="mt-2 text-sm text-muted-foreground">Villes couvertes</p>
            </div>
            <div>
              <p className="text-display text-5xl text-primary">24/7</p>
              <p className="mt-2 text-sm text-muted-foreground">Support disponible</p>
            </div>
            <div>
              <p className="text-display text-5xl text-primary">100%</p>
              <p className="mt-2 text-sm text-muted-foreground">Gratuit pour les utilisateurs</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <span className="flex items-center gap-2"><img src="/logo.png" alt="Moment" className="h-25 w-25 object-contain" /> MOMENT · Cotonou</span>
          <span>Application de démonstration · Données de test</span>
        </div>
      </footer>
    </div>
  );
}
