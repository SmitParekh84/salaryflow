import { LandingHero } from "@/features/landing/landing-hero";
import { LandingStructuredData } from "@/features/landing/structured-data";

export default function Home() {
  return (
    <>
      <LandingStructuredData />
      <LandingHero />
    </>
  );
}
