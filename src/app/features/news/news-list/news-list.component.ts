import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { NewsService } from '../../../core/services/news.service';
import {
  NewsPost,
  NewsPostType,
  NewsCategory,
  NEWS_CATEGORY_LABELS,
  NEWS_TYPE_LABELS,
} from '../../../core/models/types';

type TypeFilter = 'all' | NewsPostType;
type CategoryFilter = 'all' | NewsCategory;

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [RouterLink, FormsModule, SlicePipe],
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.scss',
})
export class NewsListComponent implements OnInit {
  posts: NewsPost[] = [];
  loading = true;

  typeFilter: TypeFilter = 'all';
  categoryFilter: CategoryFilter = 'all';
  search = '';

  typeLabels = NEWS_TYPE_LABELS;
  categoryLabels = NEWS_CATEGORY_LABELS;
  categoryList = Object.entries(NEWS_CATEGORY_LABELS) as [NewsCategory, string][];

  constructor(
    private newsService: NewsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      this.posts = await this.newsService.getPosts();
    } catch (err) {
      console.error('Failed to load news:', err);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  get filteredPosts(): NewsPost[] {
    const term = this.search.trim().toLowerCase();
    return this.posts.filter(p => {
      if (this.typeFilter !== 'all' && p.post_type !== this.typeFilter) return false;
      if (this.categoryFilter !== 'all' && p.category !== this.categoryFilter) return false;
      if (term) {
        const hay = `${p.title} ${p.body}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }

  setType(t: TypeFilter) {
    this.typeFilter = t;
  }

  get announcements(): NewsPost[] {
    return this.filteredPosts.filter(p => p.post_type === 'announcement');
  }

  get newsOnly(): NewsPost[] {
    return this.filteredPosts.filter(p => p.post_type === 'news');
  }
}
