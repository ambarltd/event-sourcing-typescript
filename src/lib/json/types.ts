export { type Json, type JsonObject, type JsonArray };

type Json = null | string | number | boolean | JsonArray | JsonObject;
type JsonObject = { [x: string]: Json };
type JsonArray = Array<Json>;
