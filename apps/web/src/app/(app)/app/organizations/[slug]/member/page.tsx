import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrganizationMemberPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/app/organizations/${slug}/members`);
}
