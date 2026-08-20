import { CategoryView } from "@/features/reports/category-view";
import { BUCKET_KEYS, type BucketKey } from "@/lib/reports";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bucket: string; category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return { title: decodeURIComponent(category) };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ bucket: string; category: string }>;
}) {
  const { bucket, category } = await params;
  if (!BUCKET_KEYS.includes(bucket as BucketKey)) notFound();

  return <CategoryView bucket={bucket as BucketKey} category={decodeURIComponent(category)} />;
}
