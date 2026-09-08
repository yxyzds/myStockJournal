import { redirect } from "next/navigation";
import { ClerkSignScreen } from "@/components/clerk-sign-screen";
import { isClerkEnabled } from "@/lib/clerk";

export default function SignUpPage() {
  if (!isClerkEnabled) redirect("/");
  return <ClerkSignScreen mode="sign-up" />;
}
