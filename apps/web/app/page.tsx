import { redirect } from "next/navigation";

export default function Home() {
  // Single demo title for now; the Library screen will list all titles later.
  redirect("/review/ethiopia-0-3-eden-zoo");
}
