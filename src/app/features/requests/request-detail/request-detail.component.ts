import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SlicePipe, TitleCasePipe } from '@angular/common';
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
  imports: [RouterLink, SlicePipe, TitleCasePipe],
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

  getStatusLabel(status: string): string {
    return this.statusLabels[status as keyof typeof this.statusLabels] ?? status;
  }
}
