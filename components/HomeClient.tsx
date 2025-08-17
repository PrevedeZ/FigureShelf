"use client";

import React from "react";
import DashboardSummary from "./DashboardSummary";
import FiguresGrid from "./FiguresGrid";
import SeriesOverview from "./SeriesOverview";

export default function HomeClient() {
  return (
    <>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">All Figures</h1>
        <DashboardSummary />
        <FiguresGrid />
      </div>

      <div className="mt-8">
        <SeriesOverview />
      </div>
    </>
  );
}
