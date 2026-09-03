import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'shell',
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class shell {}
