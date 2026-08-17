import { redirect } from 'next/navigation';
import { getSchemaModuleBySlug } from '@/lib/product/schema-modules';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EnterpriseCoverageModulePage({ params }: PageProps) {
  const resolvedParams = await params;
  const schemaModule = getSchemaModuleBySlug(resolvedParams.slug);

  redirect(schemaModule?.route ?? `/dashboard/modules/${resolvedParams.slug}`);
}
