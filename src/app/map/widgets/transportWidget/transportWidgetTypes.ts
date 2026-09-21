import BaseWidget from '../baseWidget/baseWidget';

export type TransportWidgetOptions = { Id: 'TransportWidget' };
export const TransportWidgetKey =
  BaseWidget.CreateWidgetKey<TransportWidgetOptions>('TransportWidget');
