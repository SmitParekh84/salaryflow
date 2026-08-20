import { BucketView } from "@/features/reports/bucket-view";
import { BUCKET_KEYS, type BucketKey } from "@/lib/reports";
import { notFound } from "next/navigation";

export default async function BucketPage({ params }: { params: Promise<{ bucket: string }> }) {
  const { bucket } = await params;
  if (!BUCKET_KEYS.includes(bucket as BucketKey)) notFound();

  return <BucketView bucket={bucket as BucketKey} />;
}
