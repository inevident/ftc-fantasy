import { signOutAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <SubmitButton
        className="border-white/14 bg-white/6 text-white hover:bg-white/10"
        idleLabel="Sign out"
        pendingLabel="Signing out"
      />
    </form>
  );
}

