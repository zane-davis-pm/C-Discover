import { redirect } from "next/navigation";

/** /{state} -> /{state}/explore/counties, the primary entry point per state. */
export default function StateHome({ params }: { params: { state: string } }) {
  redirect(`/${params.state}/explore/counties`);
}
