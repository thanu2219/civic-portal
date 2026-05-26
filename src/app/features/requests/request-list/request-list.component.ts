import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { RequestService } from '../../../core/services/request.service';
import {
  ServiceRequest,
  CATEGORY_LABELS,
  STATUS_LABELS,
  RequestCategory,
} from '../../../core/models/types';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './request-list.component.html',
  styleUrl: './request-list.component.scss',
})
export class RequestListComponent implements OnInit {
  requests: ServiceRequest[] = [];
  loading = true;
  error = '';

  categoryLabels = CATEGORY_LABELS;
  statusLabels = STATUS_LABELS;

  constructor(
    private requestService: RequestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      this.requests = await this.requestService.getMyRequests();
    } catch (err: any) {
      console.error('Failed to load requests:', err);
      this.error = err.message || 'Failed to load requests.';
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  getCategoryLabel(cat: string): string {
    return this.categoryLabels[cat as RequestCategory] ?? cat;
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as keyof typeof this.statusLabels] ?? status;
  }
}
