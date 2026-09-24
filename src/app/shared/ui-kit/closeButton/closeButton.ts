import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NzIconModule, NzIconService } from 'ng-zorro-antd/icon';

@Component({
  selector: 'CloseButton',
  templateUrl: './CloseButton.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzIconModule],
})
export default class CloseButton {
  constructor(private IconService: NzIconService) {}
}
