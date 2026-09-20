import { Widget } from 'deck.gl';
import DeckGlService from '../../deckglService/deckglService';
import { OnInit, Directive, ElementRef } from '@angular/core';
@Directive({ selector: 'BaseWidget' })
export default abstract class BaseWidget extends Widget implements OnInit {
  constructor(
    private DeckGlService: DeckGlService,
    private ElementRef: ElementRef,
  ) {
    super({ _container: ElementRef.nativeElement });
  }

  InitWidget() {
    const Widgets = this.DeckGlService.DeckGl.props.widgets;
    Widgets.push(this);
    this.DeckGlService.DeckGl.setProps({ widgets: Widgets });
  }

  ngOnInit(): void {
    this.InitWidget();
  }

  Register() {}
}
