import { redirect } from "next/navigation";
import { DEFAULT_STATE } from "@/lib/data";

// Root redirects to the default state's county explore — the primary entry point
export default function Home() {
  redirect(`/${DEFAULT_STATE}/explore/counties`);
}
