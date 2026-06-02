import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  NewsPost,
  NewsComment,
  NewsPostType,
  NewsCategory,
  NewsPostStatus,
} from '../models/types';

export interface CreateNewsPayload {
  title: string;
  body: string;
  post_type: NewsPostType;
  category: NewsCategory;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateNewsPayload {
  title?: string;
  body?: string;
  post_type?: NewsPostType;
  category?: NewsCategory;
  start_date?: string | null;
  end_date?: string | null;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.supabase;
  }

  private async attachAuthors(posts: NewsPost[]): Promise<void> {
    const ids = Array.from(new Set(posts.map(p => p.author_id).filter(Boolean)));
    if (!ids.length) return;
    const { data } = await this.db.from('profiles').select('*').in('id', ids);
    const map = new Map<string, any>();
    for (const p of data ?? []) map.set((p as any).id, p);
    for (const post of posts) {
      const a = map.get(post.author_id);
      if (a) post.author = a;
    }
  }

  async getPosts(limit?: number): Promise<NewsPost[]> {
    const { data, error } = await this.db
      .from('news_posts')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const now = Date.now();
    const inWindow = (data ?? []).filter((p: any) => {
      if (p.start_date && new Date(p.start_date).getTime() > now) return false;
      if (p.end_date && new Date(p.end_date).getTime() < now) return false;
      return true;
    }) as NewsPost[];

    const posts = limit ? inWindow.slice(0, limit) : inWindow;
    await this.attachAuthors(posts);
    return posts;
  }

  async getAllPosts(): Promise<NewsPost[]> {
    const { data, error } = await this.db
      .from('news_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const posts = (data ?? []) as NewsPost[];
    await this.attachAuthors(posts);
    return posts;
  }

  async getMyPosts(): Promise<NewsPost[]> {
    const { data: { user } } = await this.supabaseService.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.db
      .from('news_posts')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const posts = (data ?? []) as NewsPost[];
    await this.attachAuthors(posts);
    return posts;
  }

  async getPendingPosts(): Promise<NewsPost[]> {
    const { data, error } = await this.db
      .from('news_posts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const posts = (data ?? []) as NewsPost[];
    await this.attachAuthors(posts);
    return posts;
  }

  async getPost(id: string): Promise<NewsPost> {
    const { data, error } = await this.db
      .from('news_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const post = data as NewsPost;
    if (post.author_id) {
      const { data: author } = await this.db
        .from('profiles')
        .select('*')
        .eq('id', post.author_id)
        .single();
      if (author) post.author = author;
    }
    return post;
  }

  async createPost(payload: CreateNewsPayload, imageFile?: File): Promise<void> {
    const { data: { user } } = await this.supabaseService.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let imageUrl: string | null = null;
    if (imageFile) {
      try {
        const fileName = `news/${Date.now()}_${imageFile.name}`;
        const { error: uploadError } = await this.supabaseService.storage
          .from('news-images')
          .upload(fileName, imageFile);
        if (uploadError) {
          console.warn('Image upload failed:', uploadError.message);
        } else {
          const { data: urlData } = this.supabaseService.storage
            .from('news-images')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.warn('Image upload error:', err);
      }
    }

    // Admins auto-approve their own posts; dept_admins go to pending queue.
    const { data: profile } = await this.db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = (profile as any)?.role === 'admin';
    const status: NewsPostStatus = isAdmin ? 'approved' : 'pending';

    const { error } = await this.db.from('news_posts').insert({
      title: payload.title,
      body: payload.body,
      post_type: payload.post_type,
      category: payload.category,
      image_url: imageUrl,
      author_id: user.id,
      status,
      published: status === 'approved',
      approved_by: isAdmin ? user.id : null,
      approved_at: isAdmin ? new Date().toISOString() : null,
      rejection_reason: null,
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
    });

    if (error) throw error;
  }

  async updateContent(id: string, payload: UpdateNewsPayload): Promise<void> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.body !== undefined) updates.body = payload.body;
    if (payload.post_type !== undefined) updates.post_type = payload.post_type;
    if (payload.category !== undefined) updates.category = payload.category;
    if (payload.start_date !== undefined) updates.start_date = payload.start_date;
    if (payload.end_date !== undefined) updates.end_date = payload.end_date;

    const { error } = await this.db
      .from('news_posts')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  }

  async updatePost(
    id: string,
    updates: Partial<
      Pick<
        NewsPost,
        'title' | 'body' | 'post_type' | 'category' | 'published' | 'status'
      >
    >
  ) {
    const { error } = await this.db
      .from('news_posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async approvePost(id: string): Promise<void> {
    const { data: { user } } = await this.supabaseService.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.db
      .from('news_posts')
      .update({
        status: 'approved',
        published: true,
        rejection_reason: null,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async rejectPost(id: string, reason: string): Promise<void> {
    const { error } = await this.db
      .from('news_posts')
      .update({
        status: 'rejected',
        published: false,
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async deletePost(id: string) {
    const { error } = await this.db.from('news_posts').delete().eq('id', id);
    if (error) throw error;
  }

  async getComments(postId: string): Promise<NewsComment[]> {
    const { data, error } = await this.db
      .from('news_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const comments = (data ?? []) as NewsComment[];
    for (const comment of comments) {
      if (comment.user_id) {
        const { data: profile } = await this.db
          .from('profiles')
          .select('*')
          .eq('id', comment.user_id)
          .single();
        if (profile) comment.profile = profile;
      }
    }
    return comments;
  }

  async addComment(postId: string, content: string): Promise<NewsComment> {
    const { data: { user } } = await this.supabaseService.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.db
      .from('news_comments')
      .insert({ post_id: postId, user_id: user.id, content });

    if (error) throw error;

    const { data: profile } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: crypto.randomUUID(),
      post_id: postId,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      profile: profile ?? undefined,
    } as NewsComment;
  }
}
