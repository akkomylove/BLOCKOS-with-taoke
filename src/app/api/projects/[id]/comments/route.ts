import { NextRequest, NextResponse } from 'next/server';
import { getUserId, checkProjectPermission } from '@/lib/auth-utils';
import { getDb, query, run, saveDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { isValidNanoid } from '@/lib/validation';
import { sanitizeText } from '@/lib/sanitize';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    if (!isValidNanoid(projectId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error || 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const blockId = searchParams.get('blockId');
    const pageId = searchParams.get('pageId');

    let sql = `
      SELECT bc.*, u.name as author_name, u.avatar as author_avatar, u.email as author_email
      FROM block_comments bc
      LEFT JOIN users u ON bc.author_id = u.id
      WHERE 1=1
    `;
    const queryParams: (string | number)[] = [];

    if (blockId) {
      sql += ' AND bc.block_id = ?';
      queryParams.push(blockId);
    } else if (pageId) {
      sql += ' AND bc.page_id = ?';
      queryParams.push(pageId);
    }

    sql += ' ORDER BY bc.created_at ASC';
    const comments = query(sql, queryParams);

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        pageId: c.page_id,
        blockId: c.block_id,
        authorId: c.author_id,
        authorName: c.author_name,
        authorAvatar: c.author_avatar,
        authorEmail: c.author_email,
        content: c.content,
        mentions: JSON.parse((c.mentions as string) || '[]'),
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/comments error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    if (!isValidNanoid(projectId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await getDb();
    const perm = checkProjectPermission(userId, projectId, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { pageId, blockId, content, mentions = [] } = body;

    if (!pageId || !blockId || !content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'pageId, blockId and non-empty content required' }, { status: 400 });
    }

    const commentId = nanoid();
    const cleanContent = sanitizeText(content.trim());
    const now = Date.now();

    // 提取正文中形如 @username 的 mentions 并与传入数组合并
    const parsedMentions = new Set<string>(Array.isArray(mentions) ? mentions : []);
    const mentionMatches = cleanContent.match(/@([\w\u4e00-\u9fa5]+)/g);
    if (mentionMatches) {
      mentionMatches.forEach((m) => parsedMentions.add(m.slice(1)));
    }

    run(
      `INSERT INTO block_comments (id, page_id, block_id, author_id, content, mentions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [commentId, pageId, blockId, userId, cleanContent, JSON.stringify(Array.from(parsedMentions)), now, now]
    );
    saveDb();

    return NextResponse.json({
      success: true,
      comment: {
        id: commentId,
        pageId,
        blockId,
        authorId: userId,
        content: cleanContent,
        mentions: Array.from(parsedMentions),
        createdAt: now,
      },
    });
  } catch (err) {
    console.error('POST /api/projects/[id]/comments error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId: string;
    try {
      userId = await getUserId();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 });
    }

    await getDb();
    const commentRows = query('SELECT * FROM block_comments WHERE id = ?', [commentId]);
    if (commentRows.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const comment = commentRows[0];
    const perm = checkProjectPermission(userId, projectId, 'read');
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 仅允许评论作者或管理员/所有者删除评论
    const isAuthor = comment.author_id === userId;
    const isPrivileged = perm.role === 'owner' || perm.role === 'admin';

    if (!isAuthor && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own comments' }, { status: 403 });
    }

    run('DELETE FROM block_comments WHERE id = ?', [commentId]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/projects/[id]/comments error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
