import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SlicePipe, TitleCasePipe } from '@angular/common';
import { RequestService } from '../../../core/services/request.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ServiceRequest,
  Department,
  RequestStatus,
  RequestCategory,
  RequestEvent,
  CATEGORY_LABELS,
  STATUS_LABELS,
  DEPT_REJECTION_REASONS,
} from '../../../core/models/types';

@Component({
  selector: 'app-request-queue',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, SlicePipe, TitleCasePipe],
  templateUrl: './request-queue.component.html',
  styleUrl: './request-queue.component.scss',
})
export class RequestQueueComponent implements OnInit {
  requests: ServiceRequest[] = [];
  departments: Department[] = [];
  loading = true;

  filterCategory: RequestCategory | '' = '';
  categories = Object.entries(CATEGORY_LABELS) as [RequestCategory, string][];
  categoryLabels = CATEGORY_LABELS;
  statusLabels = STATUS_LABELS;
  rejectionReasons = DEPT_REJECTION_REASONS;

  // Tabs: admin = active|approved|rejected, dept = active|resolved|rejected
  activeTab: 'active' | 'approved' | 'resolved' | 'rejected' = 'active';

  // Detail panel
  viewRequest: ServiceRequest | null = null;
  viewEvents: RequestEvent[] = [];
  viewLoading = false;

  activeRequest: ServiceRequest | null = null;
  modalMode: 'approve' | 'reject' | 'resolve' | 'dept_reject' | null = null;
  selectedDepartment = '';
  actionNotes = '';
  actionLoading = false;
  actionError = '';

  // Dept admin rejection
  selectedRejectionReason = '';
  rejectionFreeText = '';

  // Resolution photo
  resolutionPhoto: File | null = null;
  resolutionPhotoPreview = '';

  // Bulk resolve
  selectedIds = new Set<string>();
  bulkMode = false;
  bulkResolution = '';

  constructor(
    private requestService: RequestService,
    private departmentService: DepartmentService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const filters: any = {};
      if (this.filterCategory) filters.category = this.filterCategory;

      this.requests = await this.requestService.getAllRequests(filters);
      this.departments = await this.departmentService.getDepartments();
    } catch (err) {
      console.error('Failed to load request queue:', err);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  setTab(tab: 'active' | 'approved' | 'resolved' | 'rejected') {
    this.activeTab = tab;
  }

  // Status sets per tab, role-aware
  private inTab(req: ServiceRequest, tab: typeof this.activeTab): boolean {
    if (this.auth.isAdmin()) {
      switch (tab) {
        case 'active': return req.status === 'pending';
        case 'approved': return req.status === 'routed' || req.status === 'in_progress' || req.status === 'completed';
        case 'rejected': return req.status === 'rejected';
      }
    } else {
      // dept_admin
      switch (tab) {
        case 'active': return req.status === 'routed' || req.status === 'in_progress';
        case 'resolved': return req.status === 'completed';
        case 'rejected': return req.status === 'closed';
      }
    }
    return true;
  }

  get visibleRequests(): ServiceRequest[] {
    return this.requests.filter(r => this.inTab(r, this.activeTab));
  }

  get tabCounts() {
    return {
      active: this.requests.filter(r => this.inTab(r, 'active')).length,
      approved: this.requests.filter(r => this.inTab(r, 'approved')).length,
      resolved: this.requests.filter(r => this.inTab(r, 'resolved')).length,
      rejected: this.requests.filter(r => this.inTab(r, 'rejected')).length,
    };
  }

  async openDetail(request: ServiceRequest) {
    this.viewRequest = request;
    this.viewEvents = [];
    this.viewLoading = true;
    this.cdr.detectChanges();

    try {
      const full = await this.requestService.getRequest(request.id);
      this.viewRequest = full;
      this.viewEvents = await this.requestService.getRequestEvents(request.id);
    } catch (err) {
      console.error('Failed to load request detail:', err);
    }

    this.viewLoading = false;
    this.cdr.detectChanges();
  }

  closeDetail() {
    this.viewRequest = null;
    this.viewEvents = [];
  }

  openModalFromDetail(mode: 'approve' | 'reject' | 'resolve' | 'dept_reject') {
    if (!this.viewRequest) return;
    this.openModal(this.viewRequest, mode);
  }

  openModal(request: ServiceRequest, mode: 'approve' | 'reject' | 'resolve' | 'dept_reject') {
    this.activeRequest = request;
    this.modalMode = mode;
    this.actionNotes = '';
    this.actionError = '';
    this.selectedRejectionReason = '';
    this.rejectionFreeText = '';
    this.resolutionPhoto = null;
    this.resolutionPhotoPreview = '';

    if (mode === 'approve') {
      this.selectedDepartment = request.department_id
        ?? this.getDepartmentIdBySlug(request.category);
    } else {
      this.selectedDepartment = '';
    }
  }

  closeModal() {
    this.activeRequest = null;
    this.modalMode = null;
  }

  onResolutionPhotoSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.actionError = 'Photo must be under 5 MB.';
      return;
    }

    this.resolutionPhoto = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.zone.run(() => {
        this.resolutionPhotoPreview = e.target?.result as string;
        this.cdr.detectChanges();
      });
    };
    reader.readAsDataURL(file);
  }

  removeResolutionPhoto() {
    this.resolutionPhoto = null;
    this.resolutionPhotoPreview = '';
  }

  get selectedReasonConfig() {
    return this.rejectionReasons.find(r => r.value === this.selectedRejectionReason);
  }

  async submitAction() {
    if (!this.activeRequest || !this.modalMode) return;
    this.actionError = '';

    if (this.modalMode === 'approve' && !this.selectedDepartment) {
      this.actionError = 'Please select a department.';
      return;
    }
    if (this.modalMode === 'reject' && !this.actionNotes.trim()) {
      this.actionError = 'Please provide a rejection reason.';
      return;
    }
    if (this.modalMode === 'resolve' && !this.actionNotes.trim()) {
      this.actionError = 'Please provide resolution details.';
      return;
    }
    if (this.modalMode === 'dept_reject') {
      if (!this.selectedRejectionReason) {
        this.actionError = 'Please select a rejection reason.';
        return;
      }
      if (this.selectedRejectionReason === 'other' && !this.rejectionFreeText.trim()) {
        this.actionError = 'Please provide a rejection reason.';
        return;
      }
    }

    this.actionLoading = true;

    try {
      if (this.modalMode === 'approve') {
        await this.requestService.approveRequest(
          this.activeRequest.id,
          this.selectedDepartment,
          this.actionNotes
        );
      } else if (this.modalMode === 'reject') {
        await this.requestService.rejectRequest(this.activeRequest.id, this.actionNotes);
      } else if (this.modalMode === 'resolve') {
        await this.requestService.resolveRequest(
          this.activeRequest.id,
          this.actionNotes,
          this.resolutionPhoto ?? undefined
        );
      } else if (this.modalMode === 'dept_reject') {
        const reason = this.selectedRejectionReason === 'other'
          ? this.rejectionFreeText
          : this.selectedReasonConfig?.label ?? this.selectedRejectionReason;

        if (this.selectedReasonConfig?.reroutes) {
          await this.requestService.rerouteRequest(this.activeRequest.id, reason);
        } else {
          await this.requestService.deptRejectRequest(this.activeRequest.id, reason);
        }
      }
      this.closeModal();
      await this.load();
      if (this.viewRequest) {
        await this.openDetail(this.viewRequest);
      }
    } catch (err: any) {
      console.error('Action failed:', err);
      this.actionError = err.message || 'Action failed. Please try again.';
    }

    this.actionLoading = false;
    this.cdr.detectChanges();
  }

  toggleSelect(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  async submitBulkResolve() {
    if (!this.bulkResolution.trim() || !this.selectedIds.size) return;
    this.actionLoading = true;

    try {
      await this.requestService.bulkResolve(
        Array.from(this.selectedIds),
        this.bulkResolution
      );
      this.selectedIds.clear();
      this.bulkMode = false;
      this.bulkResolution = '';
      await this.load();
    } catch (err) {
      console.error('Bulk resolve failed:', err);
    }

    this.actionLoading = false;
    this.cdr.detectChanges();
  }

  getDepartmentIdBySlug(slug: string): string {
    return this.departments.find(d => d.slug === slug)?.id ?? '';
  }

  getCategoryLabel(cat: string): string {
    return this.categoryLabels[cat as RequestCategory] ?? cat;
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as keyof typeof this.statusLabels] ?? status;
  }
}
