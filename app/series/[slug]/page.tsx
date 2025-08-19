// app/series/[slug]/page.tsx
import SeriesClient from "../../../components/SeriesClient";

export default function Page({ params }: { params: { slug: string } }) {
  return <SeriesClient slug={params.slug} />;
}
