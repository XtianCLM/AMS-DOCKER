"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/context/UserContext";

interface Props {
  permission: string;
  children: React.ReactNode;
}

export default function PermissionGuard({
  permission,
  children,
}: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!user.permissions.includes(permission)) {
      router.replace("/unauthorized");
    }
  }, [
    loading,
    user,
    permission,
    router,
  ]);

  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (!user.permissions.includes(permission)) {
    return null;
  }

  return <>{children}</>;
}