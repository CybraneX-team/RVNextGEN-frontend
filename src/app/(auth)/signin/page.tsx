import AuthForm from "@/components/AuthForm";

export default async function SigninPage({ searchParams }: PageProps<"/signin">) {
  const { email } = await searchParams;
  return <AuthForm mode="signin" initialEmail={typeof email === "string" ? email : ""} />;
}
