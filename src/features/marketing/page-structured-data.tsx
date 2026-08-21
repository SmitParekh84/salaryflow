import { BRAND } from "@/lib/brand";
import { SITE_ORIGIN, absoluteUrl } from "@/lib/site-url";

/**
 * Schema.org description of a single marketing page.
 *
 * Every node points back at the entities the landing page already declares
 * (`/#organization`, `/#website`, `/#app`) by `@id` rather than restating them.
 * That is what lets a crawler read the whole site as facts about one product
 * instead of a set of unrelated pages that happen to share a name, and it keeps
 * the description of the organisation in exactly one place.
 *
 * The breadcrumb is emitted here rather than rendered in the page because these
 * pages are one level deep: a visible "Home / About" strip would add a row of
 * chrome to say what the header already says, but a crawler still benefits from
 * the hierarchy.
 */
export function MarketingStructuredData({
  type = "WebPage",
  path,
  name,
  description,
  breadcrumbName,
  freeOffer = false,
}: {
  /** Narrower page types earn richer treatment in results. */
  type?: "WebPage" | "AboutPage" | "ContactPage";
  /** Route this page is served from, e.g. "/pricing". */
  path: string;
  name: string;
  description: string;
  /** Breadcrumb label. Defaults to `name`. */
  breadcrumbName?: string;
  /**
   * Attaches the free offer to the application node. Set on the page that
   * actually states the price, so the claim and the markup cannot drift.
   */
  freeOffer?: boolean;
}) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": `${absoluteUrl(path)}#webpage`,
        url: absoluteUrl(path),
        name,
        description,
        isPartOf: { "@id": absoluteUrl("/#website") },
        about: { "@id": absoluteUrl("/#app") },
        publisher: { "@id": absoluteUrl("/#organization") },
        inLanguage: "en",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${absoluteUrl(path)}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: BRAND.name, item: SITE_ORIGIN },
          {
            "@type": "ListItem",
            position: 2,
            name: breadcrumbName ?? name,
            item: absoluteUrl(path),
          },
        ],
      },
      ...(freeOffer
        ? [
            {
              // Same `@id` as the landing page's application node on purpose:
              // this is one more fact about that entity, not a second app.
              "@type": "SoftwareApplication",
              "@id": absoluteUrl("/#app"),
              name: BRAND.name,
              applicationCategory: "FinanceApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "INR",
                availability: "https://schema.org/InStock",
                url: absoluteUrl(path),
              },
            },
          ]
        : []),
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
