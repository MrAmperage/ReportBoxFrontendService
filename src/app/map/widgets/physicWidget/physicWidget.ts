import { ChangeDetectionStrategy, Component } from '@angular/core';
import BaseWidget from '../baseWidget/baseWidget';
import { PhisictWidgetOptions } from './physicWidgetTypes';

@Component({
  selector: 'PhysicWidget',
  templateUrl: './physicWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PhysicWidget extends BaseWidget<PhisictWidgetOptions> {
  Options = { Id: 'PhysicWidget' };
}
