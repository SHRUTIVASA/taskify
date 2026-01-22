"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/AuthContext";
import { useEffect } from "react";

export default function Home() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Redirect based on user role
    const roleRoutes = {
      Employee: "/dashboards/Employee",
      Admin: "/dashboards/Admin",
      Supervisor: "dashboards/Supervisor",
      TeamLeader: "/dashboards/Teamleader",
      UnitHead: "/dashboards/Unithead",
      Head: "/dashboards/Head",
    };

    if (currentUser.role && roleRoutes[currentUser.role]) {
      router.push(roleRoutes[currentUser.role]);
    }
  }, [currentUser, router]);

  return null; // This page just handles redirects
}