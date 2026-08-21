import { BRAND } from "@/lib/brand";
import { SITE_ORIGIN, absoluteUrl } from "@/lib/site-url";
import { FAQS } from "./faqs";

/**
 * Schema.org description of the landing page.
 *
 * Emitted as one `@graph` rather than several script tags so the nodes can
 * reference each other by `@id` - the application node points at the publisher
 * instead of restating it, which is what lets a crawler treat them as facts
 * about one entity rather than three unrelated blobs.
 *
 * Every claim here is also visible on the page. The FAQ entries come from the
 * same array the accordion renders, and the free-tier `offer` matches what the
 * FAQ says about pricing.
 */
export function LandingStructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: BRAND.name,
        url: SITE_ORIGIN,
        logo: absoluteUrl("/icons/favicon-64.png"),
        email: BRAND.legalEmail,
        // Every profile a reader can verify the company against. sameAs is how
        // a crawler ties the site, the LinkedIn page and the Instagram account
        // to one entity rather than three unrelated things sharing a name.
        sameAs: [BRAND.linkedin, BRAND.instagram],
        // Both published mailboxes, split the way /contact describes them, so
        // the routing a reader is told about is the one a crawler reads too.
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: BRAND.supportEmail,
            url: absoluteUrl("/contact"),
            availableLanguage: ["en"],
          },
          {
            "@type": "ContactPoint",
            contactType: "privacy",
            email: BRAND.legalEmail,
            url: absoluteUrl("/contact"),
            availableLanguage: ["en"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        name: BRAND.name,
        url: SITE_ORIGIN,
        description: BRAND.description,
        publisher: { "@id": absoluteUrl("/#organization") },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": absoluteUrl("/#app"),
        name: BRAND.name,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, Android, iOS, Windows, macOS",
        description: BRAND.description,
        url: SITE_ORIGIN,
        publisher: { "@id": absoluteUrl("/#organization") },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
      },
      {
        "@type": "FAQPage",
        "@id": absoluteUrl("/#faq"),
        mainEntity: FAQS.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // `<` is escaped because a literal `</script>` inside the JSON would end
      // the tag early and turn the rest of the payload into markup.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
