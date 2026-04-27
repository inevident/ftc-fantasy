import { createClient } from "@/utils/supabase/server";
import { NavBar } from "@/components/nav-bar";

type AppNavProps = {
  leagueCode?: string | null;
  leagueName?: string | null;
  pageTitle?: string | null;
};

export async function AppNav({ leagueCode, leagueName, pageTitle }: AppNavProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return null;
  }

  return (
    <NavBar
      leagueCode={leagueCode}
      leagueName={leagueName}
      pageTitle={pageTitle}
      userEmail={user.email}
      userName={user.user_metadata?.display_name ?? null}
    />
  );
}
