import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth-admin";
import AdminLogin from "./AdminLogin";

export const metadata: Metadata = {
  title: "Admin",
  description: "Administration Luxury Market",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  if (await isAdmin()) {
    redirect("/admin/boutique");
  }
  return <AdminLogin />;
}
