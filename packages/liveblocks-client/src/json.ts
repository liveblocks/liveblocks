/**
 * Represents an indefinitely deep arbitrary JSON data structure. There are
 * four types that make up the Json family:
 *
 * - Json         any legal JSON value
 * - JsonScalar   any legal JSON leaf value (no lists or objects)
 * - JsonArray    a JSON value whose outer type is an array
 * - JsonObject   a JSON value whose outer type is an object
 *
 */
export type Json = JsonScalar | JsonArray | JsonObject;
export type JsonScalar = string | number | boolean | null | undefined;
export type JsonArray = Json[];
export type JsonObject = { [key: string]: Json | undefined };
