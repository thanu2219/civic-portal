import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestService } from '../../../core/services/request.service';
import { ServiceRequest } from '../../../core/models/types';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [RouterLink, SlicePipe, TranslatePipe],
  templateUrl: './request-list.component.html',
  styleUrl: './request-list.component.scss',
})
export class RequestListComponent implements OnInit {
  requests: ServiceRequest[] = [];
  loading = true;
  error = '';

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

  // Citizens shouldn't see the internal "routed" state (an admin-routed-to-dept
  // detail). Surface it as "Work In Progress" instead via the i18n key
  // 'status.in_progress'.
  displayStatus(status: string): string {
    return status === 'routed' ? 'in_progress' : status;
  }
}
