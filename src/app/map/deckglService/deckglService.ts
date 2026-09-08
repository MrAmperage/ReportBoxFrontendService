import { Injectable } from '@angular/core';
import { Deck } from 'deck.gl';
import { BehaviorSubject } from 'rxjs';
import { BaseWidgetOptions } from './deckglServiceTypes';

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

  RegisterWidget<OptionsType extends BaseWidgetOptions>(Options: OptionsType) {
    if (this.WidgetOptionsMap.has(Options.Id)) {
      throw new Error(`Виджет ${Options.Id} уже зарегистрирован`);
    } else {
      this.WidgetOptionsMap.set(Options.Id, new BehaviorSubject(Options));
    }
  }
}
