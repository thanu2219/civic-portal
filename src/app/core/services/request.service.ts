import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  ServiceRequest,
  RequestCategory,
  RequestStatus,
  RequestEvent,
} from '../models/types';

@Injectable({ providedIn: 'root' })
export class RequestService {
  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.supabase;
  }

  async createRequest(
    title: string,
    description: string,
    category: RequestCategory,
    location: string,
    photos: File[]
  ): Promise<void> {
    const { data: { user } } = await this.supabaseService.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const photoUrls: string[] = [];
    for (const photo of photos) {
      try {
        const fileName = `${user.id}/${Date.now()}_${photo.name}`;
        const { error: uploadError } = await this.supabaseService.storage
          .from('request-photos')
          .upload(fileName, photo);

        if (uploadError) {
          console.warn('Photo upload failed, skipping:', uploadError.message);
          continue;
        }

        const { data: urlData } = this.supabaseService.storage
          .from('request-photos')
          .getPublicUrl(fileName);
        photoUrls.push(urlData.publicUrl);
      } catch (uploadErr) {
        console.warn('Photo upload error, skipping:', uploadErr);
      }
    }

    const { data: dept } = await this.db
      .from('departments')
      .select('id')
      .eq('slug', category)
      .single();

    const { error } = await this.db
      .from('requests')
      .insert({
        user_id: user.id,
        title,
        description,
        category,
        location,
        photos: photoUrls,
        status: 'pending' as RequestStatus,
        department_id: dept?.id ?? null,
      });

    if (error) {
      console.error('Request insert failed:', error);
      throw new Error(error.message || 'Failed to create request');
    }
  }

  async getMyRequests(): Promise<ServiceRequest[]> {
    const { data: { user } } = await this.supabaseService.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.db
      .from('requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const requests = (data ?? []) as ServiceRequest[];

    for (const req of requests) {
      if (req.department_id) {
        const { data: dept } = await this.db
          .from('departments')
          .select('*')
          .eq('id', req.department_id)
          .single();
        if (dept) req.department = dept;
      }
    }

    return requests;
  }

  async getAllRequests(
    filters?: { status?: RequestStatus; category?: RequestCategory; department_id?: string }
  ): Promise<ServiceRequest[]> {
    let query = this.db
      .from('requests')
      .select('*');

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.department_id) query = query.eq('department_id', filters.department_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const requests = (data ?? []) as ServiceRequest[];

    for (const req of requests) {
      if (req.user_id) {
        const { data: profile } = await this.db
          .from('profiles')
          .select('*')
          .eq('id', req.user_id)
          .single();
        if (profile) req.profile = profile;
      }
      if (req.department_id) {
        const { data: dept } = await this.db
          .from('departments')
          .select('*')
          .eq('id', req.department_id)
          .single();
        if (dept) req.department = dept;
      }
    }

    return requests;
  }

  async getRequest(id: string): Promise<ServiceRequest> {
    const { data, error } = await this.db
      .from('requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    const request = data as ServiceRequest;

    if (request.department_id) {
      const { data: dept } = await this.db
        .from('departments')
        .select('*')
        .eq('id', request.department_id)
        .single();
      if (dept) request.department = dept;
    }

    if (request.user_id) {
      const { data: profile } = await this.db
        .from('profiles')
        .select('*')
        .eq('id', request.user_id)
        .single();
      if (profile) request.profile = profile;
    }

    return request;
  }

  async getRequestEvents(requestId: string): Promise<RequestEvent[]> {
    const { data, error } = await this.db
      .from('request_events')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    const events = (data ?? []) as RequestEvent[];

    for (const event of events) {
      if (event.actor_id) {
        const { data: actor } = await this.db
          .from('profiles')
          .select('*')
          .eq('id', event.actor_id)
          .single();
        if (actor) event.actor = actor;
      }
    }

    return events;
  }

  async approveRequest(id: string, departmentId: string, notes?: string) {
    const { error } = await this.db
      .from('requests')
      .update({ status: 'routed', department_id: departmentId })
      .eq('id', id);
    if (error) throw error;

    await this.addEvent(id, 'approved', notes ?? `Request approved and routed to department.`);
  }

  async rejectRequest(id: string, reason: string) {
    const { error } = await this.db
      .from('requests')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', id);
    if (error) throw error;

    await this.addEvent(id, 'rejected', reason);
  }

  async resolveRequest(id: string, resolution: string, photo?: File) {
    let resolutionPhotoUrl: string | null = null;

    if (photo) {
      try {
        const { data: { user } } = await this.supabaseService.auth.getUser();
        const fileName = `resolutions/${user?.id}/${Date.now()}_${photo.name}`;
        const { error: uploadError } = await this.supabaseService.storage
          .from('request-photos')
          .upload(fileName, photo);

        if (!uploadError) {
          const { data: urlData } = this.supabaseService.storage
            .from('request-photos')
            .getPublicUrl(fileName);
          resolutionPhotoUrl = urlData.publicUrl;
        } else {
          console.warn('Resolution photo upload failed:', uploadError.message);
        }
      } catch (err) {
        console.warn('Resolution photo upload error:', err);
      }
    }

    const updateData: any = { status: 'completed', resolution };
    if (resolutionPhotoUrl) updateData.resolution_photo = resolutionPhotoUrl;

    const { error } = await this.db
      .from('requests')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;

    await this.addEvent(id, 'resolved', resolution);
  }

  async rerouteRequest(id: string, reason: string) {
    const { error } = await this.db
      .from('requests')
      .update({ status: 'pending', department_id: null, rejection_reason: null })
      .eq('id', id);
    if (error) throw error;

    await this.addEvent(id, 'rerouted', reason);
  }

  async deptRejectRequest(id: string, reason: string) {
    const { error } = await this.db
      .from('requests')
      .update({ status: 'closed', rejection_reason: reason })
      .eq('id', id);
    if (error) throw error;

    await this.addEvent(id, 'rejected', reason);
  }

  async bulkResolve(requestIds: string[], resolution: string) {
    for (const id of requestIds) {
      await this.resolveRequest(id, resolution);
    }
  }

  private async addEvent(requestId: string, action: string, notes: string) {
    const { data: { user } } = await this.supabaseService.auth.getUser();
    if (!user) return;

    await this.db.from('request_events').insert({
      request_id: requestId,
      actor_id: user.id,
      action,
      notes,
    });
  }

  async getStats() {
    try {
      const { data } = await this.db.from('requests').select('status');
      const all = data ?? [];
      return {
        total: all.length,
        pending: all.filter((r: any) => r.status === 'pending').length,
        inProgress: all.filter((r: any) =>
          r.status === 'routed' || r.status === 'in_progress'
        ).length,
        completed: all.filter((r: any) => r.status === 'completed').length,
      };
    } catch (err) {
      console.error('Failed to get stats:', err);
      return { total: 0, pending: 0, inProgress: 0, completed: 0 };
    }
  }
}
