import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RequestService } from '../../../core/services/request.service';
import { CATEGORY_LABELS, RequestCategory } from '../../../core/models/types';

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-request.component.html',
  styleUrl: './create-request.component.scss',
})
export class CreateRequestComponent {
  title = '';
  description = '';
  category: RequestCategory | '' = '';
  location = '';
  photos: File[] = [];
  previewUrls: string[] = [];
  loading = false;
  error = '';

  categories = Object.entries(CATEGORY_LABELS) as [RequestCategory, string][];

  constructor(
    private requestService: RequestService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const newFiles = Array.from(input.files);
    if (this.photos.length + newFiles.length > 5) {
      this.error = 'Maximum 5 photos allowed.';
      return;
    }

    for (const file of newFiles) {
      if (file.size > 5 * 1024 * 1024) {
        this.error = `File "${file.name}" exceeds 5 MB limit.`;
        return;
      }
    }

    this.error = '';
    this.photos.push(...newFiles);

    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.zone.run(() => {
          this.previewUrls.push(e.target?.result as string);
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(index: number) {
    this.photos.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  async onSubmit() {
    if (!this.title || !this.description || !this.category || !this.location.trim()) {
      this.error = 'Please fill in all required fields.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.requestService.createRequest(
        this.title,
        this.description,
        this.category as RequestCategory,
        this.location.trim(),
        this.photos
      );
      this.zone.run(() => {
        this.router.navigate(['/requests']);
      });
    } catch (err: any) {
      console.error('Request submission failed:', err);
      this.zone.run(() => {
        this.error = err.message || err.error_description || 'Failed to submit request. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }
}
