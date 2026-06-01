import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Profile, UserRole } from '../models/types';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.supabase;
  }

  async getUsers(): Promise<Profile[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Profile[];
  }

  async updateRole(userId: string, role: UserRole) {
    const { error } = await this.db
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    if (error) throw error;
  }

  async updateProfile(userId: string, updates: Partial<Pick<Profile, 'full_name'>>) {
    const { error } = await this.db
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    if (error) throw error;
  }

  async deleteUser(userId: string) {
    const { error } = await this.db
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (error) throw error;
  }
}
