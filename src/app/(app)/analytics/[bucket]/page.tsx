import { BucketView } from "@/features/reports/bucket-view";
import { BUCKET_KEYS, BUCKET_LABELS, type BucketKey } from "@/lib/reports";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bucket: string }>;
}): Promise<Metadata> {
  const { bucket } = await params;
  const label = BUCKET_LABELS[bucket as BucketKey];
  return { title: label ?? "Analytics" };
}

export default async function BucketPage({ params }: { params: Promise<{ bucket: string }> }) {
  const { bucket } = await params;
  if (!BUCKET_KEYS.includes(bucket as BucketKey)) notFound();

  return <BucketView bucket={bucket as BucketKey} />;
}
