import { ChangeDetectionStrategy, Component } from '@angular/core';
import BaseWidget from '../baseWidget/baseWidget';

@Component({
  selector: 'TransportWidget',
  templateUrl: './transportWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TransportWidget extends BaseWidget {}
