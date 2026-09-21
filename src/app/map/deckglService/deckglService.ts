import { Injectable } from '@angular/core';
import { Deck } from 'deck.gl';
import { BehaviorSubject, Observable } from 'rxjs';

import { BaseWidgetOptions, BaseWidgetKey } from '../widgets/baseWidget/baseWidgetTypes';

@Injectable()
export default class DeckGlService {
  DeckGl!: Deck;
  readonly WidgetOptionsMap: Map<string, BehaviorSubject<any>> = new Map();
  SetDeck(Deck: Deck) {
    this.DeckGl = Deck;
    return this.DeckGl;
  }

  UpdateOptions<OptionsType extends BaseWidgetOptions>(
    Key: string,
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
  UnregisterWidget(Id: string): void {
    const Subject = this.WidgetOptionsMap.get(Id);

    if (Subject === undefined) {
      return;
    }

    Subject.complete();
    this.WidgetOptionsMap.delete(Id);
  }
  RegisterWidget<OptionsType extends BaseWidgetOptions>(
    Options: OptionsType,
  ): BehaviorSubject<OptionsType> {
    if (this.WidgetOptionsMap.has(Options.Id)) {
      throw new Error(`Виджет ${Options.Id} уже зарегистрирован`);
    }
    const NewOptions = new BehaviorSubject(Options);
    this.WidgetOptionsMap.set(Options.Id, NewOptions);
    return NewOptions;
  }

  GetOptions<OptionsType extends BaseWidgetOptions>(
    Key: BaseWidgetKey<OptionsType>,
  ): Observable<OptionsType> {
    const Option = this.WidgetOptionsMap.get(Key);
    if (Option === undefined) {
      throw new Error(`Виджет ${Key} не зарегистрирован`);
    }
    return Option as unknown as BehaviorSubject<OptionsType>;
  }
}
