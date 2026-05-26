import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Department } from '../models/types';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.supabase;
  }

  async getDepartments(): Promise<Department[]> {
    const { data, error } = await this.db
      .from('departments')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data ?? []) as Department[];
  }

  async getMyDepartments(userId: string): Promise<Department[]> {
    const { data, error } = await this.db
      .from('department_staff')
      .select('department_id')
      .eq('user_id', userId);

    if (error) throw error;

    const departments: Department[] = [];
    for (const row of data ?? []) {
      const { data: dept } = await this.db
        .from('departments')
        .select('*')
        .eq('id', (row as any).department_id)
        .single();
      if (dept) departments.push(dept as Department);
    }
    return departments;
  }

  async assignStaff(userId: string, departmentId: string) {
    const { error } = await this.db
      .from('department_staff')
      .upsert({ user_id: userId, department_id: departmentId });
    if (error) throw error;
  }

  async removeStaff(userId: string, departmentId: string) {
    const { error } = await this.db
      .from('department_staff')
      .delete()
      .eq('user_id', userId)
      .eq('department_id', departmentId);
    if (error) throw error;
  }
}
