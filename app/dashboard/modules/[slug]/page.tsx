import EnterpriseModuleClient from './EnterpriseModuleClient';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EnterpriseModulePage({ params }: PageProps) {
  const resolvedParams = await params;

  return <EnterpriseModuleClient slug={resolvedParams.slug} />;
}
