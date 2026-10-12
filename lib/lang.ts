// English/Spanish choice for the login and guest pages. The toggle stores it in the
// hk_lang cookie; with no choice yet, the browser's language decides.
import { cookies, headers } from "next/headers";

export type Lang = "en" | "es";
export const LANG_COOKIE = "hk_lang";

export async function getLang(): Promise<Lang> {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  if (saved === "en" || saved === "es") return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.trim().toLowerCase().startsWith("es") ? "es" : "en";
}
