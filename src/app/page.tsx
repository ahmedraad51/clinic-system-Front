import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BUILT_MODE, CLOUD_DOMAIN, isMainAddress } from "@/lib/deployment";

/** The start page: the public website on the cloud's main address, the clinic's dashboard everywhere else. */
export default async function Home() {
  const host = (await headers()).get("host") ?? "";
  if (BUILT_MODE === "cloud" && CLOUD_DOMAIN && isMainAddress(host)) redirect("/site");
  redirect("/dashboard");
}
