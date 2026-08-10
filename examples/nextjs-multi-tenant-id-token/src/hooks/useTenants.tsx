// Hook to get the tenant

import { useState, useEffect } from "react";
import { usePathParams } from "./usePathParams";

export function useTenants() {
  const { tenant: tenantId } = usePathParams();

  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);

  const [activeTenant, setActiveTenant] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/tenants")
      .then((res) => res.json())
      .then((data) => setTenants(data));
  }, []);

  useEffect(() => {
    if (tenantId) {
      setActiveTenant(tenants.find((tenant) => tenant.id === tenantId) || null);
    } else {
      setActiveTenant(null);
    }
  }, [tenantId, tenants]);

  return { tenants, activeTenant };
}
