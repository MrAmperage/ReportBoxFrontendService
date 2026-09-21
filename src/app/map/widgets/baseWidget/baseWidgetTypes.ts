export type WidgetPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'fill';

export type BaseWidgetOptions = {
  Id: string;
};

declare const WidgetOptionsType: unique symbol;

export type WidgetKey<OptionsType extends BaseWidgetOptions> = string & {
  readonly [WidgetOptionsType]: OptionsType;
};
