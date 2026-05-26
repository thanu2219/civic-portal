import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { NewsService } from '../../../core/services/news.service';
import { AuthService } from '../../../core/services/auth.service';
import { NewsPost } from '../../../core/models/types';

@Component({
  selector: 'app-news-manage',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, SlicePipe],
  templateUrl: './news-manage.component.html',
  styleUrl: './news-manage.component.scss',
})
export class NewsManageComponent implements OnInit {
  posts: NewsPost[] = [];
  loading = true;

  showForm = false;
  editId: string | null = null;
  formTitle = '';
  formBody = '';
  formImage: File | null = null;
  formLoading = false;
  formError = '';

  constructor(
    private newsService: NewsService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      this.posts = await this.newsService.getAllPosts();
    } catch (err) {
      console.error('Failed to load news:', err);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  openNewForm() {
    this.editId = null;
    this.formTitle = '';
    this.formBody = '';
    this.formImage = null;
    this.formError = '';
    this.showForm = true;
  }

  openEditForm(post: NewsPost) {
    this.editId = post.id;
    this.formTitle = post.title;
    this.formBody = post.body;
    this.formImage = null;
    this.formError = '';
    this.showForm = true;
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.formImage = input.files[0];
    }
  }

  async submitForm() {
    if (!this.formTitle || !this.formBody) {
      this.formError = 'Title and body are required.';
      return;
    }

    this.formLoading = true;
    this.formError = '';
    this.cdr.detectChanges();

    try {
      if (this.editId) {
        await this.newsService.updatePost(this.editId, {
          title: this.formTitle,
          body: this.formBody,
        });
      } else {
        await this.newsService.createPost(
          this.formTitle,
          this.formBody,
          this.formImage ?? undefined
        );
      }
      this.showForm = false;
      await this.load();
    } catch (err: any) {
      this.formError = err.message || 'Failed to save.';
    }

    this.formLoading = false;
    this.cdr.detectChanges();
  }

  async togglePublish(post: NewsPost) {
    try {
      await this.newsService.updatePost(post.id, { published: !post.published });
      await this.load();
    } catch (err) {
      console.error('Toggle publish failed:', err);
    }
  }

  async deletePost(post: NewsPost) {
    if (!confirm(`Delete "${post.title}"?`)) return;
    try {
      await this.newsService.deletePost(post.id);
      await this.load();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }
}
