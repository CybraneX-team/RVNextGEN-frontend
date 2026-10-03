import AuthOptions from "@/components/AuthOptions";

export default async function SigninOptionsPage({ searchParams }: PageProps<"/auth-options/signin">) {
  const { error } = await searchParams;
  return <AuthOptions mode="signin" error={typeof error === "string" ? error : undefined} />;
}
