import EnterpriseModuleClient from '../../../modules/[slug]/EnterpriseModuleClient';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EnterpriseCoverageModulePage({ params }: PageProps) {
  const resolvedParams = await params;

  return <EnterpriseModuleClient slug={resolvedParams.slug} />;
}
