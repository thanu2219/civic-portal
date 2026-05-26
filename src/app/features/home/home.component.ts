import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { RequestService } from '../../core/services/request.service';
import { NewsService } from '../../core/services/news.service';
import { NewsPost, CATEGORY_LABELS, RequestCategory } from '../../core/models/types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  stats = { total: 0, pending: 0, inProgress: 0, completed: 0 };
  recentNews: NewsPost[] = [];
  categories = Object.entries(CATEGORY_LABELS) as [RequestCategory, string][];

  categoryIcons: Record<RequestCategory, string> = {
    electricity: '⚡',
    municipality: '🏢',
    road_and_transportation: '🛣️',
    water: '💧',
    traffic: '🚦',
  };

  constructor(
    public auth: AuthService,
    private requestService: RequestService,
    private newsService: NewsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    try {
      this.stats = await this.requestService.getStats();
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
    try {
      this.recentNews = await this.newsService.getPosts(3);
    } catch (err) {
      console.error('Failed to load news:', err);
    }
    this.cdr.detectChanges();
  }
}
