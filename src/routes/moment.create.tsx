import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState, useEffect } from "react";
import { Dice, DiceRollOverlay } from "@/components/moment/DiceRoll";
import { KkiapayWidget } from "@/components/KkiapayWidget";
import { TRANSPORTS, VIBES, formatFcfa } from "@/lib/moment-engine";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import * as LucideIcons from "lucide-react";
const { CalendarDays, Clock, ChevronLeft, ChevronRight, Flame, Palmtree, Gamepad2, UtensilsCrossed, Clapperboard, Heart, Music, Palette, Car, Bike, Footprints, Shuffle, Sparkles, Moon, Sun, PartyPopper, CalendarClock, Dice5 } = LucideIcons as any;

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
        content:
          "Renseigne ton contexte et lance le dé : MOMENT compose ta soirée.",
      },
    ],
  }),
  component: CreateMoment,
});

const CITIES = [
  "Cotonou",
  "Porto-Novo",
  "Ouidah",
  "Grand-Popo",
  "Abomey",
  "Parakou",
  "Ganvié",
  "Abomey-Calavi",
];

const QUICK_WHENS = [
  { id: "ce_soir", label: "Ce soir", Icon: Moon },
  { id: "demain", label: "Demain", Icon: Sun },
  { id: "ce_weekend", label: "Ce week-end", Icon: PartyPopper },
  { id: "prochain_weekend", label: "Prochain week-end", Icon: CalendarClock },
  { id: "date_precise", label: "Date précise", Icon: CalendarDays },
];

const TIMES = [
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30",
  "22:00", "22:30", "23:00",
];

const BUDGETS = [3000, 5000, 7500, 10000, 15000, 20000, 25000, 30000];

const STEPS = ["Où", "Personnes", "Budget", "Quand", "Vibe", "Transport", "Résumé", "Paiement"];

/* ── Reusable chip ── */
function Chip({
  active,
  children,
  onClick,
  icon,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-5 py-3 text-sm transition-all flex items-center gap-2 ${
        active
          ? "border-primary bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20"
          : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground hover:bg-primary/5"
      }`}
    >
      {icon && <span className="text-base">{icon}</span>}
      {children}
    </button>
  );
}

/* ── Mini calendar for custom date ── */
function MiniCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (d: string) => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Build calendar grid
  const cells: (number | null)[] = [];
  // Fill leading blanks (Mon-based: shift by (firstDay + 6) % 7)
  const startOffset = (firstDay + 6) % 7; // Monday = 0
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="surface-panel p-4 w-full max-w-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-semibold text-sm">
          {monthNames[month]} {year}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((d) => (
          <div key={d} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast = dateStr < todayStr;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={day}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(dateStr)}
              className={`
                w-full aspect-square rounded-lg text-sm flex items-center justify-center transition-all
                ${isPast ? "text-muted-foreground/30 cursor-not-allowed" : "cursor-pointer hover:bg-primary/10"}
                ${isSelected ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20" : ""}
                ${isToday && !isSelected ? "border border-primary/40 text-primary font-semibold" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main create moment component ── */
function CreateMoment() {
  const { isAdmin, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState("Cotonou");
  const [people, setPeople] = useState(4);
  const [budget, setBudget] = useState(10000);
  const [when, setWhen] = useState("ce_soir");
  const [customDate, setCustomDate] = useState("");
  const [startTime, setStartTime] = useState("19:00");
  const [vibes, setVibes] = useState<string[]>([]);
  const [transport, setTransport] = useState("peu_importe");
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState("");
  const [guestLimit, setGuestLimit] = useState<{
    allowed: boolean;
    remaining: number;
    count: number;
  } | null>(null);
  const [fingerprint, setFingerprint] = useState("");

  // Redirect admin and partners
  useEffect(() => {
    if (isAdmin || user?.role?.includes("partner")) {
      navigate({ to: isAdmin ? "/admin" : "/partner" });
    }
  }, [isAdmin, user, navigate]);

  // Check guest limit
  useEffect(() => {
    if (!isAuthenticated) {
      import("@/lib/fingerprint").then(({ getDeviceFingerprint }) => {
        getDeviceFingerprint().then((fp) => {
          setFingerprint(fp);
          api.guest.check(fp).then((res: any) => {
            setGuestLimit({
              allowed: res.allowed,
              remaining: res.remaining,
              count: res.count,
            });
          });
        });
      });
    }
  }, [isAuthenticated]);

  const toggleVibe = (id: string) => {
    setVibes((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
    );
  };

  // Compute the display date for step 6
  const getDisplayDate = () => {
    if (when === "date_precise" && customDate) {
      const d = new Date(customDate + "T12:00:00");
      return d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    const map: Record<string, string> = {
      ce_soir: "Ce soir",
      demain: "Demain",
      ce_weekend: "Ce week-end",
      prochain_weekend: "Prochain week-end",
      date_precise: customDate || "Date précise",
    };
    return map[when] || "Ce soir";
  };

  const onSettled = useCallback(
    async (roll: number) => {
      try {
        const response = await api.moments.generate({
          city,
          people,
          budget,
          when: getDisplayDate(),
          start: startTime,
          vibes: vibes.join(","),
          transport,
          roll,
          date: new Date().toISOString().split("T")[0],
        });

        if (response.success && response.moment) {
          navigate({
            to: "/moment/$id",
            params: { id: response.moment.id },
          });
        }
      } catch (error) {
        console.error("Failed to generate moment:", error);
      }
    },
    [navigate, city, people, budget, when, startTime, vibes, transport],
  );

  return (
    <div className="grain min-h-screen">
      <DiceRollOverlay open={rolling} onSettled={onSettled} />

      <div className="relative mx-auto max-w-3xl px-5 py-14">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />

        <div className="relative">
          {/* ── Progress bar ── */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i <= step
                    ? "bg-primary shadow-lg shadow-primary/30"
                    : "bg-secondary"
                }`}
              />
            ))}
          </div>
          <p className="label-mono mt-4">
            Étape {String(step + 1).padStart(2, "0")} / 08 · {STEPS[step]}
          </p>

          {/* ── Step content ── */}
          <div key={step} className="animate-rise mt-8 min-h-[320px]">
            {/* Step 0: City */}
            {step === 0 && (
              <>
                <h1 className="text-display text-5xl uppercase">Où ?</h1>
                <p className="mt-4 text-muted-foreground">
                  Choisis ta ville pour composer ta soirée
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {CITIES.map((c) => (
                    <Chip key={c} active={city === c} onClick={() => setCity(c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
                <div className="mt-6 surface-panel p-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Ville sélectionnée :
                    </span>{" "}
                    {city}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {city === "Cotonou" &&
                      "Hub urbain avec 21 lieux : rooftops, plages, vie nocturne"}
                    {city === "Porto-Novo" &&
                      "Capitale avec 10 lieux : patrimoine afro-brésilien, culture"}
                    {city === "Ouidah" &&
                      "Route des Esclaves avec 5 lieux : culture vodoun, plages"}
                    {city === "Grand-Popo" &&
                      "Écotourisme avec 6 lieux : plages, fleuve Mono, nature"}
                    {city === "Abomey" &&
                      "Histoire avec 6 lieux : palais royaux, UNESCO"}
                    {city === "Parakou" &&
                      "Nord avec 9 lieux : culture du Borgou, marché Arzèkè"}
                    {city === "Ganvié" && "Village lacustre unique"}
                    {city === "Abomey-Calavi" && "Banlieue de Cotonou"}
                  </p>
                </div>
              </>
            )}

            {/* Step 1: People */}
            {step === 1 && (
              <>
                <h1 className="text-display text-5xl uppercase">
                  Avec combien de personnes ?
                </h1>
                <p className="mt-4 text-muted-foreground">
                  Le nombre de personnes influence le choix des lieux
                </p>
                <div className="mt-10 flex items-center justify-center gap-10">
                  <button
                    type="button"
                    onClick={() => setPeople((p) => Math.max(1, p - 1))}
                    className="size-16 rounded-full border-2 border-border text-3xl transition-all hover:border-primary hover:bg-primary/10 active:scale-95"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <span className="text-display text-8xl text-primary">
                      {people}
                    </span>
                    <p className="text-sm text-muted-foreground mt-2">
                      {people === 1 && "Solo"}
                      {people === 2 && "Couple"}
                      {people >= 3 && people <= 4 && "Petit groupe"}
                      {people >= 5 && people <= 8 && "Groupe moyen"}
                      {people > 8 && "Grand groupe"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPeople((p) => Math.min(20, p + 1))}
                    className="size-16 rounded-full border-2 border-border text-3xl transition-all hover:border-primary hover:bg-primary/10 active:scale-95"
                  >
                    +
                  </button>
                </div>
                <div className="mt-8 flex justify-center gap-3">
                  {[1, 2, 3, 4, 6, 8, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPeople(n)}
                      className={`w-12 h-12 rounded-full text-sm font-semibold transition-all ${
                        people === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-primary/10"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Budget */}
            {step === 2 && (
              <>
                <h1 className="text-display text-5xl uppercase">
                  Combien chacun veut dépenser ?
                </h1>
                <p className="mt-4 text-muted-foreground">
                  Le budget influence le type de lieux proposés
                </p>
                <div className="mt-8 text-center">
                  <p className="text-display text-5xl text-primary">
                    {formatFcfa(budget)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    par personne
                  </p>
                </div>
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
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  {BUDGETS.map((b) => (
                    <Chip key={b} active={budget === b} onClick={() => setBudget(b)}>
                      {formatFcfa(b)}
                    </Chip>
                  ))}
                </div>
                <div className="mt-6 surface-panel p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Budget total :
                    </span>{" "}
                    {formatFcfa(budget * people)}
                  </p>
                </div>
              </>
            )}

            {/* Step 3: When — with mini calendar */}
            {step === 3 && (
              <>
                <h1 className="text-display text-5xl uppercase">Quand ?</h1>
                <p className="mt-4 text-muted-foreground">
                  Le moment de la sortie influence les lieux disponibles
                </p>

                {/* Quick when chips */}
                <div className="mt-8 flex flex-wrap gap-3">
                  {QUICK_WHENS.map((w) => (
                    <Chip
                      key={w.id}
                      active={when === w.id}
                      onClick={() => setWhen(w.id)}
                      icon={<w.Icon className="h-4 w-4" />}
                    >
                      {w.label}
                    </Chip>
                  ))}
                </div>

                {/* Mini calendar (always visible, highlighted when "Date précise") */}
                <div className="mt-6 flex flex-col md:flex-row gap-6 items-start">
                  <div className={`${when !== "date_precise" ? "opacity-50" : ""} transition-opacity`}>
                    <MiniCalendar
                      selectedDate={customDate}
                      onSelect={(d) => {
                        setCustomDate(d);
                        setWhen("date_precise");
                      }}
                    />
                  </div>

                  <div className="flex-1 w-full">
                    <p className="label-mono mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Heure de départ
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {TIMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setStartTime(t)}
                          className={`rounded-lg border px-3 py-2.5 text-sm font-mono transition-all ${
                            startTime === t
                              ? "border-primary bg-primary text-primary-foreground font-semibold"
                              : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 surface-panel p-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Sélection :
                    </span>{" "}
                    {getDisplayDate()} à {startTime}
                  </p>
                </div>
              </>
            )}

            {/* Step 4: Vibes */}
            {step === 4 && (
              <>
                <h1 className="text-display text-5xl uppercase">Quelle vibe ?</h1>
                <p className="mt-4 text-muted-foreground">
                  L'ambiance influence le type de lieux proposés
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {VIBES.map((v) => (
                    <Chip
                      key={v.id}
                      active={vibes.includes(v.id)}
                      onClick={() => toggleVibe(v.id)}
                      icon={<span className="text-base">{(() => { const I = (LucideIcons as any)[v.icon]; return I ? <I className="h-4 w-4" /> : null; })()}</span>}
                    >
                      {v.label}
                    </Chip>
                  ))}
                </div>
                <div className="mt-6 surface-panel p-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Vibes sélectionnées :
                    </span>{" "}
                    {vibes.length ? vibes.join(", ") : "surprise"}
                  </p>
                </div>
              </>
            )}

            {/* Step 5: Transport */}
            {step === 5 && (
              <>
                <h1 className="text-display text-5xl uppercase">
                  Comment on se déplace ?
                </h1>
                <p className="mt-4 text-muted-foreground">
                  Le transport influence les distances et le temps de trajet
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {TRANSPORTS.map((t) => (
                    <Chip
                      key={t.id}
                      active={transport === t.id}
                      onClick={() => setTransport(t.id)}
                      icon={<span className="text-base">{(() => { const I = (LucideIcons as any)[t.icon]; return I ? <I className="h-4 w-4" /> : null; })()}</span>}
                    >
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            {/* Step 6: Summary */}
            {step === 6 && (
              <div className="text-center flex flex-col items-center py-4">
                <h1 className="text-display text-3xl md:text-5xl uppercase leading-tight">
                  Qu'est-ce<br />qu'on fait<br />
                  <span className="text-primary">ce soir ?</span>
                </h1>

                <div className="mt-6 space-y-1.5 text-sm uppercase tracking-[0.25em] text-muted-foreground">
                  <p>{city}</p>
                  <p>{people} personnes</p>
                  <p>{formatFcfa(budget * people)}</p>
                  <p>{getDisplayDate()} · {startTime}</p>
                  <p>{vibes.length ? vibes.join(" · ") : "surprise"}</p>
                </div>

                {/* Guest limit reached */}
                {!isAuthenticated && guestLimit && !guestLimit.allowed ? (
                  <div className="mt-12 space-y-6">
                    <div className="surface-panel p-6 max-w-sm mx-auto">
                      <p className="text-2xl font-bold text-primary mb-2">
                        0 moment restant
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vous avez utilisé vos 20 moments gratuits.
                        Connectez-vous pour continuer à créer des moments !
                      </p>
                    </div>
                    <button
                      onClick={() => navigate({ to: "/auth/register" })}
                      className="rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-primary-foreground hover:scale-105 transition-transform"
                    >
                      Créer un compte gratuit
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 surface-panel p-6 max-w-md mx-auto">
                    <p className="text-sm text-muted-foreground mb-2">Frais de service MOMENT</p>
                    <p className="text-display text-3xl text-primary font-bold">{formatFcfa(200)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Par moment créé</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 7: Payment */}
            {step === 7 && (
              <div className="text-center flex flex-col items-center py-4">
                <h1 className="text-display text-2xl md:text-3xl uppercase">
                  Paiement
                </h1>
                <p className="mt-3 text-muted-foreground text-sm">
                  {isAuthenticated
                    ? "Payer les frais de service pour continuer"
                    : "Lancez le dé gratuitement en tant qu'invité"}
                </p>

                {!isAuthenticated && guestLimit && !guestLimit.allowed ? (
                  <div className="mt-10 space-y-6">
                    <div className="surface-panel p-6 max-w-sm mx-auto">
                      <p className="text-2xl font-bold text-primary mb-2">0 moment restant</p>
                      <p className="text-sm text-muted-foreground">
                        Connectez-vous pour continuer à créer des moments !
                      </p>
                    </div>
                    <button
                      onClick={() => navigate({ to: "/auth/register" })}
                      className="rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-primary-foreground hover:scale-105 transition-transform"
                    >
                      Créer un compte gratuit
                    </button>
                  </div>
                ) : !isAuthenticated ? (
                  /* Guest: skip payment, go directly to dice */
                  <button
                    type="button"
                    onClick={() => setStep(8)}
                    className="mx-auto mt-10 surface-panel p-6 max-w-sm rounded-2xl"
                  >
                    <p className="text-sm text-muted-foreground mb-2">Moment invité gratuit</p>
                    <p className="text-display text-3xl text-primary font-bold">0 FCFA</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {guestLimit?.remaining || 20} moment(s) restant(s)
                    </p>
                    <p className="mt-4 text-sm font-semibold text-primary uppercase tracking-widest">
                      Passer au lancer →
                    </p>
                  </button>
                ) : (
                  /* Authenticated: show Kkiapay widget inline */
                  <div className="mt-8 w-full max-w-sm mx-auto surface-panel p-6 rounded-2xl">
                    <div className="text-center mb-4">
                      <p className="text-sm text-muted-foreground">Frais de service MOMENT</p>
                      <p className="text-display text-4xl text-primary font-bold mt-2">200 FCFA</p>
                      <p className="text-xs text-muted-foreground mt-1">Par moment créé</p>
                    </div>
                    <KkiapayWidget
                        amount={200}
                        sandbox={true}
                        onSuccess={(transactionId) => {
                          console.log("Moment payment success:", transactionId);
                          setRolling(false);
                          setStep(8);
                        }}
                        onFailure={(err) => {
                          console.error("Paiement échoué:", err);
                          alert("Le paiement a échoué. Veuillez réessayer.");
                        }}
                        onClose={() => {}}
                      />
                  </div>
                )}
              </div>
            )}

            {/* Step 8: Lancer le dé */}
            {step === 8 && (
              <div className="text-center flex flex-col items-center py-4">
                <h1 className="text-display text-2xl md:text-3xl uppercase">
                  Lancez le dé !
                </h1>
                <p className="mt-3 text-muted-foreground text-sm">
                  Le dé va déterminer la direction de votre soirée
                </p>

                {!isAuthenticated && guestLimit && !guestLimit.allowed ? (
                  <div className="mt-10 space-y-6">
                    <div className="surface-panel p-6 max-w-sm mx-auto">
                      <p className="text-2xl font-bold text-primary mb-2">0 moment restant</p>
                      <p className="text-sm text-muted-foreground">
                        Connectez-vous pour continuer à créer des moments !
                      </p>
                    </div>
                    <button
                      onClick={() => navigate({ to: "/auth/register" })}
                      className="rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-primary-foreground hover:scale-105 transition-transform"
                    >
                      Créer un compte gratuit
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRolling(true)}
                    className="group mx-auto mt-10 flex flex-col items-center gap-4"
                  >
                    <Dice size={80} value={5} spinning={rolling} />
                    <span className="rounded-full bg-primary px-8 py-3 text-sm font-bold uppercase tracking-[0.25em] text-primary-foreground shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
                      {isAuthenticated
                        ? "Lancer le dé"
                        : `Lancer (${guestLimit?.remaining || 20} restants)`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Navigation buttons ── */}
          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-full border border-border px-6 py-3 text-sm uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              Retour
            </button>
            {step <= 6 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(7, s + 1))}
                className="rounded-full bg-secondary px-8 py-3 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-accent"
              >
                Continuer →
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
