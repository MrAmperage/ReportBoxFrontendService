import { Widget } from 'deck.gl';
import DeckGlService from '../../deckglService/deckglService';
import { OnInit, Directive, ElementRef, HostBinding } from '@angular/core';
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

  Register() {}
}
