import { Injectable } from '@angular/core';
import { Deck } from 'deck.gl';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export default class DeckGlService {
  Deck!: Deck;
  readonly WidgetOptionsMap: Map<string, BehaviorSubject<any>> = new Map();
  SetDeck(Deck: Deck) {
    this.Deck = Deck;
  }

  UpdateOptions<OptionType>(Id: string, Option: Partial<OptionType>) {
    const OldOption = this.WidgetOptionsMap.get(Id);
    if (OldOption !== undefined) {
      OldOption.next({ ...OldOption.getValue(), ...Option });
    }
  }
}
