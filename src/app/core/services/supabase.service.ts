import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: SupabaseClient | null = null;

  get isConfigured(): boolean {
    return (
      !!environment.supabaseUrl &&
      !environment.supabaseUrl.startsWith('YOUR_') &&
      !!environment.supabaseAnonKey &&
      !environment.supabaseAnonKey.startsWith('YOUR_')
    );
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      if (!this.isConfigured) {
        throw new Error('Supabase is not configured. Update src/environments/environment.ts with your project URL and anon key.');
      }
      this.client = createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey
      );
    }
    return this.client;
  }

  get supabase(): SupabaseClient {
    return this.getClient();
  }

  get auth() {
    return this.getClient().auth;
  }

  get storage() {
    return this.getClient().storage;
  }
}
