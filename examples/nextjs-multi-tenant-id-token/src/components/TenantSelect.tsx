import { useRouter } from "next/navigation";
import { useTenants } from "../hooks/useTenants";
import { useClient } from "@liveblocks/react";

export function TenantSelect() {
  const { tenants, activeTenant } = useTenants();
  const { logout } = useClient();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    logout();
    router.push(`/${e.target.value}`);
    router.refresh();
  };

  return (
    <div className="tenant-select">
      <select value={activeTenant?.id || ""} onChange={handleChange}>
        {!activeTenant && (
          <option value="" disabled>
            Select a tenant
          </option>
        )}
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </div>
  );
}
