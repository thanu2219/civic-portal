import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { NewsService } from '../../../core/services/news.service';
import { AuthService } from '../../../core/services/auth.service';
import { NewsPost, NewsComment, NewsCategory, NEWS_CATEGORY_LABELS } from '../../../core/models/types';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, SlicePipe],
  templateUrl: './news-detail.component.html',
  styleUrl: './news-detail.component.scss',
})
export class NewsDetailComponent implements OnInit {
  post: NewsPost | null = null;
  comments: NewsComment[] = [];
  newComment = '';
  loading = true;
  submitting = false;

  categoryLabel(c: NewsCategory): string {
    return NEWS_CATEGORY_LABELS[c] ?? c;
  }

  constructor(
    private route: ActivatedRoute,
    private newsService: NewsService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  async load(id: string) {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      this.post = await this.newsService.getPost(id);
      this.comments = await this.newsService.getComments(id);
    } catch (err) {
      console.error('Failed to load article:', err);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  async submitComment() {
    if (!this.newComment.trim() || !this.post) return;

    this.submitting = true;
    this.cdr.detectChanges();

    try {
      const comment = await this.newsService.addComment(this.post.id, this.newComment.trim());
      this.comments.push(comment);
      this.newComment = '';
    } catch (err) {
      console.error('Failed to post comment:', err);
    }

    this.submitting = false;
    this.cdr.detectChanges();
  }
}
