import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";
const { Camera, X, Check, User, MapPin, Calendar, Mail, Phone, Trash2, Upload } = LucideIcons;
const ImageIcon = LucideIcons.Image;

export const Route = createFileRoute("/profile")({ ssr: false, component: Profile });

function Profile() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [city, setCity] = useState(user?.city || "Cotonou");
  const [phone, setPhone] = useState(user?.phone || "");
  const [success, setSuccess] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setCity(user.city || "Cotonou");
      setPhone(user.phone || "");
    }
  }, [user]);

  const compressImage = (file: File, maxWidth = 400): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const img = new window.Image();
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const base64 = await compressImage(file, 300);
      const res = await api.auth.updateMe({ avatar: base64 });
      if (res.success && (res as any).user) {
        setUser((res as any).user);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); if (avatarInputRef.current) avatarInputRef.current.value = ""; }
  };

  const handleAvatarDelete = async () => {
    if (!confirm("Supprimer votre photo de profil ?")) return;
    setSaving(true);
    try {
      const res = await api.auth.updateMe({ avatar: "" });
      if (res.success && (res as any).user) {
        setUser((res as any).user);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const base64 = await compressImage(file, 800);
      const res = await api.auth.updateMe({ coverImage: base64 });
      if (res.success && (res as any).user) {
        setUser((res as any).user);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); if (coverInputRef.current) coverInputRef.current.value = ""; }
  };

  const handleCoverDelete = async () => {
    if (!confirm("Supprimer l'image de fond ?")) return;
    setSaving(true);
    try {
      const res = await api.auth.updateMe({ coverImage: "" });
      if (res.success && (res as any).user) {
        setUser((res as any).user);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      const res = await api.auth.updateMe({ firstName: firstName.trim(), lastName: lastName.trim(), city });
      if (res.success && (res as any).user) {
        setUser((res as any).user);
        setEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (e: any) { alert(e.message || "Erreur lors de la mise à jour"); }
    finally { setSaving(false); }
  };

  const initials = `${(user?.firstName || "U")[0]}${(user?.lastName || "U")[0]}`.toUpperCase();

  return (
    <ProtectedRoute>
      <div className="grain min-h-screen">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 pb-24">

          {/* Cover image */}
          <div className="relative rounded-2xl overflow-visible h-40 sm:h-52 mb-16 bg-gradient-to-br from-primary/20 to-primary/5">
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              {(user as any)?.coverImage ? (
                <img src={(user as any).coverImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="pattern-adinkra opacity-10 absolute inset-0" />
                  <ImageIcon className="h-10 w-10 text-primary/20" />
                </div>
              )}
            </div>
            {/* Cover actions */}
            <div className="absolute top-3 right-3 flex gap-2">
              <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverUpload} className="hidden" />
              <button onClick={() => coverInputRef.current?.click()}
                className="p-2 rounded-xl bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors"
                title="Changer l'image de fond">
                <Camera className="h-4 w-4" />
              </button>
              {(user as any)?.coverImage && (
                <button onClick={handleCoverDelete}
                  className="p-2 rounded-xl bg-black/50 backdrop-blur-sm text-red-400/80 hover:text-red-400 hover:bg-black/70 transition-colors"
                  title="Supprimer l'image de fond">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Avatar */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-10">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-background overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                  {(user as any)?.avatar ? (
                    <img src={(user as any).avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-2xl">{initials}</span>
                  )}
                </div>
                {/* Avatar overlay actions */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" />
                  <button onClick={() => avatarInputRef.current?.click()}
                    className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                    title="Changer la photo">
                    <Camera className="h-4 w-4" />
                  </button>
                  {(user as any)?.avatar && (
                    <button onClick={handleAvatarDelete}
                      className="p-2 rounded-full bg-red-500/30 text-red-400 hover:bg-red-500/50 transition-colors"
                      title="Supprimer la photo">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Success toast */}
          {success && (
            <div className="fixed top-4 right-4 z-50 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2.5 rounded-xl flex items-center gap-2 animate-rise">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Profil mis à jour</span>
            </div>
          )}

          {/* Profile info */}
          <div className="surface-panel p-5 sm:p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-display text-xl sm:text-2xl uppercase">Mon Profil</h1>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                  Modifier
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(false); setFirstName(user?.firstName || ""); setLastName(user?.lastName || ""); setCity(user?.city || "Cotonou"); }}
                    className="px-3 py-2 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleSave} disabled={saving || !firstName.trim() || !lastName.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                    {saving ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <Check className="h-3.5 w-3.5" />}
                    Sauver
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {/* First name */}
              <div>
                <label className="label-mono text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <User className="h-3 w-3" /> Prénom
                </label>
                {editing ? (
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary text-sm" />
                ) : (
                  <p className="text-sm">{user?.firstName}</p>
                )}
              </div>

              {/* Last name */}
              <div>
                <label className="label-mono text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <User className="h-3 w-3" /> Nom
                </label>
                {editing ? (
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary text-sm" />
                ) : (
                  <p className="text-sm">{user?.lastName}</p>
                )}
              </div>

              {/* Email — read only */}
              <div>
                <label className="label-mono text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Mail className="h-3 w-3" /> Email
                </label>
                <p className="text-sm text-muted-foreground">{user?.email || "Non renseigné"}</p>
              </div>

              {/* Phone — read only */}
              <div>
                <label className="label-mono text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3 w-3" /> Téléphone
                </label>
                <p className="text-sm text-muted-foreground">{user?.phone || "Non renseigné"}</p>
              </div>

              {/* City */}
              <div>
                <label className="label-mono text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <MapPin className="h-3 w-3" /> Ville
                </label>
                {editing ? (
                  <select value={city} onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary text-sm">
                    <option value="Cotonou">Cotonou</option>
                    <option value="Porto-Novo">Porto-Novo</option>
                    <option value="Ouidah">Ouidah</option>
                    <option value="Grand-Popo">Grand-Popo</option>
                    <option value="Abomey">Abomey</option>
                    <option value="Parakou">Parakou</option>
                  </select>
                ) : (
                  <p className="text-sm">{user?.city || "Cotonou"}</p>
                )}
              </div>

              {/* Role — read only */}
              <div>
                <label className="label-mono text-xs text-muted-foreground mb-1.5 block">Rôle</label>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {user?.role === "admin" || user?.role === "super_admin" ? "Administrateur" : user?.role === "partner_owner" ? "Partenaire" : "Membre"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
