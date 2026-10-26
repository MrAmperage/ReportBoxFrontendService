import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NzLayoutComponent, NzSiderComponent, NzContentComponent } from 'ng-zorro-antd/layout';
import { NzMenuDirective } from 'ng-zorro-antd/menu';

@Component({
  selector: 'Shell',
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  imports: [NzLayoutComponent, NzSiderComponent, NzContentComponent, NzMenuDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Shell {}
