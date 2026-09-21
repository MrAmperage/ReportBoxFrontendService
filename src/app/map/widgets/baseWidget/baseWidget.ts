import { Widget } from 'deck.gl';
import DeckGlService from '../../deckglService/deckglService';
import { OnInit, Directive, ElementRef, HostBinding, ChangeDetectorRef } from '@angular/core';
import { BaseWidgetKey, BaseWidgetOptions, WidgetPlacement } from './baseWidgetTypes';

@Directive({
  selector: 'BaseWidget',
})
export default abstract class BaseWidget<Options extends BaseWidgetOptions>
  extends Widget
  implements OnInit
{
  constructor(
    private DeckGlService: DeckGlService,
    private ElementRef: ElementRef<HTMLDivElement>,
    private ChangeDetectorRef: ChangeDetectorRef,
  ) {
    super({});
  }

  abstract Options: Options;
  override className: string = '';
  override placement: WidgetPlacement = 'top-left';
  @HostBinding('class.Widget')
  IsBindHostClass = true;

  InitWidget() {
    const Widgets = this.DeckGlService.DeckGl.props.widgets;
    this.setProps({ id: this.Options.Id });
    this.DeckGlService.DeckGl.setProps({ widgets: [...Widgets, this] });
    const NewOptions = this.DeckGlService.RegisterWidget(this.Options);
    NewOptions.subscribe((Value) => {
      this.Options = Value;
    });
  }
  override onAdd(): HTMLDivElement {
    return this.ElementRef.nativeElement;
  }
  ngOnInit(): void {
    this.InitWidget();
  }
  UpdateOptions(NewOptions: Partial<Omit<BaseWidgetOptions, 'Id'>>) {
    this.DeckGlService.UpdateOptions(this.Options.Id, NewOptions);
    this.ChangeDetectorRef.detectChanges();
  }
  override onRenderHTML(rootElement: HTMLElement): void {}

  static CreateWidgetKey<OptionsType extends BaseWidgetOptions>(
    Id: string,
  ): BaseWidgetKey<OptionsType> {
    return Id as BaseWidgetKey<OptionsType>;
  }
}
