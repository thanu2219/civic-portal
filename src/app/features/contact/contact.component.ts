import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  // Edit these in one place to update the contact info everywhere
  readonly ownerName = 'Thanu';
  readonly email = 'hello@example.com';
  readonly phone = '+91 00000 00000';
}
