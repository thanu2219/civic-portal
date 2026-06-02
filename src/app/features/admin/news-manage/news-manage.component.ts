import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  NewsService,
  getScheduleState,
  NewsScheduleState,
} from '../../../core/services/news.service';
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
type ScheduleFilter = 'all' | 'live' | 'scheduled' | 'expired';

@Component({
  selector: 'app-news-manage',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, SlicePipe, TranslatePipe],
  templateUrl: './news-manage.component.html',
  styleUrl: './news-manage.component.scss',
})
export class NewsManageComponent implements OnInit {
  posts: NewsPost[] = [];
  loading = true;

  activeTab: AdminTab | DeptTab = 'pending';
  scheduleFilter: ScheduleFilter = 'all';

  showForm = false;
  editId: string | null = null;
  formTitle = '';
  formBody = '';
  formType: NewsPostType = 'news';
  formCategory: NewsCategory = 'generic';
  formImage: File | null = null;
  formStartDate = '';
  formEndDate = '';
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
  private translate = inject(TranslateService);

  constructor(
    private newsService: NewsService,
    private departmentService: DepartmentService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  private t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

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
    // Schedule sub-filter only applies on the approved tab; reset it otherwise
    // so the chip state doesn't carry over invisibly.
    if (tab !== 'approved') this.scheduleFilter = 'all';
  }

  setScheduleFilter(f: ScheduleFilter) {
    this.scheduleFilter = f;
  }

  private byStatus(s: NewsPostStatus) {
    return this.posts.filter(p => p.status === s);
  }

  get pendingPosts() { return this.byStatus('pending'); }
  get approvedPosts() { return this.byStatus('approved'); }
  get rejectedPosts() { return this.byStatus('rejected'); }
  get allPosts() { return this.posts; }

  get visiblePosts(): NewsPost[] {
    let list: NewsPost[];
    switch (this.activeTab) {
      case 'pending': list = this.pendingPosts; break;
      case 'approved': list = this.approvedPosts; break;
      case 'rejected': list = this.rejectedPosts; break;
      case 'mine':
      case 'all':
      default: list = this.allPosts;
    }
    if (this.activeTab === 'approved' && this.scheduleFilter !== 'all') {
      list = list.filter(p => this.scheduleStateOf(p) === this.scheduleFilter);
    }
    return list;
  }

  scheduleStateOf(post: NewsPost): NewsScheduleState {
    return getScheduleState(post);
  }

  get approvedLiveCount(): number {
    return this.approvedPosts.filter(p => this.scheduleStateOf(p) === 'live').length;
  }

  get approvedScheduledCount(): number {
    return this.approvedPosts.filter(p => this.scheduleStateOf(p) === 'scheduled').length;
  }

  get approvedExpiredCount(): number {
    return this.approvedPosts.filter(p => this.scheduleStateOf(p) === 'expired').length;
  }

  openNewForm() {
    this.editId = null;
    this.formTitle = '';
    this.formBody = '';
    this.formType = 'news';
    this.formCategory = this.availableCategories[0]?.[0] ?? 'generic';
    this.formImage = null;
    this.formStartDate = '';
    this.formEndDate = '';
    this.formError = '';
    this.showForm = true;
  }

  openEditForm(post: NewsPost) {
    this.editId = post.id;
    this.formTitle = post.title;
    this.formBody = post.body;
    this.formType = post.post_type;
    this.formCategory = post.category;
    this.formImage = null;
    this.formStartDate = this.toLocalDatetimeInput(post.start_date);
    this.formEndDate = this.toLocalDatetimeInput(post.end_date);
    this.formError = '';
    this.showForm = true;
  }

  private toLocalDatetimeInput(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tz).toISOString().slice(0, 16);
  }

  private datetimeInputToIso(value: string): string | null {
    if (!value) return null;
    return new Date(value).toISOString();
  }

  canEdit(post: NewsPost): boolean {
    if (this.auth.isAdmin()) return false;
    if (post.status !== 'pending') return false;
    const me = this.auth.profile();
    if (!me) return false;
    return post.author_id === me.id || this.myDeptSlugs.includes(post.category);
  }

  canDelete(post: NewsPost): boolean {
    return post.status === 'rejected';
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

    const startIso = this.datetimeInputToIso(this.formStartDate);
    const endIso = this.datetimeInputToIso(this.formEndDate);

    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
      this.formError = 'End date must be after start date.';
      return;
    }

    this.formLoading = true;
    this.formError = '';
    this.cdr.detectChanges();

    try {
      if (this.editId) {
        await this.newsService.updateContent(this.editId, {
          title: this.formTitle,
          body: this.formBody,
          post_type: this.formType,
          category: this.formCategory,
          start_date: startIso,
          end_date: endIso,
        });
      } else {
        await this.newsService.createPost(
          {
            title: this.formTitle,
            body: this.formBody,
            post_type: this.formType,
            category: this.formCategory,
            start_date: startIso,
            end_date: endIso,
          },
          this.formImage ?? undefined
        );
      }
      this.showForm = false;
      await this.load();
    } catch (err: any) {
      this.formError = err.message || this.t('admin.news.form.saveFailed');
    }

    this.formLoading = false;
    this.cdr.detectChanges();
  }

  async approve(post: NewsPost) {
    try {
      await this.newsService.approvePost(post.id);
      await this.load();
    } catch (err: any) {
      alert(err.message || this.t('alerts.failedApprove'));
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
      this.rejectError = this.t('admin.news.reject.missingReason');
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
      this.rejectError = err.message || this.t('admin.news.reject.failed');
    }
    this.rejectLoading = false;
    this.cdr.detectChanges();
  }

  async deletePost(post: NewsPost) {
    if (!confirm(this.t('admin.news.confirmDelete', { title: post.title }))) return;
    try {
      await this.newsService.deletePost(post.id);
      await this.load();
    } catch (err: any) {
      alert(err.message || this.t('alerts.failedDelete'));
    }
  }

  openDetail(post: NewsPost) {
    this.detailPost = post;
  }

  closeDetail() {
    this.detailPost = null;
  }
}
