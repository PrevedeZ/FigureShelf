// scripts/backfill-slugs.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

async function main() {
  // SERIES
  const existingSeries = await prisma.series.findMany({ select: { id: true, name: true, slug: true } });
  const usedSeriesSlugs = new Set(existingSeries.map(s => s.slug).filter(Boolean));

  for (const s of existingSeries) {
    if (s.slug && s.slug.length > 0) continue;
    let base = slugify(s.name) || `series-${s.id.slice(0,8)}`;
    let slug = base;
    let i = 1;
    while (usedSeriesSlugs.has(slug)) {
      i += 1;
      slug = `${base}-${i}`;
    }
    await prisma.series.update({ where: { id: s.id }, data: { slug } });
    usedSeriesSlugs.add(slug);
    console.log(`Series ${s.name} -> ${slug}`);
  }

  // FIGURES
  const existingFigures = await prisma.figure.findMany({
    select: { id: true, name: true, character: true, releaseYear: true, slug: true }
  });
  const usedFigureSlugs = new Set(existingFigures.map(f => f.slug).filter(Boolean));

  for (const f of existingFigures) {
    if (f.slug && f.slug.length > 0) continue;
    // Compose something stable-ish, but ensure uniqueness with suffix if needed
    const baseCore = slugify(`${f.name}-${f.releaseYear || ''}`) || slugify(f.name) || `figure-${f.id.slice(0,8)}`;
    let slug = baseCore || `figure-${f.id.slice(0,8)}`;
    let i = 1;
    while (usedFigureSlugs.has(slug)) {
      i += 1;
      slug = `${baseCore}-${i}`;
    }
    await prisma.figure.update({ where: { id: f.id }, data: { slug } });
    usedFigureSlugs.add(slug);
    console.log(`Figure ${f.name} -> ${slug}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
