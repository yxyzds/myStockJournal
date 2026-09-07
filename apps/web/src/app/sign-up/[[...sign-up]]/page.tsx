import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo-mark";
import { isClerkEnabled } from "@/lib/clerk";

export default function SignUpPage() {
  if (!isClerkEnabled) redirect("/");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="mb-8 flex items-center gap-2">
        <LogoMark size={30} />
        <span className="font-heading text-[15px] font-semibold tracking-tight text-slate-900">MyStockJournal</span>
      </div>
      <SignUp />
    </div>
  );
}
