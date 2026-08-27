import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState, useEffect } from "react";
import { SiteNav } from "@/components/moment/SiteNav";
import { Dice, DiceRollOverlay } from "@/components/moment/DiceRoll";
import { KkiapayWidget } from "@/components/KkiapayWidget";
import { TRANSPORTS, VIBES, formatFcfa } from "@/lib/moment-engine";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

export const Route = createFileRoute("/moment/create")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Créer un moment — MOMENT" },
      {
        name: "description",
        content:
          "Où, avec combien de personnes, quel budget, quelle vibe : renseigne ton contexte puis lance le dé pour composer ta sortie.",
      },
      { property: "og:title", content: "Créer un moment — MOMENT" },
      {
        property: "og:description",
        content: "Renseigne ton contexte et lance le dé : MOMENT compose ta soirée.",
      },
    ],
  }),
  component: CreateMoment,
});

const CITIES = ["Cotonou", "Porto-Novo", "Ouidah", "Grand-Popo", "Abomey", "Parakou", "Ganvié", "Abomey-Calavi"];
const WHENS = ["Ce soir", "Demain", "Ce week-end", "Prochain week-end", "Date précise"];
const TIMES = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
const BUDGETS = [3000, 5000, 7500, 10000, 15000, 20000, 25000, 30000];

const STEPS = ["Où", "Personnes", "Budget", "Quand", "Vibe", "Transport", "Résumé"];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const handleClick = () => {
    console.log("Chip clicked:", children);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-full border px-5 py-3 text-sm transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground font-semibold"
          : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function CreateMoment() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState("Cotonou");
  const [people, setPeople] = useState(4);
  const [budget, setBudget] = useState(10000);
  const [when, setWhen] = useState("Ce soir");
  const [startTime, setStartTime] = useState("19:00");
  const [vibes, setVibes] = useState<string[]>([]);
  const [transport, setTransport] = useState("peu_importe");
  const [rolling, setRolling] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState("");

  // Redirect admin and partners away from moment creation
  useEffect(() => {
    if (isAdmin || user?.role?.includes('partner')) {
      navigate({ to: isAdmin ? '/admin' : '/partner' });
    }
  }, [isAdmin, user, navigate]);

  console.log("CreateMoment render - step:", step, "city:", city, "people:", people);

  const toggleVibe = (id: string) => {
    console.log("toggleVibe:", id);
    setVibes((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  };

  const onSettled = useCallback(
    async (roll: number) => {
      try {
        const response = await api.moments.generate({
          city,
          people,
          budget,
          when,
          start: startTime,
          vibes: vibes.join(","),
          transport,
          roll,
          date: new Date().toISOString().split('T')[0],
        });

        if (response.success && response.moment) {
          navigate({
            to: "/moment/$id",
            params: { id: response.moment.id },
          });
        }
      } catch (error) {
        console.error('Failed to generate moment:', error);
      }
    },
    [navigate, city, people, budget, when, startTime, vibes, transport],
  );

  return (
    <div className="grain min-h-screen">
      <SiteNav />
      <DiceRollOverlay open={rolling} onSettled={onSettled} />

      <div className="relative mx-auto max-w-3xl px-5 py-14">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />

        <div className="relative">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-secondary"
                }`}
              />
            ))}
          </div>
          <p className="label-mono mt-4">
            Étape {String(step + 1).padStart(2, "0")} / 07 · {STEPS[step]}
          </p>

          <div key={step} className="animate-rise mt-8 min-h-[320px]">
            {step === 0 && (
              <>
                <h1 className="text-display text-5xl uppercase">Où ?</h1>
                <p className="mt-4 text-muted-foreground">Choisis ta ville pour composer ta soirée</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {CITIES.map((c) => (
                    <Chip key={c} active={city === c} onClick={() => {
                      console.log("City selected:", c);
                      setCity(c);
                    }}>
                      {c}
                    </Chip>
                  ))}
                </div>
                <div className="mt-6 surface-panel p-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Ville sélectionnée :</span> {city}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {city === "Cotonou" && "Hub urbain avec 21 lieux : rooftops, plages, nightlife"}
                    {city === "Porto-Novo" && "Capitale avec 10 lieux : patrimoine afro-brésilien, culture"}
                    {city === "Ouidah" && "Route des Esclaves avec 5 lieux : culture vodoun, plages"}
                    {city === "Grand-Popo" && "Écotourisme avec 6 lieux : plages, fleuve Mono, nature"}
                    {city === "Abomey" && "Histoire avec 6 lieux : palais royaux, UNESCO"}
                    {city === "Parakou" && "Nord avec 9 lieux : culture du Borgou, marché Arzèkè"}
                    {city === "Ganvié" && "Village lacustre unique"}
                    {city === "Abomey-Calavi" && "Banlieue de Cotonou"}
                  </p>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-display text-5xl uppercase">Avec combien de personnes ?</h1>
                <p className="mt-4 text-muted-foreground">Le nombre de personnes influence le choix des lieux</p>
                <div className="mt-10 flex items-center gap-8">
                  <button
                    type="button"
                    onClick={() => {
                      console.log("Decrease people");
                      setPeople((p) => Math.max(1, p - 1));
                    }}
                    className="size-14 rounded-full border border-border text-2xl transition-colors hover:border-primary"
                  >
                    −
                  </button>
                  <span className="text-display text-7xl text-primary">{people}</span>
                  <button
                    type="button"
                    onClick={() => {
                      console.log("Increase people");
                      setPeople((p) => Math.min(20, p + 1));
                    }}
                    className="size-14 rounded-full border border-border text-2xl transition-colors hover:border-primary"
                  >
                    +
                  </button>
                </div>
                <div className="mt-6 surface-panel p-4">
                  <p className="text-xs text-muted-foreground">
                    {people === 1 && "Solo : lieux adaptés aux personnes seules"}
                    {people === 2 && "Couple : lieux romantiques et intimes"}
                    {people >= 3 && people <= 4 && "Petit groupe : lieux conviviaux et animés"}
                    {people >= 5 && people <= 8 && "Groupe moyen : lieux avec capacité suffisante"}
                    {people > 8 && "Grand groupe : réservation recommandée"}
                  </p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-display text-5xl uppercase">
                  Combien chacun veut dépenser ?
                </h1>
                <p className="mt-4 text-muted-foreground">Le budget influence le type de lieux proposés</p>
                <p className="mt-4 text-3xl text-primary">{formatFcfa(budget)}</p>
                <input
                  type="range"
                  min={2000}
                  max={50000}
                  step={500}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="mt-8 w-full accent-primary"
                  aria-label="Budget par personne"
                />
                <div className="mt-6 flex flex-wrap gap-3">
                  {BUDGETS.map((b) => (
                    <Chip key={b} active={budget === b} onClick={() => setBudget(b)}>
                      {formatFcfa(b)}
                    </Chip>
                  ))}
                </div>
                <div className="mt-6 surface-panel p-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Budget total :</span> {formatFcfa(budget * people)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {budget <= 5000 && "Budget économique : street food, lieux accessibles"}
                    {budget > 5000 && budget <= 10000 && "Budget modéré : restaurants moyens, bars"}
                    {budget > 10000 && budget <= 20000 && "Budget confortable : restaurants, rooftops"}
                    {budget > 20000 && "Budget premium : établissements haut de gamme"}
                  </p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h1 className="text-display text-5xl uppercase">Quand ?</h1>
                <p className="mt-4 text-muted-foreground">Le moment de la sortie influence les lieux disponibles</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {WHENS.map((w) => (
                    <Chip key={w} active={when === w} onClick={() => setWhen(w)}>
                      {w}
                    </Chip>
                  ))}
                </div>
                <p className="label-mono mt-10">Heure de départ</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {TIMES.map((t) => (
                    <Chip key={t} active={startTime === t} onClick={() => setStartTime(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
                <div className="mt-6 surface-panel p-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Sélection :</span> {when} à {startTime}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {when === "Ce soir" && "Soirée : lieux nocturnes, bars, rooftops"}
                    {when === "Demain" && "Demain : tous les lieux disponibles"}
                    {(when === "Ce week-end" || when === "Prochain week-end") && "Week-end : événements spéciaux, activités de jour"}
                    {when === "Date précise" && "Date précise : planification personnalisée"}
                  </p>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h1 className="text-display text-5xl uppercase">Quelle vibe ?</h1>
                <p className="mt-4 text-muted-foreground">L'ambiance influence le type de lieux proposés</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {VIBES.map((v) => (
                    <Chip key={v.id} active={vibes.includes(v.id)} onClick={() => toggleVibe(v.id)}>
                      {v.emoji} {v.label}
                    </Chip>
                  ))}
                </div>
                <div className="mt-6 surface-panel p-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Vibes sélectionnées :</span> {vibes.length ? vibes.join(", ") : "surprise"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {vibes.includes("festif") && "Festif : bars, rooftops, concerts"}
                    {vibes.includes("chill") && "Chill : plages, cafés, espaces calmes"}
                    {vibes.includes("culture") && "Culture : musées, sites historiques"}
                    {vibes.includes("food") && "Food : restaurants, street food"}
                    {vibes.includes("nature") && "Nature : plages, espaces verts"}
                  </p>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h1 className="text-display text-5xl uppercase">Comment on se déplace ?</h1>
                <p className="mt-4 text-muted-foreground">Le transport influence les distances et le temps de trajet</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {TRANSPORTS.map((t) => (
                    <Chip key={t.id} active={transport === t.id} onClick={() => setTransport(t.id)}>
                      {t.emoji} {t.label}
                    </Chip>
                  ))}
                </div>
                <div className="mt-6 surface-panel p-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Transport :</span> {TRANSPORTS.find(t => t.id === transport)?.label}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {transport === "peu_importe" && "Peu importe : optimisation globale du parcours"}
                    {transport === "moto" && "Moto : rapide et flexible, idéal pour Cotonou"}
                    {transport === "voiture" && "Voiture : confortable pour les groupes"}
                    {transport === "uber" && "Uber : service de transport privé"}
                    {transport === "transport_commun" && "Transport commun : économique"}
                  </p>
                </div>
              </>
            )}

            {step === 6 && (
              <div className="text-center">
                <h1 className="text-display text-4xl uppercase">
                  Qu'est-ce
                  <br />
                  qu'on fait
                  <br />
                  <span className="text-primary">ce soir ?</span>
                </h1>
                <div className="mt-8 space-y-1 text-sm uppercase tracking-[0.3em] text-muted-foreground">
                  <p>{city}</p>
                  <p>{people} personnes</p>
                  <p>{formatFcfa(budget * people)}</p>
                  <p>
                    {when} · {startTime}
                  </p>
                  <p>{vibes.length ? vibes.join(" · ") : "surprise"}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPayment(true)}
                  className="group mx-auto mt-12 flex flex-col items-center gap-5"
                >
                  <span className="block transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                    <Dice size={110} value={5} spinning={false} />
                  </span>
                  <span className="rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-primary-foreground">
                    Payer 200 FCFA et lancer
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                console.log("Retour clicked, current step:", step);
                setStep((s) => Math.max(0, s - 1));
              }}
              disabled={step === 0}
              className="rounded-full border border-border px-6 py-3 text-sm uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              Retour
            </button>
            {step < 6 && (
              <button
                type="button"
                onClick={() => {
                  console.log("Continuer clicked, current step:", step);
                  setStep((s) => Math.min(6, s + 1));
                }}
                className="rounded-full bg-secondary px-8 py-3 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-accent"
              >
                Continuer →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kkiapay Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="surface-panel p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Paiement</h2>
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="p-2 rounded-lg hover:bg-white/10"
              >✕</button>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Frais de service MOMENT</p>
              <p className="text-display text-3xl text-primary font-bold">200 FCFA</p>
              <p className="text-xs text-muted-foreground mt-2">Par moment créé</p>
            </div>
            <KkiapayWidget
              amount={200}
              sandbox={true}
              onSuccess={(transactionId) => {
                setShowPayment(false);
                console.log('Moment payment success:', transactionId);
                setRolling(true);
              }}
              onFailure={(err) => {
                console.error('Paiement échoué:', err);
                alert('Le paiement a échoué. Veuillez réessayer.');
                setShowPayment(false);
              }}
              onClose={() => setShowPayment(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
