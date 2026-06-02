import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ServiceRequest,
  RequestEvent,
  CATEGORY_LABELS,
  STATUS_LABELS,
  RequestCategory,
} from '../../../core/models/types';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss',
})
export class RequestDetailComponent implements OnInit {
  request: ServiceRequest | null = null;
  events: RequestEvent[] = [];
  loading = true;

  categoryLabels = CATEGORY_LABELS;
  statusLabels = STATUS_LABELS;

  constructor(
    private route: ActivatedRoute,
    private requestService: RequestService,
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
      this.request = await this.requestService.getRequest(id);
      this.events = await this.requestService.getRequestEvents(id);
    } catch (err) {
      console.error('Failed to load request:', err);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  getCategoryLabel(cat: string): string {
    return this.categoryLabels[cat as RequestCategory] ?? cat;
  }

  // Citizens shouldn't see the internal "routed" state (an admin-routed-to-dept
  // detail). Surface it as "Work In Progress" instead.
  getStatusLabel(status: string): string {
    if (status === 'routed') return this.statusLabels.in_progress;
    return this.statusLabels[status as keyof typeof this.statusLabels] ?? status;
  }

  displayStatus(status: string): string {
    return status === 'routed' ? 'in_progress' : status;
  }

  timelineLabel(action: string): string {
    // Generic label for admin approval — citizens see that their request was
    // approved without knowing who did it.
    if (action === 'approved') return 'Admin Approved';
    return action.charAt(0).toUpperCase() + action.slice(1);
  }
}
