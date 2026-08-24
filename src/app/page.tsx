import { Landing } from "@/features/site/landing";
import { LandingStructuredData } from "@/features/site/structured-data";

export default function Home() {
  return (
    <>
      <LandingStructuredData />
      <Landing />
    </>
  );
}
