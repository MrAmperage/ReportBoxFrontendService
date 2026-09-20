import { ChangeDetectionStrategy, Component } from '@angular/core';
import BaseWidget from '../baseWidget/baseWidget';

@Component({
  selector: 'TransportWidget',
  templateUrl: './transportWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TransportWidget extends BaseWidget {
  override placement: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'fill' =
    'top-left';
  override onRenderHTML(rootElement: HTMLElement): void {}
  override className: string = '';
}
