import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { ServiceRequest, RequestEvent } from '../../../core/models/types';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [RouterLink, SlicePipe, TranslatePipe],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss',
})
export class RequestDetailComponent implements OnInit {
  request: ServiceRequest | null = null;
  events: RequestEvent[] = [];
  loading = true;

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

  // Citizens shouldn't see the internal "routed" state (an admin-routed-to-dept
  // detail). Surface it as "Work In Progress" via 'status.in_progress' key.
  displayStatus(status: string): string {
    return status === 'routed' ? 'in_progress' : status;
  }

  // Maps an event action to an i18n key under request.timeline. Unknown
  // actions fall back to a titlecased version of the raw action.
  timelineKey(action: string): string {
    const known = ['approved', 'rejected', 'rerouted', 'resolved'];
    return known.includes(action) ? `request.timeline.${action}` : '';
  }

  timelineFallback(action: string): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }
}
