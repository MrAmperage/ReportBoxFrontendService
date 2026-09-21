import { Widget } from 'deck.gl';
import DeckGlService from '../../deckglService/deckglService';
import { OnInit, Directive, ElementRef, HostBinding } from '@angular/core';
import { BaseWidgetOptions, WidgetKey, WidgetPlacement } from './baseWidgetTypes';
@Directive({
  selector: 'BaseWidget',
})
export default abstract class BaseWidget extends Widget implements OnInit {
  constructor(
    private DeckGlService: DeckGlService,
    private ElementRef: ElementRef<HTMLDivElement>,
  ) {
    super({});
  }
  override className: string = '';
  override placement: WidgetPlacement = 'top-left';
  @HostBinding('class.Widget')
  IsBindHostClass = true;

  InitWidget() {
    const Widgets = this.DeckGlService.DeckGl.props.widgets;
    this.DeckGlService.DeckGl.setProps({ widgets: [...Widgets, this] });
  }
  override onAdd(): HTMLDivElement {
    return this.ElementRef.nativeElement;
  }
  ngOnInit(): void {
    this.InitWidget();
  }
  override onRenderHTML(rootElement: HTMLElement): void {}
  Register() {}

  static CreateWidgetKey<OptionsType extends BaseWidgetOptions>(
    Id: string,
  ): WidgetKey<OptionsType> {
    return Id as WidgetKey<OptionsType>;
  }
}
