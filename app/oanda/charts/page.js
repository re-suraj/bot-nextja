"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RealtimeCandles from "@/app/components/RealtimeCandles";

export default function Charts() {
  const router = useRouter();

  useEffect(() => {
    const jwtToken =
      typeof window !== "undefined" ? sessionStorage.getItem("jwtToken") : null;
    if (!jwtToken) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#131722]">
      <RealtimeCandles instrument="USD_JPY" />
    </div>
  );
}
