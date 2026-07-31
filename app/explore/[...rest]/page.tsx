/** Catches /explore/counties, /explore/municipalities, etc.
 *
 * Static-export note: `rest` is an arbitrary legacy path segment list, not
 * enumerable at build time, so generateStaticParams below only emits a
 * single placeholder shell ("_"). staticwebapp.config.json rewrites any
 * other /explore/* path to that shell; LegacyExploreCatchAllClient then
 * reads the *live* URL client-side to do the actual redirect.
 */
import { LegacyExploreCatchAllClient } from "./LegacyExploreCatchAllClient";

export function generateStaticParams() {
  return [{ rest: ["_"] }];
}

export default function LegacyExploreCatchAll() {
  return <LegacyExploreCatchAllClient />;
}
