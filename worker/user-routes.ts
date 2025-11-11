import { Hono } from "hono";
import type { Env } from './core-utils';
import { UserEntity, ChatBoardEntity, ThoughtEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Thought } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // --- Aksara App Routes ---
  app.get('/api/thoughts', async (c) => {
    const { items } = await ThoughtEntity.list(c.env);
    // Sort by creation date, newest first
    items.sort((a, b) => b.createdAt - a.createdAt);
    return ok(c, items);
  });
  app.post('/api/thoughts', async (c) => {
    const { text, author } = (await c.req.json()) as { text?: string; author?: string };
    if (!isStr(text) || text.trim().length === 0) {
      return bad(c, 'Kata-kata tidak boleh kosong.');
    }
    if (text.length > 500) {
      return bad(c, 'Kata-kata terlalu panjang (maksimal 500 karakter).');
    }
    const finalAuthor = (author && author.trim().length > 0) ? author.trim() : 'anonymous';
    const newThought: Thought = {
      id: crypto.randomUUID(),
      text: text.trim(),
      author: finalAuthor,
      createdAt: Date.now(),
    };
    const created = await ThoughtEntity.create(c.env, newThought);
    return ok(c, created);
  });
  app.delete('/api/thoughts/:id', async (c) => {
    const id = c.req.param('id');
    if (!isStr(id)) return bad(c, 'ID tidak valid.');
    const deleted = await ThoughtEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
  // --- Original Template Routes ---
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'CF Workers Demo' }}));
  // USERS
  app.get('/api/users', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await UserEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/users', async (c) => {
    const { name } = (await c.req.json()) as { name?: string };
    if (!name?.trim()) return bad(c, 'name required');
    return ok(c, await UserEntity.create(c.env, { id: crypto.randomUUID(), name: name.trim() }));
  });
  // CHATS
  app.get('/api/chats', async (c) => {
    await ChatBoardEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await ChatBoardEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/chats', async (c) => {
    const { title } = (await c.req.json()) as { title?: string };
    if (!title?.trim()) return bad(c, 'title required');
    const created = await ChatBoardEntity.create(c.env, { id: crypto.randomUUID(), title: title.trim(), messages: [] });
    return ok(c, { id: created.id, title: created.title });
  });
  // MESSAGES
  app.get('/api/chats/:chatId/messages', async (c) => {
    const chat = new ChatBoardEntity(c.env, c.req.param('chatId'));
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.listMessages());
  });
  app.post('/api/chats/:chatId/messages', async (c) => {
    const chatId = c.req.param('chatId');
    const { userId, text } = (await c.req.json()) as { userId?: string; text?: string };
    if (!isStr(userId) || !text?.trim()) return bad(c, 'userId and text required');
    const chat = new ChatBoardEntity(c.env, chatId);
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.sendMessage(userId, text.trim()));
  });
  // DELETE: Users
  app.delete('/api/users/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await UserEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/users/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await UserEntity.deleteMany(c.env, list), ids: list });
  });
  // DELETE: Chats
  app.delete('/api/chats/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await ChatBoardEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/chats/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await ChatBoardEntity.deleteMany(c.env, list), ids: list });
  });
}