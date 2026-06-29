export const USER_SEARCH_PARAM = "userType";
export const USER_ID_SEARCH_PARAM = "userId";

export const INTERNAL_USER_TYPE = "internal";
export const EXTERNAL_USER_TYPE = "external";

export type UserType = typeof INTERNAL_USER_TYPE | typeof EXTERNAL_USER_TYPE;

type SearchParams = {
  get(name: string): string | null;
};

export function getUserType(
  searchParams: SearchParams | null | undefined
): UserType {
  return searchParams?.get(USER_SEARCH_PARAM) === EXTERNAL_USER_TYPE
    ? EXTERNAL_USER_TYPE
    : INTERNAL_USER_TYPE;
}
