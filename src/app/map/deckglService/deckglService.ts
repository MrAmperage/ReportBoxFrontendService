import { Injectable } from '@angular/core';
import { Deck, Layer } from 'deck.gl';
import { BehaviorSubject, filter, Observable, take } from 'rxjs';

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
    const Subject = this.WidgetOptionsMap.get(Options.Id);
    if (Subject !== undefined) {
      if (Subject.getValue() !== undefined) {
        throw new Error(`Виджет ${Options.Id} уже зарегистрирован`);
      }
      Subject.next(Options);
      return Subject as BehaviorSubject<OptionsType>;
    }

    const NewOptions = new BehaviorSubject<OptionsType>(Options);

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

  WaitWidget<OptionsType extends BaseWidgetOptions>(
    Key: BaseWidgetKey<OptionsType>,
    WatchChanges = false,
  ): Observable<OptionsType> {
    let Subject = this.WidgetOptionsMap.get(Key);

    if (Subject === undefined) {
      Subject = new BehaviorSubject<BaseWidgetOptions | undefined>(undefined);

      this.WidgetOptionsMap.set(Key, Subject);
    }

    const Options$ = Subject.pipe(
      filter((Options): Options is OptionsType => Options !== undefined),
    );

    return WatchChanges ? Options$ : Options$.pipe(take(1));
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

  GetObservableOptions<OptionsType extends BaseWidgetOptions>(
    Key: BaseWidgetKey<OptionsType>,
  ): Observable<OptionsType> | undefined {
    const Option = this.WidgetOptionsMap.get(Key);
    if (Option === undefined) {
      return undefined;
    }
    return Option as unknown as BehaviorSubject<OptionsType>;
  }
  GetOptions<OptionsType extends BaseWidgetOptions, IsObservable extends boolean = false>(
    Key: BaseWidgetKey<OptionsType>,
    IsObservable?: IsObservable,
  ): (IsObservable extends true ? Observable<OptionsType> : OptionsType) | undefined {
    const Subject = this.WidgetOptionsMap.get(Key);

    if (Subject === undefined) {
      return undefined;
    }

    if (IsObservable) {
      return Subject.asObservable() as any;
    }

    return Subject.getValue() as any;
  }
}
