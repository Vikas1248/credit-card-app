/** Inline JSON-LD for SEO (Article, FAQPage, BreadcrumbList, etc.). */

type StructuredDataProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function StructuredData({ data }: StructuredDataProps) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(obj),
          }}
        />
      ))}
    </>
  );
}
