import { Injectable } from '@angular/core';
import { Deck, Layer } from 'deck.gl';
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

  AddLayer(Layer: Layer): void {
    const Layers = this.DeckGl.props.layers ?? [];
    const IsHasLayer = Layers.some((CurrentLayer) => (CurrentLayer as Layer).id === Layer.id);
    if (IsHasLayer) {
      throw new Error(`Слой ${Layer.id} уже добавлен`);
    } else {
      this.DeckGl.setProps({
        layers: [...Layers, Layer],
      });
    }
  }

  UpdateLayer(Layer: Layer): void {
    const Layers = this.DeckGl.props.layers ?? [];
    if (!Layers.some((CurrentLayer) => (CurrentLayer as Layer).id === Layer.id)) {
      throw new Error(`Слой ${Layer.id} не найден`);
    } else {
      this.DeckGl.setProps({
        layers: Layers.map((CurrentLayer) =>
          (CurrentLayer as Layer).id === Layer.id ? Layer : CurrentLayer,
        ),
      });
    }
  }

  RemoveLayer(Id: string): void {
    const Layers = this.DeckGl.props.layers ?? [];

    if (!Layers.some((Layer) => (Layer as Layer).id === Id)) {
      return;
    } else {
      this.DeckGl.setProps({
        layers: Layers.filter((Layer) => (Layer as Layer).id !== Id),
      });
    }
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
