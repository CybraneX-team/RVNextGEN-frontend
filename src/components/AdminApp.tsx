"use client";

import { useAuth } from "./AuthProvider";
import GrantAdminForm from "./admin/GrantAdminForm";
import AdminDashboard from "./admin/AdminDashboard";

/** Smart /admin: admins see the dashboard, everyone else sees the grant form. */
export default function AdminApp() {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? <AdminDashboard /> : <GrantAdminForm />;
  
}

