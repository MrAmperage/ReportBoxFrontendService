import { Widget } from 'deck.gl';
import DeckGlService from '../../deckglService/deckglService';
import { OnInit, Directive, ElementRef, HostBinding } from '@angular/core';
import { BaseWidgetKey, BaseWidgetOptions, WidgetPlacement } from './baseWidgetTypes';
import { BehaviorSubject, Subject } from 'rxjs';
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
  override onRenderHTML(rootElement: HTMLElement): void {}

  static CreateWidgetKey<OptionsType extends BaseWidgetOptions>(
    Id: string,
  ): BaseWidgetKey<OptionsType> {
    return Id as BaseWidgetKey<OptionsType>;
  }
}
