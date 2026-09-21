import { Injectable } from '@angular/core';
import { Deck } from 'deck.gl';
import { BehaviorSubject, Observable } from 'rxjs';

import { BaseWidgetOptions, WidgetKey } from '../widgets/baseWidget/baseWidgetTypes';

@Injectable()
export default class DeckGlService {
  DeckGl!: Deck;
  readonly WidgetOptionsMap: Map<string, BehaviorSubject<BaseWidgetOptions>> = new Map();
  SetDeck(Deck: Deck) {
    this.DeckGl = Deck;
    return this.DeckGl;
  }

  UpdateOptions<OptionsType extends BaseWidgetOptions>(
    Key: WidgetKey<OptionsType>,
    Options: Partial<Omit<OptionsType, 'Id'>>,
  ): void {
    const SubjectOption = this.WidgetOptionsMap.get(Key);
    if (SubjectOption !== undefined) {
      SubjectOption.next({
        ...SubjectOption.getValue(),
        ...Options,
      });
    }
  }

  RegisterWidget<OptionsType extends BaseWidgetOptions>(
    Key: WidgetKey<OptionsType>,
    Options: NoInfer<OptionsType>,
  ): void {
    if (this.WidgetOptionsMap.has(Key)) {
      throw new Error(`Виджет ${Key} уже зарегистрирован`);
    }

    this.WidgetOptionsMap.set(Key, new BehaviorSubject<BaseWidgetOptions>(Options));
  }

  GetOptions<OptionsType extends BaseWidgetOptions>(
    Key: WidgetKey<OptionsType>,
  ): Observable<OptionsType> {
    const Option = this.WidgetOptionsMap.get(Key);
    if (Option === undefined) {
      throw new Error(`Виджет ${Key} не зарегистрирован`);
    }
    return Option as unknown as BehaviorSubject<OptionsType>;
  }
}
