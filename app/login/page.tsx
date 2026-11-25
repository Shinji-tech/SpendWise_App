import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";

export const instant = false;

export default async function LoginAlias() {
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/sign-in");
}
