import { redirect } from "next/navigation";

/**
 * /{state}/explore has no index view of its own — the explore experience
 * lives at the typed sub-pages (counties, municipalities, …). Redirect to
 * counties, the primary entry point, so legacy "/explore" redirects and
 * hand-typed URLs never 404.
 */
export default function ExploreIndex({
  params,
}: {
  params: { state: string };
}) {
  redirect(`/${params.state}/explore/counties`);
}
