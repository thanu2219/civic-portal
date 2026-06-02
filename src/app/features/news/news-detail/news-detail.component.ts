import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { NewsService, isWithinSchedule } from '../../../core/services/news.service';
import { AuthService } from '../../../core/services/auth.service';
import { DepartmentService } from '../../../core/services/department.service';
import { NewsPost, NewsComment, NewsCategory, NEWS_CATEGORY_LABELS } from '../../../core/models/types';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, SlicePipe, TranslatePipe],
  templateUrl: './news-detail.component.html',
  styleUrl: './news-detail.component.scss',
})
export class NewsDetailComponent implements OnInit {
  post: NewsPost | null = null;
  comments: NewsComment[] = [];
  newComment = '';
  loading = true;
  submitting = false;
  notAvailable = false;

  categoryLabel(c: NewsCategory): string {
    return NEWS_CATEGORY_LABELS[c] ?? c;
  }

  constructor(
    private route: ActivatedRoute,
    private newsService: NewsService,
    private departmentService: DepartmentService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  async load(id: string) {
    this.loading = true;
    this.notAvailable = false;
    this.cdr.detectChanges();

    try {
      const post = await this.newsService.getPost(id);

      // Privileged viewers (admin, post author, same-dept staff) bypass the
      // schedule window. Everyone else only sees approved posts inside their
      // [start_date, end_date] window.
      const me = this.auth.profile();
      const isAdmin = this.auth.isAdmin();
      let isAuthorOrDeptStaff = false;
      if (me) {
        if (post.author_id === me.id) {
          isAuthorOrDeptStaff = true;
        } else if (!isAdmin) {
          const myDepts = await this.departmentService.getMyDepartments(me.id);
          isAuthorOrDeptStaff = myDepts.some(d => d.slug === post.category);
        }
      }
      const canBypassSchedule = isAdmin || isAuthorOrDeptStaff;

      if (
        !canBypassSchedule &&
        post.status === 'approved' &&
        !isWithinSchedule(post)
      ) {
        this.post = null;
        this.notAvailable = true;
      } else {
        this.post = post;
        this.comments = await this.newsService.getComments(id);
      }
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
