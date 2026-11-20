import { redirect } from "next/navigation";

type BookPageProps = {
  searchParams: Promise<{
    service?: string;
    serviceId?: string;
    service_id?: string;
    id?: string;
  }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const { service, serviceId, service_id, id } = await searchParams;
  const targetId = service || serviceId || service_id || id;

  if (targetId) {
    redirect(`/book/${targetId}`);
  }

  redirect("/explore");
}
