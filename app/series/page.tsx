"use client";
import Header from "../../components/Header";
import SeriesOverview from "../../components/SeriesOverview";

export default function SeriesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-semibold">Series</h1>
        <SeriesOverview />
      </main>
    </>
  );
}
