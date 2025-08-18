// app/admin/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import AdminDockClient from "../../components/AdminDockClient";

export default async function AdminPage() {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }
  return <AdminDockClient />;
}
