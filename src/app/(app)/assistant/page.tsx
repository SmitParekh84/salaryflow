import { AssistantView } from "@/features/chat/assistant-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aartha AI",
};

export default function AssistantPage() {
  return <AssistantView />;
}
