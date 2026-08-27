import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const { Users, Search, ToggleLeft, ToggleRight, Shield, Mail, Phone, MapPin } = LucideIcons;

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  component: AdminUsers,
});

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  city: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
};

function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.users.list();
      if (response.success && response['users']) {
        setUsers(response['users']);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.users.update(userId, { isActive: !currentStatus });
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.phone?.includes(search);
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <AdminRoute>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div>
            <h1 className="text-display text-4xl uppercase mb-6">Utilisateurs</h1>
            
            <div className="mt-8 surface-panel p-6">
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-surface"
                    />
                  </div>
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-input bg-surface"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="user">Utilisateurs</option>
                  <option value="partner_owner">Partenaires</option>
                  <option value="admin">Admins</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-input bg-surface"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold">Utilisateur</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Contact</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Rôle</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Ville</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Statut</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user._id} className="border-b border-border hover:bg-white/5">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary font-semibold">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold">{user.firstName} {user.lastName}</p>
                              {user.isVerified && (
                                <span className="text-xs text-primary flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  Vérifié
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex flex-col gap-1">
                            {user.email && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </span>
                            )}
                            {user.phone && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {user.city}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.isActive 
                              ? 'bg-leaf/10 text-leaf' 
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {user.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(user._id, user.isActive)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title={user.isActive ? 'Désactiver' : 'Activer'}
                          >
                            {user.isActive ? (
                              <ToggleRight className="h-5 w-5 text-leaf" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-destructive" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </div>
              )}
            </div>
      </div>
    </AdminRoute>
  );
}
