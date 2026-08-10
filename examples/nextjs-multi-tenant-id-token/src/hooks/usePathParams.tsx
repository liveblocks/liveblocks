// Hook to get the tenant and room from the pathname

import { usePathname } from "next/navigation";

export function usePathParams() {
  const pathname = usePathname();

  const pathParts = pathname.split("/");
  const tenant = pathParts[1];
  const room = pathParts[2];

  return { tenant, room, pathname };
}
