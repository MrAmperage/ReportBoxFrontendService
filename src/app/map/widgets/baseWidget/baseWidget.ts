import { Widget } from 'deck.gl';
import DeckGlService from '../../deckglService/deckglService';
import { OnInit, Component } from '@angular/core';
@Component({ selector: 'BaseWidget', template: '' })
export default abstract class BaseWidget extends Widget implements OnInit {
  constructor(private DeckGlService: DeckGlService) {
    super({});
  }

  InitWidget() {
    const Widgets = this.DeckGlService.Deck.props.widgets;
    Widgets.push(this);
    this.DeckGlService.Deck.setProps({ widgets: Widgets });
  }

  ngOnInit(): void {
    this.InitWidget();
  }
}
