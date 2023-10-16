declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & { [brand]: TBrand };
