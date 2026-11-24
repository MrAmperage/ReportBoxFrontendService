import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'loginBackground',
  templateUrl: './loginBackground.svg',
  styleUrl: './loginBackground.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginBackground {}
