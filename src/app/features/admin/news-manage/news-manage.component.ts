import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { NewsService } from '../../../core/services/news.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  NewsPost,
  NewsPostType,
  NewsCategory,
  NewsPostStatus,
  NEWS_CATEGORY_LABELS,
  NEWS_TYPE_LABELS,
} from '../../../core/models/types';

type AdminTab = 'pending' | 'approved' | 'rejected' | 'all';
type DeptTab = 'mine' | 'pending' | 'approved' | 'rejected';

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

  activeTab: AdminTab | DeptTab = 'pending';

  showForm = false;
  formTitle = '';
  formBody = '';
  formType: NewsPostType = 'news';
  formCategory: NewsCategory = 'generic';
  formImage: File | null = null;
  formLoading = false;
  formError = '';

  rejectTarget: NewsPost | null = null;
  rejectReason = '';
  rejectLoading = false;
  rejectError = '';

  detailPost: NewsPost | null = null;

  typeLabels = NEWS_TYPE_LABELS;
  categoryLabels = NEWS_CATEGORY_LABELS;
  categoryList = Object.entries(NEWS_CATEGORY_LABELS) as [NewsCategory, string][];
  typeList: NewsPostType[] = ['news', 'announcement'];

  get availableCategories(): [NewsCategory, string][] {
    if (this.auth.isAdmin()) return this.categoryList;
    return this.categoryList.filter(([slug]) =>
      slug === 'generic' || this.myDeptSlugs.includes(slug)
    );
  }

  myDeptSlugs: string[] = [];

  constructor(
    private newsService: NewsService,
    private departmentService: DepartmentService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.activeTab = this.auth.isAdmin() ? 'pending' : 'mine';
    this.load();
  }

  async load() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const me = this.auth.profile();
      let raw: NewsPost[] = [];

      if (this.auth.isAdmin()) {
        raw = await this.newsService.getAllPosts();
        this.posts = raw;
      } else if (me) {
        // Get this user's department slug(s) so we can scope the page to
        // their own posts + same-dept posts (RLS will allow more, but we
        // hide cross-dept approved posts here for a cleaner queue).
        const myDepts = await this.departmentService.getMyDepartments(me.id);
        this.myDeptSlugs = myDepts.map(d => d.slug);

        raw = await this.newsService.getAllPosts();
        this.posts = raw.filter(p =>
          p.author_id === me.id || this.myDeptSlugs.includes(p.category)
        );
      } else {
        this.posts = [];
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  setTab(tab: AdminTab | DeptTab) {
    this.activeTab = tab;
  }

  private byStatus(s: NewsPostStatus) {
    return this.posts.filter(p => p.status === s);
  }

  get pendingPosts() { return this.byStatus('pending'); }
  get approvedPosts() { return this.byStatus('approved'); }
  get rejectedPosts() { return this.byStatus('rejected'); }
  get allPosts() { return this.posts; }

  get visiblePosts(): NewsPost[] {
    switch (this.activeTab) {
      case 'pending': return this.pendingPosts;
      case 'approved': return this.approvedPosts;
      case 'rejected': return this.rejectedPosts;
      case 'mine':
      case 'all':
      default: return this.allPosts;
    }
  }

  openNewForm() {
    this.formTitle = '';
    this.formBody = '';
    this.formType = 'news';
    this.formCategory = this.availableCategories[0]?.[0] ?? 'generic';
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
    if (!this.formTitle.trim() || !this.formBody.trim()) {
      this.formError = 'Title and body are required.';
      return;
    }

    if (
      !this.auth.isAdmin() &&
      this.formCategory !== 'generic' &&
      !this.myDeptSlugs.includes(this.formCategory)
    ) {
      this.formError = 'You can only post for your own department or as generic.';
      return;
    }

    this.formLoading = true;
    this.formError = '';
    this.cdr.detectChanges();

    try {
      await this.newsService.createPost(
        {
          title: this.formTitle,
          body: this.formBody,
          post_type: this.formType,
          category: this.formCategory,
        },
        this.formImage ?? undefined
      );
      this.showForm = false;
      await this.load();
    } catch (err: any) {
      this.formError = err.message || 'Failed to save.';
    }

    this.formLoading = false;
    this.cdr.detectChanges();
  }

  async approve(post: NewsPost) {
    try {
      await this.newsService.approvePost(post.id);
      await this.load();
    } catch (err: any) {
      alert(err.message || 'Failed to approve.');
    }
  }

  openReject(post: NewsPost) {
    this.rejectTarget = post;
    this.rejectReason = '';
    this.rejectError = '';
  }

  closeReject() {
    this.rejectTarget = null;
    this.rejectReason = '';
    this.rejectError = '';
  }

  async confirmReject() {
    if (!this.rejectTarget) return;
    if (!this.rejectReason.trim()) {
      this.rejectError = 'Please provide a reason for rejection.';
      return;
    }
    this.rejectLoading = true;
    this.cdr.detectChanges();
    try {
      await this.newsService.rejectPost(this.rejectTarget.id, this.rejectReason.trim());
      this.rejectTarget = null;
      this.rejectReason = '';
      await this.load();
    } catch (err: any) {
      this.rejectError = err.message || 'Failed to reject.';
    }
    this.rejectLoading = false;
    this.cdr.detectChanges();
  }

  async deletePost(post: NewsPost) {
    if (!confirm(`Delete "${post.title}"?`)) return;
    try {
      await this.newsService.deletePost(post.id);
      await this.load();
    } catch (err: any) {
      alert(err.message || 'Failed to delete.');
    }
  }

  openDetail(post: NewsPost) {
    this.detailPost = post;
  }

  closeDetail() {
    this.detailPost = null;
  }
}
