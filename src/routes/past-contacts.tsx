import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const { ArrowLeft, MessageCircle, Users, Search } = LucideIcons;

export const Route = createFileRoute("/past-contacts")({ ssr: false, component: PastContactsPage });

type PastContact = {
  user: { _id: string; firstName: string; lastName: string; role: string; avatar?: string };
  lastMessage: { content: string; createdAt: string; sender: string; attachments?: any[] } | null;
  messageCount: number;
  conversationId: string;
};

function PastContactsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<PastContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadPastContacts();
  }, []);

  const loadPastContacts = async () => {
    try {
      setLoading(true);
      const res = await api.chat.getPastContacts();
      if (res.success) {
        setContacts((res as any).contacts || []);
      }
    } catch (e) {
      console.error("Error loading past contacts:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (contact: PastContact) => {
    navigate({
      to: "/chat",
      search: { conv: contact.conversationId },
    });
  };

  const filtered = contacts.filter((c) =>
    `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastMessage = (msg: PastContact["lastMessage"]) => {
    if (!msg) return "Aucun message";
    if (msg.attachments && msg.attachments.length > 0) {
      const att = msg.attachments[0]!;
      if (att.type === "image") return "📷 Photo";
      if (att.type === "video") return "🎥 Vidéo";
      if (att.type === "voice") return "🎤 Message vocal";
      if (att.type === "document") return `📄 ${att.name || "Document"}`;
    }
    return msg.content || "Aucun message";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("fr-FR", { weekday: "long" });
    } else {
      return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    }
  };

  return (
    <ProtectedRoute>
      <div className="grain flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 pt-14 pb-24 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate({ to: "/chat" })}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Contacts historiques</h1>
              <p className="text-[11px] text-muted-foreground">
                Tous les utilisateurs avec qui vous avez interagi
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:border-primary text-sm"
            />
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{contacts.length} contact{contacts.length !== 1 ? "s" : ""} au total</span>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="font-medium text-sm">
                {searchQuery ? "Aucun résultat" : "Aucun contact historique"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery
                  ? "Essayez avec d'autres termes"
                  : "Les contacts apparaîtront ici après vos premières conversations"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((contact) => (
                <button
                  key={contact.user._id}
                  onClick={() => handleOpenChat(contact)}
                  className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                    {contact.user.avatar ? (
                      <img
                        src={contact.user.avatar}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-bold text-sm">
                        {contact.user.firstName[0]}
                        {contact.user.lastName[0]}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">
                        {contact.user.firstName} {contact.user.lastName}
                      </span>
                      {contact.lastMessage && (
                        <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                          {formatDate(contact.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {contact.lastMessage?.sender === user?.id ? "Vous : " : ""}
                        {formatLastMessage(contact.lastMessage)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 ml-2 flex-shrink-0">
                        {contact.messageCount} message{contact.messageCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
