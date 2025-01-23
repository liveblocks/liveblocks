import { useSearchParams } from "next/navigation";

export const useExampleUserId = (): string | null => {
  const params = useSearchParams();
  const userId = params?.get("userId");

  return userId;
};
