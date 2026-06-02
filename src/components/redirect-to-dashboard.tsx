import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/constants/routes";

export function RedirectToDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: ROUTES.dashboard });
  }, [navigate]);

  return null;
}
