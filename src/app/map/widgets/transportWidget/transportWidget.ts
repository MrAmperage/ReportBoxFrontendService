import { ChangeDetectionStrategy, Component } from '@angular/core';
import BaseWidget from '../baseWidget/baseWidget';
import { TransportWidgetOptions } from './transportWidgetTypes';

@Component({
  selector: 'TransportWidget',
  templateUrl: './transportWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TransportWidget extends BaseWidget<TransportWidgetOptions> {
  Options = { Id: 'TransportWidget' };
}
