import { redirect } from "next/navigation";

type SignInRedirectPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function SignInRedirectPage({
  searchParams,
}: SignInRedirectPageProps) {
  const params = await searchParams;
  const redirectParams = new URLSearchParams();

  if (params.error) {
    redirectParams.set("error", params.error);
  }

  if (params.message) {
    redirectParams.set("message", params.message);
  }

  if (params.next) {
    redirectParams.set("next", params.next);
  }

  const suffix = redirectParams.size > 0 ? `?${redirectParams.toString()}` : "";
  redirect(`/login${suffix}`);
}
