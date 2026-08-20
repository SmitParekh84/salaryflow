import { CategoryView } from "@/features/reports/category-view";
import { BUCKET_KEYS, type BucketKey } from "@/lib/reports";
import { notFound } from "next/navigation";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ bucket: string; category: string }>;
}) {
  const { bucket, category } = await params;
  if (!BUCKET_KEYS.includes(bucket as BucketKey)) notFound();

  return <CategoryView bucket={bucket as BucketKey} category={decodeURIComponent(category)} />;
}
