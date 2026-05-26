import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { RequestService } from '../../../core/services/request.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ServiceRequest,
  Department,
  RequestStatus,
  RequestCategory,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from '../../../core/models/types';

@Component({
  selector: 'app-request-queue',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, SlicePipe],
  templateUrl: './request-queue.component.html',
  styleUrl: './request-queue.component.scss',
})
export class RequestQueueComponent implements OnInit {
  requests: ServiceRequest[] = [];
  departments: Department[] = [];
  loading = true;

  filterStatus: RequestStatus | '' = '';
  filterCategory: RequestCategory | '' = '';
  statuses: RequestStatus[] = ['pending', 'in_progress', 'completed', 'closed'];
  categories = Object.entries(CATEGORY_LABELS) as [RequestCategory, string][];
  categoryLabels = CATEGORY_LABELS;
  statusLabels = STATUS_LABELS;

  // Modal state
  activeRequest: ServiceRequest | null = null;
  modalMode: 'approve' | 'reject' | 'resolve' | null = null;
  selectedDepartment = '';
  actionNotes = '';
  actionLoading = false;

  // Bulk resolve
  selectedIds = new Set<string>();
  bulkMode = false;
  bulkResolution = '';

  constructor(
    private requestService: RequestService,
    private departmentService: DepartmentService,
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
      const filters: any = {};
      if (this.filterStatus) filters.status = this.filterStatus;
      if (this.filterCategory) filters.category = this.filterCategory;

      this.requests = await this.requestService.getAllRequests(filters);
      this.departments = await this.departmentService.getDepartments();
    } catch (err) {
      console.error('Failed to load request queue:', err);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  openModal(request: ServiceRequest, mode: 'approve' | 'reject' | 'resolve') {
    this.activeRequest = request;
    this.modalMode = mode;
    this.selectedDepartment = '';
    this.actionNotes = '';
    this.actionError = '';
  }

  closeModal() {
    this.activeRequest = null;
    this.modalMode = null;
  }

  actionError = '';

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
        await this.requestService.resolveRequest(this.activeRequest.id, this.actionNotes);
      }
      this.closeModal();
      await this.load();
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

  getCategoryLabel(cat: string): string {
    return this.categoryLabels[cat as RequestCategory] ?? cat;
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as keyof typeof this.statusLabels] ?? status;
  }
}
