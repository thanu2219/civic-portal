import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { NewsService } from '../../../core/services/news.service';
import { NewsPost } from '../../../core/models/types';

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.scss',
})
export class NewsListComponent implements OnInit {
  posts: NewsPost[] = [];
  loading = true;

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
}
