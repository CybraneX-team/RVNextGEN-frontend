import GoogleComplete from "@/components/GoogleComplete";

export default async function GoogleCompletePage({ searchParams }: PageProps<"/auth/google/complete">) {
  const { ticket } = await searchParams;
  return <GoogleComplete ticket={typeof ticket === "string" ? ticket : ""} />;
}
