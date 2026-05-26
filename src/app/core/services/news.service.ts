import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NewsPost, NewsComment } from '../models/types';

@Injectable({ providedIn: 'root' })
export class NewsService {
  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.supabase;
  }

  private async attachAuthors(posts: NewsPost[]): Promise<void> {
    for (const post of posts) {
      if (post.author_id) {
        const { data } = await this.db
          .from('profiles')
          .select('*')
          .eq('id', post.author_id)
          .single();
        if (data) post.author = data;
      }
    }
  }

  async getPosts(limit?: number): Promise<NewsPost[]> {
    let query = this.db
      .from('news_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    const posts = (data ?? []) as NewsPost[];
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

  async createPost(title: string, body: string, imageFile?: File): Promise<void> {
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

    const { error } = await this.db
      .from('news_posts')
      .insert({ title, body, image_url: imageUrl, author_id: user.id, published: true });

    if (error) throw error;
  }

  async updatePost(id: string, updates: Partial<Pick<NewsPost, 'title' | 'body' | 'published'>>) {
    const { error } = await this.db
      .from('news_posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
