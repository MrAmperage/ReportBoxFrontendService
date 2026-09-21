export type WidgetPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'fill';

export type BaseWidgetOptions = { readonly Id: string };

declare const WidgetOptionsType: unique symbol;

export type BaseWidgetKey<OptionsType extends BaseWidgetOptions> = string & {
  readonly [WidgetOptionsType]: OptionsType;
};
