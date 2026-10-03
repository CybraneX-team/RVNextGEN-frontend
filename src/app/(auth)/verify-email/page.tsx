import VerifyEmail from "@/components/VerifyEmail";

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  return <VerifyEmail token={typeof token === "string" ? token : ""} />;
}
