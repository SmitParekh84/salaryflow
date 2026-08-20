import { RecycleBinView } from "@/features/recycle-bin/recycle-bin-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recycle bin",
};

export default function RecycleBinPage() {
  return <RecycleBinView />;
}
