import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'reportBoxIcon',
  templateUrl: './reportBoxIcon.svg',
  styleUrl: './reportBoxIcon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReportBoxIcon {}
