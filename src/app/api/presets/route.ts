import { NextRequest, NextResponse } from 'next/server';
import { PRESET_REGISTRY, getPresetById } from '@/lib/presets';
import { getUserId } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = await getUserId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const preset = getPresetById(id);
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }
    return NextResponse.json(preset);
  }

  const list = PRESET_REGISTRY.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    difficulty: p.difficulty,
    tags: p.tags,
    highlights: p.highlights,
    recommendedWorkflow: p.recommendedWorkflow,
    documentName: p.documentName,
    preview: p.preview,
    charCount: p.charCount,
    sectionCount: p.sectionCount,
  }));

  return NextResponse.json({ presets: list });
}
