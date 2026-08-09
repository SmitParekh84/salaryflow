import {
  SettingsView,
  type SettingsSection,
} from "@/features/settings/settings-view";

const SETTINGS_SECTIONS = new Set<SettingsSection>([
  "profile",
  "money",
  "accounts",
  "planning",
  "system",
]);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const requestedSection = (await searchParams).section;
  const section =
    typeof requestedSection === "string" &&
    SETTINGS_SECTIONS.has(requestedSection as SettingsSection)
      ? (requestedSection as SettingsSection)
      : "profile";

  return <SettingsView initialSection={section} />;
}
