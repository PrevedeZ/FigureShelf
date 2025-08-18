import FiguresGrid from "../../../components/FiguresGrid";
import { toAppFigures } from "../../../components/figureAdapter";
import type { Figure } from "../../../components/types";

// ...whatever you already do to load “raw” figures for this series
// assume you currently have something like:
const rawFigures = /* fetched from catalog/api */ [] as any[];

// ↓↓↓ convert before passing to the grid
const figures: Figure[] = toAppFigures(rawFigures);

export default function Page() {
  // ... your handlers here (onAdd, onEditOwned, etc.)
  return (
    <FiguresGrid
      figures={figures}
      onAdd={/* ... */}
      onEditOwned={/* ... */}
      onOpenWish={/* ... */}
      onManageOwned={/* ... */}
    />
  );
}
